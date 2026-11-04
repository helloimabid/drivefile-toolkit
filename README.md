# DriveFile Toolkit

Chrome Manifest V3 extension + Cloudflare Worker starter for exporting Google Drive files that the signed-in user is permitted to download, plus local PDF creation from user-selected page images.

## Features

- Google OAuth sign-in through Chrome Identity.
- Accepts a Drive file URL or file ID.
- Reads Drive metadata and checks `capabilities.canDownload`.
- Downloads permitted binary files through Drive API.
- Exports Google Docs, Sheets, and Slides to PDF when Drive permits it.
- Refuses export when Drive reports `canDownload: false`.
- Optional manual image selection and local PDF reconstruction for content the user is authorized to reproduce.
- File bytes stay in the browser; the Cloudflare Worker is not in the file-download path.

## Configure Google OAuth (required)

1. Create/select a project in Google Cloud Console and enable the Google Drive API.
2. Configure the OAuth consent screen.
3. Create an OAuth client ID of type **Chrome Extension** and enter the extension ID shown at `chrome://extensions`.
4. Replace `REPLACE_WITH_CHROME_EXTENSION_OAUTH_CLIENT_ID` in `extension/manifest.json`.
5. Keep the `drive.readonly` scope declaration. Google may require OAuth app verification for public distribution because this is a restricted/sensitive data-access scope; review Google's current requirements before publishing.
6. Reload the unpacked extension.

The extension requests interactive sign-in only when the user starts an export. Tokens are handled by Chrome Identity and are not sent to the Cloudflare Worker.

## Install locally

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Select **Load unpacked** and choose the `extension/` directory.
4. Complete the OAuth configuration above.
5. Paste a Drive file URL or ID into the popup and choose **Check permission & export**.

## Drive API behavior

- For ordinary files, the extension requests `files.get?alt=media`.
- For Google Docs, Sheets, and Slides, it requests `files.export?mimeType=application/pdf`.
- Before either operation, it requests file metadata including `capabilities.canDownload`.
- If that capability is false or absent, the extension stops. It does not inspect private viewer internals, scrape protected page resources, or defeat download restrictions.

Some file types have Drive API export limitations or size limits. The extension displays API errors rather than attempting a viewer-based workaround.

## Cloudflare Worker

The Worker remains a health/status API only. The browser downloads directly from Google's API so OAuth tokens and file contents are not proxied or stored by this service. Run it with `cd worker && npm install && npm run dev`, then deploy with `npm run deploy`.

## Privacy and security

- Never commit OAuth client secrets or access tokens.
- Chrome extension OAuth uses a public client ID; do not treat it as a secret.
- File bytes are processed in the popup/browser and are not uploaded by this implementation.
- Use only files you own or are authorized to download or reproduce.
