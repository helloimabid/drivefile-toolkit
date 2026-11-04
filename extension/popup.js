// State
let activeTabId = null;
let isProcessing = false;

// DOM Elements
const $ = (id) => document.getElementById(id);
const statusEl = $("status");
const progressContainer = $("progress-container");
const progressBar = $("progress-bar");
const progressLabel = $("progress-label");
const progressPercent = $("progress-percent");
const progressStatus = $("progress-status");
const driveExportBtn = $("drive-export");
const startCaptureBtn = $("start-capture");

// Tab Switching
document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    const targetTab = tab.dataset.tab;

    // Update active tab button
    document
      .querySelectorAll(".tab")
      .forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");

    // Switch content
    document.querySelectorAll(".tab-content").forEach((content) => {
      content.classList.remove("active");
    });
    $(`tab-${targetTab}`).classList.add("active");
  });
});

// Helper: Show Status
function showStatus(message, type = "info") {
  statusEl.textContent = message;
  statusEl.className = `status-toast ${type}`;
  if (type === "info") {
    // Auto-hide info after 5s
    setTimeout(() => {
      if (statusEl.textContent === message) {
        statusEl.textContent = "";
        statusEl.className = "status-toast";
      }
    }, 5000);
  }
}

// Helper: Progress UI
function updateProgress(percent, label, statusText) {
  progressContainer.classList.remove("hidden");
  progressBar.style.width = `${percent}%`;
  progressPercent.textContent = `${Math.round(percent)}%`;
  progressLabel.textContent = label;
  progressStatus.textContent = statusText;
}

function hideProgress() {
  progressContainer.classList.add("hidden");
  progressBar.style.width = "0%";
}

// Helper: Button Loading State
function setButtonLoading(btn, isLoading, loadingText = "Processing...") {
  if (isLoading) {
    btn.disabled = true;
    btn.dataset.originalText = btn.innerHTML;
    btn.innerHTML = `<span class="spinner"></span> ${loadingText}`;
  } else {
    btn.disabled = false;
    btn.innerHTML = btn.dataset.originalText || btn.innerHTML;
  }
}

// Helper: Extract File ID
function extractFileId(input) {
  const value = input.trim();
  if (/^[a-zA-Z0-9_-]{10,}$/.test(value)) return value;
  try {
    const url = new URL(value);
    if (!["drive.google.com", "docs.google.com"].includes(url.hostname))
      return null;
    const match =
      url.pathname.match(/\/file\/d\/([^/]+)/) ||
      url.pathname.match(/\/document\/d\/([^/]+)/) ||
      url.pathname.match(/\/spreadsheets\/d\/([^/]+)/) ||
      url.pathname.match(/\/presentation\/d\/([^/]+)/);
    return match?.[1] || url.searchParams.get("id");
  } catch {
    return null;
  }
}

// Helper: Get Auth Token
async function getDriveToken() {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive: true }, (token) => {
      if (chrome.runtime.lastError || !token) {
        reject(
          new Error(
            chrome.runtime.lastError?.message ||
              "Google sign-in was not completed.",
          ),
        );
        return;
      }
      resolve(token);
    });
  });
}

// Helper: Drive API Fetch
async function driveApi(url, token) {
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(
      body.error?.message || `Google Drive API error (${response.status}).`,
    );
  }
  return response;
}

// --- URL Export Logic ---
driveExportBtn.addEventListener("click", async () => {
  if (isProcessing) return;
  isProcessing = true;
  const urlInput = $("drive-url").value;
  const fileId = extractFileId(urlInput);

  if (!fileId) {
    showStatus("Please enter a valid Google Drive URL or File ID.", "error");
    isProcessing = false;
    return;
  }

  setButtonLoading(driveExportBtn, true, "Exporting...");
  updateProgress(10, "Fetching Metadata", "Contacting Google Drive API...");
  showStatus("Checking file permissions...", "info");

  try {
    const token = await getDriveToken();

    // 1. Get Metadata
    const metadataUrl = new URL(
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}`,
    );
    metadataUrl.searchParams.set(
      "fields",
      "id,name,mimeType,size,capabilities(canDownload)",
    );
    const metadataResponse = await driveApi(metadataUrl, token);
    const file = await metadataResponse.json();

    if (file.capabilities?.canDownload !== true) {
      throw new Error(
        "Google Drive reports that downloading is disabled for this file. The extension will not bypass that restriction.",
      );
    }

    updateProgress(40, "Preparing Export", `File type: ${file.mimeType}`);

    // 2. Determine Download URL
    let downloadUrl;
    let filename = file.name || "drive-file";

    const googleMimeTypes = [
      "application/vnd.google-apps.document",
      "application/vnd.google-apps.spreadsheet",
      "application/vnd.google-apps.presentation",
    ];

    if (googleMimeTypes.includes(file.mimeType)) {
      // Export Google Docs to PDF
      downloadUrl = new URL(
        `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}/export`,
      );
      downloadUrl.searchParams.set("mimeType", "application/pdf");
      if (!/\.pdf$/i.test(filename)) filename += ".pdf";
    } else {
      // Direct download
      downloadUrl = new URL(
        `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}`,
      );
      downloadUrl.searchParams.set("alt", "media");
      if (!/\.[a-z0-9]{1,8}$/i.test(filename)) filename += ".download";
    }

    // 3. Download
    updateProgress(70, "Downloading", "Streaming file data...");
    const response = await driveApi(downloadUrl, token);
    const blob = await response.blob();

    if (!blob.size) throw new Error("Google Drive returned an empty file.");

    // 4. Trigger Browser Download
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = filename;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);

    updateProgress(100, "Complete", `Downloaded ${filename}`);
    showStatus(
      `Successfully downloaded ${filename} (${(blob.size / 1024 / 1024).toFixed(2)} MB)`,
      "success",
    );
  } catch (error) {
    console.error("Export Error:", error);
    showStatus(
      error.message || "Export failed. Check your OAuth setup.",
      "error",
    );
    updateProgress(0, "Failed", error.message);
  } finally {
    isProcessing = false;
    setButtonLoading(driveExportBtn, false);
    setTimeout(hideProgress, 2000);
  }
});

// --- Page Capture Logic ---
startCaptureBtn.addEventListener("click", async () => {
  if (isProcessing) return;
  isProcessing = true;
  hideProgress();

  // Get Active Tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  activeTabId = tab.id;

  if (!activeTabId || !activeTabId > 0) {
    showStatus("Could not find the active tab.", "error");
    isProcessing = false;
    return;
  }

  // Check if content script is injected, if not, inject it
  try {
    // Try to send a ping to see if it's already there
    await chrome.tabs.sendMessage(activeTabId, { type: "PING" });
  } catch {
    // If it fails, inject it
    try {
      await chrome.scripting.executeScript({
        target: { tabId: activeTabId },
        files: ["content.js"],
      });
    } catch (e) {
      showStatus(
        `Could not inject script into this tab. Is it a special page (chrome://, extension)?`,
        "error",
      );
      isProcessing = false;
      return;
    }
  }

  const quality = Number($("quality").value);

  setButtonLoading(startCaptureBtn, true, "Capturing...");
  updateProgress(5, "Scanning", "Looking for rendered page images...");
  showStatus("Scanning active tab for pages...", "info");

  try {
    // Send message to content script to start export
    // The content script will handle the heavy lifting and send back progress updates
    const result = await chrome.tabs.sendMessage(activeTabId, {
      type: "DFT_EXPORT",
      quality: quality,
    });

    if (result && result.error) {
      throw new Error(result.error);
    }

    // If the content script returns success immediately (synchronous return for simple cases)
    // OR if it relies on the download happening in the content script context
    // In our previous content.js, the download happens in the content script.
    // So we just wait for the response.

    showStatus(
      result?.message || "PDF generated and download triggered.",
      "success",
    );
    updateProgress(100, "Complete", "PDF Download Started");
  } catch (error) {
    console.error("Capture Error:", error);
    showStatus(
      error.message ||
        "Capture failed. Ensure the tab is a Google Doc/Drive page.",
      "error",
    );
    updateProgress(0, "Failed", error.message);
  } finally {
    isProcessing = false;
    setButtonLoading(startCaptureBtn, false);
    setTimeout(hideProgress, 3000);
  }
});

// Listen for progress updates from content script
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "DFT_PROGRESS") {
    updateProgress(
      message.percent,
      message.label || "Processing",
      message.status || "",
    );
  }
});
