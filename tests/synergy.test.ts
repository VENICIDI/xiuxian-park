import { describe, expect, it } from "vitest";
import { indexOf } from "../src/game/config";
import {
  computeBuildingParams,
  hasMountainGuard,
  totalExtraStops,
} from "../src/game/systems/SynergySystem";
import {
  neighborIndices,
  canPlaceAt,
  canPlaceFootprint,
  footprintIndices,
} from "../src/game/systems/PlacementSystem";
import { getBuildingDef } from "../src/game/data/buildings";
import { isRoad } from "../src/game/systems/route";
import { forcePlace, newGame } from "./helpers";

describe("坐标与邻接", () => {
  it("一维索引换算正确", () => {
    expect(indexOf(0, 0)).toBe(0);
    expect(indexOf(7, 0)).toBe(7);
    expect(indexOf(0, 1)).toBe(8);
    expect(indexOf(7, 5)).toBe(47);
  });

  it("四方向邻居数量正确（角、边、中心）", () => {
    expect(neighborIndices(indexOf(0, 0))).toHaveLength(2);
    expect(neighborIndices(indexOf(3, 0))).toHaveLength(3);
    expect(neighborIndices(indexOf(3, 3))).toHaveLength(4);
  });
});

describe("放置合法性", () => {
  it("占用格不可再放置", () => {
    const s = newGame(1);
    forcePlace(s, "pill-shop", 2, 2);
    expect(canPlaceAt(s, indexOf(2, 2)).ok).toBe(false);
    expect(canPlaceAt(s, indexOf(3, 2)).ok).toBe(true);
  });

  it("道路格不可放置建筑", () => {
    const s = newGame(1);
    // y=1 与 y=4 为道路走廊
    expect(isRoad(indexOf(3, 1))).toBe(true);
    expect(canPlaceAt(s, indexOf(3, 1)).ok).toBe(false);
    // y=0 为可建造空地
    expect(isRoad(indexOf(3, 0))).toBe(false);
    expect(canPlaceAt(s, indexOf(3, 0)).ok).toBe(true);
  });
});

describe("多格占地与旋转", () => {
  it("旋转交换宽高（占地格随之改变）", () => {
    const def = getBuildingDef("sword-coaster"); // 2×1
    const a = indexOf(0, 0);
    expect(footprintIndices(a, def, 0)).toEqual([indexOf(0, 0), indexOf(1, 0)]);
    expect(footprintIndices(a, def, 1)).toEqual([indexOf(0, 0), indexOf(0, 1)]);
    expect(footprintIndices(a, def, 2)).toEqual([indexOf(0, 0), indexOf(1, 0)]);
  });

  it("占地任一格落在道路上则不可放置", () => {
    const s = newGame(1);
    const def = getBuildingDef("thunder-tower"); // 1×2
    // (0,0) 竖直占 (0,0)(0,1)，(0,1) 是道路 → 非法
    expect(canPlaceFootprint(s, indexOf(0, 0), def, 0).ok).toBe(false);
    // (0,2) 占 (0,2)(0,3) 均空地 → 合法
    expect(canPlaceFootprint(s, indexOf(0, 2), def, 0).ok).toBe(true);
  });

  it("占地重叠时不可放置", () => {
    const s = newGame(1);
    forcePlace(s, "sword-coaster", 2, 2); // 占 (2,2)(3,2)
    const def = getBuildingDef("pill-shop");
    expect(canPlaceFootprint(s, indexOf(3, 2), def, 0).ok).toBe(false);
    expect(canPlaceFootprint(s, indexOf(4, 2), def, 0).ok).toBe(true);
  });

  it("多格建筑与相邻聚灵阵联动（相邻任一占地格即可）", () => {
    const s = newGame(1);
    forcePlace(s, "sword-coaster", 2, 2); // 2×1 占 (2,2)(3,2)
    forcePlace(s, "spirit-gathering-array", 4, 2); // 邻接 (3,2)
    const params = computeBuildingParams(s);
    const coaster = [...params.values()].find(
      (p) => p.index === indexOf(2, 2),
    )!;
    const bonus = coaster.additive.find((a) => a.sourceId === "聚灵阵");
    expect(bonus?.value).toBeCloseTo(0.15, 5);
  });
});

describe("聚灵阵相邻加成", () => {
  it("相邻建筑获得 +15% 加成", () => {
    const s = newGame(1);
    forcePlace(s, "pill-shop", 2, 2);
    forcePlace(s, "spirit-gathering-array", 3, 2); // 右邻
    const params = computeBuildingParams(s);
    const shopIdx = indexOf(2, 2);
    const shop = [...params.values()].find(
      (p) => p.index === shopIdx,
    )!;
    const bonus = shop.additive.find((a) => a.sourceId === "聚灵阵");
    expect(bonus?.value).toBeCloseTo(0.15, 5);
    expect(shop.additiveTotal).toBeCloseTo(0.15, 5);
  });

  it("不相邻则无加成", () => {
    const s = newGame(1);
    forcePlace(s, "pill-shop", 0, 0);
    forcePlace(s, "spirit-gathering-array", 5, 5);
    const params = computeBuildingParams(s);
    const shop = [...params.values()].find((p) => p.index === indexOf(0, 0))!;
    expect(shop.additiveTotal).toBe(0);
  });
});

describe("雷池全局加成", () => {
  it("雷系建筑获得全局 +30%（即使不相邻）", () => {
    const s = newGame(1);
    forcePlace(s, "thunder-tower", 0, 2); // 1×2 → 占 (0,2)(0,3)
    forcePlace(s, "thunder-pond", 7, 5);
    const params = computeBuildingParams(s);
    const tower = [...params.values()].find((p) => p.index === indexOf(0, 2))!;
    const bonus = tower.additive.find((a) => a.sourceId === "雷池");
    expect(bonus?.value).toBeCloseTo(0.3, 5);
  });
});

describe("功能建筑效果扫描", () => {
  it("护山大阵被识别", () => {
    const s = newGame(1);
    expect(hasMountainGuard(s)).toBe(false);
    forcePlace(s, "mountain-guard-array", 1, 0);
    expect(hasMountainGuard(s)).toBe(true);
  });

  it("悟道台提供额外停留次数", () => {
    const s = newGame(1);
    expect(totalExtraStops(s)).toBe(0);
    forcePlace(s, "enlightenment-altar", 1, 0);
    expect(totalExtraStops(s)).toBe(1);
  });
});
