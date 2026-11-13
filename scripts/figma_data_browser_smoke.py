"""Verify the actual screenshot dataset, native scrollbar bounds and previews."""
import json
import os
from pathlib import Path
import subprocess
import tempfile

from playwright.sync_api import sync_playwright, expect
from browser_smoke import login, sidebar_layout

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'artifacts' / 'figma-data'


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    results = []
    with tempfile.TemporaryDirectory(prefix='lighthouse-figma-browser-') as tmp:
        env = dict(os.environ, LIGHTHOUSE_DATA_DIR=tmp+'/data', LIGHTHOUSE_UPLOADS_DIR=tmp+'/uploads',
                   LIGHTHOUSE_DEMO_DATASET='figma', DEMO_ONLY='1')
        code = "const {server}=require('./server');server.listen(0,'127.0.0.1',()=>console.log('PORT='+server.address().port))"
        proc = subprocess.Popen(['node', '-e', code], cwd=ROOT/'backend', env=env, stdout=subprocess.PIPE, text=True)
        try:
            for line in proc.stdout:
                if line.startswith('PORT='):
                    port = int(line.removeprefix('PORT=').strip())
                    break
            with sync_playwright() as p:
                options = {'headless': True, 'ignore_default_args': ['--hide-scrollbars']}
                if os.environ.get('CHROMIUM_PATH'):
                    options['executable_path'] = os.environ['CHROMIUM_PATH']
                browser = p.chromium.launch(**options)
                try:
                    for width, height in [(1920, 1080), (1366, 768)]:
                        page = browser.new_page(viewport={'width': width, 'height': height})
                        errors = []
                        page.on('pageerror', lambda e: errors.append(str(e)))
                        page.goto(f'http://127.0.0.1:{port}', wait_until='networkidle')
                        login(page, 'quanly@lighthouse.test')
                        expect(page.locator('#toast')).not_to_be_visible()
                        page.evaluate('document.fonts.ready')

                        def shot(name):
                            page.screenshot(path=str(OUT/f'{name}-{width}.png'))

                        def scroll_contract(name):
                            sidebar_layout(page)
                            scroll = page.locator('.records-data-scroll')
                            columns = page.locator('.records-columns')
                            bounds = scroll.bounding_box()
                            header = columns.bounding_box()
                            assert abs(bounds['y']-header['y']-header['height']) < 1
                            assert scroll.evaluate('e => e.scrollHeight > e.clientHeight')
                            assert page.evaluate('document.documentElement.scrollHeight <= innerHeight')
                            first = scroll.locator('tbody tr').first.bounding_box()
                            assert abs(first['y']-bounds['y']) < 1
                            for th, td in zip(columns.locator('th').all(), scroll.locator('tbody tr').first.locator('td').all()):
                                assert abs(th.bounding_box()['x']-td.bounding_box()['x']) < 1
                            anchors = [page.locator(s).bounding_box() for s in ['.sidebar','.topbar','.panel-top','.records-columns']]
                            shot(name)
                            scroll.hover()
                            page.mouse.wheel(0, 600)
                            page.wait_for_timeout(350)
                            assert scroll.evaluate('e => e.scrollTop') > 0
                            assert page.evaluate('window.scrollY') == 0
                            assert anchors == [page.locator(s).bounding_box() for s in ['.sidebar','.topbar','.panel-top','.records-columns']]
                            shot(name+'-scrolled')
                            scroll.evaluate('e => e.scrollTop=0')
                            results.append({'viewport': f'{width}x{height}', 'screen': name,
                                            'scroll_top': bounds['y'], 'column_header_bottom': header['y']+header['height'],
                                            'rows': scroll.locator('tbody tr').count()})

                        expect(page.locator('.records-stat strong')).to_have_text(['12','8','4'])
                        expect(page.locator('.registration-data tbody tr').first).to_contain_text('Bùi Bích Phương')
                        expect(page.locator('.registration-data tbody tr').nth(5)).to_contain_text('Đào Di Quân')
                        scroll_contract('uc03-list')
                        page.locator('[data-action=review][data-id=HS006]').click()
                        expect(page.locator('.records-review')).to_contain_text('Đào Di Quân')
                        expect(page.locator('.records-review')).to_contain_text('01/06/1999')
                        shot('uc03-review-HS006')
                        page.locator('.review-cancel').click()
                        page.locator('.records-notice-layer').click(position={'x': 5,'y': 5})
                        page.evaluate("L.go('students')")
                        expect(page.locator('.student-data tbody tr')).to_have_count(32)
                        scroll_contract('uc04-list')
                        page.locator('#student-search').fill('Marketing')
                        expect(page.locator('.student-data tbody tr')).to_have_count(1)
                        expect(page.locator('.student-data tbody')).to_contain_text('Mai Hồng Ngọc')
                        shot('uc04-search-Marketing')
                        page.locator('[data-action=detail]').click()
                        expect(page.locator('.student-profile-heading')).to_contain_text('Mai Hồng Ngọc · LH001')
                        expect(page.locator('.student-info-grid')).to_contain_text('15/03/2005')
                        expect(page.locator('.student-profile tbody tr')).to_have_count(2)
                        shot('uc04-personal')

                        def check_proof(name):
                            page.locator('.student-profile [data-preview]').first.click()
                            crop = page.locator('.records-preview-crop')
                            expect(crop).to_be_visible()
                            assert crop.bounding_box()['width'] < 800
                            expect(page.locator('.records-preview-crop img')).to_have_js_property('naturalWidth', 1920)
                            shot(name)
                            page.get_by_role('button', name='Đóng minh chứng', exact=True).click()

                        check_proof('uc04-personal-proof')
                        page.locator('.student-profile [data-missing-proof]').click()
                        expect(page.locator('.records-notice')).to_have_text('Chưa có tệp gốc cho giấy tờ này.')
                        page.locator('.records-notice-layer').click(position={'x': 5,'y': 5})
                        page.locator('[data-tab=grades]').click()
                        expect(page.locator('.profile-table-scroll tbody tr')).to_have_count(4)
                        expect(page.locator('.profile-table-scroll')).to_contain_text('3.60')
                        shot('uc04-grades')
                        check_proof('uc04-grade-proof')
                        page.locator('[data-tab=goals]').click()
                        expect(page.locator('.profile-table-scroll tbody tr')).to_have_count(4)
                        shot('uc04-goals')
                        page.locator('[data-goal=MT002]').click()
                        expect(page.locator('.records-goal')).to_contain_text('Thành thạo Python')
                        shot('uc04-goal-python')
                        page.locator('.records-goal [data-close]').click()
                        page.locator('[data-tab=supports]').click()
                        expect(page.locator('.profile-table-scroll tbody tr')).to_have_count(4)
                        expect(page.locator('.profile-table-scroll')).to_contain_text('01/10–31/10/2026')
                        shot('uc04-supports')
                        check_proof('uc04-invoice')
                        assert not errors, errors
                        page.close()
                finally:
                    browser.close()
        finally:
            proc.terminate()
            proc.wait(timeout=10)
    (OUT/'results.json').write_text(json.dumps({'status':'passed','scroll_checks':results},indent=2)+'\n')
    print('PASS: screenshot data, counts, previews and native data-only scrollbars at both viewports')


if __name__ == '__main__':
    main()
