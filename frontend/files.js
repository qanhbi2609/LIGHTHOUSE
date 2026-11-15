'use strict';
window.LighthouseFiles=(()=>{
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const rows=r=>r.evidenceFiles?.length?r.evidenceFiles:r.evidence?[{url:r.evidence,name:r.evidenceName||'Minh chứng',previewRegion:r.previewRegion}]:[];
 function html(r,firstId=''){return rows(r).map((f,i)=>`<span class="proof-file"><button type="button" class="records-link" ${i===0&&firstId?`id="${firstId}"`:''} data-file-preview="${esc(f.url)}" ${f.previewRegion?`data-region="${esc(JSON.stringify(f.previewRegion))}"`:''}>${esc(f.name||'Xem minh chứng')}</button><a class="records-link" href="${esc(f.url)}?download=1" download>Tải xuống</a></span>`).join('');}
 document.addEventListener('click',e=>{const button=e.target.closest('[data-file-preview]');if(button)window.L.filesPreview(button.dataset.filePreview,button.dataset.region?JSON.parse(button.dataset.region):null);});
 return {rows,html};
})();
