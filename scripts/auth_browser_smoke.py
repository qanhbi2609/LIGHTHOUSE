"""UC01 browser interactions and screenshots; isolated synthetic data only."""
import json
import os
from pathlib import Path
import subprocess
import tempfile

from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'artifacts' / 'uc01'


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='lighthouse-uc01-') as tmp:
        env = dict(os.environ, LIGHTHOUSE_DEMO_DATASET='workflow', LIGHTHOUSE_DATA_DIR=tmp + '/data',
                   LIGHTHOUSE_UPLOADS_DIR=tmp + '/uploads', DEMO_ONLY='1')
        subprocess.run(['node', 'seed.js'], cwd=ROOT / 'backend', env=env, check=True)
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
                        card = page.locator('.auth-card').bounding_box()
                        page.evaluate('document.fonts.ready')
                        assert page.locator('.auth-brand').evaluate("el => getComputedStyle(el).fontFamily").startswith('Ribeye')
                        assert page.evaluate("document.fonts.check('48px Ribeye')"), 'Ribeye font did not load'
                        font_response = page.request.get(f'http://127.0.0.1:{port}/assets/fonts/ribeye-latin-400-normal.woff2')
                        assert font_response.status == 200
                        assert font_response.body()[:4] == b'wOF2'
                        for selector, filename in [('.auth-shell', 'auth-background.png'), ('.auth-logo', 'auth-logo.png')]:
                            background = page.locator(selector).evaluate('el => getComputedStyle(el).backgroundImage')
                            assert filename in background, background
                            await_image = """url => new Promise((resolve, reject) => {
                                const image = new Image();
                                image.onload = () => resolve([image.naturalWidth, image.naturalHeight]);
                                image.onerror = () => reject(new Error('Unable to load auth asset'));
                                image.src = url;
                            })"""
                            dimensions = page.evaluate(await_image, f'/assets/{filename}')
                            assert dimensions == ([1920, 1080] if selector == '.auth-shell' else [120, 120])
                        if width == 1920:
                            assert card == {'x': 1270, 'y': 77, 'width': 540, 'height': 960}, card
                        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
                        assert page.evaluate('document.documentElement.scrollHeight <= innerHeight')

                        def shot(name):
                            page.screenshot(path=str(OUT / f'{name}-{width}.png'))

                        def submit():
                            page.locator('#login-form button[type=submit]').click()

                        def dismiss():
                            page.locator('.auth-notice-layer').click(position={'x': 10, 'y': 10})

                        email = 'canbo@lighthouse.test' if width == 1920 else 'sinhvien@lighthouse.test'
                        shot('01-login')
                        page.locator('[name=email]').fill(email)
                        page.locator('[name=password]').fill('wrong')
                        page.get_by_role('button', name='Hiện mật khẩu', exact=True).click()
                        expect(page.locator('[name=password]')).to_have_attribute('type', 'text')
                        page.get_by_role('button', name='Ẩn mật khẩu', exact=True).click()
                        submit()
                        expect(page.locator('.auth-notice')).to_have_text('Email hoặc mật khẩu sai')
                        shot('02-login-error')
                        dismiss()
                        page.get_by_role('button', name='Quên mật khẩu?', exact=True).click()
                        shot('03-forgot')
                        page.locator('[name=email]').fill(email)
                        with page.expect_response('**/api/auth/forgot') as response:
                            submit()
                        otp = response.value.json()['demoCode']
                        expect(page.locator('.auth-otp input')).to_have_count(4)
                        expect(page.locator('#auth-resend')).to_be_disabled()
                        shot('04-verify')

                        def fill_code(code):
                            for i, digit in enumerate(code):
                                page.locator(f'[name=digit{i}]').fill(digit)

                        fill_code('0000')
                        submit()
                        expect(page.locator('.auth-notice')).to_have_text('Mã xác thực không hợp lệ')
                        shot('05-invalid-code')
                        dismiss()
                        # Exercise expiry rendering without waiting five minutes.
                        # The real backend expiry branch is covered by auth-recovery.test.js.
                        page.route('**/api/auth/verify', lambda route: route.fulfill(
                            status=400, json={'error': 'Mã xác thực hết hạn!'}))
                        submit()
                        expect(page.locator('.auth-notice')).to_have_text('Mã xác thực hết hạn!')
                        shot('06-expired-code')
                        dismiss()
                        page.unroute('**/api/auth/verify')
                        fill_code(otp)
                        submit()
                        expect(page.locator('[name=confirmPassword]')).to_be_visible()
                        shot('07-reset')
                        page.locator('[name=password]').fill('short')
                        page.locator('[name=confirmPassword]').fill('short')
                        submit()
                        expect(page.locator('#error-password')).to_have_text('Mật khẩu không hợp lệ!')
                        shot('08-invalid-password')
                        page.locator('[name=password]').fill('Changed@123')
                        page.locator('[name=confirmPassword]').fill('Different@123')
                        submit()
                        expect(page.locator('#error-confirmPassword')).to_have_text('Mật khẩu không trùng khớp!')
                        shot('09-mismatch')
                        page.locator('[name=confirmPassword]').fill('Changed@123')
                        submit()
                        expect(page.locator('.auth-success')).to_be_visible()
                        shot('10-success')
                        page.get_by_role('button', name='Đăng nhập', exact=True).click()
                        page.locator('[name=email]').fill(email)
                        page.locator('[name=password]').fill('Changed@123')
                        page.locator('[name=remember]').check()
                        submit()
                        expect(page.locator('.dashboard')).to_be_visible()
                        assert page.evaluate("Boolean(localStorage.getItem('lh_token'))")
                        assert not page.evaluate("Boolean(sessionStorage.getItem('lh_token'))")
                        second = context.new_page()
                        second.goto(f'http://127.0.0.1:{port}', wait_until='networkidle')
                        expect(second.locator('.dashboard')).to_be_visible()
                        second.get_by_text('Đăng xuất', exact=True).click()
                        expect(second.locator('.auth-login')).to_be_visible()
                        assert not second.evaluate("Boolean(localStorage.getItem('lh_token'))")
                        second.get_by_role('button', name='Đăng ký vào Lighthouse', exact=True).click()
                        expect(second.locator('#registration-form')).to_be_visible()
                        assert not errors, errors
                        context.close()
                finally:
                    browser.close()
        finally:
            proc.terminate()
            proc.wait(timeout=10)
    (OUT / 'results.json').write_text(json.dumps({
        'viewports': ['1920x1080', '1366x768'], 'status': 'passed',
        'screenshots': 20, 'expiry_ui_response': 'mocked; backend tested separately',
        'figma_pixel_diff': 'not_run', 'original_photo_and_logo': 'Downloads.zip; loaded successfully'
    }, indent=2) + '\n')
    print('PASS: UC01 screens, password toggles, invalid/expired code, password validation, reset, remembered login and logout at both sizes')


if __name__ == '__main__':
    main()
