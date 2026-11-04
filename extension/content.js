// content.js

let isListening = false;
let overlay;

// --- PDF Generation (Minimal Writer) ---
// Reuses your existing makePdf logic but ensures it handles the auto-captured images
function makePdf(pages) {
  const enc = (s) => new TextEncoder().encode(s);
  const chunks = [];
  const offsets = [0];
  let pos = 0;
  const push = (b) => {
    chunks.push(b);
    pos += b.length;
  };
  const obj = (n, b) => {
    offsets[n] = pos;
    push(enc(`${n} 0 obj\n`));
    push(b);
    push(enc("\nendobj\n"));
  };

  push(enc("%PDF-1.4\n"));
  const pageIds = pages.map((_, i) => 4 + i * 3);
  const contentIds = pages.map((_, i) => 5 + i * 3);
  const imageIds = pages.map((_, i) => 6 + i * 3);

  obj(1, enc("<< /Type /Catalog /Pages 2 0 R >>"));
  obj(
    2,
    enc(
      `<< /Type /Pages /Kids [${pageIds.map((x) => x + " 0 R").join(" ")}] /Count ${pages.length} >>`,
    ),
  );
  obj(3, enc("<< /Producer (DriveFile Toolkit) >>"));

  pages.forEach((p, i) => {
    const w = 595.28,
      h = 841.89; // A4
    const scale = Math.min(w / p.w, h / p.h);
    const iw = p.w * scale,
      ih = p.h * scale;
    const x = (w - iw) / 2,
      y = (h - ih) / 2;

    obj(
      pageIds[i],
      enc(
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${w} ${h}] /Resources << /XObject << /Im${i} ${imageIds[i]} 0 R >> >> /Contents ${contentIds[i]} 0 R >>`,
      ),
    );

    const stream = enc(`q ${iw} 0 0 ${ih} ${x} ${y} cm /Im${i} Do Q`);
    obj(
      contentIds[i],
      enc(
        `<< /Length ${stream.length} >>\nstream\n${new TextDecoder().decode(stream)}\nendstream`,
      ),
    );

    // p.data is a dataURL. We need raw bytes for DCTDecode (JPEG)
    const raw = atob(p.data.split(",")[1]);
    const bytes = new Uint8Array(raw.length);
    for (let j = 0; j < raw.length; j++) bytes[j] = raw.charCodeAt(j);

    const head = enc(
      `<< /Type /XObject /Subtype /Image /Width ${p.w} /Height ${p.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${bytes.length} >>\nstream\n`,
    );
    const tail = enc("\nendstream");
    const body = new Uint8Array(head.length + bytes.length + tail.length);
    body.set(head);
    body.set(bytes, head.length);
    body.set(tail, head.length + bytes.length);
    obj(imageIds[i], body);
  });

  const xref = pos;
  push(enc(`xref\n0 ${offsets.length}\n0000000000 65535 f \n`));
  for (let i = 1; i < offsets.length; i++)
    push(enc(String(offsets[i]).padStart(10, "0") + " 00000 n \n"));
  push(
    enc(
      `trailer\n<< /Size ${offsets.length} /Root 1 0 R /Info 3 0 R >>\nstartxref\n${xref}\n%%EOF`,
    ),
  );

  const out = new Uint8Array(pos);
  let at = 0;
  for (const c of chunks) {
    out.set(c, at);
    at += c.length;
  }
  return out;
}

// --- Core Logic ---

function showOverlay(message) {
  if (overlay) overlay.remove();
  overlay = document.createElement("div");
  overlay.id = "dft-overlay";
  overlay.innerHTML = `
        <div style="padding: 12px; font-family: system-ui, sans-serif; font-size: 14px; color: #fff; background: #14243a; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); position: fixed; bottom: 20px; left: 20px; z-index: 999999; max-width: 400px;">
            <strong>DriveFile Toolkit</strong><br>
            <span id="dft-msg" style="color: #a0a0a0;">${message}</span>
        </div>
    `;
  document.documentElement.append(overlay);
}

function updateOverlay(message) {
  const el = document.getElementById("dft-msg");
  if (el) el.textContent = message;
}

function removeOverlay() {
  if (overlay) overlay.remove();
  overlay = null;
}

async function autoExport(quality = 0.9) {
  // Add this inside autoExport() before finding imgs if you have missing pages
  async function forceLoadAllPages() {
    const scrollHeight = document.body.scrollHeight;
    const clientHeight = window.innerHeight;
    let scrolled = 0;

    while (scrolled < scrollHeight) {
      window.scrollTo(0, scrolled);
      await new Promise((r) => setTimeout(r, 100)); // Wait for render
      scrolled += clientHeight / 2;
    }
    window.scrollTo(0, 0); // Back to top
    await new Promise((r) => setTimeout(r, 500)); // Final wait
  }
  // Call await forceLoadAllPages() at the start of autoExport() if needed.
  if (isListening) return { message: "Already running." };
  isListening = true;
  showOverlay("Scanning for rendered pages...");

  try {
    // 1. Find all blob: images. These are the rendered pages in Google Docs/Drive.
    const imgs = [...document.querySelectorAll("img")].filter((img) =>
      img.src.startsWith("blob:"),
    );

    if (imgs.length === 0) {
      throw new Error(
        "No rendered pages (blob images) found. Scroll through the document to load pages, then try again.",
      );
    }

    const pages = [];

    // 2. Process each blob image
    for (let i = 0; i < imgs.length; i++) {
      const img = imgs[i];
      updateOverlay(`Processing page ${i + 1} of ${imgs.length}...`);

      try {
        // Create canvas to draw the blob image
        const canvas = document.createElement("canvas");
        // Use natural dimensions if available, otherwise fallback to displayed size
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // Convert to JPEG DataURL
        const dataUrl = canvas.toDataURL("image/jpeg", quality);

        // Basic validation: ensure image isn't empty
        if (dataUrl.length > 100) {
          pages.push({
            data: dataUrl,
            w: canvas.width,
            h: canvas.height,
          });
        }
      } catch (e) {
        console.warn(`Failed to process blob image ${i}:`, e);
      }
    }

    if (pages.length === 0) {
      throw new Error("No valid pages could be captured.");
    }

    // 3. Build PDF
    updateOverlay("Generating PDF...");
    const pdfBytes = makePdf(pages);

    // 4. Trigger Download
    const blob = new Blob([pdfBytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `drive-document-${Date.now()}.pdf`;
    a.click();
    URL.revokeObjectURL(url);

    updateOverlay(`Success! Downloaded ${pages.length} pages.`);
    setTimeout(removeOverlay, 3000);
    return { message: `Created PDF with ${pages.length} page image(s).` };
  } catch (error) {
    updateOverlay(`Error: ${error.message}`);
    return { message: error.message };
  } finally {
    isListening = false;
  }
}

// --- Message Listener ---
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "DFT_START") {
    // For now, Start just triggers the auto-export immediately.
    // You can modify this to enter a "select mode" if you still want manual override,
    // but the request was to fix the "can't download" issue, which implies the auto-scroll/blob method is preferred.
    // If you want to keep the "click to start" behavior, just call autoExport here.
    autoExport().then(sendResponse);
    return true; // async
  }

  if (msg.type === "DFT_EXPORT") {
    autoExport(msg.quality).then(sendResponse);
    return true;
  }
});
