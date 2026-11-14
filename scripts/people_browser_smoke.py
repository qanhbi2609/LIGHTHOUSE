"""UC07/08 reference states, canonical identity, notices and scroll boundaries."""
import json
import os
from pathlib import Path
import subprocess
import tempfile
from playwright.sync_api import sync_playwright, expect
from browser_smoke import login, sidebar_layout
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'artifacts/uc07-08'

def main():
    OUT.mkdir(parents=True,exist_ok=True)
    results=[]
    with sync_playwright() as p:
        options={'headless':True,'ignore_default_args':['--hide-scrollbars']}
        if os.environ.get('CHROMIUM_PATH'): options['executable_path']=os.environ['CHROMIUM_PATH']
        browser=p.chromium.launch(**options)
        try:
            for width,height in [(1920,1080),(1366,768)]:
                with tempfile.TemporaryDirectory(prefix='lighthouse-people-browser-') as tmp:
                    env=dict(os.environ,LIGHTHOUSE_DEMO_DATASET='figma',LIGHTHOUSE_DATA_DIR=tmp+'/data',LIGHTHOUSE_UPLOADS_DIR=tmp+'/uploads',DEMO_ONLY='1')
                    code="const {server}=require('./server');server.listen(0,'127.0.0.1',()=>console.log('PORT='+server.address().port))"
                    proc=subprocess.Popen(['node','-e',code],cwd=ROOT/'backend',env=env,stdout=subprocess.PIPE,text=True)
                    try:
                        for line in proc.stdout:
                            if line.startswith('PORT='):port=int(line[5:].strip());break
                        page=browser.new_page(viewport={'width':width,'height':height});errors=[]
                        page.on('pageerror',lambda e:errors.append(str(e)))
                        page.goto(f'http://127.0.0.1:{port}',wait_until='networkidle');login(page,'quanly@lighthouse.test')
                        expect(page.locator('#toast')).not_to_be_visible();page.evaluate('document.fonts.ready')
                        dbfile=Path(tmp)/'data/figma-demo-v1.json'
                        def shot(name):
                            page.screenshot(path=str(OUT/f'{name}-{width}.png'));results.append(f'{name}-{width}.png')
                        def notice(text):expect(page.locator('.records-notice')).to_have_text(text)
                        def dismiss():page.locator('.records-notice-layer').click(position={'x':5,'y':5})
                        def scroll_contract(gap=0):
                            sidebar_layout(page);assert page.evaluate('document.documentElement.scrollHeight<=innerHeight')
                            scroll=page.locator('.records-data-scroll');head=page.locator('.records-columns').bounding_box();box=scroll.bounding_box()
                            assert abs(box['y']-head['y']-head['height']-gap)<1
                            anchors=[page.locator(s).bounding_box() for s in ['.sidebar','.topbar','.records-columns']]
                            assert scroll.evaluate('e=>e.scrollHeight>e.clientHeight')
                            scroll.hover();page.mouse.wheel(0,450);page.wait_for_timeout(200)
                            assert scroll.evaluate('e=>e.scrollTop>0');assert anchors==[page.locator(s).bounding_box() for s in ['.sidebar','.topbar','.records-columns']]
                            for th,td in zip(page.locator('.records-columns th').all(),scroll.locator('tr').first.locator('td').all()):assert abs(th.bounding_box()['x']-td.bounding_box()['x'])<1
                            scroll.evaluate('e=>e.scrollTop=0')
                        page.evaluate("L.go('alumni')");expect(page.locator('.alumni-data tbody tr')).to_have_count(20)
                        expect(page.locator('.alumni-list-heading')).to_contain_text('20 hồ sơ');scroll_contract();shot('01-alumni')
                        page.locator('#alumni-search input').fill('Trần Cẩm Tú');page.locator('#alumni-search button').click()
                        expect(page.locator('.alumni-data tbody tr')).to_have_count(1);expect(page.locator('.alumni-data tbody')).to_contain_text('LH034');shot('02-found')
                        page.locator('#alumni-search input').fill('unknown');page.locator('#alumni-search button').click();notice('Không tìm thấy dữ liệu!');shot('03-no-results-notice');dismiss();shot('04-empty')
                        page.locator('#alumni-search input').fill('lh034@example.test');page.locator('#alumni-search button').click();expect(page.locator('.alumni-data tbody tr')).to_have_count(1)
                        page.locator('[data-people-action=profile]').click();expect(page.locator('.student-profile-heading')).to_contain_text('Trần Cẩm Tú · LH034')
                        expect(page.locator('.student-info-grid')).to_contain_text('Trần Cẩm Tú');expect(page.locator('.student-info-grid')).not_to_contain_text('Mai Hồng Ngọc');expect(page.locator('.student-profile-actions')).not_to_contain_text('Sửa');shot('05-personal')
                        page.locator('[data-missing-proof]').first.click();notice('Chưa có tệp gốc cho giấy tờ này.');dismiss()
                        for key,number in [('grades',8),('goals',6),('supports',4)]:
                            page.locator(f'[data-tab={key}]').click();expect(page.locator('.profile-table-scroll tbody tr')).to_have_count(number);shot('06-'+key)
                            if key=='goals':
                                page.locator('[data-goal]').nth(1).click();expect(page.locator('.records-goal')).to_contain_text('Thành thạo Python');shot('07-goal-detail');page.locator('.records-goal [data-close]').click()
                            else:
                                page.locator('[data-preview]').first.click();expect(page.locator('.records-preview img')).to_be_visible();shot('08-'+key+'-proof');page.locator('.records-preview [data-close]').click()
                        page.locator('[data-tab=images]').click();expect(page.locator('.profile-photo')).to_have_count(11);expect(page.locator('.add-photo-button')).to_have_count(0);shot('09-images')
                        page.locator('.profile-photo').first.click();expect(page.locator('.records-preview img')).to_be_visible();shot('09-image-preview');page.locator('.records-preview [data-close]').click()
                        timeline=page.locator('.alumni-photo-timeline');assert timeline.evaluate('e=>e.scrollHeight>e.clientHeight')
                        anchors=[page.locator(s).bounding_box() for s in ['.student-profile-heading','.student-tabbar','.profile-image-tools']]
                        timeline.hover();page.mouse.wheel(0,400);page.wait_for_timeout(200);assert timeline.evaluate('e=>e.scrollTop>0');assert anchors==[page.locator(s).bounding_box() for s in ['.student-profile-heading','.student-tabbar','.profile-image-tools']]
                        page.locator('#photo-from').fill('2027-01');page.locator('#photo-to').fill('2026-01');expect(page.locator('.records-profile-scroll .records-error')).to_have_text('Khoảng thời gian không hợp lệ!');shot('10-image-date-error')
                        page.locator('[data-tab=personal]').click();page.locator('[data-action=back]').click();expect(page.locator('.alumni-data tbody')).to_contain_text('LH034')
                        page.evaluate("L.go('users')");expect(page.locator('.users-data tbody tr')).to_have_count(9)
                        # Add enough real accounts for a native scrollbar at both reference sizes.
                        page.evaluate("""async()=>{for(let i=0;i<6;i++)await fetch('/api/users',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+sessionStorage.getItem('lh_token')},body:JSON.stringify({name:'Scroll QA '+i,email:'scroll'+i+'@example.test',role:'CanBo',permissions:[]})});await L.render()}""")
                        expect(page.locator('.users-data tbody tr')).to_have_count(15);scroll_contract();shot('11-users')
                        page.locator('#people-search').fill('unknown');expect(page.locator('.users-data .records-empty')).to_be_visible();page.locator('#people-search').fill('')
                        before=dbfile.read_text();page.locator('[data-people-action=new]').click();expect(page.locator('.people-grants input')).to_have_count(14);shot('12-add')
                        page.locator('#people-form [type=submit]').click();notice('Họ tên và Email không được để trống!');shot('13-required-notice');dismiss();expect(page.locator('[data-error=name]')).to_have_text('Không bỏ trống thông tin');shot('14-invalid')
                        page.locator('[name=name]').fill('Người dùng thử');page.locator('[name=email]').fill('browser@example.test');page.locator('[name=role]').select_option('CanBo')
                        page.locator('#people-form [type=submit]').click();expect(page.locator('.records-confirm')).to_contain_text('Xác nhận lưu phân quyền?');shot('15-confirm-add')
                        page.locator('.records-confirm [data-close]').click();notice('Đã hủy thao tác!');assert dbfile.read_text()==before;shot('16-cancel-add');dismiss()
                        page.locator('[data-people-action=new]').click();page.locator('[name=name]').fill('Người dùng thử');page.locator('[name=email]').fill('browser@example.test');page.locator('[name=role]').select_option('CanBo')
                        page.locator('#people-form [type=submit]').click();page.locator('.confirm-ok').click();notice('Cập nhật thành công!');shot('17-added');dismiss()
                        new=next(u for u in json.loads(dbfile.read_text())['users'] if u['email']=='browser@example.test');uid=new['id']
                        page.locator(f'[data-people-action=edit][data-id={uid}]').click();shot('18-edit')
                        checks=page.locator('.people-grants input:not(:disabled)');checks.first.uncheck();before=dbfile.read_text()
                        page.locator('#people-form [type=submit]').click();shot('19-confirm-edit');page.locator('.records-confirm [data-close]').click();notice('Đã hủy thao tác!');assert before==dbfile.read_text();shot('20-cancel-edit');dismiss()
                        page.locator(f'[data-people-action=edit][data-id={uid}]').click();page.locator('.people-grants input[value="rooms.create"]').uncheck()
                        page.locator('#people-form [type=submit]').click();page.locator('.confirm-ok').click();notice('Cập nhật thành công!');shot('21-edited');dismiss()
                        page.locator(f'[data-people-action=delete][data-id={uid}]').click();shot('22-confirm-delete');before=dbfile.read_text();page.locator('.records-confirm [data-close]').click();notice('Đã hủy thao tác!');assert before==dbfile.read_text();shot('23-cancel-delete');dismiss()
                        page.locator(f'[data-people-action=delete][data-id={uid}]').click();page.locator('.confirm-ok').click();notice('Xóa thành công!');shot('24-deleted');dismiss();expect(page.locator(f'[data-id={uid}]')).to_have_count(0)
                        # Backend failure preserves the editor and entered values for retry.
                        page.locator('[data-people-action=new]').click();page.locator('[name=name]').fill('Giữ nội dung');page.locator('[name=email]').fill('retry@example.test');page.locator('[name=role]').select_option('QuanLy')
                        page.route('**/api/users',lambda route:route.fulfill(status=503,content_type='application/json',body='{"error":"Không thể lưu dữ liệu!"}') if route.request.method=='POST' else route.continue_())
                        page.locator('#people-form [type=submit]').click();page.locator('.confirm-ok').click();expect(page.locator('.records-confirm .records-error')).to_have_text('Không thể lưu dữ liệu!');expect(page.locator('[name=name]')).to_have_value('Giữ nội dung');shot('25-save-error')
                        page.locator('.records-confirm [data-close]').click();dismiss();page.unroute('**/api/users')
                        # Read-only users cannot see management actions.
                        page.evaluate("""async()=>{const login=await fetch('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'canbo@lighthouse.test',password:'Demo@123'})}).then(r=>r.json());await fetch('/api/users/ND002',{method:'PATCH',headers:{'Content-Type':'application/json',Authorization:'Bearer '+sessionStorage.getItem('lh_token')},body:JSON.stringify({permissions:['users.view','alumni.view']})});sessionStorage.setItem('lh_token',login.token);sessionStorage.setItem('lh_user',JSON.stringify((await fetch('/api/auth/me',{headers:{Authorization:'Bearer '+login.token}}).then(r=>r.json())).item));} """)
                        page.reload();page.evaluate("L.go('users')");expect(page.locator('.users-data tbody tr')).to_have_count(15);expect(page.locator('[data-people-action]')).to_have_count(0);sidebar_layout(page);shot('26-readonly')
                        assert not errors,errors;page.close()
                    finally:
                        proc.terminate();proc.wait(timeout=10)
        finally:browser.close()
    (OUT/'results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2))
    print(f'PASS UC07/08: {len(results)} screenshots, both viewports')
if __name__=='__main__':main()
