/**
 * 全局常量与显示配置。
 * 规则层也会引用其中的纯数值常量（棋盘尺寸等），因此本文件不得引用 Phaser。
 */

export const GRID_WIDTH = 8;
export const GRID_HEIGHT = 6;
export const BOARD_SIZE = GRID_WIDTH * GRID_HEIGHT; // 48
export const TILE_SIZE = 96;

export const DESIGN_WIDTH = 1280;
export const DESIGN_HEIGHT = 720;

/** 存档版本，结构变化时递增并处理迁移。 */
export const SCHEMA_VERSION = 5;
export const GAME_VERSION = "0.1.0";
export const SAVE_KEY = "xian-park:save:v1";

/** 一维索引换算：index = y * GRID_WIDTH + x */
export const indexOf = (x: number, y: number): number => y * GRID_WIDTH + x;

export const xyOf = (index: number): { x: number; y: number } => ({
  x: index % GRID_WIDTH,
  y: Math.floor(index / GRID_WIDTH),
});

export const inBounds = (x: number, y: number): boolean =>
  x >= 0 && x < GRID_WIDTH && y >= 0 && y < GRID_HEIGHT;
