"""UC03/UC04 flows and scroll boundaries, using only isolated synthetic fixtures."""
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile

from playwright.sync_api import sync_playwright, expect
from browser_smoke import sidebar_layout

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'artifacts' / 'uc03-04'


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='lighthouse-records-') as tmp:
        data_dir, uploads = Path(tmp) / 'data', Path(tmp) / 'uploads'
        uploads.mkdir()
        env = dict(os.environ, LIGHTHOUSE_DATA_DIR=str(data_dir), LIGHTHOUSE_UPLOADS_DIR=str(uploads), DEMO_ONLY='1')
        subprocess.run(['node', 'seed.js'], cwd=ROOT / 'backend', env=env, check=True)
        db_file = data_dir / 'lighthouse.json'
        db = json.loads(db_file.read_text())
        shutil.copyfile(ROOT / 'frontend/assets/auth-logo.png', uploads / 'test-proof.png')
        proof = {'url': '/uploads/test-proof.png', 'name': 'Synthetic proof.png', 'group': 'family', 'created': '2026-01-01'}
        for r in db['registrations']:
            r['documents'] = [proof, dict(proof, group='school', name='Synthetic school proof.png')]
        for i in range(40):
            db['registrations'].append(dict(db['registrations'][0], id=f'QA{i:03}', name=f'Hồ sơ kiểm thử {i}',
                email=f'records-{i}@example.test', status=['Chờ kiểm tra', 'Đạt yêu cầu', 'Chờ bổ sung'][i % 3],
                note='', description='Kế hoạch học tập giả lập.\n' * 7))
            db['students'].append(dict(db['students'][0], id=f'QAS{i:03}', userId=None, registrationId=None,
                name=f'Sinh viên kiểm thử {i}', room=None))
        db['grades'][0]['evidence'] = '/uploads/test-proof.png'
        db['supports'][0]['evidence'] = '/uploads/test-proof.png'
        db_file.write_text(json.dumps(db))
        code = "const {server}=require('./server');server.listen(0,'127.0.0.1',()=>console.log(server.address().port))"
        proc = subprocess.Popen(['node', '-e', code], cwd=ROOT / 'backend', env=env, stdout=subprocess.PIPE, text=True)
        screenshots = []
        try:
            port = int(proc.stdout.readline().strip())
            with sync_playwright() as p:
                options = {'headless': True}
                if os.environ.get('CHROMIUM_PATH'):
                    options['executable_path'] = os.environ['CHROMIUM_PATH']
                browser = p.chromium.launch(**options)
                try:
                    for width, height in [(1920, 1080), (1366, 768)]:
                        page = browser.new_page(viewport={'width': width, 'height': height})
                        errors = []
                        page.on('pageerror', lambda e: errors.append(str(e)))
                        page.goto(f'http://127.0.0.1:{port}', wait_until='networkidle')
                        page.locator('[name=email]').fill('quanly@lighthouse.test')
                        page.locator('[name=password]').fill('Demo@123')
                        page.locator('#login-form button[type=submit]').click()
                        expect(page.locator('.records-registration-list')).to_be_visible()
                        expect(page.locator('#toast')).not_to_be_visible()
                        page.evaluate('document.fonts.ready')

                        def shot(name):
                            page.screenshot(path=str(OUT / f'{name}-{width}.png'))
                            screenshots.append(f'{name}-{width}.png')

                        def dismiss():
                            page.locator('.records-notice-layer').click(position={'x': 5, 'y': 5})

                        def check_scroll():
                            sidebar_layout(page)
                            sidebar = page.locator('.sidebar').bounding_box()
                            panel = page.locator('.records-list-panel').bounding_box()
                            assert sidebar['width'] == 260
                            assert panel['x'] - sidebar['width'] == 32
                            assert abs(width - panel['x'] - panel['width'] - 32) < 1
                            assert page.evaluate('document.documentElement.scrollHeight <= innerHeight')
                            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
                            scroll = page.locator('.records-data-scroll')
                            assert scroll.evaluate('e => e.scrollHeight > e.clientHeight')
                            anchors = [page.locator(s).bounding_box() for s in ['.topbar', '.sidebar', '.panel-top', '.records-columns']]
                            scroll.evaluate('e => e.scrollTop = 400')
                            assert scroll.evaluate('e => e.scrollTop') == 400
                            assert page.evaluate('window.scrollY') == 0
                            assert anchors == [page.locator(s).bounding_box() for s in ['.topbar', '.sidebar', '.panel-top', '.records-columns']]
                            scroll.evaluate('e => e.scrollTop = 0')

                        def review(id):
                            page.locator('#registration-search').fill(id)
                            page.locator('.records-data-scroll [data-action=review]').click()
                            expect(page.locator('.records-review')).to_be_visible()
                            expect(page.locator('.review-personal-grid .review-field')).to_have_count(7)
                            if height == 768:
                                actions = page.locator('.review-actions').bounding_box()
                                page.locator('.review-scroll').evaluate('el => el.scrollTop = el.scrollHeight')
                                assert actions == page.locator('.review-actions').bounding_box()
                                page.locator('.review-scroll').evaluate('el => el.scrollTop = 0')

                        check_scroll()
                        shot('17-uc03-list')
                        if width == 1920:
                            assert page.locator('.sidebar').bounding_box()['width'] == 260
                            assert page.locator('.records-list-panel').bounding_box()['x'] == 292
                            assert abs(page.locator('.records-stats').bounding_box()['y'] - 175) < 1
                        # Search and status filter are independent; counters do not shrink to search results.
                        counts = page.locator('.records-stat strong').all_text_contents()
                        page.locator('#registration-search').fill('QA007')
                        page.locator('#registration-status').select_option('Đạt yêu cầu')
                        expect(page.locator('.records-data-scroll tbody tr')).to_have_count(1)
                        assert page.locator('.records-stat strong').all_text_contents() == counts
                        page.locator('#registration-status').select_option('')
                        pending_id = 'QA000' if width == 1920 else 'QA003'
                        review(pending_id)
                        shot('18-uc03-review')
                        page.locator('#review-status').select_option('Đạt yêu cầu')
                        shot('23-uc03-eligible')
                        page.locator('.review-actions button[type=submit]').click()
                        expect(page.locator('.records-notice')).to_have_text('Đã lưu thành công!')
                        shot('24-uc03-saved')
                        dismiss()
                        review(pending_id)
                        page.locator('#review-status').select_option('Chờ bổ sung')
                        shot('22-uc03-additional-state')
                        page.locator('#review-note').fill('Yêu cầu bổ sung thêm minh chứng')
                        shot('21-uc03-additional-note')
                        page.locator('.review-actions button[type=submit]').click()
                        expect(page.locator('.records-notice')).to_have_text('Gửi yêu cầu thành công!')
                        shot('19-uc03-request-saved')
                        dismiss()
                        review(pending_id)
                        before = db_file.read_text()
                        page.locator('#review-status').select_option('Từ chối')
                        expect(page.locator('.records-confirm')).to_be_visible()
                        shot('25-uc03-refuse-confirm')
                        page.locator('.records-confirm [data-close]').click()
                        expect(page.locator('.records-notice')).to_have_text('Đã hủy thao tác!')
                        assert db_file.read_text() == before
                        shot('27-uc03-cancel')
                        dismiss()
                        page.locator('#review-status').select_option('Từ chối')
                        shot('20-uc03-refuse-choice')
                        page.locator('.confirm-ok').click()
                        expect(page.locator('.records-notice')).to_have_text('Đã xóa khỏi danh sách!')
                        shot('26-uc03-refused')
                        dismiss()
                        expect(page.locator('.records-data-scroll tbody tr')).to_have_count(0)
                        eligible_id = 'QA001' if width == 1920 else 'QA004'
                        page.locator('#registration-search').fill(eligible_id)
                        page.locator('[data-action=accept]').click()
                        shot('29-uc03-accept-confirm')
                        page.locator('.confirm-ok').click()
                        expect(page.locator('.records-notice')).to_have_text('Đã tạo hồ sơ sinh viên thành công!')
                        shot('28-uc03-accepted')
                        dismiss()
                        saved = json.loads(db_file.read_text())
                        assert any(s['registrationId'] == eligible_id for s in saved['students'])
                        # UC04 list, independent data scrolling and fixed header.
                        page.locator('.sidebar button[onclick="L.go(\'students\')"]').click()
                        expect(page.locator('.records-student-list')).to_be_visible()
                        check_scroll()
                        shot('01-uc04-list')
                        page.locator('#student-search').fill('QAS001')
                        expect(page.locator('.records-data-scroll tbody tr')).to_have_count(1)
                        shot('02-uc04-search')
                        page.locator('#student-search').fill('does-not-exist')
                        expect(page.locator('.records-empty')).to_be_visible()
                        shot('03-uc04-empty')
                        page.locator('#student-search').fill('LH001')
                        page.locator('[data-action=detail]').click()
                        expect(page.locator('.student-info-grid')).to_be_visible()
                        shot('06-uc04-personal')
                        page.locator('.student-profile [data-preview]').first.click()
                        expect(page.locator('.records-preview img')).to_be_visible()
                        shot('05-uc04-personal-proof')
                        page.get_by_role('button', name='Đóng minh chứng', exact=True).click()
                        for tab, name, proof_name in [('grades', '11-uc04-grades', '09-uc04-grade-proof'), ('goals', '10-uc04-goals', None), ('supports', '07-uc04-supports', '08-uc04-invoice')]:
                            page.locator(f'[data-tab={tab}]').click()
                            shot(name)
                            if proof_name:
                                page.locator('.student-profile [data-preview]').first.click()
                                expect(page.locator('.records-preview img')).to_be_visible()
                                shot(proof_name)
                                page.get_by_role('button', name='Đóng minh chứng', exact=True).click()
                            else:
                                page.locator('[data-goal]').first.click()
                                expect(page.locator('.records-goal')).to_be_visible()
                                shot('04-uc04-goal-detail')
                                page.locator('.records-goal [data-close]').click()
                        page.locator('[data-tab=personal]').click()
                        page.locator('.student-profile-actions [data-action=edit]').click()
                        expect(page.locator('#student-edit-form')).to_be_visible()
                        shot('13-uc04-edit')
                        original = next(s for s in json.loads(db_file.read_text())['students'] if s['id'] == 'LH001')
                        page.locator('#edit-email').fill('invalid')
                        page.locator('#student-edit-form [type=submit]').click()
                        expect(page.locator('[data-error=email]')).not_to_be_empty()
                        page.locator('#edit-email').fill(original['email'])
                        changed_name = f'Đã chỉnh sửa {width}'
                        page.locator('#edit-name').fill(changed_name)
                        page.locator('#student-edit-form [type=submit]').click()
                        shot('12-uc04-save-confirm')
                        page.locator('.records-confirm [data-close]').click()
                        expect(page.locator('.records-notice')).to_have_text('Đã hủy thao tác!')
                        current = next(s for s in json.loads(db_file.read_text())['students'] if s['id'] == 'LH001')
                        assert current == original
                        shot('15-uc04-cancel-save')
                        dismiss()
                        page.locator('#student-edit-form [type=submit]').click()
                        page.locator('.confirm-ok').click()
                        expect(page.locator('.records-notice')).to_have_text('Lưu hồ sơ thành công!')
                        shot('14-uc04-saved')
                        saved = json.loads(db_file.read_text())
                        assert next(s for s in saved['students'] if s['id'] == 'LH001')['name'] == changed_name
                        assert saved['studentRevisions'][-1]['before'] == original
                        assert not errors, errors
                        page.close()
                finally:
                    browser.close()
        finally:
            proc.terminate()
            proc.wait(timeout=10)
    (OUT / 'results.json').write_text(json.dumps({'status': 'passed', 'viewports': ['1920x1080', '1366x768'],
        'screenshots': screenshots, 'proof_content': 'synthetic fixture, not personal documents',
        'checks': ['body does not scroll', 'data only scrolls', 'fixed table headers', 'sidebar bounds', 'independent filters',
                   'review statuses', 'cancel without writes', 'accept', 'preview', 'profile tabs', 'edit validation', 'revision history']}, indent=2) + '\n')
    print('PASS: UC03/UC04 workflows and isolated scroll containers at both viewports')


if __name__ == '__main__':
    main()
