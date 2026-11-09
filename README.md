# DriveFile Toolkit  |  [](https://www.google.com/search?q=https://github.com/helloimabid/DriveFile-Toolkit/releases) [](https://opensource.org/licenses/MIT)

> **The ultimate browser extension to bypass restrictions, export Google Drive files, and recover restricted PDFs from web viewers effortlessly.**

Official Website & Tool Hub: [drivefile-toolkit.helloimabid.com](https://drivefile-toolkit.helloimabid.com/)

---

## 🚀 Overview

**DriveFile Toolkit** is a powerful Manifest V3 Google Chrome extension engineered for power users, researchers, and students who need seamless access to documents. Whether you are dealing with files where the download button is disabled, or you need a reliable bridge to export Google Docs, Sheets, and Slides directly via API, DriveFile Toolkit bridges the gap.

### Key Capabilities

* **Direct URL & API Export**: Input any Google Drive file URL or ID to fetch, verify capabilities, and download files directly to your device. Automatically handles conversion of Google Native formats (Docs, Sheets, Slides) into clean PDF exports.


* **Restricted File & Page Recovery**: Bypasses viewing blocks on restricted web viewers by auto-scanning, rendering, and capturing high-fidelity `blob:` image nodes directly from the DOM.


* **Built-in Minimal PDF Writer**: Compiles captured page arrays directly into standardized A4 multi-page PDF documents locally inside your browser—keeping your data private and secure.


* **Cloudflare Workers License Verification & Credits**: Features integrated usage quota validation and secure activation key support via a serverless worker endpoint.



---

## 🛠️ Tech Stack

* **Extension Architecture**: Manifest V3 (Service Workers, Content Scripts, ActiveTab Permissions)


* **Frontend UI**: Modular vanilla CSS with custom dark mode themes, variable styling, glassmorphism elements, and responsive layout designs


* **Core Processing**: Modern JavaScript (ESNext), HTML5 Canvas Rendering, and a zero-dependency Native Minimal PDF Writer stream engine


* **Backend Authorization**: Google Identity API (`chrome.identity`) combined with Cloudflare Worker API routes for secure permission checks



---

## 📂 Project Structure

```text
DriveFile-Toolkit/
├── manifest.json        # Extension configuration & permission scopes (MV3)
├── popup.html           # Modern dark-themed user interface popup
├── popup.css            # Custom design stylesheet with glassmorphic cards
├── popup.js             # API management, OAuth flows, UI event triggers
├── content.js           # DOM page analyzer, blob image extractor, PDF builder
└── service-worker.js    # Background runtime lifecycle listener

```

---

## ⚙️ Installation & Setup (Developer Mode)

To load and run **DriveFile Toolkit** locally in your browser:

1. **Clone or Download** this repository to your local machine:
```bash
git clone https://github.com/helloimabid/DriveFile-Toolkit.git

```


2. Open Google Chrome and navigate to `chrome://extensions/`.
3. Enable **Developer mode** using the toggle switch in the top-right corner.
4. Click the **Load unpacked** button in the top-left corner.
5. Select the folder containing the project files (`DriveFile-Toolkit`).
6. Pin **DriveFile Toolkit** to your extension toolbar for quick access!

> *Note: Remember to replace the placeholder `client_id` inside `manifest.json` with your own Google Cloud Console OAuth extension client ID if you are building a custom production release.*

---

## 💡 How It Works

1. **URL Export Tab**: Paste any Google Drive document link or file ID. The extension authenticates your session, verifies file permissions via the Google Drive REST API v3, and triggers a clean download stream.


2. **Page Recovery Tab**: If a document viewer restricts downloads, scroll down the target page to let the viewer lazily load all page images into memory. Click **Recover & Export PDF**, and the background script aggregates the rendered canvas nodes into an optimized A4 PDF file.



---

## 👤 Author

Developed with passion by **Sadman Abid**.

* Website: [helloimabid.com](https://helloimabid.com)


* GitHub: [@helloimabid](https://github.com/helloimabid)

---

## 📝 License

This project is open-source and available under the [MIT License](https://www.google.com/search?q=LICENSE).
