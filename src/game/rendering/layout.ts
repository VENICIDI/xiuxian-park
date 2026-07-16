import { GRID_HEIGHT, GRID_WIDTH, indexOf } from "../config";

/**
 * 45° 伪等距（2:1 菱形）投影布局。
 * 网格坐标 (gx,gy) → 屏幕坐标：
 *   x = ORIGIN_X + (gx - gy) * HALF_W
 *   y = ORIGIN_Y + (gx + gy) * HALF_H
 * 其中 (gx,gy) 允许为「角坐标」（0..GRID_WIDTH / 0..GRID_HEIGHT），
 * 格中心即角坐标 (cx+0.5, cy+0.5)。
 */
export const TILE_W = 92; // 菱形地砖宽
export const TILE_H = 46; // 菱形地砖高（2:1）
export const HALF_W = TILE_W / 2;
export const HALF_H = TILE_H / 2;

/** 投影原点（网格角 (0,0) 的屏幕位置），使棋盘落在左侧游玩区并居中。 */
export const ORIGIN_X = 356;
export const ORIGIN_Y = 214;

export const PANEL_X = 762;
export const PANEL_W = 494;
export const PANEL_Y = 96;

/** 左侧游玩区（用于输入命中的矩形包围盒）。 */
export const PLAY_X = 0;
export const PLAY_Y = 84;
export const PLAY_W = 752;
export const PLAY_H = 566;

export type Pt = { x: number; y: number };

/** 角坐标（可为小数）→ 屏幕坐标。 */
export function isoCorner(gx: number, gy: number): Pt {
  return {
    x: ORIGIN_X + (gx - gy) * HALF_W,
    y: ORIGIN_Y + (gx + gy) * HALF_H,
  };
}

/** 格中心屏幕坐标。 */
export function cellCenter(index: number): Pt {
  const gx = index % GRID_WIDTH;
  const gy = Math.floor(index / GRID_WIDTH);
  return isoCorner(gx + 0.5, gy + 0.5);
}

/** 单格地砖的四个菱形顶点（后/右/前/左）。 */
export function cellDiamond(index: number): {
  top: Pt;
  right: Pt;
  bottom: Pt;
  left: Pt;
} {
  const gx = index % GRID_WIDTH;
  const gy = Math.floor(index / GRID_WIDTH);
  return {
    top: isoCorner(gx, gy),
    right: isoCorner(gx + 1, gy),
    bottom: isoCorner(gx + 1, gy + 1),
    left: isoCorner(gx, gy + 1),
  };
}

/** 矩形占地（锚点格 ax,ay，尺寸 w×h）的地面菱形四顶点。 */
export function footprintDiamond(
  ax: number,
  ay: number,
  w: number,
  h: number,
): { back: Pt; right: Pt; front: Pt; left: Pt; center: Pt } {
  return {
    back: isoCorner(ax, ay),
    right: isoCorner(ax + w, ay),
    front: isoCorner(ax + w, ay + h),
    left: isoCorner(ax, ay + h),
    center: isoCorner(ax + w / 2, ay + h / 2),
  };
}

/** 等距深度秩：越靠前（gx+gy 越大）越应盖住后方。 */
export function isoRank(index: number): number {
  const gx = index % GRID_WIDTH;
  const gy = Math.floor(index / GRID_WIDTH);
  return gx + gy;
}

/** 屏幕坐标 → 格索引（按地面平面反投影），越界返回 -1。 */
export function indexAtWorld(worldX: number, worldY: number): number {
  const dx = worldX - ORIGIN_X;
  const dy = worldY - ORIGIN_Y;
  const a = dx / HALF_W; // gx - gy
  const b = dy / HALF_H; // gx + gy
  const gxf = (a + b) / 2;
  const gyf = (b - a) / 2;
  const gx = Math.floor(gxf);
  const gy = Math.floor(gyf);
  if (gx < 0 || gx >= GRID_WIDTH || gy < 0 || gy >= GRID_HEIGHT) return -1;
  return indexOf(gx, gy);
}
