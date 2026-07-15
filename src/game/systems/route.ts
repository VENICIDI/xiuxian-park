import { BOARD_SIZE, indexOf } from "../config";
import { neighborIndices } from "./grid";

/**
 * 固定游客路线（独立道路）。
 * 道路格不可放置建筑；建筑只能放在道路旁的空地上。
 * 游客沿道路前进，经过某道路格时，会触发与其相邻的建筑。
 * 无 A* 寻路，顺序稳定，可复现。
 *
 * 布局（■=道路，□=可建造），8 列 × 6 行：
 *   y0: □ □ □ □ □ □ □ □
 *   y1: ■ ■ ■ ■ ■ ■ ■ ■   ← 上层走廊（入口在最左）
 *   y2: □ □ □ □ □ □ □ ■
 *   y3: □ □ □ □ □ □ □ ■   ← 右侧竖直连接段
 *   y4: ■ ■ ■ ■ ■ ■ ■ ■   ← 下层走廊（出口在最左）
 *   y5: □ □ □ □ □ □ □ □
 */
function buildRoute(): number[] {
  const route: number[] = [];
  // 上层走廊：y=1，从左到右
  for (let x = 0; x < 8; x++) route.push(indexOf(x, 1));
  // 右侧竖直连接段：y=2,3
  route.push(indexOf(7, 2));
  route.push(indexOf(7, 3));
  // 下层走廊：y=4，从右到左
  for (let x = 7; x >= 0; x--) route.push(indexOf(x, 4));
  return route;
}

export const ROUTE = buildRoute();

/** 道路格集合（不可放置建筑）。 */
export const ROAD_SET: ReadonlySet<number> = new Set(ROUTE);

/** 道路格 → 路线顺序。 */
export const ROUTE_POSITION: Record<number, number> = (() => {
  const map: Record<number, number> = {};
  ROUTE.forEach((cellIndex, order) => {
    map[cellIndex] = order;
  });
  return map;
})();

/** 入口 / 出口棋盘索引。 */
export const ENTRANCE_INDEX = ROUTE[0];
export const EXIT_INDEX = ROUTE[ROUTE.length - 1];

/** 某格是否为道路。 */
export const isRoad = (index: number): boolean => ROAD_SET.has(index);

/**
 * 每个道路格相邻的可建造格（供模拟时按路线顺序触发建筑）。
 * 顺序沿用 neighborIndices（上、下、左、右），保证确定性。
 */
export const ROAD_ADJACENT_BUILDABLE: Record<number, number[]> = (() => {
  const map: Record<number, number[]> = {};
  for (const roadCell of ROUTE) {
    map[roadCell] = neighborIndices(roadCell).filter((n) => !ROAD_SET.has(n));
  }
  return map;
})();

/**
 * 每个可建造格的“服务顺序”：与其相邻的道路格中最早的路线顺序。
 * 未被任何道路服务的空地不会有游客光顾（收益为 0）。
 */
export const BUILDING_SERVE_ORDER: Record<number, number> = (() => {
  const map: Record<number, number> = {};
  for (let i = 0; i < BOARD_SIZE; i++) {
    if (ROAD_SET.has(i)) continue;
    let best = Infinity;
    for (const n of neighborIndices(i)) {
      const order = ROUTE_POSITION[n];
      if (order != null && order < best) best = order;
    }
    if (best !== Infinity) map[i] = best;
  }
  return map;
})();

/** 该空地是否能被道路服务（相邻至少一个道路格）。 */
export const isServed = (index: number): boolean =>
  BUILDING_SERVE_ORDER[index] != null;
