const start=document.querySelector('#start'), make=document.querySelector('#make'), status=document.querySelector('#status');
let tabId;
start.addEventListener('click',async()=>{
  const [tab]=await chrome.tabs.query({active:true,currentWindow:true}); tabId=tab.id;
  try {
    await chrome.scripting.executeScript({target:{tabId},files:['content.js']});
    await chrome.tabs.sendMessage(tabId,{type:'DFT_START'});
    status.textContent='Click page images you are authorized to include. Click again to deselect.';
    make.disabled=false;
  } catch(e) { status.textContent='This page does not allow extension injection. Try a regular website tab.'; }
});
make.addEventListener('click',async()=>{
  const quality=Number(document.querySelector('#quality').value);
  status.textContent='Creating PDF locally…';
  try { const result=await chrome.tabs.sendMessage(tabId,{type:'DFT_EXPORT',quality}); status.textContent=result?.message||'PDF export requested.'; }
  catch(e) { status.textContent='Capture session unavailable. Start selection again.'; }
});