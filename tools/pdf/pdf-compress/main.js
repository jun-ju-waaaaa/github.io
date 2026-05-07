pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

const { PDFDocument } = PDFLib;
let isCanceled = false;
const isMobile = window.innerWidth < 768;

function dataURLToUint8Array(dataURL) {
  const base64 = dataURL.split(',')[1];
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function getPresetSettings() {
  const preset = document.querySelector("input[name='qualityPreset']:checked").value;
  let setting = {};
  switch (preset) {
    case "mobile": setting = { dpi: 110, quality: 0.5 }; break;
    case "pc":     setting = { dpi: 150, quality: 0.6 }; break;
    case "pc-hi":  setting = { dpi: 300, quality: 0.8 }; break;
    case "print":  setting = { dpi: 220, quality: 0.8 }; break;
    case "min":    setting = { dpi: 72,  quality: 0.3 }; break;
    default:       setting = { dpi: 150, quality: 0.6 };
  }
  if (isMobile && setting.dpi > 160) {
    setting.dpi = 160;
    setting.quality = 0.6;
  }
  return setting;
}

function updateProgress(percent) {
  const pct = Math.round(percent);
  const bar = document.getElementById("progressBar");
  const pctText = document.getElementById("progressPct");
  if (bar) bar.style.width = pct + "%";
  if (pctText) pctText.textContent = pct + "%";
}

function showEl(id) { document.getElementById(id).classList.remove("hidden"); }
function hideEl(id) { document.getElementById(id).classList.add("hidden"); }

function resetUI() {
  updateProgress(0);
  hideEl("processingSection");
  hideEl("resultSection");
  hideEl("cancelMsg");

  document.getElementById("download").style.display = "none";
  document.getElementById("completeList").innerHTML = "";
  document.getElementById("downloadNote").style.display = "none";
  isCanceled = false;
}

async function compressPDF(file) {
  const { dpi, quality } = getPresetSettings();
  const scale = dpi / 72;

  let pdf, loadingTask;
  try {
    const arrayBuffer = await file.arrayBuffer();
    loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    pdf = await loadingTask.promise;
  } catch (e) {
    alert("PDFの読み込みに失敗しました。ファイルが壊れているか、パスワードがかかっている可能性があります。");
    return null;
  }

  const newPdf = await PDFDocument.create();
  const totalPages = pdf.numPages;

  for (let i = 1; i <= totalPages; i++) {
    if (isCanceled) {
      loadingTask.destroy();
      return null;
    }

    try {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 1 });
      const renderViewport = page.getViewport({ scale });

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      canvas.width = renderViewport.width;
      canvas.height = renderViewport.height;

      await page.render({ canvasContext: ctx, viewport: renderViewport }).promise;

      const jpegDataUrl = canvas.toDataURL("image/jpeg", quality);
      const jpegBytes = dataURLToUint8Array(jpegDataUrl);
      const embeddedJpeg = await newPdf.embedJpg(jpegBytes);

      const newPage = newPdf.addPage([viewport.width, viewport.height]);
      newPage.drawImage(embeddedJpeg, { x: 0, y: 0, width: viewport.width, height: viewport.height });

      canvas.width = 0;
      canvas.height = 0;

      updateProgress((i / totalPages) * 100);

      await new Promise(r => setTimeout(r, isMobile ? 400 : 100));
    } catch (err) {
      console.error(`Page ${i} error:`, err);
    }
  }

  loadingTask.destroy();
  const pdfBytes = await newPdf.save();
  return new Blob([pdfBytes], { type: "application/pdf" });
}

async function handleSingle(file) {
  resetUI();
  document.getElementById("progressText").textContent = file.name;
  showEl("processingSection");

  const result = await compressPDF(file);
  if (isCanceled || !result) return;

  const url = URL.createObjectURL(result);
  const downloadLink = document.getElementById("download");
  downloadLink.href = url;
  downloadLink.download = file.name.replace(/\.pdf$/i, "_compressed.pdf");
  downloadLink.style.display = "flex";

  document.getElementById("completeMsgText").textContent = "圧縮が完了しました！";
  document.getElementById("downloadNote").style.display = "block";

  hideEl("processingSection");
  showEl("resultSection");
}

async function handleMultiple(files) {
  resetUI();
  showEl("processingSection");

  const list = document.getElementById("completeList");

  for (let idx = 0; idx < files.length; idx++) {
    if (isCanceled) break;

    const file = files[idx];
    updateProgress(0);
    document.getElementById("progressText").textContent = `${file.name}（${idx + 1}/${files.length}）`;

    const result = await compressPDF(file);
    if (!result) continue;

    const url = URL.createObjectURL(result);

    const li = document.createElement("li");

    const nameSpan = document.createElement("span");
    nameSpan.className = "file-name";
    nameSpan.textContent = file.name;

    const saveBtn = document.createElement("button");
    saveBtn.textContent = "保存";
    saveBtn.className = "btn btn-success save-btn";
    saveBtn.addEventListener("click", () => {
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name.replace(/\.pdf$/i, "_compressed.pdf");
      document.body.appendChild(a);
      a.click();
      a.remove();
    });

    li.appendChild(nameSpan);
    li.appendChild(saveBtn);
    list.appendChild(li);

    await new Promise(r => setTimeout(r, 100));
  }

  document.getElementById("completeMsgText").textContent = "すべての処理が完了しました";
  document.getElementById("downloadNote").style.display = "block";

  hideEl("processingSection");
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
  const files = [...e.target.files];
  if (files.length === 0) return;
  e.target.value = "";
  if (files.length === 1) handleSingle(files[0]);
  else handleMultiple(files);
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
  const files = [...e.dataTransfer.files].filter(f => f.type === "application/pdf");
  if (files.length === 0) return;
  if (files.length === 1) handleSingle(files[0]);
  else handleMultiple(files);
});

// キャンセル
document.getElementById("cancelBtn").addEventListener("click", () => {
  isCanceled = true;
  hideEl("processingSection");
  showEl("cancelMsg");
  setTimeout(() => hideEl("cancelMsg"), 2500);
});

// リセット
document.getElementById("resetBtn").addEventListener("click", resetUI);
