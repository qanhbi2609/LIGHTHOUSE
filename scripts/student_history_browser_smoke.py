"""UC10/11 reference flows, student privacy, and cross-UC review/history, isolated data."""
import json,os,subprocess,tempfile
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
from browser_smoke import login,ready,sidebar_layout
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'artifacts/uc10-11'

def main():
    OUT.mkdir(parents=True,exist_ok=True);shots=[]
    with sync_playwright() as p:
        options={'headless':True,'ignore_default_args':['--hide-scrollbars']}
        if os.environ.get('CHROMIUM_PATH'):options['executable_path']=os.environ['CHROMIUM_PATH']
        browser=p.chromium.launch(**options)
        try:
            for width,height in [(1920,1080),(1366,768)]:
                with tempfile.TemporaryDirectory(prefix='lighthouse-student-browser-') as tmp:
                    env=dict(os.environ,LIGHTHOUSE_DEMO_DATASET='figma',LIGHTHOUSE_DATA_DIR=tmp+'/data',LIGHTHOUSE_UPLOADS_DIR=tmp+'/uploads',DEMO_ONLY='1')
                    subprocess.run(['node','seed.js'],cwd=ROOT/'backend',env=env,check=True,stdout=subprocess.DEVNULL)
                    dbfile=Path(tmp)/'data/figma-demo-v1.json';db=json.loads(dbfile.read_text())
                    for day in [5,4,3]:
                        for i in range(6):db['history'].append({'id':f'QA{day}{i}','time':f'2026-11-0{day}T{23-i:02}:30:00Z','actor':'Người kiểm thử','userId':'ND001','subject':f'QA-{i}','action':'Thao tác kiểm thử'})
                    next(g for g in db['grades'] if g['id']=='KQ101').update(status='Yêu cầu gửi lại',requestNote='Bổ sung chứng chỉ và bảng điểm rõ hơn')
                    second=dict(next(u for u in db['users'] if u['id']=='ND003'),id='STUDENT-QA',email='student2@example.test',studentId='LH002');db['users'].append(second);dbfile.write_text(json.dumps(db))
                    proc=subprocess.Popen(['node','-e',"const {server}=require('./server');server.listen(0,'127.0.0.1',()=>console.log('PORT='+server.address().port))"],cwd=ROOT/'backend',env=env,stdout=subprocess.PIPE,text=True)
                    try:
                        for line in proc.stdout:
                            if line.startswith('PORT='):port=int(line[5:]);break
                        page=browser.new_page(viewport={'width':width,'height':height});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
                        page.goto(f'http://127.0.0.1:{port}',wait_until='networkidle');login(page,'quanly@lighthouse.test');expect(page.locator('#toast')).not_to_be_visible()
                        def shot(name):
                            fn=f'{name}-{width}.png';page.screenshot(path=str(OUT/fn));shots.append(fn)
                        def dismiss():page.locator('.lh-feedback button').click()
                        def notice(text):expect(page.locator('.lh-feedback > span:nth-child(2)')).to_have_text(text)
                        def switch(email):
                            page.get_by_text('Đăng xuất',exact=True).click();login(page,email);expect(page.locator('#toast')).not_to_be_visible()
                        page.evaluate("L.go('history')");expect(page.locator('.history-workspace')).to_be_visible();sidebar_layout(page)
                        scroll=page.locator('#history-results');assert scroll.evaluate('e=>e.scrollHeight>e.clientHeight')
                        anchors=[page.locator(s).bounding_box() for s in ['.sidebar','.topbar','.history-filter','.history-table-heading']]
                        scroll.hover();page.mouse.wheel(0,500);page.wait_for_timeout(200);assert scroll.evaluate('e=>e.scrollTop')>0;assert anchors==[page.locator(s).bounding_box() for s in ['.sidebar','.topbar','.history-filter','.history-table-heading']];assert page.evaluate('window.scrollY')==0;scroll.evaluate('e=>e.scrollTop=0');shot('01-history')
                        before=dbfile.read_text();page.locator('#history-from').fill('2026-11-05');page.locator('#history-to').fill('2026-11-05');expect(page.locator('.history-day')).to_have_count(1);expect(page.locator('.history-row')).to_have_count(6);shot('02-history-filtered')
                        page.locator('#history-from').fill('2026-11-06');expect(page.locator('#history-filter-error')).to_have_text('Khoảng thời gian không hợp lệ!');expect(page.locator('.history-row')).to_have_count(6);shot('03-history-invalid')
                        page.locator('#history-from').fill('2100-01-01');expect(page.locator('#history-filter-error')).to_have_text('Khoảng thời gian không hợp lệ!');page.locator('#history-to').fill('2100-01-31');expect(page.locator('.history-empty')).to_be_visible();expect(page.locator('.lh-feedback')).to_have_count(0);shot('04-history-empty');assert dbfile.read_text()==before
                        switch('sinhvien@lighthouse.test');expect(page.locator('.student-goals')).to_be_visible();expect(page.locator('.sidebar .navitem.active')).to_have_count(1);expect(page.locator('.topbar .usertext b')).to_contain_text('Mai Hồng Ngọc');shot('05-goals')
                        before=dbfile.read_text();page.locator('#student-goal-new').click();expect(page.locator('.student-goal-dialog')).to_be_visible();page.locator('#student-goal-form [type=submit]').click();expect(page.locator('[data-error=name]')).to_have_text('Vui lòng nhập đầy đủ các mục tiêu trước khi gửi!');shot('06-goal-errors')
                        page.locator('.student-goal-dialog [data-close]').click();expect(page.locator('.lh-feedback')).to_have_count(0);assert dbfile.read_text()==before
                        page.locator('#student-goal-new').click();name=f'Mục tiêu kiểm thử {width}';detail=('Việc cần làm:\n• Học 30 từ vựng mỗi ngày.\n'+('• Hoàn thành kế hoạch phát triển cá nhân.\n'*20)).strip()
                        page.locator('#student-goal-name').fill(name);page.locator('#student-goal-detail').fill(detail);shot('07-goal-create')
                        page.route('**/api/goals',lambda r:r.fulfill(status=503,json={'error':'Không gửi được mục tiêu!'}),times=1)
                        page.locator('#student-goal-form [type=submit]').click();expect(page.locator('#student-goal-error')).to_have_text('Không gửi được mục tiêu!');expect(page.locator('#student-goal-detail')).to_have_value(detail);assert dbfile.read_text()==before;shot('08-goal-retry')
                        page.locator('#student-goal-form [type=submit]').click();notice('Gửi thành công!');dismiss();shot('09-goal-sent')
                        goal=next(g for g in json.loads(dbfile.read_text())['goals'] if g['name']==name);assert goal['studentId']=='LH001' and goal['detail']==detail
                        page.locator(f'[data-goal-view={goal["id"]}]').click();expect(page.locator('.student-goal-readonly')).to_contain_text(name);expect(page.locator('.student-preserve')).to_have_text(detail);shot('10-goal-view');page.locator('.student-goal-dialog [data-close]').click()
                        page.evaluate("L.go('grades')");expect(page.locator('#student-grade-form')).to_be_visible();expect(page.locator('.sidebar .navitem.active')).to_have_count(1);expect(page.locator('.sidebar .navitem.active')).to_contain_text('Kết quả học tập');expect(page.locator('.student-return-banner')).to_contain_text('1 kết quả');shot('11-grade-form')
                        form=page.locator('#student-grade-form');before=dbfile.read_text()
                        for field,value in [('term','II'),('year','2025 - 2026'),('gpa','3.85'),('debts','2'),('certificates','VSTEP B2')]:form.locator(f'[name={field}]').fill(value)
                        form.locator('[type=file]').set_input_files(dict(name='bad.txt',mimeType='text/plain',buffer=b'bad'));form.locator('[type=submit]').click();expect(form.locator('[data-error=rank]')).to_have_text('Vui lòng nhập đầy đủ thông tin trước khi gửi !');expect(form.locator('[data-error=file]')).to_have_text('File không đúng định dạng !');assert dbfile.read_text()==before;shot('12-grade-errors')
                        form.locator('[name=rank]').fill('Xuất sắc');form.locator('[type=file]').set_input_files(str(ROOT/'frontend/assets/auth-logo.png'));expect(form.locator('.student-debt-note')).to_contain_text('2 môn')
                        page.route('**/api/grades',lambda r:r.fulfill(status=503,json={'error':'Không gửi được kết quả!'}),times=1)
                        form.locator('[type=submit]').click();expect(form.locator('.student-form-error')).to_have_text('Không gửi được kết quả!');assert dbfile.read_text()==before;shot('13-grade-retry')
                        form.locator('[type=submit]').click();notice('Gửi thành công!');dismiss();shot('14-grade-sent')
                        saved=json.loads(dbfile.read_text());grade=next(g for g in reversed(saved['grades']) if g['studentId']=='LH001' and g.get('debts')==2 and g.get('status')=='Chờ xét duyệt');assert grade['evidenceName']=='auth-logo.png'
                        page.locator('.student-grade-history').scroll_into_view_if_needed();expect(page.locator(f'[data-grade-view={grade["id"]}]')).to_be_visible();shot('15-grades-history')
                        page.locator(f'[data-grade-view={grade["id"]}]').click();expect(page.locator('.student-grade-values')).to_contain_text('3.85');page.locator('.student-old-proof').click();expect(page.locator('.records-preview img')).to_be_visible();page.locator('.records-preview [data-close]').click();page.locator('.student-goal-dialog [data-close]').click()
                        page.locator('[data-grade-view=KQ101]').click();expect(page.locator('.student-grade-dialog')).to_be_visible();expect(page.locator('.student-request-note')).to_contain_text('Bổ sung chứng chỉ và bảng điểm rõ hơn');expect(page.locator('.student-request-note textarea,.student-request-note input')).to_have_count(0);shot('16-grade-supplement')
                        original=next(g for g in json.loads(dbfile.read_text())['grades'] if g['id']=='KQ101');before=dbfile.read_text();page.locator('.student-grade-dialog [data-close]').click();expect(page.locator('.lh-feedback')).to_have_count(0);assert dbfile.read_text()==before
                        page.locator('[data-grade-view=KQ101]').click();redo=page.locator('#student-grade-resubmit');redo.locator('[name=gpa]').fill('3.90');redo.locator('[type=file]').set_input_files(str(ROOT/'frontend/assets/auth-logo.png'))
                        page.route('**/api/grades/KQ101/resubmit',lambda r:r.fulfill(status=503,json={'error':'Không gửi lại được kết quả!'}),times=1)
                        redo.locator('[type=submit]').click();expect(redo.locator('.student-form-error')).to_have_text('Không gửi lại được kết quả!');assert dbfile.read_text()==before;shot('17-supplement-retry')
                        redo.locator('[type=submit]').click();notice('Gửi thành công!');dismiss();expect(page.locator('.student-return-banner')).to_have_count(0);shot('18-supplement-sent')
                        current=json.loads(dbfile.read_text());assert current['gradeRevisions'][-1]['before']==original;assert next(g for g in current['grades'] if g['id']=='KQ101')['status']=='Chờ xét duyệt'
                        switch('quanly@lighthouse.test');page.evaluate("L.go('grades')");ready(page);page.locator(f'[data-assessment-id={grade["id"]}]').click();expect(page.locator('.assessment-student')).to_contain_text('Mai Hồng Ngọc');expect(page.locator('#grade-proof')).to_have_text('auth-logo.png');page.locator('#grade-approve').click();page.locator('.confirm-ok').click();notice('Cập nhật thành công!');dismiss()
                        page.evaluate("L.go('goals')");ready(page);page.locator('#assessment-search').fill(name);page.locator(f'[data-assessment-id={goal["id"]}]').click();page.locator('#save-goal-review').click();page.locator('.confirm-ok').click();notice('Cập nhật thành công!');dismiss()
                        page.evaluate("L.go('students')");ready(page);page.locator('#student-search').fill('LH001');page.locator('[data-action=detail]').click();page.locator('[data-tab=goals]').click();expect(page.locator('.profile-table-scroll')).to_contain_text(name);shot('19-profile-goal')
                        page.locator('[data-tab=grades]').click();expect(page.locator('.profile-table-scroll')).to_contain_text('3.85');shot('20-profile-grade')
                        switch('sinhvien@lighthouse.test');expect(page.locator(f'[data-goal-view={goal["id"]}]').locator('xpath=ancestor::tr')).to_contain_text('Đạt')
                        switch('student2@example.test');page.evaluate("L.go('grades')");expect(page.locator('#student-grade-form')).to_be_visible();expect(page.locator('#student-grade-gpa')).to_have_value('');expect(page.locator('#student-grade-year')).to_have_value('');expect(page.locator('.topbar .usertext b')).to_contain_text('Nguyễn Khoa Tóc Tiên');assert not errors,errors;page.close()
                    finally:proc.terminate();proc.wait(timeout=10)
        finally:browser.close()
    (OUT/'results.json').write_text(json.dumps({'status':'passed','viewports':['1920x1080','1366x768'],'screenshots':shots,'checks':['grouped history, filters and scroll','student-only pages and one active nav','inline validation','long goals and submit retry','grade proof and debt flag','requested grade revision and cancel','manager approval in UC06','shared UC04 identity','no draft leakage between students']},indent=2))
    print('PASS UC10/11: history, student goals/grades, supplement, retry, approval and cross-account privacy at both viewports')
if __name__=='__main__':main()
