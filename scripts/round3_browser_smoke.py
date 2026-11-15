"""Round 3 UI: compact evidence, aligned filters, nested cancel and student lifecycle."""
import json,os,subprocess,tempfile
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
from browser_smoke import login,ready
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'artifacts/round3'
def main():
    OUT.mkdir(parents=True,exist_ok=True);shots=[]
    with sync_playwright() as p:
        options={'headless':True}
        if os.environ.get('CHROMIUM_PATH'):options['executable_path']=os.environ['CHROMIUM_PATH']
        browser=p.chromium.launch(**options)
        try:
            for width,height in [(1920,1080),(1366,768),(1366,608),(390,844)]:
                with tempfile.TemporaryDirectory(prefix='lighthouse-round3-browser-') as tmp:
                    env=dict(os.environ,LIGHTHOUSE_DEMO_DATASET='figma',LIGHTHOUSE_DATA_DIR=tmp+'/data',LIGHTHOUSE_UPLOADS_DIR=tmp+'/uploads',DEMO_ONLY='1')
                    proc=subprocess.Popen(['node','-e',"const {server}=require('./server');server.listen(0,'127.0.0.1',()=>console.log('PORT='+server.address().port))"],cwd=ROOT/'backend',env=env,stdout=subprocess.PIPE,text=True)
                    try:
                        for line in proc.stdout:
                            if line.startswith('PORT='):port=int(line[5:]);break
                        page=browser.new_page(viewport={'width':width,'height':height});errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto(f'http://127.0.0.1:{port}',wait_until='networkidle');login(page,'quanly@lighthouse.test');dbfile=Path(tmp)/'data/figma-demo-v1.json'
                        def go(name):page.evaluate('(s)=>L.go(s)',name);ready(page)
                        def dismiss():
                            if page.locator('.lh-feedback button').count():page.locator('.lh-feedback button').click()
                        def shot(name):
                            fn=f'{name}-{width}x{height}.png';page.screenshot(path=str(OUT/fn));shots.append(fn)
                        go('goals');title=page.locator('.assessment-filters h3').bounding_box();tools=page.locator('.assessment-filters .toolrow').bounding_box()
                        if width>1100:assert abs(title['y']+title['height']/2-tools['y']-tools['height']/2)<3,(title,tools)
                        else:assert tools['y']>=title['y']+title['height']
                        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');shot('01-filters')
                        if height<=650:
                            workspace=page.locator('.assessments-workspace');assert workspace.evaluate('e=>e.scrollHeight>e.clientHeight');workspace.evaluate('e=>e.scrollTop=e.scrollHeight');table=page.locator('.records-data-scroll');assert table.evaluate('e=>e.clientHeight>=150');head=page.locator('.records-columns').bounding_box();table.evaluate('e=>e.scrollTop=500');assert head==page.locator('.records-columns').bounding_box();shot('02-scroll')
                        # Huy closes only confirmation and keeps the parent editor/draft.
                        go('reports');page.locator('[data-report-action=new]').click();page.locator('#report-from').fill('2026-10-01');page.locator('#report-to').fill('2026-10-31');page.locator('#report-range-form [type=submit]').click();expect(page.locator('#report-save')).to_be_visible();page.locator('#report-notes').fill('Giữ bản đang nhập');page.locator('#report-files').set_input_files(str(ROOT/'frontend/assets/auth-logo.png'));before=dbfile.read_text();page.locator('#report-save').click();page.locator('.records-confirm [data-close]').click();expect(page.locator('.report-editor')).to_be_visible();expect(page.locator('#report-notes')).to_have_value('Giữ bản đang nhập');expect(page.locator('.report-images h4')).to_contain_text('(1)');assert dbfile.read_text()==before;dismiss();shot('03-cancel-report')
                        go('users');page.locator('[data-people-action=new]').click();page.locator('[name=name]').fill('Giữ nội dung');page.locator('[name=email]').fill('draft@example.test');page.locator('[name=password]').fill('2609');page.locator('[name=role]').select_option('CanBo');page.locator('#people-form [type=submit]').click();page.locator('.records-confirm [data-close]').click();expect(page.locator('.people-editor')).to_be_visible();expect(page.locator('[name=email]')).to_have_value('draft@example.test');assert dbfile.read_text()==before;dismiss();shot('04-cancel-user');page.locator('.people-editor [data-close]').click()
                        go('students');page.locator('#student-search').fill('LH001');page.locator('[data-action=detail]').click();page.locator('[data-tab=personal]').click();page.locator('[data-preview]').first.click();expect(page.locator('.proof-download')).to_have_count(0);expect(page.get_by_text('Tải xuống tệp',exact=True)).to_have_count(0);expect(page.locator('.records-preview img')).to_be_visible();shot('05-proof');page.locator('.records-preview [data-close]').click()
                        go('users');student=next(u for u in json.loads(dbfile.read_text())['users'] if u['role']=='SinhVien' and u.get('studentId')=='LH001');expect(page.locator(f'[data-people-action=edit][data-id={student["id"]}]')).to_be_visible();go('students');page.locator('#student-search').fill('LH001');page.locator('[data-student-status=LH001]').select_option('Rời trước thời hạn');page.locator('.confirm-ok').click();expect(page.locator('.lh-feedback > span:nth-child(2)')).to_have_text('Cập nhật thành công!');dismiss();go('users');expect(page.locator(f'[data-people-action=edit][data-id={student["id"]}]')).to_have_count(0);saved=json.loads(dbfile.read_text());assert any(u['id']==student['id'] and not u['active'] for u in saved['users']);assert any(s['id']=='LH001' for s in saved['students']);shot('06-disabled-account');assert not errors,errors;page.close()
                    finally:proc.terminate();proc.wait(timeout=10)
        finally:browser.close()
    (OUT/'results.json').write_text(json.dumps({'status':'passed','screenshots':shots,'viewports':['1920x1080','1366x768','1366x608','390x844']},ensure_ascii=False,indent=2));print('PASS round3: desktop row/mobile wrapping, nested scrolling, preserved cancel drafts, image-only preview and disabled student accounts')
if __name__=='__main__':main()
