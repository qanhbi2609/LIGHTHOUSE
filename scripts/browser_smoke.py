"""Exercise the demo UI with isolated data; save evidence, not Figma approval.

Requires Python Playwright 1.62.0 and Chromium. Run from any directory.
"""
import json
import os
from pathlib import Path
import subprocess
import tempfile

from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
OUT = Path(os.environ.get("SCREENSHOT_DIR", ROOT / "artifacts" / "browser"))
OUT.mkdir(parents=True, exist_ok=True)
SCREENS = ["registrations", "students", "rooms", "alumni", "goals",
           "grades", "users", "reports", "history"]


def login(page, email):
    page.locator('input[name="email"]').fill(email)
    page.locator('input[name="password"]').fill("Demo@123")
    page.locator('#login-form button[type="submit"]').click()
    expect(page.locator('.dashboard')).to_be_visible()
    expect(page.locator('#page-content .loading')).to_have_count(0)


def ready(page):
    expect(page.locator('#page-content .loading')).to_have_count(0)
    expect(page.locator('#page-content')).not_to_be_empty()
    expect(page.locator('#page-content .danger')).to_have_count(0)


def sidebar_layout(page):
    assert page.locator('.sidebar-brand').evaluate('el => getComputedStyle(el).fontFamily').startswith('Ribeye')
    assert page.locator('.navitem span').first.evaluate('el => getComputedStyle(el).fontFamily').startswith('Roboto')
    nav = page.locator('.sidebar-group').bounding_box()
    footer = page.locator('.sidebar-footer').bounding_box()
    label = page.locator('.navitem span').first.bounding_box()
    assert label['width'] > 100, 'Navigation labels squeezed into a narrow column'
    assert nav['y'] + nav['height'] <= footer['y'] + 1, 'Navigation overlaps footer'
    assert page.locator('.sidebar-group').evaluate('el => el.scrollHeight <= el.clientHeight + 1'), 'Navigation requires scrolling'
    for item in page.locator('.sidebar .navitem').all():
        box = item.bounding_box()
        assert box['y'] >= nav['y'] and box['y'] + box['height'] <= footer['y'], 'A menu item is clipped'
    assert footer['y'] + footer['height'] <= page.viewport_size['height'], 'Footer is clipped'


def main():
    results = []
    with tempfile.TemporaryDirectory(prefix="lighthouse-browser-") as tmp:
        env = dict(os.environ, LIGHTHOUSE_DATA_DIR=tmp + '/data',
                   LIGHTHOUSE_UPLOADS_DIR=tmp + '/uploads', DEMO_ONLY='1',
                   NODE_ENV='development')
        subprocess.run(['node', 'seed.js'], cwd=ROOT / 'backend', env=env, check=True)
        # Enough synthetic residents to exercise the six-person UI boundary.
        db_path = Path(tmp) / 'data' / 'lighthouse.json'
        db = json.loads(db_path.read_text())
        for i in range(4):
            db['students'].append(dict(db['students'][0], id=f'QA{i}',
                                       name=f'Room capacity QA {i}', room=None,
                                       userId=None, registrationId=None))
        db_path.write_text(json.dumps(db))
        # Ask the OS for an unused port; don't interfere with development servers.
        code = "const {server}=require('./server');server.listen(0,'127.0.0.1',()=>console.log(server.address().port))"
        proc = subprocess.Popen(['node', '-e', code], cwd=ROOT / 'backend',
                                env=env, stdout=subprocess.PIPE, text=True)
        try:
            port = int(proc.stdout.readline().strip())
            with sync_playwright() as p:
                options = {'headless': True}
                if os.environ.get('CHROMIUM_PATH'):
                    options['executable_path'] = os.environ['CHROMIUM_PATH']
                browser = p.chromium.launch(**options)
                try:
                    for width, height in [(1920, 1080), (1366, 768)]:
                        context = browser.new_context(viewport={'width': width, 'height': height})
                        page = context.new_page()
                        errors = []
                        page.on('pageerror', lambda error: errors.append(str(error)))
                        page.goto(f'http://127.0.0.1:{port}', wait_until='networkidle')
                        expect(page.locator('#login-form')).to_be_visible()
                        page.screenshot(path=str(OUT / f'login-{width}.png'))
                        # Verify the actual form, including its error path.
                        page.locator('input[name="email"]').fill('quanly@lighthouse.test')
                        page.locator('input[name="password"]').fill('incorrect')
                        page.locator('#login-form button[type="submit"]').click()
                        expect(page.locator('.auth-notice')).to_contain_text('Email hoặc mật khẩu sai')
                        page.locator('.auth-notice-layer').click(position={'x': 10, 'y': 10})
                        login(page, 'quanly@lighthouse.test')
                        sidebar_layout(page)
                        expect(page.locator('#toast')).not_to_be_visible()
                        for screen in SCREENS:
                            if screen == 'grades':
                                page.evaluate('(screen) => L.go(screen)', screen)
                            else:
                                page.locator(f'.sidebar button[onclick="L.go(\'{screen}\')"]').click()
                            ready(page)
                            page.screenshot(path=str(OUT / f'{screen}-{width}.png'))
                            if screen == 'rooms':
                                page.get_by_role('button', name='＋ Tạo phòng', exact=True).click()
                                capacity = page.locator('input[name="capacity"]')
                                expect(capacity).to_have_value('6')
                                expect(capacity).to_have_attribute('readonly', '')
                                page.locator('.dialog .cancel').click()
                                page.locator('.room-card').filter(has=page.locator('h3', has_text='A101')).get_by_role('button', name='Sửa', exact=True).click()
                                checks = page.locator('.dialog input[type="checkbox"]')
                                expect(checks).to_have_count(7)
                                for check in checks.all():
                                    if page.locator('.dialog input:checked').count() == 6:
                                        break
                                    if not check.is_checked():
                                        check.check()
                                expect(page.locator('.dialog input:checked')).to_have_count(6)
                                expect(page.locator('.dialog input:not(:checked):disabled')).to_have_count(1)
                                page.locator('.dialog input:checked').first.uncheck()
                                expect(page.locator('.dialog input:disabled')).to_have_count(0)
                                page.locator('.dialog .cancel').click()
                        page.get_by_text('Đăng xuất', exact=True).click()
                        expect(page.locator('#login-form')).to_be_visible()
                        login(page, 'sinhvien@lighthouse.test')
                        expect(page.locator('.sidebar nav button')).to_have_count(2)
                        for screen in ['goals', 'grades']:
                            page.evaluate('(screen) => L.go(screen)', screen)
                            ready(page)
                            page.screenshot(path=str(OUT / f'student-{screen}-{width}.png'))
                        # Session survives reload; server-side sessions remain in memory.
                        page.reload(wait_until='networkidle')
                        expect(page.locator('.dashboard')).to_be_visible()
                        ready(page)
                        assert not errors, errors
                        results.append({'viewport': f'{width}x{height}', 'status': 'passed',
                                        'manager_screens': SCREENS, 'student_screens': ['goals', 'grades'],
                                        'figma_comparison': 'not_run'})
                        context.close()
                finally:
                    browser.close()
        finally:
            proc.terminate()
            proc.wait(timeout=10)
    (OUT / 'results.json').write_text(json.dumps(results, indent=2) + '\n')
    print('PASS: authentication, navigation, reload, sidebar layout and six-person room limit at both viewports')
    print('Screenshots are evidence of current UI only; Figma comparison not performed.')


if __name__ == '__main__':
    main()
