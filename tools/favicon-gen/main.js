/* =============================================
   Favicon Generator – main.js
   ============================================= */
'use strict';

const SIZES = [16, 32, 48, 64, 128, 180, 192, 512];
const PREVIEW_SIZES = [16, 32, 64, 128, 192];

let mode = 'text';
let uploadedImage = null;
let generatedBlobs = null;
let individualBlobUrls = [];

// --- DOM refs ---
const modeText  = document.getElementById('mode-text');
const modeImage = document.getElementById('mode-image');
const panelText = document.getElementById('panel-text');
const panelImg  = document.getElementById('panel-image');

const textInput  = document.getElementById('favicon-text');
const bgColor    = document.getElementById('bg-color');
const fgColor    = document.getElementById('fg-color');
const bgValue    = document.getElementById('bg-value');
const fgValue    = document.getElementById('fg-value');
const shapeGroup = document.getElementById('shape-group');
const fontGroup  = document.getElementById('font-group');

const uploadZone = document.getElementById('upload-zone');
const fileInput  = document.getElementById('file-input');
const uploadStatus = document.getElementById('upload-status');

const previewSizes = document.getElementById('preview-sizes');
const btnGenerate  = document.getElementById('btn-generate');
const dlSection    = document.getElementById('dl-section');
const btnDlZip     = document.getElementById('btn-dl-zip');
const codeBlock    = document.getElementById('code-block');
const btnCopyCode  = document.getElementById('btn-copy-code');

// --- Mode switch ---
modeText.addEventListener('click',  () => switchMode('text'));
modeImage.addEventListener('click', () => switchMode('image'));

function switchMode(m) {
  mode = m;
  modeText.classList.toggle('active',  m === 'text');
  modeImage.classList.toggle('active', m === 'image');
  panelText.style.display  = m === 'text'  ? '' : 'none';
  panelImg.style.display   = m === 'image' ? '' : 'none';
  updatePreview();
}

// --- Color pickers ---
bgColor.addEventListener('input', () => { bgValue.textContent = bgColor.value; updatePreview(); });
fgColor.addEventListener('input', () => { fgValue.textContent = fgColor.value; updatePreview(); });
bgValue.textContent = bgColor.value;
fgValue.textContent = fgColor.value;

// --- Text input ---
textInput.addEventListener('input', updatePreview);

// --- Shape buttons ---
shapeGroup.querySelectorAll('.opt-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    shapeGroup.querySelectorAll('.opt-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    updatePreview();
  });
});

// --- Font buttons ---
fontGroup.querySelectorAll('.opt-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    fontGroup.querySelectorAll('.opt-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    updatePreview();
  });
});

// --- Upload ---
uploadZone.addEventListener('click', () => fileInput.click());
uploadZone.addEventListener('dragover', e => { e.preventDefault(); uploadZone.classList.add('drag-over'); });
uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('drag-over'));
uploadZone.addEventListener('drop', e => {
  e.preventDefault();
  uploadZone.classList.remove('drag-over');
  const f = e.dataTransfer.files[0];
  if (f) loadImageFile(f);
});
fileInput.addEventListener('change', () => {
  if (fileInput.files[0]) loadImageFile(fileInput.files[0]);
});

function loadImageFile(file) {
  if (!file.type.startsWith('image/')) {
    uploadStatus.textContent = '画像ファイルを選択してください。';
    return;
  }
  const reader = new FileReader();
  reader.onload = e => {
    const img = new Image();
    img.onload = () => {
      uploadedImage = img;
      uploadStatus.textContent = `読み込み完了: ${file.name} (${img.width}×${img.height}px)`;
      updatePreview();
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

// --- Get current shape ---
function getShape() {
  const btn = shapeGroup.querySelector('.opt-btn.active');
  return btn ? btn.dataset.shape : 'square';
}

// --- Get current font ---
function getFont() {
  const btn = fontGroup.querySelector('.opt-btn.active');
  return btn ? btn.dataset.font : 'sans';
}

const fontMap = {
  sans:  '-apple-system, BlinkMacSystemFont, "Noto Sans JP", sans-serif',
  serif: 'Georgia, "Noto Serif JP", serif',
  mono:  '"Courier New", Consolas, monospace',
};

// --- Draw favicon to canvas ---
function drawToCanvas(canvas, size) {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, size, size);

  if (mode === 'text') {
    const bg = bgColor.value;
    const fg = fgColor.value;
    const shape = getShape();
    const radius = shape === 'square' ? size * 0.12
                 : shape === 'rounded' ? size * 0.3
                 : size * 0.5;

    // Background
    ctx.beginPath();
    if (shape === 'circle') {
      ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    } else {
      roundRect(ctx, 0, 0, size, size, radius);
    }
    ctx.fillStyle = bg;
    ctx.fill();

    // Text
    const text = textInput.value.trim().slice(0, 2) || '?';
    const fontFamily = fontMap[getFont()] || fontMap.sans;
    const fontSize = text.length === 1 ? size * 0.62 : size * 0.5;
    ctx.font = `700 ${fontSize}px ${fontFamily}`;
    ctx.fillStyle = fg;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // Slight vertical adjustment for optical centering
    ctx.fillText(text, size / 2, size / 2 + fontSize * 0.04);

  } else if (mode === 'image' && uploadedImage) {
    const img = uploadedImage;
    const srcW = img.width, srcH = img.height;
    const aspect = srcW / srcH;
    let dw, dh, dx, dy;
    if (aspect >= 1) {
      dw = size; dh = size / aspect;
      dx = 0; dy = (size - dh) / 2;
    } else {
      dh = size; dw = size * aspect;
      dy = 0; dx = (size - dw) / 2;
    }
    ctx.drawImage(img, dx, dy, dw, dh);
  }
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

// --- Live preview update ---
function updatePreview() {
  // 前回生成の blob URL を解放
  individualBlobUrls.forEach(u => URL.revokeObjectURL(u));
  individualBlobUrls = [];
  const indivDl = document.getElementById('individual-dl');
  if (indivDl) { indivDl.innerHTML = '<p class="individual-dl-label">▼ ファイルを個別にダウンロード</p>'; indivDl.style.display = 'none'; }

  previewSizes.innerHTML = '';
  PREVIEW_SIZES.forEach(size => {
    const item = document.createElement('div');
    item.className = 'preview-item';
    const wrap = document.createElement('div');
    wrap.className = 'preview-canvas-wrap';
    wrap.style.width  = size + 'px';
    wrap.style.height = size + 'px';
    const cv = document.createElement('canvas');
    cv.width = size; cv.height = size;
    drawToCanvas(cv, size);
    wrap.appendChild(cv);
    const lbl = document.createElement('div');
    lbl.className = 'preview-size-label';
    lbl.textContent = size + 'px';
    item.appendChild(wrap);
    item.appendChild(lbl);
    previewSizes.appendChild(item);
  });
  generatedBlobs = null;
  dlSection.style.display = 'none';
}

// Kick off initial preview
updatePreview();

// --- Generate all sizes ---
function getCanvasBlob(canvas, type, quality) {
  return new Promise(resolve => {
    canvas.toBlob(resolve, type, quality);
  });
}

btnGenerate.addEventListener('click', async () => {
  btnGenerate.disabled = true;
  btnGenerate.textContent = '生成中...';
  try {
    const blobs = {};
    for (const size of SIZES) {
      const cv = document.createElement('canvas');
      cv.width = size; cv.height = size;
      drawToCanvas(cv, size);
      blobs[size] = await getCanvasBlob(cv, 'image/png', 1.0);
    }

    // Build ICO (16, 32, 48)
    const icoBlob = await buildIco([
      { size: 16, blob: blobs[16] },
      { size: 32, blob: blobs[32] },
      { size: 48, blob: blobs[48] },
    ]);

    generatedBlobs = { pngs: blobs, ico: icoBlob };
    showDownload();
  } finally {
    btnGenerate.disabled = false;
    btnGenerate.innerHTML = '✅ ZIPをダウンロード準備完了';
  }
});

// --- Build ICO file ---
async function buildIco(entries) {
  // Modern ICO: embeds PNG data directly
  const pngDatas = await Promise.all(entries.map(e => e.blob.arrayBuffer()));
  const count = entries.length;
  const headerSize = 6;
  const dirEntrySize = 16;
  const totalDirSize = dirEntrySize * count;
  const totalSize = headerSize + totalDirSize + pngDatas.reduce((s, d) => s + d.byteLength, 0);
  const buf = new ArrayBuffer(totalSize);
  const view = new DataView(buf);

  // ICONDIR header
  view.setUint16(0, 0, true);       // reserved
  view.setUint16(2, 1, true);       // type: 1 = icon
  view.setUint16(4, count, true);   // count

  let offset = headerSize + totalDirSize;
  entries.forEach((entry, i) => {
    const pngData = pngDatas[i];
    const base = headerSize + i * dirEntrySize;
    const s = entry.size;
    view.setUint8(base,     s >= 256 ? 0 : s);  // width
    view.setUint8(base + 1, s >= 256 ? 0 : s);  // height
    view.setUint8(base + 2, 0);                  // color count
    view.setUint8(base + 3, 0);                  // reserved
    view.setUint16(base + 4, 1, true);           // planes
    view.setUint16(base + 6, 32, true);          // bit count
    view.setUint32(base + 8,  pngData.byteLength, true);  // size
    view.setUint32(base + 12, offset, true);               // offset

    // Copy PNG data
    new Uint8Array(buf, offset, pngData.byteLength).set(new Uint8Array(pngData));
    offset += pngData.byteLength;
  });

  return new Blob([buf], { type: 'image/x-icon' });
}

// --- ファイルダウンロードトリガー（DOM追加方式・Android/iOS対応） ---
function triggerDownload(url, filename) {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { document.body.removeChild(a); }, 100);
}

// --- Show download section ---
function showDownload() {
  dlSection.style.display = 'block';

  // 個別ダウンロードリンクを生成
  const indivDl = document.getElementById('individual-dl');
  if (indivDl && generatedBlobs) {
    const files = [
      { name: 'favicon.ico',                blob: generatedBlobs.ico,        label: 'favicon.ico（16/32/48px）' },
      { name: 'favicon-16x16.png',          blob: generatedBlobs.pngs[16],   label: 'favicon-16x16.png' },
      { name: 'favicon-32x32.png',          blob: generatedBlobs.pngs[32],   label: 'favicon-32x32.png' },
      { name: 'favicon-48x48.png',          blob: generatedBlobs.pngs[48],   label: 'favicon-48x48.png' },
      { name: 'favicon-64x64.png',          blob: generatedBlobs.pngs[64],   label: 'favicon-64x64.png' },
      { name: 'favicon-128x128.png',        blob: generatedBlobs.pngs[128],  label: 'favicon-128x128.png' },
      { name: 'apple-touch-icon.png',       blob: generatedBlobs.pngs[180],  label: 'apple-touch-icon.png（180px）' },
      { name: 'android-chrome-192x192.png', blob: generatedBlobs.pngs[192],  label: 'android-chrome-192x192.png' },
      { name: 'android-chrome-512x512.png', blob: generatedBlobs.pngs[512],  label: 'android-chrome-512x512.png' },
    ];
    indivDl.innerHTML = '<p class="individual-dl-label">▼ ファイルを個別にダウンロード</p>';
    files.forEach(f => {
      const url = URL.createObjectURL(f.blob);
      individualBlobUrls.push(url);
      const a = document.createElement('a');
      a.href = url;
      a.download = f.name;
      a.className = 'btn-dl-single';
      a.textContent = '⬇ ' + f.label;
      indivDl.appendChild(a);
    });

    // スマホ・iOS では個別DLを表示
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (isIOS || window.innerWidth < 640) {
      indivDl.style.display = '';
    }
  }

  // HTML code snippet
  const code = `<link rel="icon" type="image/x-icon" href="/favicon.ico">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">`;
  codeBlock.textContent = code;
}

// --- Copy HTML code ---
btnCopyCode.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(codeBlock.textContent);
    btnCopyCode.textContent = '✅ コピーしました';
    setTimeout(() => { btnCopyCode.textContent = '📋 HTMLコードをコピー'; }, 2000);
  } catch {
    btnCopyCode.textContent = 'コピー失敗';
  }
});

// --- Download ZIP ---
btnDlZip.addEventListener('click', async () => {
  if (!generatedBlobs) return;
  btnDlZip.disabled = true;
  btnDlZip.textContent = '準備中...';
  try {
    const zip = new JSZip();

    zip.file('favicon.ico',                  generatedBlobs.ico);
    zip.file('favicon-16x16.png',            generatedBlobs.pngs[16]);
    zip.file('favicon-32x32.png',            generatedBlobs.pngs[32]);
    zip.file('favicon-48x48.png',            generatedBlobs.pngs[48]);
    zip.file('favicon-64x64.png',            generatedBlobs.pngs[64]);
    zip.file('favicon-128x128.png',          generatedBlobs.pngs[128]);
    zip.file('apple-touch-icon.png',         generatedBlobs.pngs[180]);
    zip.file('android-chrome-192x192.png',   generatedBlobs.pngs[192]);
    zip.file('android-chrome-512x512.png',   generatedBlobs.pngs[512]);

    const manifest = JSON.stringify({
      name: '',
      short_name: '',
      icons: [
        { src: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
        { src: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' },
      ],
      theme_color: '#ffffff',
      background_color: '#ffffff',
      display: 'standalone',
    }, null, 2);
    zip.file('site.webmanifest', manifest);

    const htmlCode = `<!-- <head> 内に貼り付けてください -->
<link rel="icon" type="image/x-icon" href="/favicon.ico">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
`;
    zip.file('head-code.html', htmlCode);

    const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
    const url = URL.createObjectURL(blob);
    triggerDownload(url, 'favicon-package.zip');
    setTimeout(() => URL.revokeObjectURL(url), 30000);

    btnDlZip.textContent = '✅ ダウンロード完了';
    setTimeout(() => {
      btnDlZip.textContent = '⬇️ ZIPをダウンロード';
      btnDlZip.disabled = false;
    }, 3000);
  } catch (err) {
    console.error(err);
    btnDlZip.textContent = 'エラーが発生しました';
    btnDlZip.disabled = false;
  }
});
