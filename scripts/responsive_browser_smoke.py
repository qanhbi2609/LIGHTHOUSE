"""Responsive layout checks: UC01/02, all manager screens, profile and dialogs."""
import json
import os
from pathlib import Path
import subprocess
import tempfile
from playwright.sync_api import sync_playwright, expect
from browser_smoke import login, ready, sidebar_layout, SCREENS
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'artifacts/responsive'
SIZES=[(320,568),(390,844),(768,1024),(1024,600),(1093,614),(1366,608),(1920,1080),(2560,1440)]

def main():
    OUT.mkdir(parents=True,exist_ok=True);results=[]
    with tempfile.TemporaryDirectory(prefix='lighthouse-responsive-') as tmp:
        env=dict(os.environ,LIGHTHOUSE_DATA_DIR=tmp+'/data',LIGHTHOUSE_UPLOADS_DIR=tmp+'/uploads',LIGHTHOUSE_DEMO_DATASET='figma',DEMO_ONLY='1')
        code="const {server}=require('./server');server.listen(0,'127.0.0.1',()=>console.log('PORT='+server.address().port))"
        proc=subprocess.Popen(['node','-e',code],cwd=ROOT/'backend',env=env,stdout=subprocess.PIPE,text=True)
        try:
            for line in proc.stdout:
                if line.startswith('PORT='):port=int(line[5:]);break
            with sync_playwright() as p:
                opts={'headless':True,'ignore_default_args':['--hide-scrollbars']}
                if os.environ.get('CHROMIUM_PATH'):opts['executable_path']=os.environ['CHROMIUM_PATH']
                browser=p.chromium.launch(**opts)
                try:
                    for width,height in SIZES:
                        page=browser.new_page(viewport={'width':width,'height':height});errors=[]
                        page.on('pageerror',lambda e:errors.append(str(e)))
                        page.goto(f'http://127.0.0.1:{port}',wait_until='networkidle')
                        def shot(name):page.screenshot(path=str(OUT/f'{name}-{width}x{height}.png'))
                        def no_overflow(name):
                            metrics=page.evaluate('({width:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth})')
                            assert metrics['scroll']<=metrics['width']+1,(name,width,height,metrics)
                        for view in ['login','forgot','verify','reset','success']:
                            page.evaluate('(v)=>L.auth(v)',view);expect(page.locator('.auth-card')).to_be_visible()
                            no_overflow('auth-'+view)
                            card=page.locator('.auth-card').bounding_box()
                            if view=='login' and width>760:
                                assert abs(card['width']/card['height']-540/960)<.02,('login card proportions',width,height,card)
                            for el in page.locator('.auth-card input:not([type=checkbox]),.auth-card .auth-primary,.auth-register').all():
                                b=el.bounding_box();assert b['x']>=card['x'] and b['x']+b['width']<=card['x']+card['width']+1,(view,b,card)
                                el.scroll_into_view_if_needed();assert el.is_visible()
                            page.evaluate('scrollTo(0,0)');shot('auth-'+view)
                        page.evaluate("L.auth('register')");no_overflow('registration');shot('registration')
                        page.evaluate("L.auth('login')");login(page,'quanly@lighthouse.test');expect(page.locator('#toast')).not_to_be_visible()
                        for screen in SCREENS:
                            page.evaluate('(s)=>L.go(s)',screen);ready(page);no_overflow(screen)
                            if width>760:sidebar_layout(page);assert page.locator('.sidebar').bounding_box()['width']==185
                            else:
                                expect(page.locator('.sidebar .navitem')).to_have_count(8)
                                assert page.locator('.sidebar-group').evaluate('e=>e.getBoundingClientRect().bottom<=innerHeight')
                                assert all(i.get_attribute('aria-label') for i in page.locator('.navitem').all())
                                page.locator('.sidebar-toggle').click();expect(page.locator('.navitem span').first).to_be_visible()
                                expect(page.locator('.sidebar')).to_have_css('transform','matrix(1, 0, 0, 1, 0, 0)')
                                for label in page.locator('.navitem span').all():assert label.bounding_box()['width']>100
                                brand=page.locator('.sidebar-brand');assert brand.evaluate('e=>e.scrollWidth<=e.clientWidth+1')
                                shot(screen+'-menu');page.locator('.sidebar-backdrop').click(position={'x':width-30,'y':height-30})
                            if screen=='rooms':
                                for summary in page.locator('.room-card p').all():assert summary.evaluate('e=>e.scrollHeight<=e.clientHeight+1')
                            shot(screen)
                        page.evaluate("L.go('students')");ready(page);page.locator('[data-action=detail][data-id=LH001]').click()
                        for tab in ['personal','grades','goals','supports','images']:
                            page.locator(f'[data-tab={tab}]').click();no_overflow('profile-'+tab);shot('profile-'+tab)
                            if tab=='supports':
                                page.locator('[data-action=add-support]').click();expect(page.locator('.records-support')).to_be_visible();no_overflow('support-editor')
                                save=page.locator('.records-support [type=submit]');save.scroll_into_view_if_needed();b=save.bounding_box();assert b['y']+b['height']<=height+1;shot('support-editor')
                                page.locator('.records-support [data-close]').click();page.locator('.records-notice-layer').click(position={'x':2,'y':2})
                            if tab=='images':
                                expect(page.locator('.profile-photo-timeline .profile-photo')).to_have_count(11)
                                assert page.locator('.profile-photo-timeline').evaluate('e=>e.clientHeight>30')
                                if height<=1080:
                                    fixed=page.locator('.profile-image-tools').bounding_box();page.locator('.profile-photo-timeline').evaluate('e=>e.scrollTop=400');assert page.locator('.profile-image-tools').bounding_box()==fixed

                        page.evaluate("L.go('rooms')");ready(page);page.locator('#room-new').click()
                        expect(page.locator('.room-picker')).to_be_visible();no_overflow('room-picker');save=page.locator('.room-picker [type=submit]');save.scroll_into_view_if_needed();b=save.bounding_box();assert b['y']+b['height']<=height+1;shot('room-picker');page.locator('.room-picker [data-close]').click()
                        page.locator('.records-notice-layer').click(position={'x':2,'y':2})
                        for action in ['detail','edit']:
                            page.locator(f'[data-room=A102] [data-room-action={action}]').click()
                            dialog=page.locator('.rooms-detail' if action=='detail' else '.room-picker')
                            expect(dialog).to_be_visible();no_overflow('room-'+action)
                            box=dialog.bounding_box();assert box['y']>=0 and box['y']+box['height']<=height+1
                            if action=='detail':
                                close=page.get_by_role('button',name='Đóng thông tin phòng',exact=True);b=close.bounding_box();assert b['y']>=box['y'] and b['y']+b['height']<box['y']+100
                                scroll=page.locator('.rooms-detail-data');assert scroll.evaluate('e=>e.clientHeight>30')
                                fixed=page.locator('.rooms-detail header').bounding_box();scroll.evaluate('e=>e.scrollTop=e.scrollHeight');assert page.locator('.rooms-detail header').bounding_box()==fixed
                            else:
                                fixed=dialog.locator('footer').bounding_box();dialog.locator('.room-picker-list').evaluate('e=>e.scrollTop=e.scrollHeight');assert dialog.locator('footer').bounding_box()==fixed
                            shot('room-'+action);dialog.locator('[data-close]').click()
                            if action=='edit':page.locator('.records-notice-layer').click(position={'x':2,'y':2})
                        for kind in ['goals','grades']:
                            page.evaluate('(s)=>L.go(s)',kind);ready(page);page.locator('[data-assessment-id]').first.click()
                            dialog=page.locator('.assessment-dialog');expect(dialog).to_be_visible();no_overflow('assessment-'+kind)
                            box=dialog.bounding_box();assert box['y']>=0 and box['y']+box['height']<=height+1
                            fixed=[dialog.locator(sel).bounding_box() for sel in ['header','footer']]
                            scroll=dialog.locator('.assessment-dialog-scroll');assert scroll.evaluate('e=>e.clientHeight>30');scroll.evaluate('e=>e.scrollTop=e.scrollHeight')
                            assert fixed==[dialog.locator(sel).bounding_box() for sel in ['header','footer']]
                            assert fixed[1]['y']+fixed[1]['height']<=height+1;shot('assessment-'+kind)
                            if kind=='grades':
                                page.locator('#grade-proof').click();expect(page.locator('.records-preview-crop')).to_be_visible();shot('assessment-grade-proof');page.get_by_role('button',name='Đóng minh chứng',exact=True).click()
                            dialog.locator('.assessment-close').click();page.locator('.records-notice-layer').click(position={'x':2,'y':2})
                        page.evaluate("L.go('users')");ready(page);page.locator('[data-people-action=new]').click()
                        expect(page.locator('.people-editor')).to_be_visible();no_overflow('people-editor');b=page.locator('.people-editor [type=submit]').bounding_box();assert b['y']+b['height']<=height+1;shot('people-editor');page.locator('.people-editor [data-close]').click()
                        page.locator('.records-notice-layer').click(position={'x':2,'y':2})
                        page.evaluate("L.go('alumni')");ready(page);page.locator('[data-people-action=profile][data-id=LH034]').click()
                        for tab in ['personal','grades','goals','supports','images']:
                            page.locator(f'[data-tab={tab}]').click();no_overflow('alumni-'+tab);shot('alumni-'+tab)
                            expect(page.locator('[data-action=edit],[data-action=add-support],#profile-upload,[data-action=delete-image]')).to_have_count(0)
                        page.evaluate("L.go('reports')");ready(page);before=(Path(tmp)/'data/figma-demo-v1.json').read_text()
                        page.locator('[data-report-action=new]').click();expect(page.locator('.report-editor')).to_be_visible();no_overflow('report-editor-empty');shot('report-editor-empty')
                        page.locator('#report-from').fill('2026-10-01');page.locator('#report-to').fill('2026-10-31');page.locator('#report-range-form [type=submit]').click()
                        expect(page.locator('#report-save')).to_be_visible();no_overflow('report-editor');page.locator('#report-notes').fill('Nhận xét responsive')
                        page.locator('#report-save').scroll_into_view_if_needed();b=page.locator('#report-save').bounding_box();assert b['y']+b['height']<=height+1;shot('report-editor')
                        page.locator('#report-save').click();page.locator('.records-confirm [data-close]').click();expect(page.locator('.reports-list')).to_be_visible()
                        page.locator('.records-notice-layer').click(position={'x':2,'y':2});assert (Path(tmp)/'data/figma-demo-v1.json').read_text()==before
                        page.locator('[data-report-action=preview]').first.click();expect(page.locator('.report-paper')).to_have_count(2);no_overflow('report-pdf-preview');shot('report-pdf-preview')
                        page.evaluate("""async()=>fetch('/api/grades/KQ101/review',{method:'PATCH',headers:{'Content-Type':'application/json',Authorization:'Bearer '+sessionStorage.getItem('lh_token')},body:JSON.stringify({status:'Yêu cầu gửi lại',note:'Bổ sung minh chứng'})})""")
                        page.get_by_text('Đăng xuất',exact=True).click();login(page,'sinhvien@lighthouse.test');expect(page.locator('#toast')).not_to_be_visible()
                        expect(page.locator('.student-goals')).to_be_visible();expect(page.locator('.navitem.active')).to_have_count(1);no_overflow('student-goals');shot('student-goals')
                        before=(Path(tmp)/'data/figma-demo-v1.json').read_text();page.locator('#student-goal-new').click();expect(page.locator('.student-goal-dialog')).to_be_visible();no_overflow('student-goal-dialog')
                        page.locator('#student-goal-name').fill('Mục tiêu responsive');page.locator('#student-goal-detail').fill('Kế hoạch sáu tháng.\n'*30)
                        box=page.locator('.student-goal-dialog').bounding_box();assert box['y']>=0 and box['y']+box['height']<=height+1
                        b=page.locator('#student-goal-form [type=submit]').bounding_box();assert b['y']+b['height']<=height+1;shot('student-goal-dialog')
                        page.locator('.student-goal-dialog [data-close]').click();page.locator('.records-notice-layer').click(position={'x':2,'y':2})
                        page.evaluate("L.go('grades')");expect(page.locator('#student-grade-form')).to_be_visible();expect(page.locator('.navitem.active')).to_have_count(1);no_overflow('student-grades');shot('student-grades')
                        for field in page.locator('#student-grade-form input:not([type=file])').all():
                            box=page.locator('#student-grade-form').bounding_box();b=field.bounding_box();assert b['x']>=box['x']-1 and b['x']+b['width']<=box['x']+box['width']+1
                        send=page.locator('#student-grade-form [type=submit]');send.scroll_into_view_if_needed();b=send.bounding_box();assert b['y']+b['height']<=height+1
                        page.locator('.student-grade-history').scroll_into_view_if_needed();no_overflow('student-grades-history');shot('student-grades-history');assert page.evaluate('window.scrollY')==0
                        page.locator('#student-return-first').click();expect(page.locator('.student-grade-dialog')).to_be_visible();no_overflow('student-grade-dialog')
                        dialog=page.locator('.student-grade-dialog');fixed=[dialog.locator(s).bounding_box() for s in ['header','footer']];dialog.locator('.student-dialog-scroll').evaluate('e=>e.scrollTop=e.scrollHeight');assert fixed==[dialog.locator(s).bounding_box() for s in ['header','footer']];assert fixed[1]['y']+fixed[1]['height']<=height+1;shot('student-grade-dialog')
                        dialog.locator('[data-close]').click();page.locator('.records-notice-layer').click(position={'x':2,'y':2});assert (Path(tmp)/'data/figma-demo-v1.json').read_text()==before
                        assert not errors,errors
                        results.append({'width':width,'height':height,'status':'passed'});page.close()
                finally:browser.close()
        finally:proc.terminate();proc.wait(timeout=10)
    (OUT/'results.json').write_text(json.dumps(results,indent=2))
    print(f'PASS responsive: {len(SIZES)} viewports; UC01 states, UC02, manager pages, profile tabs and dialogs')
if __name__=='__main__':main()
