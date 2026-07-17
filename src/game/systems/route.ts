import { BOARD_SIZE, GRID_HEIGHT, GRID_WIDTH, indexOf } from "../config";
import { neighborIndices } from "./grid";

/**
 * 固定游客路线（独立道路）——蜿蜒盘桓的园区主路。
 * 道路格不可放置建筑；建筑只能放在道路旁的空地上。
 * 游客沿主路前进，经过某道路格时会触发与其相邻的建筑。
 * 主路多次上下折返，使不同空地的「服务顺序」差异明显：
 * 越早被经过（游客钱包足、体力好）越肥；越靠后越瘦——形成放置策略。
 * 无 A* 寻路，顺序稳定，可复现。
 *
 * 采用「不等间距竖列蛇形」：若干条竖直主路交替上/下行，并在顶/底行横向串联，
 * 竖列之间形成宽窄不一的建造口袋（1 格窄缝 / 2 格宽袋），迫使玩家权衡
 * 「大建筑只能进宽袋」与「越靠前的口袋服务顺序越肥」。
 *
 * 布局（■=道路，□=可建造），10 列 × 8 行（竖列 x=0,2,5,7,9）：
 *   y0: ▶ □ ■ ■ ■ ■ □ ■ ■ ■
 *   y1: ■ □ ■ □ □ ■ □ ■ □ ■
 *   y2: ■ □ ■ □ □ ■ □ ■ □ ■
 *   y3: ■ □ ■ □ □ ■ □ ■ □ ■
 *   y4: ■ □ ■ □ □ ■ □ ■ □ ■
 *   y5: ■ □ ■ □ □ ■ □ ■ □ ■
 *   y6: ■ □ ■ □ □ ■ □ ■ □ ■
 *   y7: ■ ■ ■ □ □ ■ ■ ■ □ ◀
 * 入口在 (0,0)，出口在 (9,7)。口袋依次为 x1(窄)、x3~4(宽)、x6(窄)、x8(窄)。
 */

/** 竖直主路所在列（不等间距，制造宽窄口袋）。 */
function roadColumns(w: number): number[] {
  const preset: Record<number, number[]> = {
    10: [0, 2, 5, 7, 9],
  };
  if (preset[w]) return preset[w];
  // 退化规则：每隔 2 列一条竖路，并确保最后一列为竖路（出口明确）
  const cols: number[] = [];
  for (let x = 0; x < w; x += 3) cols.push(x);
  if (cols[cols.length - 1] !== w - 1) cols.push(w - 1);
  return cols;
}

function buildRoute(): number[] {
  const H = GRID_HEIGHT;
  const cols = roadColumns(GRID_WIDTH);
  const route: number[] = [];
  for (let i = 0; i < cols.length; i++) {
    const x = cols[i];
    const goingDown = i % 2 === 0;
    if (goingDown) {
      for (let y = 0; y < H; y++) route.push(indexOf(x, y));
    } else {
      for (let y = H - 1; y >= 0; y--) route.push(indexOf(x, y));
    }
    // 沿结束所在行横向串联到下一条竖路
    if (i < cols.length - 1) {
      const nextX = cols[i + 1];
      const rowY = goingDown ? H - 1 : 0;
      for (let cx = x + 1; cx < nextX; cx++) route.push(indexOf(cx, rowY));
    }
  }
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
