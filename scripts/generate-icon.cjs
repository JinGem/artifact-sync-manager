/**
 * Generate Doraemon-inspired tray icon for Artifact Sync Manager.
 * Outputs: tray-icon.png (32x32)
 * app-icon.png is user-provided and not auto-generated.
 * Uses only Node.js built-ins (fs + zlib).
 */
const fs = require("fs");
const zlib = require("zlib");
const path = require("path");

function crc32(data) {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc ^= data[i];
    for (let j = 0; j < 8; j++) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crcInput = Buffer.concat([typeBuf, data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function fillPixel(raw, W, x, y, r, g, b, a) {
  if (x < 0 || x >= W || y < 0) return;
  const idx = y * (1 + W * 4) + 1 + x * 4;
  raw[idx] = r;
  raw[idx + 1] = g;
  raw[idx + 2] = b;
  raw[idx + 3] = a;
}

function drawCircle(raw, W, H, cx, cy, r, fillR, fillG, fillB, fillA) {
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const dx = x - cx + 0.5;
      const dy = y - cy + 0.5;
      if (dx * dx + dy * dy <= r * r) {
        fillPixel(raw, W, x, y, fillR, fillG, fillB, fillA);
      }
    }
  }
}

function drawEllipse(raw, W, H, cx, cy, rx, ry, fillR, fillG, fillB, fillA) {
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const dx = (x - cx + 0.5) / rx;
      const dy = (y - cy + 0.5) / ry;
      if (dx * dx + dy * dy <= 1) {
        fillPixel(raw, W, x, y, fillR, fillG, fillB, fillA);
      }
    }
  }
}

function drawLine(raw, W, x0, y0, x1, y1, r, g, b, a) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const steps = Math.max(Math.abs(dx), Math.abs(dy)) * 2;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    fillPixel(raw, W, Math.round(x0 + dx * t), Math.round(y0 + dy * t), r, g, b, a);
  }
}

// Colors
const BLUE = [33, 150, 243];
const WHITE = [255, 255, 255];
const BLACK = [34, 34, 34];
const RED = [244, 67, 54];
const YELLOW = [255, 235, 59];

function drawDoraemon(raw, W, H) {
  // Scale factor relative to 32x32 base design
  const S = W / 32;

  // Blue head
  drawCircle(raw, W, H, W / 2, H * 0.47, 13.5 * S, ...BLUE, 255);

  // White face
  drawEllipse(raw, W, H, W / 2, H * 0.53, 11 * S, 9 * S, ...WHITE, 255);

  // Eyes (two touching white ellipses)
  drawEllipse(raw, W, H, W / 2 - 3 * S, H * 0.31, 4 * S, 5.5 * S, ...WHITE, 255);
  drawEllipse(raw, W, H, W / 2 + 3 * S, H * 0.31, 4 * S, 5.5 * S, ...WHITE, 255);

  // Pupils
  drawCircle(raw, W, H, W / 2 - 3 * S, H * 0.34, 1.8 * S, ...BLACK, 255);
  drawCircle(raw, W, H, W / 2 + 3 * S, H * 0.34, 1.8 * S, ...BLACK, 255);
  // Eye highlights
  drawCircle(raw, W, H, W / 2 - 2.5 * S, H * 0.33, 0.5 * S, ...WHITE, 255);
  drawCircle(raw, W, H, W / 2 + 2.5 * S, H * 0.33, 0.5 * S, ...WHITE, 255);

  // Red nose
  drawCircle(raw, W, H, W / 2, H * 0.47, 2.2 * S, ...RED, 255);
  drawCircle(raw, W, H, W / 2 - 0.7 * S, H * 0.45, 0.6 * S, ...WHITE, 200);

  // Vertical nose-to-mouth line
  drawLine(raw, W, W / 2, H * 0.53, W / 2, H * 0.66, ...BLACK, 255);

  // Mouth (parabola)
  for (let x = Math.round(W / 2 - 6 * S); x <= Math.round(W / 2 + 6 * S); x++) {
    const t = (x - W / 2) / (6 * S);
    const y = H * 0.69 - t * t * 2.5 * S;
    fillPixel(raw, W, x, Math.round(y), ...BLACK, 255);
    fillPixel(raw, W, x, Math.round(y) + 1, ...BLACK, 255);
  }

  // Whiskers - left side
  for (let i = 0; i < 3; i++) {
    const y = H * (0.5 + i * 0.078);
    drawLine(raw, W, W * 0.125, y, W * 0.344, y - 0.5 * S, ...BLACK, 255);
  }
  // Whiskers - right side
  for (let i = 0; i < 3; i++) {
    const y = H * (0.5 + i * 0.078);
    drawLine(raw, W, W * 0.656, y - 0.5 * S, W * 0.875, y, ...BLACK, 255);
  }

  // Red collar
  for (let x = Math.round(W * 0.188); x <= Math.round(W * 0.812); x++) {
    fillPixel(raw, W, x, Math.round(H * 0.812), ...RED, 255);
    fillPixel(raw, W, x, Math.round(H * 0.812) + 1, ...RED, 255);
  }

  // Yellow bell
  drawCircle(raw, W, H, W / 2, H * 0.906, 2.5 * S, ...YELLOW, 255);
  drawLine(raw, W, W / 2 - 2 * S, H * 0.906, W / 2 + 2 * S, H * 0.906, ...BLACK, 255);
  drawCircle(raw, W, H, W / 2, H * 0.938, 0.8 * S, ...BLACK, 255);
}

function generatePng(size) {
  const raw = Buffer.alloc(size * (1 + size * 4));
  raw.fill(0);

  drawDoraemon(raw, size, size);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const compressed = zlib.deflateSync(raw);
  return Buffer.concat([
    signature,
    chunk("IHDR", ihdr),
    chunk("IDAT", compressed),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const outDir = path.join(__dirname, "..", "src", "main", "tray");
fs.mkdirSync(outDir, { recursive: true });

fs.writeFileSync(path.join(outDir, "tray-icon.png"), generatePng(32));
console.log("✓ Generated: src/main/tray/tray-icon.png (32x32)");
