"""Round-two regression: reset/navigation, pending workflow, multiple private proofs and Vietnam time."""
import json,os,subprocess,tempfile
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
from browser_smoke import login,ready
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'artifacts/round2'
def main():
    OUT.mkdir(parents=True,exist_ok=True);shots=[]
    with sync_playwright() as p:
        options={'headless':True}
        if os.environ.get('CHROMIUM_PATH'):options['executable_path']=os.environ['CHROMIUM_PATH']
        browser=p.chromium.launch(**options)
        try:
            for width,height in [(1920,1080),(1366,768)]:
                with tempfile.TemporaryDirectory(prefix='lighthouse-round2-browser-') as tmp:
                    env=dict(os.environ,LIGHTHOUSE_DEMO_DATASET='figma',LIGHTHOUSE_DATA_DIR=tmp+'/data',LIGHTHOUSE_UPLOADS_DIR=tmp+'/uploads',DEMO_ONLY='1')
                    proc=subprocess.Popen(['node','-e',"const {server}=require('./server');server.listen(0,'127.0.0.1',()=>console.log('PORT='+server.address().port))"],cwd=ROOT/'backend',env=env,stdout=subprocess.PIPE,text=True)
                    try:
                        for line in proc.stdout:
                            if line.startswith('PORT='):port=int(line[5:]);break
                        base=f'http://127.0.0.1:{port}';dbfile=Path(tmp)/'data/figma-demo-v1.json';page=browser.new_page(viewport={'width':width,'height':height});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
                        page.goto(base,wait_until='networkidle');login(page,'quanly@lighthouse.test')
                        def go(screen):page.evaluate('(s)=>L.go(s)',screen);ready(page)
                        def shot(name):
                            filename=f'{name}-{width}.png';page.screenshot(path=str(OUT/filename));shots.append(filename)
                        def dismiss():
                            if page.locator('.lh-feedback button').count():page.locator('.lh-feedback button').click()
                        png=dict(name='auth-logo.png',mimeType='image/png',buffer=(ROOT/'frontend/assets/auth-logo.png').read_bytes());pdf=dict(name='bang-diem.pdf',mimeType='application/pdf',buffer=b'%PDF-1.4\n%%EOF')
                        # Sidebar resets query and date filters, refetches current rows.
                        for screen,selector in [('registrations','#registration-search'),('students','#student-search'),('users','#people-search'),('reports','#report-filter-query'),('goals','#assessment-search'),('grades','#assessment-search'),('alumni','#alumni-search input'),('rooms','#room-student-input')]:
                            go(screen);search=page.locator(selector);expect(search).to_have_attribute('placeholder','Nhập thông tin để tìm kiếm');search.fill('missing-filter');search.press('Enter');go('history');go(screen);expect(page.locator(selector)).to_have_value('');expect(page.get_by_role('button',name='Tìm',exact=True)).to_have_count(0)
                        go('goals');page.locator('#assessment-from').fill('2100-01-01');go('students');go('goals');expect(page.locator('#assessment-from')).to_have_value('');shot('01-default-lists')
                        # Supplemental registration proofs are attached to this exact registration.
                        go('registrations');page.locator('[data-action=review][data-id=HS001]').click();expect(page.locator('#review-add-files')).to_have_attribute('multiple','');page.locator('#review-add-files').set_input_files([png,pdf]);expect(page.locator('.lh-feedback > span:nth-child(2)')).to_have_text('Tải tệp thành công!');dismiss();shot('02-supplement-files');page.locator('.records-review [data-close]').click()
                        saved=json.loads(dbfile.read_text());assert len(next(r for r in saved['registrations'] if r['id']=='HS001')['documents'])==2
                        # Every profile tab has the same Back action.
                        go('students');page.locator('#student-search').fill('LH001');page.locator('[data-action=detail]').click()
                        for tab in ['personal','grades','goals','supports','images']:
                            page.locator(f'[data-tab={tab}]').click();expect(page.locator('[data-action=back]')).to_be_visible()
                        page.locator('[data-tab=supports]').click();page.locator('[data-action=add-support]').click();form=page.locator('#support-form')
                        for field,value in [('name','Hỗ trợ nhiều tệp'),('amount','1200000'),('date','2026-11-15')]:form.locator(f'[name={field}]').fill(value)
                        form.locator('[name=type]').select_option('Học phí');form.locator('[type=submit]').click();expect(form.locator('.records-error[role=alert]')).to_have_text('Vui lòng tải lên minh chứng bắt buộc');form.locator('[type=file]').set_input_files([png,pdf]);form.locator('[type=submit]').click();expect(page.locator('.lh-feedback > span:nth-child(2)')).to_have_text('Cập nhật thành công!');dismiss()
                        row=page.locator('.profile-table-scroll tbody tr').filter(has_text='Hỗ trợ nhiều tệp');expect(row.locator('[data-file-preview]')).to_have_count(2);row.locator('[data-file-preview]').first.click();close=page.locator('.records-preview [data-close]');box=close.bounding_box();assert box['width']<=32 and box['height']<=32;shot('03-proof-preview');close.click()
                        with page.expect_download() as download:row.locator('a[download]').nth(1).click()
                        target=OUT/f'invoice-{width}.pdf';download.value.save_as(target);assert target.read_bytes().startswith(b'%PDF-');shot('04-profile-files')
                        # Newest grade is pending, hides on request, returns on resubmit and moves to profile on approval.
                        page.get_by_text('Đăng xuất',exact=True).click();login(page,'sinhvien@lighthouse.test');go('grades');form=page.locator('#student-grade-form')
                        for field,value in [('term','II'),('year','2026-2027'),('gpa','3.8'),('rank','Giỏi'),('debts','0')]:form.locator(f'[name={field}]').fill(value)
                        form.locator('[type=file]').set_input_files([png,pdf]);form.locator('[type=submit]').click();expect(page.locator('.lh-feedback > span:nth-child(2)')).to_have_text('Gửi thành công!');dismiss();grade=json.loads(dbfile.read_text())['grades'][-1];gid=grade['id'];assert len(grade['evidenceFiles'])==2
                        page.get_by_text('Đăng xuất',exact=True).click();login(page,'quanly@lighthouse.test');go('grades');expect(page.locator('[data-assessment-id]').first).to_have_attribute('data-assessment-id',gid);page.locator(f'[data-assessment-id={gid}]').click();page.locator('#grade-request-note').fill('Bổ sung thêm minh chứng');page.locator('#grade-request').click();expect(page.locator('.lh-feedback > span:nth-child(2)')).to_have_text('Gửi yêu cầu thành công!');dismiss();expect(page.locator(f'[data-assessment-id={gid}]')).to_have_count(0);shot('05-request-hidden')
                        page.get_by_text('Đăng xuất',exact=True).click();login(page,'sinhvien@lighthouse.test');go('grades');page.locator(f'[data-grade-view={gid}]').click();form=page.locator('#student-grade-resubmit');expect(form.locator('.proof-file')).to_have_count(2);form.locator('[type=file]').set_input_files(png);form.locator('[type=submit]').click();expect(page.locator('.lh-feedback > span:nth-child(2)')).to_have_text('Gửi thành công!');dismiss()
                        page.get_by_text('Đăng xuất',exact=True).click();login(page,'quanly@lighthouse.test');go('grades');page.locator(f'[data-assessment-id={gid}]').click();expect(page.locator('.proof-file')).to_have_count(3);page.locator('#grade-approve').click();page.locator('.confirm-ok').click();expect(page.locator('.lh-feedback > span:nth-child(2)')).to_have_text('Cập nhật thành công!');dismiss();expect(page.locator(f'[data-assessment-id={gid}]')).to_have_count(0)
                        go('students');page.locator('#student-search').fill('LH001');page.locator('[data-action=detail]').click();page.locator('[data-tab=grades]').click();expect(page.locator('th').filter(has_text='CHỨNG CHỈ')).to_be_visible();expect(page.locator('.profile-table-scroll tbody tr').last.locator('.proof-file')).to_have_count(3);shot('06-reviewed-profile')
                        # Vietnam clock and live refresh without sidebar reload.
                        go('history');page.evaluate("""async()=>{await fetch('/api/users',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+sessionStorage.getItem('lh_token')},body:JSON.stringify({name:'Live history',email:'live@example.test',role:'CanBo',permissions:['rooms.view'],password:'2609'})})}""");expect(page.locator('#history-results')).to_contain_text('Thêm người dùng',timeout=8000);shot('07-live-history')
                        page.get_by_text('Đăng xuất',exact=True).click();login(page,'giamdoc@lighthouse.test');expect(page.locator('.sidebar .navitem')).to_have_count(3);go('reports');expect(page.locator('[data-report-action=new],[data-report-action=preview],[data-report-action=download]')).to_have_count(0);shot('08-director-readonly');assert not errors,errors;page.close()
                    finally:proc.terminate();proc.wait(timeout=10)
        finally:browser.close()
    (OUT/'results.json').write_text(json.dumps({'status':'passed','screenshots':shots,'viewports':['1920x1080','1366x768']},ensure_ascii=False,indent=2))
    print('PASS round2: navigation reset, required multi-file proofs, secure download, pending/resubmit/profile, live history and director scope')
if __name__=='__main__':main()
