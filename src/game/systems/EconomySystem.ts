import { BALANCE } from "../data/balance";
import { getBuildingDef } from "../data/buildings";
import { SECT_DEFINITIONS } from "../data/visitors";
import type { BuildingDefinition } from "../models/building";
import type { GameState, PresentationEvent, RevenueBreakdown } from "../models/game-state";
import type { VisitorState } from "../models/visitor";
import { buildOccupancy } from "./PlacementSystem";
import { ROUTE, ROAD_ADJACENT_BUILDABLE } from "./route";
import type { BuildingRevenueParam } from "./SynergySystem";

export type SimulateInput = {
  state: GameState;
  params: Map<string, BuildingRevenueParam>;
  visitors: VisitorState[];
  disabledInstanceIds: Set<string>;
  insuranceRatio: number;
};

export type SimulateOutput = {
  grossRevenue: number;
  recoveredRevenue: number;
  events: PresentationEvent[];
  breakdowns: Map<string, RevenueBreakdown>;
  bestCombo: number;
};

/** 计算某位游客在某座建筑的单次消费系数（含门派偏好、满意度、疲劳）。 */
function spendMultiplier(visitor: VisitorState, def: BuildingDefinition): number {
  const sect = SECT_DEFINITIONS[visitor.sect];
  let mult = 1;

  if (def.tags.some((t) => sect.likedTags.includes(t))) {
    mult += BALANCE.likedTagBonus;
  }
  if (def.tags.some((t) => sect.dislikedTags.includes(t))) {
    mult -= BALANCE.dislikedTagPenalty;
  }

  mult +=
    (visitor.satisfaction - BALANCE.satisfactionPivot) *
    BALANCE.satisfactionSlopePerPoint;
  mult -= visitor.fatigue * BALANCE.fatigueSpendPenaltyPerPoint;

  return Math.max(0.1, mult);
}

/** 停留时更新满意度（受刺激耐受度、偏好影响）。 */
function satisfactionDelta(visitor: VisitorState, def: BuildingDefinition): number {
  const sect = SECT_DEFINITIONS[visitor.sect];
  let delta = 0;

  if (def.tags.includes("stimulating")) {
    const toleranceGap = sect.thrillTolerance - 50;
    const thrillBoost = 1 + visitor.thrill / 100;
    delta += toleranceGap * 0.06 * BALANCE.thrillSatisfactionScale * thrillBoost;
  }
  if (def.tags.some((t) => sect.likedTags.includes(t))) delta += 3;
  if (def.tags.some((t) => sect.dislikedTags.includes(t))) delta -= 4;

  return Math.round(delta);
}

/**
 * 逐个模拟游客沿固定路线行动（步骤 6-8）。
 * 先结算数值并生成事件日志，动画只做表现。
 */
export function simulateVisitors(input: SimulateInput): SimulateOutput {
  const { state, params, visitors, disabledInstanceIds, insuranceRatio } = input;

  const events: PresentationEvent[] = [];
  const breakdowns = new Map<string, RevenueBreakdown>();
  const occupancy = buildOccupancy(state);
  let grossRevenue = 0;
  let recoveredRevenue = 0;
  let bestCombo = 0;

  // 初始化收益明细
  for (const param of params.values()) {
    if (!param.isRevenueBuilding) continue;
    breakdowns.set(param.instanceId, {
      buildingInstanceId: param.instanceId,
      definitionId: param.definitionId,
      base: param.base,
      rarityMultiplier: param.rarityMultiplier,
      levelMultiplier: param.levelMultiplier,
      additiveBonuses: param.additive,
      finalMultipliers: [],
      result: 0,
    });
  }

  for (const visitor of visitors) {
    events.push({ type: "visitorSpawned", visitorId: visitor.id, sect: visitor.sect });
    let combo = 0;
    // 同一游客对每座建筑最多触发一次（避免多个相邻道路格重复触发）
    const visited = new Set<string>();

    for (let routeIndex = 0; routeIndex < ROUTE.length; routeIndex++) {
      const roadCell = ROUTE[routeIndex];
      const adjacent = ROAD_ADJACENT_BUILDABLE[roadCell];
      if (!adjacent) continue;

      for (const cellIndex of adjacent) {
        const inst = occupancy.get(cellIndex);
        if (!inst) continue;
        if (visited.has(inst.instanceId)) continue;
        const def = getBuildingDef(inst.definitionId);
        const param = params.get(inst.instanceId);
        if (!param) continue;
        visited.add(inst.instanceId);

        // 恢复疲劳类建筑：经过即生效（不消耗停留次数）
        const restore = def.effects.find((e) => e.kind === "restoreFatigue");
        if (restore && restore.kind === "restoreFatigue") {
          visitor.fatigue = Math.max(0, visitor.fatigue - restore.value);
        }

        if (!param.isRevenueBuilding) continue;
        if (visitor.remainingStops <= 0 || visitor.wallet <= 0) continue;

        events.push({ type: "visitorMoved", visitorId: visitor.id, routeIndex });
        events.push({ type: "buildingTriggered", buildingInstanceId: inst.instanceId });

        // 计算消费
        let spend = param.perVisitBase * spendMultiplier(visitor, def);
        const highSat = def.effects.find((e) => e.kind === "highSatisfactionBonus");
        if (
          highSat &&
          highSat.kind === "highSatisfactionBonus" &&
          visitor.satisfaction >= highSat.threshold
        ) {
          spend *= 1 + highSat.value;
        }
        spend = Math.min(visitor.wallet, Math.max(0, Math.round(spend)));

        // 停留结算
        visitor.remainingStops -= 1;
        visitor.fatigue += BALANCE.fatiguePerStop;
        visitor.wallet -= spend;
        combo += 1;

        const disabled = disabledInstanceIds.has(inst.instanceId);
        if (disabled) {
          // 停业：本应收益进入损失桶，保险回收一部分
          const recovered = Math.round(spend * insuranceRatio);
          recoveredRevenue += recovered;
        } else {
          grossRevenue += spend;
          const bd = breakdowns.get(inst.instanceId);
          if (bd) bd.result += spend;
          if (spend > 0) {
            events.push({
              type: "purchase",
              visitorId: visitor.id,
              buildingInstanceId: inst.instanceId,
              amount: spend,
            });
          }
          if (def.tags.includes("thunder")) {
            events.push({ type: "thunder", buildingInstanceId: inst.instanceId });
          }
        }

        // 满意度变化
        const dSat = satisfactionDelta(visitor, def);
        if (dSat !== 0) {
          visitor.satisfaction = Math.max(0, Math.min(100, visitor.satisfaction + dSat));
          events.push({ type: "satisfactionChanged", visitorId: visitor.id, delta: dSat });
        }
      }
    }

    if (combo > bestCombo) bestCombo = combo;
  }

  return { grossRevenue, recoveredRevenue, events, breakdowns, bestCombo };
}
