pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

let cancelRequested = false;

function getSettings() {
  const format  = document.querySelector("input[name='outputFormat']:checked").value;
  const quality = document.querySelector("input[name='outputQuality']:checked").value;

  let scale, compressionQuality;
  switch (quality) {
    case "low":   scale = 1.0; compressionQuality = 0.65; break;
    case "medium": scale = 1.5; compressionQuality = 0.85; break;
    case "high":   scale = 2.0; compressionQuality = 0.92; break;
    case "ultra":  scale = 3.0; compressionQuality = 0.97; break;
    default:       scale = 1.5; compressionQuality = 0.85;
  }

  let mimeType, ext;
  switch (format) {
    case "jpeg": mimeType = "image/jpeg"; ext = "jpg"; break;
    case "png":  mimeType = "image/png";  ext = "png"; break;
    case "webp": mimeType = "image/webp"; ext = "webp"; break;
    default:     mimeType = "image/jpeg"; ext = "jpg";
  }

  return { scale, compressionQuality, mimeType, ext };
}

function showEl(id) { document.getElementById(id).classList.remove("hidden"); }
function hideEl(id) { document.getElementById(id).classList.add("hidden"); }

function updateProgress(current, total) {
  const pct = Math.round((current / total) * 100);
  document.getElementById("progressBar").style.width = pct + "%";
  document.getElementById("progressPct").textContent = pct + "%";
}

function resetUI() {
  cancelRequested = false;
  hideEl("processingSection");
  hideEl("resultSection");
  hideEl("cancelMsg");
  hideEl("thumbsCard");

  document.getElementById("progressBar").style.width = "0%";
  document.getElementById("progressPct").textContent = "0%";
  document.getElementById("thumbs").innerHTML = "";
  document.getElementById("download").style.display = "none";
  document.getElementById("downloadNote").style.display = "none";
}

function addThumb(blobUrl, filename, caption) {
  showEl("thumbsCard");

  const div = document.createElement("div");
  div.className = "thumb";

  const a = document.createElement("a");
  a.href = blobUrl;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  a.download = filename;

  const img = document.createElement("img");
  img.src = blobUrl;
  img.alt = caption;
  img.loading = "lazy";

  const cap = document.createElement("div");
  cap.className = "thumb-caption";
  cap.textContent = caption;

  a.appendChild(img);
  div.appendChild(a);
  div.appendChild(cap);
  document.getElementById("thumbs").appendChild(div);
}

async function processFiles(files) {
  const fileInput = document.getElementById("fileInput");
  fileInput.disabled = true;
  cancelRequested = false;

  showEl("processingSection");
  document.getElementById("thumbs").innerHTML = "";
  hideEl("thumbsCard");

  const settings = getSettings();

  // 全ページ数カウント & PDF読み込み
  let totalPages = 0;
  const pdfDocs = [];
  for (const file of files) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    totalPages += pdf.numPages;
    pdfDocs.push({ file, pdf });
  }

  const singlePage = totalPages === 1;
  const zip = singlePage ? null : new JSZip();
  let singleBlobUrl = null;
  let singleFilename = null;
  let processedPages = 0;

  for (const { file, pdf } of pdfDocs) {
    if (cancelRequested) break;

    const baseName = file.name.replace(/\.pdf$/i, "");

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      if (cancelRequested) break;

      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: settings.scale });

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      canvas.width  = viewport.width;
      canvas.height = viewport.height;

      // JPEG は透明→黒化を防ぐため白背景で塗りつぶす
      if (settings.mimeType === "image/jpeg") {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      await page.render({ canvasContext: ctx, viewport }).promise;

      const dataUrl = canvas.toDataURL(settings.mimeType, settings.compressionQuality);
      canvas.width = 0;
      canvas.height = 0;

      const pageStr   = String(pageNum).padStart(3, "0");
      const filename  = `${baseName}_${pageStr}.${settings.ext}`;
      const base64    = dataUrl.split(",")[1];
      const byteArr   = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
      const blob      = new Blob([byteArr], { type: settings.mimeType });
      const blobUrl   = URL.createObjectURL(blob);

      if (singlePage) {
        singleBlobUrl  = blobUrl;
        singleFilename = filename;
      } else {
        zip.file(filename, base64, { base64: true });
      }

      const thumbCaption = pdfDocs.length > 1
        ? `${baseName} p.${pageNum}`
        : `p.${pageNum}`;
      addThumb(blobUrl, filename, thumbCaption);

      processedPages++;
      updateProgress(processedPages, totalPages);

      await new Promise(r => setTimeout(r, 30));
    }
  }

  fileInput.disabled = false;
  hideEl("processingSection");

  if (cancelRequested) {
    showEl("cancelMsg");
    setTimeout(() => hideEl("cancelMsg"), 2500);
    return;
  }

  const downloadEl = document.getElementById("download");

  if (singlePage) {
    downloadEl.href     = singleBlobUrl;
    downloadEl.download = singleFilename;
    downloadEl.textContent = `画像をダウンロード (.${settings.ext})`;
  } else {
    document.getElementById("completeMsgText").textContent = "ZIPを生成中...";
    showEl("resultSection");
    const zipBlob = await zip.generateAsync({ type: "blob" });
    downloadEl.href     = URL.createObjectURL(zipBlob);
    downloadEl.download = `converted_${settings.ext}.zip`;
    downloadEl.textContent = `ZIPでダウンロード（${totalPages}枚）`;
  }

  downloadEl.style.display = "flex";
  document.getElementById("downloadNote").style.display = "block";
  document.getElementById("completeMsgText").textContent =
    `変換が完了しました（${totalPages}枚）`;

  showEl("resultSection");
}

// ファイルボタン
document.getElementById("fileButton").addEventListener("click", (e) => {
  e.stopPropagation();
  document.getElementById("fileInput").click();
});

// アップロードゾーン全体のタップ
const dropArea = document.getElementById("dropArea");
dropArea.addEventListener("click", () => {
  document.getElementById("fileInput").click();
});

document.getElementById("fileInput").addEventListener("change", (e) => {
  const files = Array.from(e.target.files).filter(f =>
    f.name.toLowerCase().endsWith(".pdf")
  );
  e.target.value = "";
  if (files.length === 0) return;
  resetUI();
  processFiles(files);
});

// ドラッグ＆ドロップ
dropArea.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropArea.classList.add("dragover");
});
dropArea.addEventListener("dragleave", () => dropArea.classList.remove("dragover"));
dropArea.addEventListener("drop", (e) => {
  e.preventDefault();
  dropArea.classList.remove("dragover");
  const files = Array.from(e.dataTransfer.files).filter(f =>
    f.name.toLowerCase().endsWith(".pdf")
  );
  if (files.length === 0) {
    alert("PDFファイルをドロップしてください");
    return;
  }
  resetUI();
  processFiles(files);
});

// キャンセル
document.getElementById("cancelBtn").addEventListener("click", () => {
  cancelRequested = true;
});

// リセット
document.getElementById("resetBtn").addEventListener("click", resetUI);
