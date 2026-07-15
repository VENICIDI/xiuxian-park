import { describe, expect, it } from "vitest";
import { generateVisitors } from "../src/game/systems/VisitorSystem";
import { RandomService } from "../src/game/services/RandomService";
import { SECT_DEFINITIONS } from "../src/game/data/visitors";

describe("游客生成", () => {
  it("数量正确且属性在合理范围", () => {
    const rng = new RandomService(3, 0);
    const visitors = generateVisitors(rng, 10, 0, 0);
    expect(visitors).toHaveLength(10);
    for (const v of visitors) {
      expect(v.wallet).toBeGreaterThan(0);
      expect(v.satisfaction).toBeGreaterThanOrEqual(0);
      expect(v.remainingStops).toBe(SECT_DEFINITIONS[v.sect].baseStops);
    }
  });

  it("额外停留次数生效", () => {
    const rng = new RandomService(3, 0);
    const visitors = generateVisitors(rng, 5, 2, 0);
    for (const v of visitors) {
      expect(v.remainingStops).toBe(SECT_DEFINITIONS[v.sect].baseStops + 2);
    }
  });

  it("同种子生成完全一致", () => {
    const a = generateVisitors(new RandomService(9, 0), 8, 0, 5);
    const b = generateVisitors(new RandomService(9, 0), 8, 0, 5);
    expect(a).toEqual(b);
  });
});
