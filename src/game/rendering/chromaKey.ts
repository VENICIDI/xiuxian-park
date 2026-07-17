import Phaser from "phaser";

/**
 * 运行时去除图片的纯品红背景（chroma key），生成带透明通道的新纹理。
 *
 * 用途：AI 出的建筑图统一用纯品红底 `#FF00FF`（配色中不存在的色相）。此函数**全图**判定并
 * 去除品红像素——包括被结构包围的内部孔洞（如过山车环轨内圈、拱门下方）——而洪水填充做不到。
 *
 * 判据基于“品红特征”而非单纯距离：R、B 高且 G 很低（品红 G≈0，紫流苏 G≈100、白云 G 高），
 * 因此能抠净品红、同时保留紫饰与白云。边缘再做羽化 + 去品红溢色，减轻粉色毛边。
 *
 * @param scene   目标场景
 * @param srcKey  已加载的源纹理 key
 * @param opts.gMax     判为背景时 G 分量上限（越低越保守），默认 90
 * @param opts.minRB    判为背景时 R、B 分量下限，默认 120
 * @param opts.diff     判为背景时 (R-G)、(B-G) 的下限，默认 70
 * @param opts.feather  边缘羽化次数，默认 1
 * @returns 处理后写回的纹理 key（与 srcKey 相同，原纹理被替换）
 */
export function removeBackground(
  scene: Phaser.Scene,
  srcKey: string,
  opts: {
    gMax?: number;
    minRB?: number;
    diff?: number;
    feather?: number;
  } = {},
): string {
  const gMax = opts.gMax ?? 90;
  const minRB = opts.minRB ?? 120;
  const diff = opts.diff ?? 70;
  const feather = opts.feather ?? 1;

  const tex = scene.textures.get(srcKey);
  if (!tex) return srcKey;
  const source = tex.getSourceImage() as HTMLImageElement | HTMLCanvasElement;
  const w = source.width;
  const h = source.height;
  if (!w || !h) return srcKey;

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return srcKey;
  ctx.drawImage(source, 0, 0);

  const img = ctx.getImageData(0, 0, w, h);
  const data = img.data;

  // 全图去品红：R、B 高且 G 很低（品红特征），紫饰(G≈100)/白云(G 高)不满足 → 保留
  const isMagenta = (r: number, g: number, b: number): boolean =>
    g <= gMax && r >= minRB && b >= minRB && r - g >= diff && b - g >= diff;

  for (let p = 0; p < w * h; p++) {
    const i = p * 4;
    if (isMagenta(data[i], data[i + 1], data[i + 2])) data[i + 3] = 0;
  }

  // 边缘羽化：紧邻透明区的实体像素衰减 alpha，减轻硬边
  for (let f = 0; f < feather; f++) {
    const snapshot = new Uint8Array(w * h);
    for (let p = 0; p < w * h; p++) snapshot[p] = data[p * 4 + 3];
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const p = y * w + x;
        if (snapshot[p] === 0) continue;
        const near =
          (x > 0 && snapshot[p - 1] === 0) ||
          (x < w - 1 && snapshot[p + 1] === 0) ||
          (y > 0 && snapshot[p - w] === 0) ||
          (y < h - 1 && snapshot[p + w] === 0);
        if (near) data[p * 4 + 3] = Math.floor(data[p * 4 + 3] * 0.6);
      }
    }
  }

  // 去溢色：仅对紧邻透明区、且偏品红的边缘像素，压低多出的 R/B，消除粉色描边
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

  ctx.putImageData(img, 0, 0);

  // 裁剪到不透明内容的紧边界，去掉四周透明留白，使后续按内容宽高缩放/居中更准
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

  let outCanvas: HTMLCanvasElement = canvas;
  if (maxX >= minX && maxY >= minY) {
    const bw = maxX - minX + 1;
    const bh = maxY - minY + 1;
    const cropped = document.createElement("canvas");
    cropped.width = bw;
    cropped.height = bh;
    const cctx = cropped.getContext("2d");
    if (cctx) {
      cctx.drawImage(canvas, minX, minY, bw, bh, 0, 0, bw, bh);
      outCanvas = cropped;
    }
  }

  if (scene.textures.exists(srcKey)) scene.textures.remove(srcKey);
  scene.textures.addCanvas(srcKey, outCanvas);
  return srcKey;
}
