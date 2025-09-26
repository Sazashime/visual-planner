// static/js/app.js
const PIXEL_SIZE = 40; // keep in sync with backend
const TILE_SIZE = 0.4; // meters

let products = {}; // will be fetched from /api/products
let selectedCode = null;
let eraserMode = false;

const paletteEl = document.getElementById("palette");
const previewEl = document.getElementById("preview");
const canvas = document.getElementById("gridCanvas");
const ctx = canvas.getContext("2d");
const generateBtn = document.getElementById("generate");
const calcBtn = document.getElementById("calculate");
const resultsEl = document.getElementById("results");
const eraseBtn = document.getElementById("erase");

let cols = 0, rows = 0;
let grid = []; // 2D array of codes
let painting = false;

async function fetchProducts() {
  const resp = await fetch("/api/products");
  products = await resp.json();
}

function buildPalette() {
  paletteEl.innerHTML = "";
  for (const code in products) {
    const p = products[code];
    const btn = document.createElement("div");
    btn.className = "tile-btn";
    btn.dataset.code = code;

    if (p.image) {
      const img = document.createElement("img");
      img.src = "/static/" + p.image;
      btn.appendChild(img);
    } else {
      const sw = document.createElement("div");
      sw.style.width = "48px";
      sw.style.height = "48px";
      sw.style.background = p.css_color || "#ddd";
      sw.style.border = "1px solid #aaa";
      sw.style.marginBottom = "6px";
      btn.appendChild(sw);
    }

    const label = document.createElement("div");
    label.style.fontSize = "11px";
    label.style.textAlign = "center";
    label.textContent = code;
    btn.appendChild(label);

    btn.addEventListener("click", () => {
      eraserMode = false;
      setSelected(code);
    });

    paletteEl.appendChild(btn);
  }
}

function setSelected(code) {
  selectedCode = code;
  // mark selected
  document.querySelectorAll(".tile-btn").forEach(el => el.classList.remove("selected"));
  const el = document.querySelector(`.tile-btn[data-code="${code}"]`);
  if (el) el.classList.add("selected");

  // update preview
  const p = products[code];
  previewEl.innerHTML = "";
  if (p.image) {
    const img = document.createElement("img");
    img.src = "/static/" + p.image;
    img.style.width = "120px";
    previewEl.appendChild(img);
  } else {
    const sw = document.createElement("div");
    sw.style.width = "120px";
    sw.style.height = "80px";
    sw.style.background = p.css_color || "#ddd";
    previewEl.appendChild(sw);
  }
  const info = document.createElement("div");
  info.style.marginTop = "6px";
  info.innerHTML = `<b>${code}</b><br>${p.name || ""}<br>${p.price ? p.price + " лв" : ""}`;
  previewEl.appendChild(info);
}

function generateGrid() {
  const w = parseFloat(document.getElementById("width").value) || 0;
  const h = parseFloat(document.getElementById("height").value) || 0;
  cols = Math.max(1, Math.ceil(w / TILE_SIZE));
  rows = Math.max(1, Math.ceil(h / TILE_SIZE));
  grid = Array.from({length: rows}, () => Array(cols).fill(""));

  canvas.width = cols * PIXEL_SIZE;
  canvas.height = rows * PIXEL_SIZE;
  drawGrid();
}

function drawGrid() {
  ctx.clearRect(0,0,canvas.width, canvas.height);
  ctx.strokeStyle = "#bbb";
  for (let r=0;r<rows;r++){
    for (let c=0;c<cols;c++){
      const x = c*PIXEL_SIZE, y = r*PIXEL_SIZE;
      // fill color if painted
      const code = grid[r][c];
      if (code) {
        const p = products[code];
        ctx.fillStyle = p.css_color || "#ddd";
        ctx.fillRect(x,y,PIXEL_SIZE,PIXEL_SIZE);
      } else {
        ctx.fillStyle = "#fff";
        ctx.fillRect(x,y,PIXEL_SIZE,PIXEL_SIZE);
      }
      ctx.strokeRect(x,y,PIXEL_SIZE,PIXEL_SIZE);
    }
  }
}

// canvas painting handlers
canvas.addEventListener("mousedown", (e) => {
  painting = true;
  paintAtEvent(e);
});
canvas.addEventListener("mousemove", (e) => {
  if (painting) paintAtEvent(e);
});
document.addEventListener("mouseup", () => { painting = false; });

function paintAtEvent(e) {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const c = Math.floor(x / PIXEL_SIZE);
  const r = Math.floor(y / PIXEL_SIZE);
  if (r>=0 && r<rows && c>=0 && c<cols) {
    if (eraserMode) {
      grid[r][c] = "";
    } else if (selectedCode) {
      grid[r][c] = selectedCode;
    }
    drawGrid();
  }
}

// Buttons
eraseBtn.addEventListener("click", () => {
  eraserMode = true;
  selectedCode = null;
  document.querySelectorAll(".tile-btn").forEach(el => el.classList.remove("selected"));
  previewEl.innerHTML = "Eraser";
});

generateBtn.addEventListener("click", () => {
  generateGrid();
});

calcBtn.addEventListener("click", async () => {
  const resp = await fetch("/api/calculate", {
    method: "POST",
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({grid: grid, tile_size_m: TILE_SIZE})
  });
  const data = await resp.json();
  if (data.error) { resultsEl.textContent = data.error; return; }

  // display results using adjusted_counts
  let text = "";
  if (data.adjusted_counts) {
    for (const [code, adjQty] of Object.entries(data.adjusted_counts)) {
      const price = products[code].price || 0;
      const subtotal = data.subtotal[code] || (adjQty*price);
      text += `${code}: ${adjQty} tiles × ${price.toFixed(2)} лв = ${subtotal.toFixed(2)} лв\n`;
    }
  } else {
    // fallback to normal counts
    for (const [code, qty] of Object.entries(data.counts)) {
      const price = products[code].price || 0;
      const subtotal = data.subtotals[code] || (qty*price);
      text += `${code}: ${qty} tiles × ${price.toFixed(2)} лв = ${subtotal.toFixed(2)} лв\n`;
    }
  }
  text += `\nTotal: ${data.total.toFixed(2)} лв`;
  resultsEl.textContent = text;
});

// init
(async () => {
  await fetchProducts();
  await buildPalette();
  generateGrid();
})();
