/**
 * 确定性伪随机数服务（mulberry32）。
 * 规则层所有随机都必须走这里，禁止直接 Math.random()。
 * 通过 seed + cursor 可完整复现随机序列。
 */
export class RandomService {
  private readonly seed: number;
  private cursor: number;

  constructor(seed: number, cursor = 0) {
    this.seed = seed >>> 0;
    this.cursor = cursor >>> 0;
  }

  get currentCursor(): number {
    return this.cursor;
  }

  get currentSeed(): number {
    return this.seed;
  }

  /** 返回 [0,1) 浮点数，并推进游标。 */
  next(): number {
    // mulberry32：以 seed + cursor 组合作为状态，保证可根据 cursor 复现。
    this.cursor = (this.cursor + 1) >>> 0;
    let t = (this.seed + this.cursor * 0x6d2b79f5) >>> 0;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** [min, max) 浮点 */
  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  /** [min, max] 整数 */
  int(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1));
  }

  /** 概率判定，chance ∈ [0,1] */
  chance(chance: number): boolean {
    return this.next() < chance;
  }

  /** 从数组中等概率取一个 */
  pick<T>(items: readonly T[]): T {
    return items[this.int(0, items.length - 1)];
  }

  /** 按权重取一个 */
  weightedPick<T>(items: readonly T[], weightOf: (item: T) => number): T {
    const total = items.reduce((s, it) => s + weightOf(it), 0);
    let roll = this.next() * total;
    for (const it of items) {
      roll -= weightOf(it);
      if (roll < 0) return it;
    }
    return items[items.length - 1];
  }

  /** Fisher–Yates 洗牌（返回新数组） */
  shuffle<T>(items: readonly T[]): T[] {
    const arr = items.slice();
    for (let i = arr.length - 1; i > 0; i--) {
      const j = this.int(0, i);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  /** 从数组中不重复抽取 n 个 */
  sample<T>(items: readonly T[], n: number): T[] {
    return this.shuffle(items).slice(0, Math.min(n, items.length));
  }
}
