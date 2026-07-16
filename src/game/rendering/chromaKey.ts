import Phaser from "phaser";

/**
 * 运行时去除图片的纯色（白）背景，生成带透明通道的新纹理。
 *
 * 用途：AI 出的建筑图若是 JPEG / 白底 PNG（无 alpha），直接贴到棋盘上会显示成
 * 一块白色矩形卡片。此函数从图片四条边做洪水填充，把与边缘连通的近白像素设为透明，
 * 从而保留中间的建筑主体与被主体包围的内部云朵。
 *
 * ⚠️ 这是权宜之计：与边缘连通的白云会被一并吃掉。正式资产应直接导出透明底 PNG。
 *
 * @param scene   目标场景（其纹理管理器会被写入新纹理）
 * @param srcKey  已加载的源纹理 key
 * @param opts.threshold 判定为背景的“白”阈值（min(r,g,b) 需高于此值），默认 232
 * @param opts.desat     判定为背景的最大彩度（max-min 需低于此值），默认 22
 * @param opts.feather   边缘羽化像素，减轻锯齿/白边，默认 1
 * @returns 处理后写回的纹理 key（与 srcKey 相同，原纹理被替换）
 */
export function removeBackground(
  scene: Phaser.Scene,
  srcKey: string,
  opts: { threshold?: number; desat?: number; feather?: number } = {},
): string {
  const threshold = opts.threshold ?? 232;
  const desat = opts.desat ?? 22;
  const feather = opts.feather ?? 1;

  const tex = scene.textures.get(srcKey);
  if (!tex) return srcKey;
  const source = tex.getSourceImage() as
    | HTMLImageElement
    | HTMLCanvasElement;
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

  const isBg = (i: number): boolean => {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const mn = Math.min(r, g, b);
    const mx = Math.max(r, g, b);
    return mn >= threshold && mx - mn <= desat;
  };

  // 洪水填充：从所有边缘的背景像素出发，标记连通的背景区域
  const removed = new Uint8Array(w * h);
  const stack: number[] = [];
  const pushIfBg = (x: number, y: number) => {
    const p = y * w + x;
    if (removed[p]) return;
    if (isBg(p * 4)) {
      removed[p] = 1;
      stack.push(p);
    }
  };
  for (let x = 0; x < w; x++) {
    pushIfBg(x, 0);
    pushIfBg(x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    pushIfBg(0, y);
    pushIfBg(w - 1, y);
  }
  while (stack.length) {
    const p = stack.pop() as number;
    const x = p % w;
    const y = (p / w) | 0;
    if (x > 0) pushIfBg(x - 1, y);
    if (x < w - 1) pushIfBg(x + 1, y);
    if (y > 0) pushIfBg(x, y - 1);
    if (y < h - 1) pushIfBg(x, y + 1);
  }

  for (let p = 0; p < removed.length; p++) {
    if (removed[p]) data[p * 4 + 3] = 0;
  }

  // 边缘羽化：对紧邻透明区域的实体像素做一次 alpha 衰减，减轻硬白边
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
        if (near) data[p * 4 + 3] = Math.floor(data[p * 4 + 3] * 0.5);
      }
    }
  }

  ctx.putImageData(img, 0, 0);

  if (scene.textures.exists(srcKey)) scene.textures.remove(srcKey);
  scene.textures.addCanvas(srcKey, canvas);
  return srcKey;
}
