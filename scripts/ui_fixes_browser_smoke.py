"""Cross-site fixes from the user's UI-error report, with isolated mutable data."""
import json,os,subprocess,tempfile
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
from browser_smoke import login,ready
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'artifacts/ui-fixes'
def main():
    OUT.mkdir(parents=True,exist_ok=True);shots=[]
    with sync_playwright() as p:
        options={'headless':True}
        if os.environ.get('CHROMIUM_PATH'):options['executable_path']=os.environ['CHROMIUM_PATH']
        browser=p.chromium.launch(**options)
        try:
            for width,height in [(1920,1080),(1366,768)]:
                with tempfile.TemporaryDirectory(prefix='lighthouse-ui-fixes-browser-') as tmp:
                    env=dict(os.environ,LIGHTHOUSE_DEMO_DATASET='figma',LIGHTHOUSE_DATA_DIR=tmp+'/data',LIGHTHOUSE_UPLOADS_DIR=tmp+'/uploads',DEMO_ONLY='1')
                    proc=subprocess.Popen(['node','-e',"const {server}=require('./server');server.listen(0,'127.0.0.1',()=>console.log('PORT='+server.address().port))"],cwd=ROOT/'backend',env=env,stdout=subprocess.PIPE,text=True)
                    try:
                        for line in proc.stdout:
                            if line.startswith('PORT='):port=int(line[5:]);break
                        datafile=Path(tmp)/'data/figma-demo-v1.json';page=browser.new_page(viewport={'width':width,'height':height});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
                        page.goto(f'http://127.0.0.1:{port}',wait_until='networkidle');login(page,'quanly@lighthouse.test')
                        def shot(name):
                            filename=f'{name}-{width}.png';page.screenshot(path=str(OUT/filename));shots.append(filename)
                        def go(screen):page.evaluate('(s)=>L.go(s)',screen);ready(page)
                        def silent():expect(page.locator('.lh-feedback,.records-notice-layer,.auth-notice-layer')).to_have_count(0)
                        def dismiss():page.locator('.lh-feedback button').click()
                        # Every searchable list supports Enter, empty state and immediate restore.
                        for screen,search,rows in [('registrations','#registration-search','.registration-data tbody tr'),('students','#student-search','.student-data tbody tr'),('users','#people-search','.users-data tbody tr'),('reports','#report-filter-query','.report-data tbody tr'),('goals','#assessment-search','.assessment-goals tbody tr'),('grades','#assessment-search','.assessment-grades tbody tr'),('alumni','#alumni-search input','.alumni-data tbody tr')]:
                            go(screen);count=page.locator(rows).count();assert count>0
                            page.locator(search).fill('no-match-unique');page.locator(search).press('Enter');expect(page.locator(rows)).to_have_count(0);silent();shot(screen+'-empty')
                            page.locator(search).fill('');expect(page.locator(rows)).to_have_count(count);silent()
                        go('rooms');page.locator('#room-student-input').fill('no-match-unique');page.locator('#room-student-input').press('Enter');expect(page.locator('.room-search-empty')).to_be_visible();silent();page.locator('#room-student-input').fill('');expect(page.locator('#room-search-result')).to_be_empty();expect(page.locator('.room-card')).to_have_count(4)
                        go('history');page.locator('#history-from').fill('2100-01-01');expect(page.locator('#history-from')).to_be_visible();page.locator('#history-to').fill('2100-01-31');expect(page.locator('.history-empty')).to_be_visible();silent();expect(page.locator('#history-from + .lh-date-display')).to_have_text('01/01/2100');page.locator('#history-from').fill('');page.locator('#history-to').fill('');expect(page.locator('#history-from')).to_be_visible()
                        # X never saves or creates a cancel message across all editable dialogs.
                        for screen,open_selector,dialog in [('users','[data-people-action=new]','.people-editor'),('rooms','#room-new','.room-picker'),('goals','[data-assessment-id]','.assessment-dialog'),('grades','[data-assessment-id]','.assessment-dialog')]:
                            go(screen);before=datafile.read_text();page.locator(open_selector).first.click();expect(page.locator(dialog)).to_be_visible();page.locator(dialog+' [data-close]').first.click();expect(page.locator(dialog)).to_have_count(0);silent();assert datafile.read_text()==before
                        # Existing incomplete registration can be corrected; note is status-bound.
                        go('registrations');page.locator('[data-action=review][data-id=HS001]').click();form=page.locator('#review-form');expect(page.locator('#review-note')).to_be_disabled();before=datafile.read_text()
                        form.locator('[type=submit]').click();expect(form.locator('[data-error=cccd]')).not_to_be_empty();assert datafile.read_text()==before
                        for key,value in [('cccd','001001000001'),('hometown','Đà Nẵng'),('address','Địa chỉ cập nhật')]:form.locator(f'[name={key}]').fill(value)
                        page.locator('#review-status').select_option('Chờ bổ sung');expect(page.locator('#review-note')).to_be_enabled();page.locator('#review-note').fill('Cần bổ sung minh chứng');form.locator('[type=submit]').click();expect(page.locator('.lh-feedback > span:nth-child(2)')).to_have_text('Gửi yêu cầu thành công!');shot('registration-saved');dismiss()
                        go('registrations');page.locator('[data-action=review][data-id=HS001]').click();expect(page.locator('[name=address]')).to_have_value('Địa chỉ cập nhật');page.locator('#review-status').select_option('Đạt yêu cầu');expect(page.locator('#review-note')).to_be_disabled();page.locator('.records-review [data-close]').click();silent()
                        # Profile DOB is a calendar, displays DD/MM/YYYY but submits ISO.
                        go('students');page.locator('#student-search').fill('LH001');page.locator('[data-action=detail]').click();expect(page.locator('[data-missing-proof]')).to_have_count(0);expect(page.locator('.profile-table-scroll [data-preview]')).to_have_count(1)
                        page.locator('[data-action=edit]').click();expect(page.locator('#edit-dob')).to_have_attribute('type','date');page.locator('#edit-dob').fill('2005-09-26');expect(page.locator('#edit-dob + .lh-date-display')).to_have_text('26/09/2005');page.locator('#edit-cancel').click();dismiss()
                        page.locator('[data-tab=supports]').click();page.locator('[data-action=add-support]').click();form=page.locator('#support-form');expect(form.locator('[name=type] option')).to_have_text(['Chọn loại hỗ trợ','Học phí','Phí sinh hoạt','Y tế','Chi phí khác']);before=datafile.read_text();form.locator('[type=submit]').click();expect(form.locator('[aria-invalid=true]')).to_have_count(4);assert datafile.read_text()==before
                        for key,value in [('name','Hỗ trợ kiểm thử'),('amount','0'),('date','2026-11-14')]:form.locator(f'[name={key}]').fill(value)
                        form.locator('[name=type]').select_option('Y tế');shot('support-valid');form.locator('[type=submit]').click();expect(page.locator('.lh-feedback > span:nth-child(2)')).to_have_text('Cập nhật thành công!');dismiss();expect(page.locator('.profile-table-scroll')).to_contain_text('Hỗ trợ kiểm thử')
                        # Account creation starts with no grants. Password remains masked on edit.
                        go('users');page.locator('[data-people-action=new]').click();form=page.locator('#people-form');expect(form.locator('input[type=checkbox]:checked')).to_have_count(0);form.locator('[name=name]').fill('Tài khoản UI');form.locator('[name=email]').fill('ui@example.test');form.locator('[name=role]').select_option('CanBo');expect(form.locator('input[value="users.manage"]')).to_be_disabled();form.locator('[type=submit]').click();expect(form.locator('[data-error=password]')).not_to_be_empty();form.locator('[name=password]').fill('2609');expect(form.locator('[name=password]')).to_have_attribute('type','password');form.locator('input[value="rooms.view"]').check();shot('user-create');form.locator('[type=submit]').click();page.locator('.confirm-ok').click();expect(page.locator('.lh-feedback > span:nth-child(2)')).to_have_text('Cập nhật thành công!');dismiss()
                        row=next(u for u in json.loads(datafile.read_text())['users'] if u['email']=='ui@example.test');assert 'password' not in row
                        page.locator(f'[data-people-action=edit][data-id={row["id"]}]').click();form=page.locator('#people-form');expect(form.locator('[name=id]')).to_have_attribute('readonly','');expect(form.locator('[name=email]')).to_be_editable();expect(form.locator('[name=name]')).to_be_editable();expect(form.locator('[name=password]')).to_have_value('');expect(form.locator('input[value="rooms.view"]')).to_be_checked();form.locator('[name=email]').fill('ui-edited@example.test');form.locator('[name=password]').fill('2710');form.locator('[type=submit]').click();page.locator('.confirm-ok').click();expect(page.locator('.lh-feedback > span:nth-child(2)')).to_have_text('Cập nhật thành công!');dismiss();go('users');expect(page.locator('.users-data')).to_contain_text('ui-edited@example.test')
                        # Ending support retains the same profile and appears in alumni after navigation.
                        go('students');page.locator('#student-search').fill('LH002');expect(page.locator('.student-data [data-action=edit]')).to_have_count(0);page.locator('[data-student-status=LH002]').select_option('Rời trước thời hạn');page.locator('.confirm-ok').click();expect(page.locator('.lh-feedback > span:nth-child(2)')).to_have_text('Cập nhật thành công!');dismiss();go('alumni');page.locator('#alumni-search input').fill('LH002');page.locator('#alumni-search input').press('Enter');expect(page.locator('.alumni-data tbody')).to_contain_text('Rời trước thời hạn');assert any(s['id']=='LH002' for s in json.loads(datafile.read_text())['students'])
                        go('reports');expect(page.locator('#report-filter-type option')).to_have_text(['Loại báo cáo','Báo cáo tháng','Báo cáo quý','Báo cáo 6 tháng','Báo cáo năm','Báo cáo 5 năm']);page.locator('[data-report-action=detail]').first.click();expect(page.get_by_text('Xem trước PDF',exact=True)).to_have_count(0);expect(page.locator('[data-report-action=back]')).to_be_visible();shot('report-detail')
                        page.get_by_text('Đăng xuất',exact=True).click();login(page,'giamdoc@lighthouse.test');expect(page.locator('.sidebar .navitem')).to_have_count(5);expect(page.locator('.sidebar')).not_to_contain_text('Tiếp nhận hồ sơ');expect(page.locator('.sidebar')).not_to_contain_text('Mục tiêu & Kết quả');go('users');page.locator('[data-people-action=new]').click();page.locator('[name=role]').select_option('GiamDoc');expect(page.locator('.people-grants input[value="rooms.view"]')).to_be_disabled();expect(page.locator('.people-grants input[value="history.view"]')).to_be_enabled();shot('director-grants');page.locator('.people-editor [data-close]').click();silent();assert not errors,errors;page.close()
                    finally:proc.terminate();proc.wait(timeout=10)
        finally:browser.close()
    (OUT/'results.json').write_text(json.dumps({'status':'passed','screenshots':shots,'viewports':['1920x1080','1366x768']},ensure_ascii=False,indent=2))
    print('PASS UI fixes: all search/restore, silent X, required forms, ISO dates, passwords/grants, status, reports and navigation')
if __name__=='__main__':main()
