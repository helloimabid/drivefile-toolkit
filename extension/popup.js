const $ = (selector) => document.querySelector(selector);
const status = $('#status');
const setStatus = (message) => { status.textContent = message; };
const driveButton = $('#drive-export');
const start = $('#start');
const make = $('#make');
let tabId;

function extractFileId(input) {
  const value = input.trim();
  if (/^[a-zA-Z0-9_-]{10,}$/.test(value)) return value;
  try {
    const url = new URL(value);
    if (!['drive.google.com', 'docs.google.com'].includes(url.hostname)) return null;
    const match = url.pathname.match(/\/file\/d\/([^/]+)/) ||
      url.pathname.match(/\/document\/d\/([^/]+)/) ||
      url.pathname.match(/\/spreadsheets\/d\/([^/]+)/) ||
      url.pathname.match(/\/presentation\/d\/([^/]+)/);
    return match?.[1] || url.searchParams.get('id');
  } catch { return null; }
}

async function getDriveToken() {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive: true }, (token) => {
      if (chrome.runtime.lastError || !token) {
        reject(new Error(chrome.runtime.lastError?.message || 'Google sign-in was not completed.'));
        return;
      }
      resolve(token);
    });
  });
}

async function driveApi(url, token) {
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error?.message || `Google Drive API error (${response.status}).`);
  }
  return response;
}

driveButton.addEventListener('click', async () => {
  const fileId = extractFileId($('#drive-url').value);
  if (!fileId) { setStatus('Enter a valid Google Drive file URL or file ID.'); return; }
  driveButton.disabled = true;
  setStatus('Signing in and checking Drive permissions…');
  try {
    const token = await getDriveToken();
    const metadataUrl = new URL(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}`);
    metadataUrl.searchParams.set('fields', 'id,name,mimeType,size,capabilities(canDownload)');
    const metadataResponse = await driveApi(metadataUrl, token);
    const file = await metadataResponse.json();

    if (file.capabilities?.canDownload !== true) {
      throw new Error('Google Drive reports that downloading is disabled for this file. The extension will not bypass that restriction.');
    }

    let downloadUrl;
    let filename = file.name || 'drive-file';
    if (file.mimeType === 'application/vnd.google-apps.document' ||
        file.mimeType === 'application/vnd.google-apps.spreadsheet' ||
        file.mimeType === 'application/vnd.google-apps.presentation') {
      downloadUrl = new URL(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}/export`);
      downloadUrl.searchParams.set('mimeType', 'application/pdf');
      if (!/\.pdf$/i.test(filename)) filename += '.pdf';
    } else {
      downloadUrl = new URL(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}`);
      downloadUrl.searchParams.set('alt', 'media');
      if (!/\.[a-z0-9]{1,8}$/i.test(filename)) filename += '.download';
    }

    setStatus('Downloading permitted file…');
    const response = await driveApi(downloadUrl, token);
    const blob = await response.blob();
    if (!blob.size) throw new Error('Google Drive returned an empty file.');
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = filename;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    setStatus(`Ready: ${filename} (${(blob.size / 1024 / 1024).toFixed(2)} MB)`);
  } catch (error) {
    setStatus(error.message || 'Export failed. Check the extension OAuth setup and file permissions.');
  } finally {
    driveButton.disabled = false;
  }
});

start.addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  tabId = tab.id;
  try {
    await chrome.scripting.executeScript({ target: { tabId }, files: ['content.js'] });
    await chrome.tabs.sendMessage(tabId, { type: 'DFT_START' });
    setStatus('Click page images you are authorized to include. Click again to deselect.');
    make.disabled = false;
  } catch {
    setStatus('This page does not allow extension injection. Try a regular website tab.');
  }
});

make.addEventListener('click', async () => {
  setStatus('Creating PDF locally…');
  try {
    const result = await chrome.tabs.sendMessage(tabId, {
      type: 'DFT_EXPORT',
      quality: Number($('#quality').value)
    });
    setStatus(result?.message || 'PDF export requested.');
  } catch {
    setStatus('Capture session unavailable. Start selection again.');
  }
});