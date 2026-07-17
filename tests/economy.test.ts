import { describe, expect, it } from "vitest";
import { resolveDay } from "../src/game/controllers/TurnController";
import { RandomService } from "../src/game/services/RandomService";
import { forcePlace, newGame } from "./helpers";

function buildSamplePark(seed: number) {
  const s = newGame(seed);
  // 均放在 x3~4 宽袋（紧邻第 2/5 列竖直道路，可被游客服务）
  forcePlace(s, "sword-coaster", 3, 1); // 2×1 → 占 (3,1)(4,1)
  forcePlace(s, "pill-shop", 3, 2);
  forcePlace(s, "mengpo-tea", 3, 3);
  forcePlace(s, "spirit-gathering-array", 4, 2); // 相邻丹药铺/过山车提供 +15%
  return s;
}

describe("确定性可复现", () => {
  it("同种子同棋盘得到完全相同的结算", () => {
    const a = resolveDay(buildSamplePark(12345));
    const b = resolveDay(buildSamplePark(12345));
    expect(a.nextState.spiritStones).toBe(b.nextState.spiritStones);
    expect(a.nextState.rngCursor).toBe(b.nextState.rngCursor);
    expect(a.events.length).toBe(b.events.length);
    expect(a.nextState.ownedBuildingIds).toEqual(b.nextState.ownedBuildingIds);
  });

  it("不同种子通常产生不同结果", () => {
    const a = resolveDay(buildSamplePark(1));
    const b = resolveDay(buildSamplePark(999));
    // 事件/游客不同，收益大概率不同
    const different =
      a.nextState.spiritStones !== b.nextState.spiritStones ||
      a.nextState.activeEventId !== b.nextState.activeEventId;
    expect(different).toBe(true);
  });
});

describe("收益产生", () => {
  it("有游乐/商店时应产生正向毛收入明细", () => {
    const res = resolveDay(buildSamplePark(42));
    const total = res.breakdowns.reduce((s, b) => s + b.result, 0);
    expect(total).toBeGreaterThan(0);
  });

  it("空乐园仍需缴纳维护费（灵石减少）", () => {
    const s = newGame(7);
    const before = s.spiritStones;
    const res = resolveDay(s);
    expect(res.nextState.spiritStones).toBeLessThan(before);
  });
});

describe("RandomService", () => {
  it("同 seed+cursor 复现同序列", () => {
    const r1 = new RandomService(555, 0);
    const seq1 = [r1.next(), r1.next(), r1.next()];
    const r2 = new RandomService(555, 0);
    const seq2 = [r2.next(), r2.next(), r2.next()];
    expect(seq1).toEqual(seq2);
  });

  it("从游标恢复可继续同序列", () => {
    const r1 = new RandomService(555, 0);
    r1.next();
    r1.next();
    const cursor = r1.currentCursor;
    const nextVal = r1.next();
    const r2 = new RandomService(555, cursor);
    expect(r2.next()).toEqual(nextVal);
  });
});
