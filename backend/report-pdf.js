'use strict';
const fs=require('node:fs'),path=require('node:path');
const {PDFDocument,rgb}=require('./vendor/pdf-lib-1.17.1'),fontkit=require('./vendor/fontkit-1.1.1');
const pretty=v=>String(v||'').slice(0,10).split('-').reverse().join('/');
async function reportPDF(report,uploads){
 const doc=await PDFDocument.create();doc.registerFontkit(fontkit);
 const font=await doc.embedFont(fs.readFileSync(path.join(__dirname,'../frontend/assets/fonts/pdf/Roboto-Regular.ttf')),{subset:true});
 const bold=await doc.embedFont(fs.readFileSync(path.join(__dirname,'../frontend/assets/fonts/pdf/Roboto-Bold.ttf')),{subset:true});
 const blue=rgb(.12,.23,.54),ink=rgb(.20,.25,.33),muted=rgb(.39,.45,.55);let page,y;
 function add(){page=doc.addPage([595.28,841.89]);y=800;}
 function lines(value,size,width,face){const rows=[];for(const paragraph of String(value||'').split('\n')){let line='';for(const original of paragraph.split(/\s+/)){if(!original)continue;const chunks=[];let chunk='';for(const char of original){if(chunk&&face.widthOfTextAtSize(chunk+char,size)>width){chunks.push(chunk);chunk=char;}else chunk+=char;}if(chunk)chunks.push(chunk);for(const word of chunks){const trial=line?line+' '+word:word;if(face.widthOfTextAtSize(trial,size)>width&&line){rows.push(line);line=word;}else line=trial;}}rows.push(line);}return rows;}
 function text(value,{size=10,width=515,strong=false,color=ink,x=40,gap=5}={}){const face=strong?bold:font;for(const line of lines(value,size,width,face)){if(y<65)add();page.drawText(line,{x,y,size,font:face,color});y-=size+4;}y-=gap;}
 function section(s){text(`${s.number}. ${s.title}`,{strong:true,color:blue,size:11});text(s.text);y-=6;}
 add();text('LIGHTHOUSE · Student Management',{strong:true,color:blue});y-=12;
 text(report.reportData?.title||report.type,{size:18,strong:true,color:blue});y-=6;
 text(`Loại: ${report.type}     Kỳ: ${pretty(report.from)} – ${pretty(report.to)}`,{color:muted});
 text(`Người lập: ${report.authorName||report.author}     Ngày lập: ${pretty(report.created)}`,{color:muted});y-=12;
 const sections=report.reportData?.sections||[{number:1,title:'Nội dung tổng hợp',text:report.content||'Chưa có nội dung.'}];
 for(const s of sections.slice(0,5))section(s);
 if(report.reportData?.metrics){const m=report.reportData.metrics;y-=10;text('Tổng hợp số lượng sinh viên',{strong:true,color:blue});text(`Đầu kỳ: ${m.beginning}    Mới vào: ${m.entered}    Tốt nghiệp: ${m.graduated}    Rời: ${m.left}    Cuối kỳ: ${m.ending}`);}
 add();text(`${report.id} · ${report.reportData?.title||report.type} (tiếp)`,{strong:true,color:blue});y-=10;
 for(const s of sections.slice(5))section(s);
 text('Nhận xét và đề xuất',{strong:true,color:blue,size:11});text(report.notes||'Chưa có nhận xét.');
 for(const url of report.files||[]){if(!/^\/uploads\/[a-zA-Z0-9._-]+\.(png|jpe?g)$/i.test(url))continue;
  try{const bytes=fs.readFileSync(path.join(uploads,path.basename(url))),image=/\.png$/i.test(url)?await doc.embedPng(bytes):await doc.embedJpg(bytes);if(y<190)add();const scale=Math.min(190/image.width,105/image.height);page.drawImage(image,{x:40,y:y-image.height*scale,width:image.width*scale,height:image.height*scale});y-=image.height*scale+16;text(report.fileDetails?.find(f=>f.url===url)?.name||path.basename(url),{size:8,color:muted});}catch{text('Không hiển thị được ảnh đính kèm.',{size:9,color:muted});}
 }
 y-=12;text('Người xem xét',{strong:true,x:425,width:130});text('(Ký, ghi rõ họ tên)',{color:muted,x:410,width:145});
 const pages=doc.getPages();pages.forEach((p,i)=>{p.drawText(`Lighthouse · ${report.id}`,{x:40,y:35,font,size:9,color:muted});p.drawText(`Trang ${i+1} / ${pages.length}`,{x:460,y:35,font,size:9,color:muted});});
 doc.setTitle(report.reportData?.title||report.type);doc.setAuthor(report.authorName||report.author);return Buffer.from(await doc.save());
}
module.exports={reportPDF};
