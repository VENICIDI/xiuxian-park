import { BOARD_SIZE, indexOf } from "../config";
import { neighborIndices } from "./grid";

/**
 * 固定游客路线（独立道路）——蜿蜒盘桓的园区主路。
 * 道路格不可放置建筑；建筑只能放在道路旁的空地上。
 * 游客沿主路前进，经过某道路格时会触发与其相邻的建筑。
 * 主路多次上下折返，使不同空地的「服务顺序」差异明显：
 * 越早被经过（游客钱包足、体力好）越肥；越靠后越瘦——形成放置策略。
 * 无 A* 寻路，顺序稳定，可复现。
 *
 * 布局（■=道路，□=可建造），8 列 × 6 行：
 *   y0: ▶ □ □ ■ ■ ■ ■ □
 *   y1: ■ □ □ ■ □ □ ■ □
 *   y2: ■ □ □ ■ □ □ ■ □
 *   y3: ■ □ □ ■ □ □ ■ □
 *   y4: ■ □ □ ■ □ □ ■ □
 *   y5: ■ ■ ■ ■ □ □ ◀ □
 * 入口在 (0,0)，出口在 (6,5)。左袋 x1~2、中袋 x4~5 均为 2 格宽（可放多格建筑），
 * 右侧 x7 为 1 格宽窄条（服务顺序最靠后）。
 */
function buildRoute(): number[] {
  const route: number[] = [];
  // 第 0 列向下（入口 0,0 → 0,5）
  for (let y = 0; y <= 5; y++) route.push(indexOf(0, y));
  // 底部向右连接到第 3 列
  route.push(indexOf(1, 5));
  route.push(indexOf(2, 5));
  // 第 3 列向上（3,5 → 3,0）
  for (let y = 5; y >= 0; y--) route.push(indexOf(3, y));
  // 顶部向右连接到第 6 列
  route.push(indexOf(4, 0));
  route.push(indexOf(5, 0));
  // 第 6 列向下（6,0 → 出口 6,5）
  for (let y = 0; y <= 5; y++) route.push(indexOf(6, y));
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
