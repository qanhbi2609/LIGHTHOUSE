"""UC09 saved list, period snapshot, cancellation, retry, attachments and real PDF download."""
import json,os,subprocess,tempfile
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
from browser_smoke import login,sidebar_layout,ready
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'artifacts/uc09'

def main():
    OUT.mkdir(parents=True,exist_ok=True);shots=[]
    with sync_playwright() as p:
        options={'headless':True,'ignore_default_args':['--hide-scrollbars']}
        if os.environ.get('CHROMIUM_PATH'):options['executable_path']=os.environ['CHROMIUM_PATH']
        browser=p.chromium.launch(**options)
        try:
            for width,height in [(1920,1080),(1366,768)]:
                with tempfile.TemporaryDirectory(prefix='lighthouse-reports-browser-') as tmp:
                    env=dict(os.environ,LIGHTHOUSE_DEMO_DATASET='figma',LIGHTHOUSE_DATA_DIR=tmp+'/data',LIGHTHOUSE_UPLOADS_DIR=tmp+'/uploads',DEMO_ONLY='1')
                    proc=subprocess.Popen(['node','-e',"const {server}=require('./server');server.listen(0,'127.0.0.1',()=>console.log('PORT='+server.address().port))"],cwd=ROOT/'backend',env=env,stdout=subprocess.PIPE,text=True)
                    try:
                        for line in proc.stdout:
                            if line.startswith('PORT='):port=int(line[5:]);break
                        page=browser.new_page(viewport={'width':width,'height':height},accept_downloads=True);errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
                        page.goto(f'http://127.0.0.1:{port}',wait_until='networkidle');login(page,'quanly@lighthouse.test');expect(page.locator('#toast')).not_to_be_visible();page.evaluate('document.fonts.ready')
                        dbfile=Path(tmp)/'data/figma-demo-v1.json';uploads=Path(tmp)/'uploads'
                        def shot(name):
                            f=f'{name}-{width}.png';page.screenshot(path=str(OUT/f));shots.append(f)
                        def dismiss():page.locator('.records-notice-layer').click(position={'x':2,'y':2})
                        def report_list():page.evaluate("L.go('reports')");expect(page.locator('.reports-list')).to_be_visible()
                        def aggregate(from_day='2026-10-01',to_day='2026-10-31'):
                            page.locator('#report-from').fill(from_day);page.locator('#report-to').fill(to_day);page.locator('#report-range-form [type=submit]').click()
                        def compose():
                            page.locator('[data-report-action=new]').click();expect(page.locator('.report-empty')).to_be_visible();aggregate();expect(page.locator('#report-save')).to_be_visible()
                        report_list()
                        page.evaluate("""async()=>{for(let i=0;i<12;i++)await fetch('/api/reports',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+sessionStorage.getItem('lh_token')},body:JSON.stringify({type:'Tổng hợp tháng',from:'2026-09-01',to:'2026-09-30',content:'Synthetic saved report '+i,confirm:true})});await L.render()}""")
                        expect(page.locator('.reports-total span')).to_have_text('13');sidebar_layout(page)
                        scroll=page.locator('.records-data-scroll');expect(page.locator('.report-data tbody tr')).to_have_count(13)
                        assert scroll.evaluate('e=>e.scrollHeight>e.clientHeight')
                        fixed=[page.locator(s).bounding_box() for s in ['.topbar','.reports-total','.reports-tools','.records-columns']]
                        scroll.hover();page.mouse.wheel(0,500);page.wait_for_timeout(200);assert scroll.evaluate('e=>e.scrollTop')>0
                        assert fixed==[page.locator(s).bounding_box() for s in ['.topbar','.reports-total','.reports-tools','.records-columns']];assert page.evaluate('window.scrollY')==0;scroll.evaluate('e=>e.scrollTop=0');shot('01-list')
                        page.locator('#report-filter-query').fill('BC001');expect(page.locator('.report-data tbody tr')).to_have_count(1)
                        page.locator('#report-filter-query').fill('missing');expect(page.locator('.records-empty')).to_be_visible();shot('02-empty-list');page.locator('#report-filter-query').fill('')
                        page.locator('#report-filter-type').select_option('Tổng hợp tháng');expect(page.locator('.report-data tbody tr')).to_have_count(12);page.locator('#report-filter-type').select_option('')
                        page.locator('#report-filter-from').fill('2026-10-01');expect(page.locator('.report-data tbody tr')).to_have_count(1)
                        page.locator('#report-filter-to').fill('2026-09-01');expect(page.locator('#report-filter-error')).to_have_text('Khoảng thời gian không hợp lệ!')
                        page.locator('#report-filter-from').fill('');page.locator('#report-filter-to').fill('')
                        before=dbfile.read_text();page.locator('[data-report-action=new]').click();shot('03-new-empty')
                        aggregate('1900-01-01','1900-01-31');expect(page.locator('.report-empty')).to_be_visible();expect(page.locator('#report-save')).to_have_count(0);assert dbfile.read_text()==before
                        aggregate('2026-11-01','2026-10-01');expect(page.locator('#report-form-error')).to_have_text('Khoảng thời gian không hợp lệ!')
                        old_data=page.evaluate("""async()=>fetch('/api/reports/summary?from=2026-10-01&to=2026-10-31&type='+encodeURIComponent('Tổng hợp tháng'),{headers:{Authorization:'Bearer '+sessionStorage.getItem('lh_token')}}).then(r=>r.json())""")
                        pending=[];page.route('**/api/reports/summary?**',lambda r:pending.append(r),times=1)
                        aggregate();expect(page.locator('#report-range-form [type=submit]')).to_be_disabled();assert len(pending)==1
                        page.locator('#report-from').fill('2026-09-01');pending[0].fulfill(status=200,json=old_data);page.wait_for_timeout(150)
                        expect(page.locator('.report-empty')).to_be_visible();expect(page.locator('#report-save')).to_have_count(0)
                        aggregate();expect(page.locator('.report-section')).to_have_count(10);expect(page.locator('.report-content-card')).to_contain_text('10/2026');expect(page.locator('.report-content-card input,.report-content-card textarea')).to_have_count(0)
                        page.locator('#report-notes').fill('Nhận xét kiểm thử: giữ đúng số liệu và hồ sơ sinh viên.')
                        page.locator('#report-files').set_input_files(str(ROOT/'frontend/assets/auth-logo.png'));expect(page.locator('.report-images h4')).to_have_text('Hình ảnh đính kèm (1)')
                        page.locator('#report-files').set_input_files(dict(name='bad.txt',mimeType='text/plain',buffer=b'bad'));expect(page.locator('#report-upload-error')).to_have_text('Định dạng không phù hợp!');expect(page.locator('.report-images h4')).to_have_text('Hình ảnh đính kèm (1)');shot('04-compose')
                        page.locator('#report-save').click();expect(page.locator('.records-confirm')).to_contain_text('Xác nhận lưu thông tin báo cáo?');shot('05-confirm')
                        page.locator('.records-confirm [data-close]').click();expect(page.locator('.records-notice')).to_have_text('Đã hủy thao tác!');expect(page.locator('.reports-list')).to_be_visible();assert dbfile.read_text()==before;shot('06-cancel');dismiss()
                        compose();page.locator('#report-notes').fill('Nhận xét mới <script>plain text</script>');page.locator('#report-files').set_input_files(str(ROOT/'frontend/assets/auth-logo.png'));expect(page.locator('.report-images h4')).to_have_text('Hình ảnh đính kèm (1)')
                        page.route('**/api/reports',lambda r:r.fulfill(status=503,json={'error':'Không lưu được báo cáo. Vui lòng thử lại.'}),times=1)
                        page.locator('#report-save').click();page.locator('.confirm-ok').click();expect(page.locator('.records-confirm .records-error')).to_have_text('Không lưu được báo cáo. Vui lòng thử lại.');assert dbfile.read_text()==before
                        expect(page.locator('#report-notes')).to_have_value('Nhận xét mới <script>plain text</script>');shot('07-save-error')
                        page.locator('.confirm-ok').click();expect(page.locator('.records-notice')).to_have_text('Lưu thành công!');expect(page.locator('.reports-total span')).to_have_text('14');shot('08-saved');dismiss()
                        saved=json.loads(dbfile.read_text());r=saved['reports'][0];assert r['notes']=='Nhận xét mới <script>plain text</script>' and len(r['files'])==1 and len(r['reportData']['sections'])==10
                        page.locator('#report-filter-query').fill(r['id']);page.locator('[data-report-action=detail]').click();expect(page.locator('.report-detail')).to_be_visible();expect(page.locator('.report-preserve')).to_have_text(r['notes']);shot('09-detail')
                        page.locator('[data-report-action=back]').click();expect(page.locator('.report-data tbody tr')).to_have_count(1)
                        page.locator('[data-report-action=preview]').click();expect(page.locator('.report-paper')).to_have_count(2);shot('10-pdf-preview')
                        with page.expect_download() as dl:page.locator('[data-report-action=download]').click()
                        download=dl.value;assert download.suggested_filename==r['id']+'.pdf';pdfpath=OUT/f'report-{width}.pdf';download.save_as(pdfpath);assert pdfpath.read_bytes().startswith(b'%PDF-');assert pdfpath.stat().st_size>5000
                        assert len(page.context.pages)==1
                        page.locator('[data-report-action=back]').click();page.get_by_text('Đăng xuất',exact=True).click();login(page,'canbo@lighthouse.test');expect(page.locator('#toast')).not_to_be_visible();report_list();expect(page.locator('[data-report-action=new]')).to_have_count(0)
                        page.evaluate('L.reportNew()');expect(page.locator('.reports-list')).to_be_visible();assert not errors,errors;page.close()
                    finally:proc.terminate();proc.wait(timeout=10)
        finally:browser.close()
    (OUT/'results.json').write_text(json.dumps({'status':'passed','viewports':['1920x1080','1366x768'],'screenshots':shots,'checks':['data-only scroll','period and type filters','no-data and invalid range','server generated snapshot','attachment validation','cancel without writes','save error retry','saved view','PDF preview and real download','view-only grants']},indent=2))
    print('PASS UC09: saved list, summary, attachments, cancel/retry, snapshot, PDF download and grants at both viewports')
if __name__=='__main__':main()
