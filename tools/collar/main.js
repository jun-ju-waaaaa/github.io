let hue = 0;
let sat = 0;
let val = 100;

const slPanel = document.getElementById("slPanel");
const slThumb = document.getElementById("slThumb");
const hueSlider = document.getElementById("hueSlider");
const hueHandle = document.getElementById("hueHandle");
const preview = document.getElementById("preview");
const previewLabel = document.getElementById("previewLabel");
const savedList = document.getElementById("savedList");
const saveColorBtn = document.getElementById("saveColorBtn");

/* HSV → RGB */
function hsvToRgb(h, s, v) {
  s /= 100;
  v /= 100;
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;

  let r1, g1, b1;
  if (h < 60) { r1 = c; g1 = x; b1 = 0; }
  else if (h < 120) { r1 = x; g1 = c; b1 = 0; }
  else if (h < 180) { r1 = 0; g1 = c; b1 = x; }
  else if (h < 240) { r1 = 0; g1 = x; b1 = c; }
  else if (h < 300) { r1 = x; g1 = 0; b1 = c; }
  else { r1 = c; g1 = 0; b1 = x; }

  return {
    r: Math.round((r1 + m) * 255),
    g: Math.round((g1 + m) * 255),
    b: Math.round((b1 + m) * 255)
  };
}

/* RGB → HEX */
function rgbToHex(r, g, b) {
  const toHex = (v) => v.toString(16).padStart(2, "0");
  return "#" + toHex(r) + toHex(g) + toHex(b);
}

/* RGB → HSL */
function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r,g,b), min = Math.min(r,g,b);
  let h, s, l = (max + min) / 2;

  const d = max - min;
  if (d === 0) h = 0;
  else if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;

  h = Math.round(h * 60);
  if (h < 0) h += 360;

  s = d === 0 ? 0 : d / (1 - Math.abs(2*l - 1));
  s = Math.round(s * 100);
  l = Math.round(l * 100);

  return { h, s, l };
}

/* UI更新 */
function updateUI() {
  const { r, g, b } = hsvToRgb(hue, sat, val);
  const hex = rgbToHex(r, g, b);
  const hsl = rgbToHsl(r, g, b);

  preview.style.backgroundColor = hex;
  previewLabel.textContent = hex;

  document.querySelector('[data-type="hex"] [data-code]').textContent = hex;
  document.querySelector('[data-type="rgb"] [data-code]').textContent =
    `rgb(${r}, ${g}, ${b})`;
  document.querySelector('[data-type="hsl"] [data-code]').textContent =
    `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;
  document.querySelector('[data-type="rgba"] [data-code]').textContent =
    `rgba(${r}, ${g}, ${b}, 1)`;

  /* HSV の hue を CSS に渡す */
  slPanel.style.setProperty("--hue", hue);

  /* SL パネルのつまみ位置 */
  const rect = slPanel.getBoundingClientRect();
  slThumb.style.left = `${(sat / 100) * rect.width}px`;
  slThumb.style.top = `${((100 - val) / 100) * rect.height}px`;

  /* Hue ハンドル位置 */
  const rect2 = hueSlider.getBoundingClientRect();
  hueHandle.style.left = `${(hue / 360) * rect2.width}px`;
}

/* SLパネル操作 */
function handleSLMove(clientX, clientY) {
  const rect = slPanel.getBoundingClientRect();
  let x = clientX - rect.left;
  let y = clientY - rect.top;

  x = Math.max(0, Math.min(rect.width, x));
  y = Math.max(0, Math.min(rect.height, y));

  sat = Math.round((x / rect.width) * 100);
  val = Math.round(100 - (y / rect.height) * 100);

  updateUI();
}

/* Hueバー操作 */
function handleHueMove(clientX) {
  const rect = hueSlider.getBoundingClientRect();
  let x = clientX - rect.left;
  x = Math.max(0, Math.min(rect.width, x));

  hue = Math.round((x / rect.width) * 360);
  updateUI();
}

/* PC操作 */
slPanel.addEventListener("mousedown", (e) => {
  const move = (ev) => handleSLMove(ev.clientX, ev.clientY);
  const up = () => {
    window.removeEventListener("mousemove", move);
    window.removeEventListener("mouseup", up);
  };
  move(e);
  window.addEventListener("mousemove", move);
  window.addEventListener("mouseup", up);
});

hueSlider.addEventListener("mousedown", (e) => {
  const move = (ev) => handleHueMove(ev.clientX);
  const up = () => {
    window.removeEventListener("mousemove", move);
    window.removeEventListener("mouseup", up);
  };
  move(e);
  window.addEventListener("mousemove", move);
  window.addEventListener("mouseup", up);
});

/* スマホ操作 */
slPanel.addEventListener("touchstart", (e) => {
  e.preventDefault();
  const t = e.touches[0];
  handleSLMove(t.clientX, t.clientY);

  const move = (ev) => {
    ev.preventDefault();
    const touch = ev.touches[0];
    handleSLMove(touch.clientX, touch.clientY);
  };
  const end = () => {
    window.removeEventListener("touchmove", move);
    window.removeEventListener("touchend", end);
  };

  window.addEventListener("touchmove", move, { passive: false });
  window.addEventListener("touchend", end);
});

hueSlider.addEventListener("touchstart", (e) => {
  e.preventDefault();
  const t = e.touches[0];
  handleHueMove(t.clientX);

  const move = (ev) => {
    ev.preventDefault();
    const touch = ev.touches[0];
    handleHueMove(touch.clientX);
  };
  const end = () => {
    window.removeEventListener("touchmove", move);
    window.removeEventListener("touchend", end);
  };

  window.addEventListener("touchmove", move, { passive: false });
  window.addEventListener("touchend", end);
});

/* 保存色 */
saveColorBtn.addEventListener("click", () => {
  const { r, g, b } = hsvToRgb(hue, sat, val);
  const hex = rgbToHex(r, g, b);

  const item = document.createElement("div");
  item.className = "saved-item";
  item.style.backgroundColor = hex;

  item.addEventListener("click", () => {
    const rgb = item.style.backgroundColor.match(/\d+/g).map(Number);
    const [rr, gg, bb] = rgb;

    /* RGB → HSV に戻す */
    const max = Math.max(rr, gg, bb);
    const min = Math.min(rr, gg, bb);
    const d = max - min;

    let h = 0;
    if (d !== 0) {
      if (max === rr) h = ((gg - bb) / d) % 6;
      else if (max === gg) h = (bb - rr) / d + 2;
      else h = (rr - gg) / d + 4;
      h = Math.round(h * 60);
      if (h < 0) h += 360;
    }

    const v = Math.round((max / 255) * 100);
    const s = max === 0 ? 0 : Math.round((d / max) * 100);

    hue = h;
    sat = s;
    val = v;

    updateUI();
  });

  savedList.appendChild(item);
});

/* 初期表示 */
updateUI();
/* コピー機能 */
document.querySelectorAll(".copy-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const card = btn.closest(".code-card");
    const text = card.querySelector("[data-code]").textContent.trim();

    navigator.clipboard.writeText(text).then(() => {
      btn.classList.add("copied");
      setTimeout(() => btn.classList.remove("copied"), 600);
    });
  });
});

