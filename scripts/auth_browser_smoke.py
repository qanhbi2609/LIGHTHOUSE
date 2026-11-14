"""Current UC01 contract: inline validation, authentication, session and removed recovery."""
import json,os,subprocess,tempfile
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'artifacts/uc01'
def main():
    OUT.mkdir(parents=True,exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='lighthouse-auth-browser-') as tmp:
        env=dict(os.environ,LIGHTHOUSE_DEMO_DATASET='workflow',LIGHTHOUSE_DATA_DIR=tmp+'/data',LIGHTHOUSE_UPLOADS_DIR=tmp+'/uploads',DEMO_ONLY='1')
        proc=subprocess.Popen(['node','-e',"const {server}=require('./server');server.listen(0,'127.0.0.1',()=>console.log(server.address().port))"],cwd=ROOT/'backend',env=env,stdout=subprocess.PIPE,text=True)
        try:
            for line in proc.stdout:
                if line.strip().isdigit():port=int(line);break
            with sync_playwright() as p:
                options={'headless':True}
                if os.environ.get('CHROMIUM_PATH'):options['executable_path']=os.environ['CHROMIUM_PATH']
                browser=p.chromium.launch(**options)
                try:
                    for width,height in [(1920,1080),(1366,768)]:
                        context=browser.new_context(viewport={'width':width,'height':height});page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
                        page.goto(f'http://127.0.0.1:{port}',wait_until='networkidle');page.evaluate('document.fonts.ready')
                        assert page.locator('.auth-brand').evaluate("e=>getComputedStyle(e).fontFamily").startswith('Ribeye')
                        assert 'auth-background.png' in page.locator('.auth-shell').evaluate('e=>getComputedStyle(e).backgroundImage')
                        expect(page.get_by_text('Quên mật khẩu?',exact=True)).to_have_count(0)
                        def shot(name):page.screenshot(path=str(OUT/f'{name}-{width}.png'))
                        def submit():page.locator('#login-form [type=submit]').click()
                        shot('01-login');requests=[];page.on('request',lambda r:requests.append(r.url) if '/api/auth/login' in r.url else None)
                        submit();expect(page.locator('#auth-login-error')).to_have_text('Vui lòng không để trống thông tin');assert not requests
                        page.locator('[name=email]').fill('quanly@lighthouse.test');submit();expect(page.locator('#auth-login-error')).to_have_text('Vui lòng không để trống thông tin');assert not requests;shot('02-required')
                        page.locator('[name=password]').fill('Wrong@123');page.locator('[name=email]').fill('bad');submit();expect(page.locator('#auth-login-error')).to_have_text('Email không hợp lệ');assert not requests
                        page.locator('[name=email]').fill('unknown@example.test');submit();expect(page.locator('#auth-login-error')).to_have_text('Email không hợp lệ');shot('03-email-error')
                        page.locator('[name=email]').fill('quanly@lighthouse.test');submit();expect(page.locator('#auth-login-error')).to_have_text('Email hoặc mật khẩu sai.');expect(page.locator('.lh-feedback')).to_have_count(0);shot('04-password-error')
                        page.locator('[name=password]').fill('Demo@123');page.locator('.auth-eye').click();expect(page.locator('[name=password]')).to_have_attribute('type','text');page.locator('.auth-eye').click();expect(page.locator('[name=password]')).to_have_attribute('type','password')
                        page.locator('[name=remember]').check();submit();expect(page.locator('.dashboard')).to_be_visible();assert page.evaluate("!!localStorage.getItem('lh_token')");page.reload();expect(page.locator('.dashboard')).to_be_visible();shot('05-authenticated')
                        for view in ['forgot','verify','reset','success']:
                            page.evaluate('(v)=>L.auth(v)',view);expect(page.locator('.auth-login')).to_be_visible();expect(page.locator('.auth-forgot,.auth-verify,.auth-reset')).to_have_count(0)
                        for route in ['forgot','verify','reset']:assert page.request.post(f'http://127.0.0.1:{port}/api/auth/{route}',data={'email':'quanly@lighthouse.test'}).status==410
                        assert not errors,errors;context.close()
                finally:browser.close()
        finally:proc.terminate();proc.wait(timeout=10)
    print('PASS UC01: required/email/password errors, eye, remember/reload and disabled recovery at both viewports')
if __name__=='__main__':main()
