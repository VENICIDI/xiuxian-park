import { GRID_WIDTH, indexOf } from "../config";

/** 棋盘在屏幕上的显示布局常量。 */
export const TILE_DISPLAY = 90;
export const BOARD_X = 24;
export const BOARD_Y = 96;

export const PANEL_X = 762;
export const PANEL_W = 494;
export const PANEL_Y = 96;

export function cellCenter(index: number): { x: number; y: number } {
  const x = index % GRID_WIDTH;
  const y = Math.floor(index / GRID_WIDTH);
  return {
    x: BOARD_X + x * TILE_DISPLAY + TILE_DISPLAY / 2,
    y: BOARD_Y + y * TILE_DISPLAY + TILE_DISPLAY / 2,
  };
}

export function cellTopLeft(index: number): { x: number; y: number } {
  const x = index % GRID_WIDTH;
  const y = Math.floor(index / GRID_WIDTH);
  return { x: BOARD_X + x * TILE_DISPLAY, y: BOARD_Y + y * TILE_DISPLAY };
}

/** 世界坐标转棋盘索引，越界返回 -1。 */
export function indexAtWorld(worldX: number, worldY: number): number {
  const gx = Math.floor((worldX - BOARD_X) / TILE_DISPLAY);
  const gy = Math.floor((worldY - BOARD_Y) / TILE_DISPLAY);
  if (gx < 0 || gx >= GRID_WIDTH || gy < 0 || gy >= 6) return -1;
  return indexOf(gx, gy);
}
