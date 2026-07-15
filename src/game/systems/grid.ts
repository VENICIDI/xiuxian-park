import { inBounds, indexOf, xyOf } from "../config";

/** 四方向邻居的棋盘索引（越界忽略），顺序：上、下、左、右。 */
export function neighborIndices(index: number): number[] {
  const { x, y } = xyOf(index);
  const result: number[] = [];
  const deltas = [
    [0, -1],
    [0, 1],
    [-1, 0],
    [1, 0],
  ];
  for (const [dx, dy] of deltas) {
    const nx = x + dx;
    const ny = y + dy;
    if (inBounds(nx, ny)) result.push(indexOf(nx, ny));
  }
  return result;
}

/** 指定半径（切比雪夫距离）内的所有棋盘索引，含自身。 */
export function indicesWithinRadius(index: number, radius: number): number[] {
  const { x, y } = xyOf(index);
  const result: number[] = [];
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const nx = x + dx;
      const ny = y + dy;
      if (inBounds(nx, ny)) result.push(indexOf(nx, ny));
    }
  }
  return result;
}
