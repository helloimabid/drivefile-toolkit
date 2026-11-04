# DriveFile Toolkit

A Chrome Manifest V3 extension + Cloudflare Worker starter for **authorized browser-side capture** of pages you are permitted to reproduce.

## What it does
- Chrome extension popup lets the user start capture on the active tab.
- Content script captures only images explicitly marked as pages in a user-selected, authorized document workflow (and offers a manual page-image selection mode).
- Captures are converted locally into a PDF using jsPDF.
- Optional Worker API provides a health endpoint and short-lived job metadata; it does not fetch Google Drive viewer internals, bypass access controls, or proxy protected content.

## Important boundary
This starter intentionally does **not** scrape private Google Drive viewer internals, defeat disabled-download controls, automate scrolling to extract restricted content, or use authenticated cookies/tokens to retrieve files. Use it only for content you own or have permission to reproduce. For Google Drive files, prefer Drive API `files.get` / `files.export` when the account and file permissions allow it.

## Project layout
- `extension/`: Chrome MV3 extension (popup, content script, service worker)
- `worker/`: Cloudflare Worker API
- `web/`: simple landing page
- `wrangler.toml`: Worker config

## Run locally
1. Install Node.js 20+.
2. `cd worker && npm install`
3. `npx wrangler dev`
4. In Chrome, open `chrome://extensions`, enable Developer mode, choose **Load unpacked**, and select `extension/`.
5. Open an authorized document page that contains page images you are allowed to reproduce. Use the extension popup and select the images/pages in the capture UI.

## Deploy Worker
1. `cd worker`
2. `npx wrangler login`
3. Set `name` and `account_id` in `wrangler.toml` if needed.
4. `npm run deploy`

## Production hardening
- Add Cloudflare Turnstile or authenticated access before exposing write endpoints.
- Configure CORS to your exact website origin.
- Add rate limiting and abuse monitoring.
- Keep all file bytes in the browser unless you have a clear reason and consent to upload them.
- Add privacy notice, retention policy, and copyright/permission workflow.


## Notes on capture behavior
The extension intentionally requires the user to click each image. It uses ordinary page DOM image elements and browser CORS rules. Images served cross-origin without CORS permission cannot be read; this is expected browser security behavior. It does not attempt to defeat those controls.

For best reliability, a future production version should use a dedicated upload input for user-provided images/PDFs, and Google Drive API OAuth for files that the signed-in user is allowed to download/export.
