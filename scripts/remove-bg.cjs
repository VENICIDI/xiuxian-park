#!/usr/bin/env node
/**
 * 离线抠品红背景 → 输出透明 PNG（与 src/game/rendering/chromaKey.ts 同算法）。
 *
 * 用法：
 *   node scripts/remove-bg.cjs <输入.png> <输出.png> [gMax] [minRB] [diff] [feather]
 * 例：
 *   node scripts/remove-bg.cjs "src/assets/image-1 (8).png" src/assets/building-sword-coaster.png
 *
 * 处理：全图去品红（R、B 高且 G 很低）→ 边缘羽化 → 去粉色溢色 → 裁剪到不透明内容边界。
 * 品红 #FF00FF 在配色中不存在，故全图去除安全；紫饰(G≈100)/白云(G 高) 会被保留。
 */
const fs = require("fs");
const { PNG } = require("pngjs");

function main() {
  const [, , inPath, outPath, gMaxA, minRBA, diffA, featherA] = process.argv;
  if (!inPath || !outPath) {
    console.error(
      'usage: node scripts/remove-bg.cjs <in.png> <out.png> [gMax=90] [minRB=120] [diff=70] [feather=1]',
    );
    process.exit(1);
  }
  const gMax = gMaxA ? +gMaxA : 90;
  const minRB = minRBA ? +minRBA : 120;
  const diff = diffA ? +diffA : 70;
  const feather = featherA ? +featherA : 1;

  const png = PNG.sync.read(fs.readFileSync(inPath));
  const { width: w, height: h, data } = png; // data 为 RGBA

  const isMagenta = (r, g, b) =>
    g <= gMax && r >= minRB && b >= minRB && r - g >= diff && b - g >= diff;

  // 全图去品红
  for (let p = 0; p < w * h; p++) {
    const i = p * 4;
    if (isMagenta(data[i], data[i + 1], data[i + 2])) data[i + 3] = 0;
  }

  // 边缘羽化
  for (let f = 0; f < feather; f++) {
    const snap = new Uint8Array(w * h);
    for (let p = 0; p < w * h; p++) snap[p] = data[p * 4 + 3];
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const p = y * w + x;
        if (snap[p] === 0) continue;
        const near =
          (x > 0 && snap[p - 1] === 0) ||
          (x < w - 1 && snap[p + 1] === 0) ||
          (y > 0 && snap[p - w] === 0) ||
          (y < h - 1 && snap[p + w] === 0);
        if (near) data[p * 4 + 3] = Math.floor(data[p * 4 + 3] * 0.6);
      }
    }
  }

  // 去溢色：边缘偏品红像素压低多出的 R/B
  const alpha = new Uint8Array(w * h);
  for (let p = 0; p < w * h; p++) alpha[p] = data[p * 4 + 3];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = y * w + x;
      if (alpha[p] === 0) continue;
      const near =
        (x > 0 && alpha[p - 1] === 0) ||
        (x < w - 1 && alpha[p + 1] === 0) ||
        (y > 0 && alpha[p - w] === 0) ||
        (y < h - 1 && alpha[p + w] === 0);
      if (!near) continue;
      const i = p * 4;
      const r = data[i],
        g = data[i + 1],
        b = data[i + 2];
      const m = (r + b) / 2;
      if (m > g) {
        const excess = (m - g) * 0.7;
        data[i] = Math.max(g, r - excess);
        data[i + 2] = Math.max(g, b - excess);
      }
    }
  }

  // 裁剪到不透明内容边界
  let minX = w,
    minY = h,
    maxX = -1,
    maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] !== 0) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < minX || maxY < minY) {
    console.error("图像全透明，未写出");
    process.exit(1);
  }
  const bw = maxX - minX + 1;
  const bh = maxY - minY + 1;
  const out = new PNG({ width: bw, height: bh });
  for (let y = 0; y < bh; y++) {
    for (let x = 0; x < bw; x++) {
      const si = ((y + minY) * w + (x + minX)) * 4;
      const di = (y * bw + x) * 4;
      out.data[di] = data[si];
      out.data[di + 1] = data[si + 1];
      out.data[di + 2] = data[si + 2];
      out.data[di + 3] = data[si + 3];
    }
  }
  fs.writeFileSync(outPath, PNG.sync.write(out));
  console.log(
    `done: ${inPath} (${w}x${h}) -> ${outPath} (${bw}x${bh}, RGBA transparent)`,
  );
}

main();
