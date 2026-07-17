#!/usr/bin/env node
/**
 * 把透明 PNG 绕中心旋转指定角度，输出透明 PNG（扩边 + 预乘 alpha 双线性采样 + 裁剪到内容）。
 * 用于把“正面平铺”的建筑图预旋转，使其直立摆放时贴合等距网格对角线。
 *
 * 用法：
 *   node scripts/rotate.cjs <输入.png> <输出.png> <角度deg，正数=顺时针>
 * 例：
 *   node scripts/rotate.cjs .tmp-unrot-sword.png src/assets/building-sword-coaster.png 45
 */
const fs = require("fs");
const { PNG } = require("pngjs");

function main() {
  const [, , inPath, outPath, degA] = process.argv;
  if (!inPath || !outPath || degA === undefined) {
    console.error("usage: node scripts/rotate.cjs <in.png> <out.png> <deg>");
    process.exit(1);
  }
  const deg = +degA;
  const rad = (deg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  const src = PNG.sync.read(fs.readFileSync(inPath));
  const w = src.width,
    h = src.height,
    sd = src.data;

  // 输出画布尺寸（能容纳旋转后内容）
  const nw = Math.ceil(Math.abs(w * cos) + Math.abs(h * sin));
  const nh = Math.ceil(Math.abs(w * sin) + Math.abs(h * cos));
  const out = new PNG({ width: nw, height: nh });
  const od = out.data;

  const cx = w / 2,
    cy = h / 2;
  const ncx = nw / 2,
    ncy = nh / 2;

  for (let oy = 0; oy < nh; oy++) {
    for (let ox = 0; ox < nw; ox++) {
      // 反向映射：输出像素 -> 源坐标（逆旋转）
      const dx = ox - ncx;
      const dy = oy - ncy;
      const sx = cos * dx + sin * dy + cx;
      const sy = -sin * dx + cos * dy + cy;

      const di = (oy * nw + ox) * 4;
      if (sx < 0 || sx >= w - 1 || sy < 0 || sy >= h - 1) {
        od[di] = od[di + 1] = od[di + 2] = od[di + 3] = 0;
        continue;
      }
      const x0 = Math.floor(sx),
        y0 = Math.floor(sy);
      const fx = sx - x0,
        fy = sy - y0;
      // 四邻 + 预乘 alpha 双线性，避免透明边缘产生黑/彩色晕
      let r = 0,
        g = 0,
        b = 0,
        a = 0;
      const add = (xx, yy, wgt) => {
        const i = (yy * w + xx) * 4;
        const al = sd[i + 3] * wgt;
        r += sd[i] * al;
        g += sd[i + 1] * al;
        b += sd[i + 2] * al;
        a += al;
      };
      add(x0, y0, (1 - fx) * (1 - fy));
      add(x0 + 1, y0, fx * (1 - fy));
      add(x0, y0 + 1, (1 - fx) * fy);
      add(x0 + 1, y0 + 1, fx * fy);
      if (a > 0) {
        od[di] = Math.round(r / a);
        od[di + 1] = Math.round(g / a);
        od[di + 2] = Math.round(b / a);
        od[di + 3] = Math.round(a);
      } else {
        od[di] = od[di + 1] = od[di + 2] = od[di + 3] = 0;
      }
    }
  }

  // 裁剪到不透明内容
  let minX = nw,
    minY = nh,
    maxX = -1,
    maxY = -1;
  for (let y = 0; y < nh; y++) {
    for (let x = 0; x < nw; x++) {
      if (od[(y * nw + x) * 4 + 3] !== 0) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  const bw = maxX - minX + 1,
    bh = maxY - minY + 1;
  const cropped = new PNG({ width: bw, height: bh });
  for (let y = 0; y < bh; y++) {
    for (let x = 0; x < bw; x++) {
      const si = ((y + minY) * nw + (x + minX)) * 4;
      const ci = (y * bw + x) * 4;
      cropped.data[ci] = od[si];
      cropped.data[ci + 1] = od[si + 1];
      cropped.data[ci + 2] = od[si + 2];
      cropped.data[ci + 3] = od[si + 3];
    }
  }
  fs.writeFileSync(outPath, PNG.sync.write(cropped));
  console.log(
    `rotated ${deg}deg: ${inPath} (${w}x${h}) -> ${outPath} (${bw}x${bh})`,
  );
}

main();
