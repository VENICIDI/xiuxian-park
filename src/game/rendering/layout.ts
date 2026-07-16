import {
  DESIGN_HEIGHT,
  DESIGN_WIDTH,
  GRID_HEIGHT,
  GRID_WIDTH,
  indexOf,
} from "../config";

/**
 * 屏幕分区（1280×720）：顶部 HUD 10% / 地图 65% / 右侧面板 25%，其余为页面边距。
 */
export const HUD_H = Math.round(DESIGN_HEIGHT * 0.1); // 72（顶部 10%）
export const MARGIN = 24; // 页面呼吸边距（规范十八）

export const MAP_X = MARGIN; // 24
export const MAP_W = Math.round(DESIGN_WIDTH * 0.65); // 832（地图 65%）

export const PANEL_W = Math.round(DESIGN_WIDTH * 0.25); // 320（右侧 25%）
export const PANEL_X = DESIGN_WIDTH - MARGIN - PANEL_W; // 936
export const PANEL_Y = HUD_H + 16; // 88
export const PANEL_H = DESIGN_HEIGHT - PANEL_Y - MARGIN; // 608

/** 底部操作栏（位于地图列底部）。 */
export const BAR_H = 60;
export const BAR_X = MAP_X;
export const BAR_W = MAP_W;
export const BAR_Y = DESIGN_HEIGHT - MARGIN - BAR_H; // 636

/** 左侧地图游玩区（用于输入命中的矩形包围盒）。 */
export const PLAY_X = 0;
export const PLAY_Y = HUD_H;
export const PLAY_W = MAP_X + MAP_W + 24; // 覆盖地图列
export const PLAY_H = DESIGN_HEIGHT - HUD_H;

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

/** 投影原点（网格角 (0,0) 的屏幕位置），使棋盘落在地图列并居中。 */
export const ORIGIN_X = 394;
export const ORIGIN_Y = 186;

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
