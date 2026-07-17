import {
  DESIGN_HEIGHT,
  DESIGN_WIDTH,
  GRID_HEIGHT,
  GRID_WIDTH,
  indexOf,
} from "../config";

/**
 * 屏幕分区（1280×720）：顶部 HUD 10% / 中部全宽地图 / 底部三张建筑卡坞。
 * 右上角浮置「开始营业 / 速度 / 跳过」操作按钮（见 ParkScene）。
 */
export const HUD_H = Math.round(DESIGN_HEIGHT * 0.1); // 72（顶部 10%）
export const MARGIN = 24; // 页面呼吸边距（规范十八）

/** 顶栏右侧操作区（开始营业 / 速度 / 跳过），事件牌需在此左侧收边。 */
export const HUD_CTRL_RIGHT = DESIGN_WIDTH - 12; // 1268
export const HUD_CTRL_X = DESIGN_WIDTH - 12 - 204; // 1064（预留宽度 204）

/** 中部地图区（右侧图鉴移除后铺满整宽）。 */
export const MAP_X = MARGIN; // 24
export const MAP_W = DESIGN_WIDTH - MARGIN * 2; // 1232（全宽）

/** 底部建筑卡坞（横排 3 张手牌，紧凑小卡）。 */
export const HAND_H = 100;
export const HAND_MARGIN_BOTTOM = 16;
export const HAND_X = MARGIN; // 24
export const HAND_W = DESIGN_WIDTH - MARGIN * 2; // 1232
export const HAND_Y = DESIGN_HEIGHT - HAND_MARGIN_BOTTOM - HAND_H; // 562

/** 地图游玩区（用于输入命中的矩形包围盒），止于手牌坞上沿。 */
export const PLAY_X = 0;
export const PLAY_Y = HUD_H;
export const PLAY_W = DESIGN_WIDTH;
export const PLAY_H = HAND_Y - HUD_H;

/**
 * 45° 伪等距（2:1 菱形）投影布局。
 * 网格坐标 (gx,gy) → 屏幕坐标：
 *   x = ORIGIN_X + (gx - gy) * HALF_W
 *   y = ORIGIN_Y + (gx + gy) * HALF_H
 * 其中 (gx,gy) 允许为「角坐标」（0..GRID_WIDTH / 0..GRID_HEIGHT），
 * 格中心即角坐标 (cx+0.5, cy+0.5)。
 */
export const TILE_W = 84; // 菱形地砖宽（10×8 更大棋盘，缩小地砖以在竖直空间内容纳）
export const TILE_H = 42; // 菱形地砖高（2:1）
export const HALF_W = TILE_W / 2;
export const HALF_H = TILE_H / 2;

/**
 * 投影原点（网格角 (0,0) 的屏幕位置），使棋盘在全宽画布内水平居中、
 * 垂直位于 HUD 与底部建筑卡坞之间，并留出顶部建筑高度与底部厚土台的空间。
 * 水平：菱形包围盒中心 = ORIGIN_X + (W-H)*HALF_W/2，令其等于画布中心 640。
 */
export const ORIGIN_X =
  Math.round(DESIGN_WIDTH / 2 - ((GRID_WIDTH - GRID_HEIGHT) * HALF_W) / 2) - 48;
export const ORIGIN_Y = 116;

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
