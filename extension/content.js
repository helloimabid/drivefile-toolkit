// User-driven page-image selector. It does not inspect Google Drive private APIs,
// blob URLs, network requests, cookies, or protected viewer internals.
let selecting=false; const selected=new Set(); let overlay;
function badge(img,on){img.style.outline=on?'3px solid #19a66a':'';img.dataset.dftSelected=on?'1':'0';}
function onClick(e){const img=e.target.closest('img');if(!img||!selecting)return;e.preventDefault();e.stopPropagation();
  if(selected.has(img)){selected.delete(img);badge(img,false)}else{selected.add(img);badge(img,true)}
}
function start(){if(selecting)return;selecting=true;document.addEventListener('click',onClick,true);
  overlay=document.createElement('div');overlay.textContent='DriveFile Toolkit: click authorized page images to select; use extension popup to create PDF.';
  Object.assign(overlay.style,{position:'fixed',zIndex:2147483647,bottom:'12px',left:'12px',background:'#14243a',color:'#fff',padding:'10px 14px',borderRadius:'8px',font:'13px system-ui',boxShadow:'0 2px 12px #0008'});document.documentElement.append(overlay);
}
async function exportPdf(quality){
  const imgs=[...selected].filter(i=>i.isConnected);
  if(!imgs.length)return {message:'No images selected.'};
  const pages=[];
  for(const img of imgs){try{
    const src=img.currentSrc||img.src;if(!src||!/^https?:/i.test(src))continue;
    const response=await fetch(src,{mode:'cors',credentials:'omit'});if(!response.ok)continue;
    const blob=await response.blob();const bitmap=await createImageBitmap(blob);
    const canvas=document.createElement('canvas');canvas.width=bitmap.width;canvas.height=bitmap.height;
    canvas.getContext('2d').drawImage(bitmap,0,0);pages.push({data:canvas.toDataURL('image/jpeg',quality),w:canvas.width,h:canvas.height});
    bitmap.close();
  }catch(err){console.warn('Skipped image that could not be read:',err)}}
  if(!pages.length)return {message:'No selected images were readable. The page may block cross-origin image access.'};
  // Build PDF using a self-contained minimal PDF writer (JPEG image XObjects).
  const pdf=makePdf(pages);const url=URL.createObjectURL(new Blob([pdf],{type:'application/pdf'}));
  const a=document.createElement('a');a.href=url;a.download='authorized-document-capture.pdf';a.click();
  setTimeout(()=>URL.revokeObjectURL(url),60000);
  return {message:`Created PDF with ${pages.length} page image(s).`};
}
function makePdf(pages){
  const enc=s=>new TextEncoder().encode(s), chunks=[], offsets=[0];let pos=0;
  const push=b=>{chunks.push(b);pos+=b.length}, obj=(n,b)=>{offsets[n]=pos;push(enc(`${n} 0 obj\n`));push(b);push(enc('\nendobj\n'))};
  push(enc('%PDF-1.4\n'));
  const pageIds=pages.map((_,i)=>4+i*3), contentIds=pages.map((_,i)=>5+i*3), imageIds=pages.map((_,i)=>6+i*3);
  obj(1,enc('<< /Type /Catalog /Pages 2 0 R >>'));
  obj(2,enc(`<< /Type /Pages /Kids [${pageIds.map(x=>x+' 0 R').join(' ')}] /Count ${pages.length} >>`));
  obj(3,enc('<< /Producer (DriveFile Toolkit) >>'));
  pages.forEach((p,i)=>{
    const w=595.28,h=841.89,scale=Math.min(w/p.w,h/p.h),iw=p.w*scale,ih=p.h*scale,x=(w-iw)/2,y=(h-ih)/2;
    obj(pageIds[i],enc(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${w} ${h}] /Resources << /XObject << /Im${i} ${imageIds[i]} 0 R >> >> /Contents ${contentIds[i]} 0 R >>`));
    const stream=enc(`q ${iw} 0 0 ${ih} ${x} ${y} cm /Im${i} Do Q`);
    obj(contentIds[i],enc(`<< /Length ${stream.length} >>\nstream\n${new TextDecoder().decode(stream)}\nendstream`));
    const raw=atob(p.data.split(',')[1]), bytes=new Uint8Array(raw.length);for(let j=0;j<raw.length;j++)bytes[j]=raw.charCodeAt(j);
    const head=enc(`<< /Type /XObject /Subtype /Image /Width ${p.w} /Height ${p.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${bytes.length} >>\nstream\n`);
    const tail=enc('\nendstream');const body=new Uint8Array(head.length+bytes.length+tail.length);body.set(head);body.set(bytes,head.length);body.set(tail,head.length+bytes.length);obj(imageIds[i],body);
  });
  const xref=pos;push(enc(`xref\n0 ${offsets.length}\n0000000000 65535 f \n`));for(let i=1;i<offsets.length;i++)push(enc(String(offsets[i]).padStart(10,'0')+' 00000 n \n'));
  push(enc(`trailer\n<< /Size ${offsets.length} /Root 1 0 R /Info 3 0 R >>\nstartxref\n${xref}\n%%EOF`));
  const out=new Uint8Array(pos);let at=0;for(const c of chunks){out.set(c,at);at+=c.length}return out;
}
chrome.runtime.onMessage.addListener((msg,sender,sendResponse)=>{
  if(msg.type==='DFT_START'){start();sendResponse({ok:true});}
  if(msg.type==='DFT_EXPORT'){exportPdf(msg.quality).then(sendResponse);return true;}
});