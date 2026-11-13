"""UC05/UC06 reference states, real scroll boundaries and UC04 image notices."""
import json
import os
from pathlib import Path
import subprocess
import tempfile
from playwright.sync_api import sync_playwright, expect
from browser_smoke import login, sidebar_layout

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT/'artifacts/uc05-06'


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    shots = []
    with sync_playwright() as p:
        options = {'headless': True, 'ignore_default_args':['--hide-scrollbars']}
        if os.environ.get('CHROMIUM_PATH'):
            options['executable_path'] = os.environ['CHROMIUM_PATH']
        browser = p.chromium.launch(**options)
        try:
            for width, height in [(1920,1080),(1366,768)]:
                with tempfile.TemporaryDirectory(prefix='lighthouse-management-browser-') as tmp:
                    env = dict(os.environ,LIGHTHOUSE_DEMO_DATASET='figma',LIGHTHOUSE_DATA_DIR=tmp+'/data',LIGHTHOUSE_UPLOADS_DIR=tmp+'/uploads',DEMO_ONLY='1')
                    code="const {server}=require('./server');server.listen(0,'127.0.0.1',()=>console.log('PORT='+server.address().port))"
                    proc=subprocess.Popen(['node','-e',code],cwd=ROOT/'backend',env=env,stdout=subprocess.PIPE,text=True)
                    try:
                        for line in proc.stdout:
                            if line.startswith('PORT='):
                                port=int(line[5:].strip())
                                break
                        page=browser.new_page(viewport={'width':width,'height':height})
                        errors=[]
                        page.on('pageerror',lambda e:errors.append(str(e)))
                        page.goto(f'http://127.0.0.1:{port}',wait_until='networkidle')
                        login(page,'quanly@lighthouse.test')
                        expect(page.locator('#toast')).not_to_be_visible()
                        page.evaluate('document.fonts.ready')
                        dbfile=Path(tmp)/'data/figma-demo-v1.json'

                        def shot(name):
                            page.screenshot(path=str(OUT/f'{name}-{width}.png'))
                            shots.append(f'{name}-{width}.png')

                        def notice(text):
                            expect(page.locator('.records-notice')).to_have_text(text)

                        def dismiss():
                            page.locator('.records-notice-layer').click(position={'x':5,'y':5})

                        def room(id,action):
                            page.locator(f'[data-room="{id}"] [data-room-action="{action}"]').click()

                        def data_scroll():
                            sidebar_layout(page)
                            assert page.evaluate('document.documentElement.scrollHeight<=innerHeight')
                            scroll=page.locator('.records-data-scroll')
                            head=page.locator('.records-columns').bounding_box()
                            box=scroll.bounding_box()
                            assert abs(box['y']-head['y']-head['height'])<1
                            assert scroll.evaluate('e=>e.scrollHeight>e.clientHeight')
                            anchors=[page.locator(s).bounding_box() for s in ['.sidebar','.topbar','.assessment-stats','.assessment-filters','.records-columns']]
                            scroll.hover();page.mouse.wheel(0,500);page.wait_for_timeout(250)
                            assert scroll.evaluate('e=>e.scrollTop')>0
                            assert anchors==[page.locator(s).bounding_box() for s in ['.sidebar','.topbar','.assessment-stats','.assessment-filters','.records-columns']]
                            assert page.evaluate('window.scrollY')==0
                            scroll.evaluate('e=>e.scrollTop=0')

                        page.evaluate("L.go('rooms')")
                        expect(page.locator('.room-card')).to_have_count(4)
                        sidebar_layout(page)
                        expect(page.locator('[data-room=A102] .room-capacity')).to_have_text('6/6 sinh viên')
                        shot('15-rooms')
                        page.locator('#room-student-input').fill('LH001')
                        page.locator('#room-search-form [type=submit]').click()
                        expect(page.locator('.room-search-match')).to_contain_text('3/6 · Còn chỗ: 3')
                        shot('16-room-search')
                        page.locator('#room-student-input').fill('missing')
                        page.locator('#room-search-form [type=submit]').click()
                        notice('Không tìm thấy thông tin.')
                        dismiss();expect(page.locator('.room-search-empty')).to_have_text('Chưa có dữ liệu.')
                        shot('17-room-empty')
                        page.locator('#room-student-input').fill('LH004')
                        page.locator('#room-search-form [type=submit]').click()
                        expect(page.locator('.room-search-match')).to_contain_text('Chưa được bố trí phòng ở')
                        page.evaluate("L.go('rooms')")
                        room('A101','detail')
                        expect(page.locator('.rooms-detail-summary')).to_contain_text('Còn chỗ3')
                        shot('18-room-detail')
                        page.locator('.rooms-detail [data-close]').click()
                        room('A101','edit')
                        picker=page.locator('.room-picker')
                        expect(picker.locator('input:checked')).to_have_count(3)
                        footer=picker.locator('footer').bounding_box()
                        picker.locator('.room-picker-list').evaluate('e=>e.scrollTop=300')
                        assert footer==picker.locator('footer').bounding_box()
                        picker.locator('#room-picker-search').fill('LH010')
                        picker.locator('input[type=checkbox]').check()
                        picker.locator('#room-picker-search').fill('')
                        expect(picker.locator('input:checked')).to_have_count(4)
                        shot('19-room-edit')
                        picker.locator('[type=submit]').click();notice('Cập nhật thành công!');shot('20-room-saved');dismiss()
                        assert next(s for s in json.loads(dbfile.read_text())['students'] if s['id']=='LH010')['room']=='A101'
                        room('A101','edit')
                        before=dbfile.read_text()
                        for id in ['LH003','LH004']:
                            picker.locator(f'input[value={id}]').check()
                        expect(picker.locator('input:checked')).to_have_count(6)
                        assert picker.locator('input:disabled').count()>0
                        blocked=picker.locator('.room-pick-row').filter(has=page.locator('input:disabled')).first
                        blocked.scroll_into_view_if_needed()
                        bounds=blocked.bounding_box()
                        page.mouse.click(bounds['x']+80,bounds['y']+12)
                        notice('Phòng đầy!');shot('21-room-full');dismiss()
                        picker.locator('input:checked').first.uncheck()
                        expect(picker.locator('input:disabled')).to_have_count(0)
                        picker.locator('[data-close]').click();notice('Đã hủy thao tác!');dismiss()
                        assert dbfile.read_text()==before
                        page.locator('#room-new').click()
                        picker.locator('[type=submit]').click()
                        notice('Thông tin không hợp lệ!')
                        expect(picker.locator('#new-room-id-error')).to_have_text('Thông tin không hợp lệ!')
                        shot('22-room-invalid');dismiss()
                        picker.locator('[name=id]').fill('A105')
                        expect(picker.locator('[name=capacity]')).to_have_value('6')
                        expect(picker.locator('[name=capacity]')).to_have_attribute('readonly','')
                        for id in ['LH001','LH002']:
                            picker.locator(f'input[value={id}]').check()
                        shot('24-room-new')
                        picker.locator('[type=submit]').click();notice('Tạo mới thành công!');shot('23-room-created');dismiss()
                        room('A104','delete');shot('27-room-delete-confirm');before=dbfile.read_text()
                        page.locator('.records-confirm [data-close]').click();notice('Đã hủy thao tác!');shot('26-room-delete-cancel');dismiss()
                        assert dbfile.read_text()==before
                        room('A104','delete');page.locator('.confirm-ok').click();notice('Xoá phòng thành công!');shot('25-room-deleted');dismiss()
                        saved=json.loads(dbfile.read_text())
                        assert not any(r['id']=='A104' for r in saved['rooms'])
                        assert not any(s['room']=='A104' for s in saved['students'])

                        page.evaluate("L.go('goals')")
                        expect(page.locator('.assessment-stats span')).to_have_text(['20','18'])
                        data_scroll();shot('02-goal-list')
                        page.locator('#assessment-search').fill('Python')
                        page.locator('#assessment-status').select_option('Chờ đánh giá')
                        expect(page.locator('.records-data-scroll tbody tr')).to_have_count(1)
                        page.locator('#assessment-from').fill('2027-01-01')
                        page.locator('#assessment-to').fill('2026-01-01')
                        expect(page.locator('#assessment-filter-error')).to_have_text('Khoảng thời gian không hợp lệ!')
                        page.locator('#assessment-from').fill('');page.locator('#assessment-to').fill('')
                        page.locator('[data-assessment-id]').click();expect(page.locator('.goal-assessment')).to_be_visible();shot('05-goal-detail')
                        expect(page.locator('.assessment-dialog')).to_contain_text('01/07/2026–31/12/2026')
                        before=dbfile.read_text();page.locator('#save-goal-review').click();shot('06-goal-confirm')
                        page.locator('.records-confirm [data-close]').click();notice('Đã hủy thao tác!');shot('03-goal-cancel');dismiss()
                        assert dbfile.read_text()==before
                        page.locator('[data-assessment-id]').click()
                        page.locator('[name=assessment-rating][value="Chưa đạt"]').check()
                        page.locator('#save-goal-review').click();page.locator('.confirm-ok').click()
                        notice('Cập nhật thành công!');shot('04-goal-saved');dismiss()
                        expect(page.locator('.assessment-stats span').first).to_have_text('19')

                        page.locator('[data-kind=grades]').click()
                        expect(page.locator('.assessment-stats span')).to_have_text(['19','18'])
                        data_scroll();shot('07-grade-list')
                        page.locator('#assessment-search').fill('LH001')
                        page.locator('#assessment-status').select_option('Chờ xét duyệt')
                        expect(page.locator('[data-assessment-id]')).to_have_count(1)
                        page.locator('[data-assessment-id]').click();expect(page.locator('.grade-assessment')).to_be_visible();shot('13-grade-detail')
                        page.locator('#grade-proof').click()
                        expect(page.locator('.records-preview-crop img')).to_have_js_property('naturalWidth',1920)
                        shot('11-grade-proof');page.get_by_role('button',name='Đóng minh chứng',exact=True).click()
                        page.locator('#grade-approve').click();shot('12-grade-confirm');before=dbfile.read_text()
                        page.locator('.records-confirm [data-close]').click();notice('Đã hủy thao tác!');shot('08-grade-cancel');dismiss()
                        assert dbfile.read_text()==before
                        page.locator('[data-assessment-id]').click();page.locator('#grade-request').click()
                        expect(page.locator('#grade-note-error')).to_have_text('Vui lòng nhập nội dung yêu cầu bổ sung.')
                        page.locator('#grade-request-note').fill('Bổ sung minh chứng bảng điểm')
                        page.locator('#grade-request').click();notice('Gửi yêu cầu thành công!');shot('10-grade-returned');dismiss()
                        expect(page.locator('.assessment-stats span').last).to_have_text('17')
                        page.locator('#assessment-status').select_option('Yêu cầu gửi lại')
                        page.locator('[data-assessment-id]').click();page.locator('#grade-approve').click();page.locator('.confirm-ok').click()
                        notice('Cập nhật thành công!');shot('09-grade-approved');dismiss()
                        # UC04: timeline controls, precise format notice, upload and cancel/delete.
                        page.evaluate("L.go('students')")
                        page.locator('#student-search').fill('LH001');page.locator('[data-action=detail]').click()
                        page.locator('[data-tab=images]').click()
                        page.locator('#profile-upload').set_input_files(dict(name='bad.txt',mimeType='text/plain',buffer=b'bad'))
                        notice('Định dạng không phù hợp!');shot('uc04-image-format');dismiss()
                        page.locator('#profile-upload').set_input_files(str(ROOT/'frontend/assets/auth-logo.png'))
                        expect(page.locator('.profile-photo img')).to_have_count(1)
                        if page.locator('.records-notice-layer').count():dismiss()
                        expect(page.locator('.records-profile-scroll h4')).to_contain_text('/')
                        page.locator('#photo-from').fill('2099-01')
                        expect(page.locator('.profile-photo')).to_have_count(0)
                        page.locator('#photo-to').fill('2000-01')
                        expect(page.locator('.records-profile-scroll .records-error')).to_have_text('Khoảng thời gian không hợp lệ!')
                        page.locator('#photo-from').fill('');page.locator('#photo-to').fill('')
                        page.locator('[data-action=delete-image]').click();page.locator('.confirm-ok').click()
                        notice('Đã xóa ảnh!');dismiss();expect(page.locator('.profile-photo')).to_have_count(0)
                        # Read permissions expose detail views, without mutation controls.
                        page.get_by_text('Đăng xuất',exact=True).click();login(page,'canbo@lighthouse.test')
                        expect(page.locator('#toast')).not_to_be_visible()
                        page.evaluate("L.go('rooms')");expect(page.locator('.room-card')).to_have_count(4)
                        expect(page.locator('#room-new')).to_have_count(0)
                        expect(page.locator('[data-room-action=edit]')).to_have_count(0)
                        page.evaluate("L.go('goals')")
                        page.locator('#assessment-search').fill('');page.locator('#assessment-status').select_option('')
                        page.locator('[data-assessment-id]').first.click()
                        expect(page.locator('.goal-assessment')).to_be_visible()
                        expect(page.locator('#save-goal-review')).to_have_count(0)
                        expect(page.locator('[name=assessment-rating]')).to_have_count(0)
                        page.locator('.goal-assessment .assessment-close').click()
                        page.evaluate("L.go('grades')")
                        page.locator('#assessment-search').fill('');page.locator('#assessment-status').select_option('')
                        page.locator('[data-assessment-id]').first.click()
                        expect(page.locator('.grade-assessment')).to_be_visible()
                        expect(page.locator('#grade-approve,#grade-request')).to_have_count(0)
                        assert not errors,errors
                        page.close()
                    finally:
                        proc.terminate();proc.wait(timeout=10)
        finally:
            browser.close()
    (OUT/'results.json').write_text(json.dumps({'status':'passed','screenshots':shots,'viewports':['1920x1080','1366x768'],
        'checks':['data-only scroll','picker-only scroll','fixed sidebar','room capacity six','atomic room creation with residents','search/no room/not found',
                  'goal evaluation','grade return and approval','cancel without writes','date/status/name filters','UC04 timeline and image notices']},indent=2)+'\n')
    print('PASS: UC05/UC06 states, notifications, scroll boundaries and UC04 timeline at both viewports')


if __name__=='__main__':main()
