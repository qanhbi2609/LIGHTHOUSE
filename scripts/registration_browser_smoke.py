"""UC02 reference screenshots and real registration/upload checks in isolated storage."""
import base64
import json
import os
from pathlib import Path
import subprocess
import tempfile

from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'artifacts' / 'uc02'
PNG = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=')


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='lighthouse-uc02-') as tmp:
        env = dict(os.environ, LIGHTHOUSE_DEMO_DATASET='workflow', LIGHTHOUSE_DATA_DIR=tmp + '/data', LIGHTHOUSE_UPLOADS_DIR=tmp + '/uploads')
        subprocess.run(['node', 'seed.js'], cwd=ROOT / 'backend', env=env, check=True)
        code = "const {server}=require('./server');server.listen(0,'127.0.0.1',()=>console.log(server.address().port))"
        proc = subprocess.Popen(['node', '-e', code], cwd=ROOT / 'backend', env=env, stdout=subprocess.PIPE, text=True)
        try:
            port = int(proc.stdout.readline().strip())
            with sync_playwright() as p:
                options = {'headless': True}
                if os.environ.get('CHROMIUM_PATH'):
                    options['executable_path'] = os.environ['CHROMIUM_PATH']
                browser = p.chromium.launch(**options)
                try:
                    for width, height in [(1920, 1080), (1366, 768)]:
                        page = browser.new_page(viewport={'width': width, 'height': height}, locale='vi-VN')
                        errors = []
                        page.on('pageerror', lambda error: errors.append(str(error)))
                        page.goto(f'http://127.0.0.1:{port}', wait_until='networkidle')
                        page.get_by_role('button', name='Đăng ký vào Lighthouse', exact=True).click()
                        form = page.locator('#registration-form')
                        expect(form).to_be_visible()
                        page.evaluate('document.fonts.ready')
                        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
                        if width == 1920:
                            if not page.evaluate('document.documentElement.scrollHeight <= innerHeight'):
                                page.screenshot(path=str(OUT / 'form-overflow.png'), full_page=True)
                            assert page.evaluate('document.documentElement.scrollHeight <= innerHeight'), page.locator('form>section').evaluate_all('els => els.map(el => [el.className,el.getBoundingClientRect().toJSON()])')
                        page.screenshot(path=str(OUT / f'form-{width}.png'), full_page=True)
                        submit = form.get_by_role('button', name='Nộp hồ sơ', exact=True)
                        submit.click()
                        expect(form.locator('.registration-status')).to_contain_text('Vui lòng cung cấp đầy đủ')
                        expect(page.locator('.records-notice')).to_have_text('Vui lòng cung cấp đầy đủ và chính xác tất cả các thông tin!')
                        page.locator('.records-notice-layer').click(position={'x':5,'y':5})
                        expect(form.locator('[name=name]')).to_have_attribute('aria-invalid', 'true')
                        values = dict(name='Sinh viên kiểm thử', dob='2006-01-15', address='Địa chỉ thử nghiệm',
                                      phone='0901234567', email=f'uc02-{width}@example.test', cccd='001001000001',
                                      family='Thông tin hoàn cảnh giả lập', school='Chưa chọn', major='Chưa chọn',
                                      description='Dự định học tập và công việc tương lai. ' * 30)
                        for key, value in values.items():
                            form.locator(f'[name={key}]').fill(value)
                        expect(form.locator('[name=hometown] option')).to_have_count(35)
                        form.locator('[name=hometown]').select_option('Đà Nẵng')
                        form.locator('[name=familyFiles]').set_input_files(dict(name='invalid.txt', mimeType='text/plain', buffer=b'bad'))
                        form.locator('[name=schoolFiles]').set_input_files(dict(name='hoc-ba.png', mimeType='image/png', buffer=PNG))
                        submit.click()
                        expect(form.locator('#error-familyFiles')).to_contain_text('Chỉ nhận PNG, JPG, PDF')
                        page.locator('.records-notice-layer').click(position={'x':5,'y':5})
                        form.locator('[name=familyFiles]').set_input_files(dict(name='minh-chung.png', mimeType='image/png', buffer=PNG))
                        # A rejected server request must leave the entered form intact.
                        page.route('**/api/registrations', lambda route: route.fulfill(status=503, json={'error': 'Không thể lưu hồ sơ lúc này.'}))
                        submit.click()
                        expect(form.locator('.registration-status')).to_have_text('Không thể lưu hồ sơ lúc này.')
                        expect(form.locator('[name=name]')).to_have_value(values['name'])
                        page.unroute('**/api/registrations')
                        with page.expect_response('**/api/registrations') as response:
                            submit.click()
                        result = response.value.json()
                        assert response.value.status == 201, result
                        expect(page.locator('.registration-success')).to_be_visible()
                        item = result['item']
                        assert len(item['familyFiles']) == 1 and len(item['schoolFiles']) == 1
                        assert item['familyFiles'] != item['schoolFiles']
                        assert item['description'] == values['description'].strip()
                        saved = json.loads((Path(tmp) / 'data' / 'lighthouse.json').read_text())
                        assert any(row['id'] == item['id'] for row in saved['registrations'])
                        for url in item['files']:
                            assert (Path(tmp) / 'uploads' / Path(url).name).read_bytes() == PNG
                        page.screenshot(path=str(OUT / f'success-{width}.png'))
                        page.get_by_role('button', name='Quay lại màn hình Đăng nhập', exact=True).click()
                        expect(page.locator('.auth-login')).to_be_visible()
                        assert not errors, errors
                        page.close()
                finally:
                    browser.close()
        finally:
            proc.terminate()
            proc.wait(timeout=10)
    (OUT / 'results.json').write_text(json.dumps({'status': 'passed', 'viewports': ['1920x1080', '1366x768'],
        'checks': ['required fields', 'file type', 'server failure preserves input', 'real submission', 'separate uploads', 'saved data', 'return to login'],
        'pixel_diff': 'not_run'}, indent=2) + '\n')
    print('PASS: UC02 validation, retry, submission, grouped uploads, persistence and success navigation at both sizes')


if __name__ == '__main__':
    main()
