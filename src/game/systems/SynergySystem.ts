import { BALANCE } from "../data/balance";
import { getBuildingDef } from "../data/buildings";
import { RARITY_MULTIPLIER } from "../models/building";
import type { BuildingInstance, BuildingTag } from "../models/building";
import type { EffectSpec } from "../models/effect";
import type { GameState } from "../models/game-state";
import {
  adjacentInstances,
  buildOccupancy,
  instanceFootprint,
  positionToIndex,
} from "./PlacementSystem";
import { BUILDING_SERVE_ORDER } from "./route";

/** 某座建筑当天的收益计算参数（未乘游客个体系数）。 */
export type BuildingRevenueParam = {
  instanceId: string;
  definitionId: string;
  index: number;
  routeIndex: number;
  isRevenueBuilding: boolean;
  base: number;
  rarityMultiplier: number;
  levelMultiplier: number;
  additive: Array<{ sourceId: string; value: number }>;
  additiveTotal: number;
  /** 每位游客到访的基础消费额（未含游客偏好/满意度/疲劳） */
  perVisitBase: number;
};

/** 效果值随等级的缩放（buff 建筑升级更强）。 */
export function effectiveEffectValue(effect: EffectSpec, level: number): number {
  const lv = level - 1;
  switch (effect.kind) {
    case "adjacentRevenueMultiplier":
      return effect.value + 0.05 * lv;
    case "globalTagRevenueMultiplier":
      return effect.value + 0.1 * lv;
    case "extraVisitorStops":
      return effect.value + (lv >= 2 ? 1 : 0); // Lv3 起 +1
    case "restoreFatigue":
      return effect.value + 8 * lv;
    case "nextDayVisitorBonus":
      return effect.value;
    case "failureRevenueRatio":
      return effect.value;
    case "adjacentStimulatingBonus":
      return effect.valuePerNeighbor;
    case "routePositionBonus":
      return effect.valuePerStep;
    default:
      return 0;
  }
}

function hasTag(tags: BuildingTag[], target: BuildingTag): boolean {
  return tags.includes(target);
}

/**
 * 计算全场每座建筑的收益参数（步骤 3-5：全局标签加成 → 相邻加成 → 快照）。
 * Buff 只读取建筑的基础标签与位置，不读取其它 Buff 放大后的结果。
 */
export function computeBuildingParams(
  state: GameState,
): Map<string, BuildingRevenueParam> {
  const result = new Map<string, BuildingRevenueParam>();
  const occupancy = buildOccupancy(state);

  // 建筑（可能多格）的服务顺序：占地中相邻道路最早的路线顺序
  const serveOrderOf = (inst: BuildingInstance): number => {
    let best = Infinity;
    for (const cell of instanceFootprint(inst)) {
      const order = BUILDING_SERVE_ORDER[cell];
      if (order != null && order < best) best = order;
    }
    return best === Infinity ? 0 : best;
  };

  // 预先收集全局标签加成来源（雷池等）
  const globalTagBonuses: Array<{
    sourceId: string;
    value: number;
    tags: BuildingTag[];
  }> = [];
  for (const inst of iterBuildings(state)) {
    const def = getBuildingDef(inst.definitionId);
    for (const eff of def.effects) {
      if (eff.kind === "globalTagRevenueMultiplier") {
        globalTagBonuses.push({
          sourceId: def.name,
          value: effectiveEffectValue(eff, inst.level),
          tags: eff.targetTags,
        });
      }
    }
  }

  for (const inst of iterBuildings(state)) {
    const def = getBuildingDef(inst.definitionId);
    const index = positionToIndex(inst.position);
    const rarityMultiplier = RARITY_MULTIPLIER[def.rarity];
    const levelMultiplier =
      BALANCE.levelMultiplier[Math.min(inst.level, BALANCE.levelMultiplier.length) - 1];

    const additive: Array<{ sourceId: string; value: number }> = [];

    // 全局标签加成
    for (const g of globalTagBonuses) {
      if (g.tags.some((t) => hasTag(def.tags, t))) {
        additive.push({ sourceId: g.sourceId, value: g.value });
      }
    }

    const neighbors = adjacentInstances(state, inst, occupancy);

    // 相邻加成：来自邻居的 adjacentRevenueMultiplier（聚灵阵）
    for (const neighbor of neighbors) {
      const nDef = getBuildingDef(neighbor.definitionId);
      for (const eff of nDef.effects) {
        if (eff.kind === "adjacentRevenueMultiplier") {
          if (
            !eff.targetTags ||
            eff.targetTags.some((t) => hasTag(def.tags, t))
          ) {
            additive.push({
              sourceId: nDef.name,
              value: effectiveEffectValue(eff, neighbor.level),
            });
          }
        }
      }
    }

    // 自身效果：相邻刺激加成（九转大摆锤）
    for (const eff of def.effects) {
      if (eff.kind === "adjacentStimulatingBonus") {
        const count = neighbors.filter((n) =>
          getBuildingDef(n.definitionId).tags.includes("stimulating"),
        ).length;
        if (count > 0) {
          additive.push({
            sourceId: "相邻刺激",
            value: eff.valuePerNeighbor * count,
          });
        }
      }
      // 路径位置加成（黄泉漂流）：相邻道路越靠后收益越高
      if (eff.kind === "routePositionBonus") {
        additive.push({
          sourceId: "路径纵深",
          value: eff.valuePerStep * serveOrderOf(inst),
        });
      }
    }

    const additiveTotal = additive.reduce((s, a) => s + a.value, 0);
    const isRevenueBuilding = def.baseRevenue > 0;
    const perVisitBase =
      def.baseRevenue * rarityMultiplier * levelMultiplier * (1 + additiveTotal);

    result.set(inst.instanceId, {
      instanceId: inst.instanceId,
      definitionId: inst.definitionId,
      index,
      routeIndex: serveOrderOf(inst),
      isRevenueBuilding,
      base: def.baseRevenue,
      rarityMultiplier,
      levelMultiplier,
      additive,
      additiveTotal,
      perVisitBase,
    });
  }

  return result;
}

/** 全场是否存在护山大阵（免疫负面事件）。 */
export function hasMountainGuard(state: GameState): boolean {
  for (const inst of iterBuildings(state)) {
    const def = getBuildingDef(inst.definitionId);
    if (def.effects.some((e) => e.kind === "preventNegativeEvent")) return true;
  }
  return false;
}

/** 全场额外停留次数（悟道台）。 */
export function totalExtraStops(state: GameState): number {
  let total = 0;
  for (const inst of iterBuildings(state)) {
    const def = getBuildingDef(inst.definitionId);
    for (const eff of def.effects) {
      if (eff.kind === "extraVisitorStops") {
        total += effectiveEffectValue(eff, inst.level);
      }
    }
  }
  return total;
}

/** 下一天游客加成（招生广场）。 */
export function totalNextDayVisitorBonus(state: GameState): number {
  let total = 0;
  for (const inst of iterBuildings(state)) {
    const def = getBuildingDef(inst.definitionId);
    for (const eff of def.effects) {
      if (eff.kind === "nextDayVisitorBonus") total += eff.value;
    }
  }
  return total;
}

/** 全场保险回收比例（渡劫保险所，取最高）。 */
export function insuranceRatio(state: GameState): number {
  let ratio = 0;
  for (const inst of iterBuildings(state)) {
    const def = getBuildingDef(inst.definitionId);
    for (const eff of def.effects) {
      if (eff.kind === "failureRevenueRatio") ratio = Math.max(ratio, eff.value);
    }
  }
  return ratio;
}

export function* iterBuildings(state: GameState): Generator<BuildingInstance> {
  for (const cell of state.board) {
    if (cell != null) yield cell;
  }
}
