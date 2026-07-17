import { BOARD_SIZE, SCHEMA_VERSION } from "../config";
import { BALANCE } from "../data/balance";
import { getBuildingDef } from "../data/buildings";
import { getDailyEvent } from "../data/daily-events";
import { MAX_LEVEL } from "../models/building";
import type { GameState, PresentationEvent, RevenueBreakdown, SimulationResult } from "../models/game-state";
import { RandomService } from "../services/RandomService";
import {
  canPlaceFootprint,
  makeInstance,
  occupantAt,
  positionToIndex,
} from "../systems/PlacementSystem";
import { generateVisitors } from "../systems/VisitorSystem";
import { simulateVisitors } from "../systems/EconomySystem";
import { rollDailyEvent } from "../systems/EventSystem";
import { generateDraft } from "../systems/DraftSystem";
import {
  computeBuildingParams,
  hasMountainGuard,
  insuranceRatio,
  iterBuildings,
  totalExtraStops,
  totalNextDayVisitorBonus,
} from "../systems/SynergySystem";

const clone = <T>(v: T): T =>
  typeof structuredClone === "function"
    ? structuredClone(v)
    : (JSON.parse(JSON.stringify(v)) as T);

function rngFor(state: GameState): RandomService {
  return new RandomService(state.seed, state.rngCursor);
}

function commitRng(state: GameState, rng: RandomService): void {
  state.rngCursor = rng.currentCursor;
}

function emptyBoard(): Array<null> {
  return new Array(BOARD_SIZE).fill(null);
}

function newRunId(): string {
  return `run_${Date.now().toString(36)}`;
}

/** 计算当天游客数量（在 startDay 时定档，供 HUD 展示）。 */
function computeVisitorCount(
  day: number,
  nextDayBonus: number,
  eventVisitorMult: number,
): number {
  let count =
    BALANCE.baseVisitorCount +
    BALANCE.visitorGrowthPerDay * (day - 1) +
    nextDayBonus;
  count *= 1 + eventVisitorMult;
  return Math.min(BALANCE.maxVisitorCount, Math.round(count));
}

/** 进入某一天的 Planning 阶段：抽取事件、定档游客数量。 */
export function startDay(state: GameState): GameState {
  const next = clone(state);
  const rng = rngFor(next);

  const event = rollDailyEvent(rng);
  next.activeEventId = event.id;

  const eventVisitorMult =
    event.effect.kind === "visitorCountMultiplier" ? event.effect.value : 0;
  next.visitorCount = computeVisitorCount(
    next.day,
    next.nextDayVisitorBonus,
    eventVisitorMult,
  );
  next.nextDayVisitorBonus = 0;
  next.phase = "planning";

  commitRng(next, rng);
  return next;
}

/** 新开一局。 */
export function createNewGame(seed?: number): GameState {
  const actualSeed = seed ?? Math.floor(Math.random() * 0xffffffff);
  const base: GameState = {
    schemaVersion: SCHEMA_VERSION,
    runId: newRunId(),
    seed: actualSeed >>> 0,
    rngCursor: 0,
    day: 1,
    phase: "planning",
    spiritStones: BALANCE.startingSpiritStones,
    shareholderPressure: BALANCE.shareholderPressure.starting,
    visitorCount: BALANCE.baseVisitorCount,
    board: emptyBoard(),
    ownedBuildingIds: [],
    activeEventId: null,
    nextDayVisitorBonus: 0,
    statistics: {
      totalRevenue: 0,
      bestDayRevenue: 0,
      bestCombo: 0,
      daysSurvived: 0,
      failureReason: null,
    },
  };
  // 开局随机发放 3 张建筑卡
  const rng = rngFor(base);
  base.ownedBuildingIds = generateDraft(rng);
  commitRng(base, rng);
  return startDay(base);
}

function dailyUpkeep(day: number): number {
  return BALANCE.dailyUpkeepBase + BALANCE.dailyUpkeepPerDay * (day - 1);
}

/** 当天的「业绩斩杀线」（目标净收益，随天数递增）。 */
export function killLineForDay(day: number): number {
  const P = BALANCE.shareholderPressure;
  return P.killLineBase + P.killLinePerDay * (day - 1);
}

/**
 * 根据当天净收益与斩杀线，返回压力增量（正=加压，负=缓解）。
 * 未达标按缺口比例加压；达标按盈余比例缓解（达标至少缓解 downBase）。
 */
export function pressureDelta(netIncome: number, killLine: number): number {
  const P = BALANCE.shareholderPressure;
  const denom = Math.max(1, killLine);
  if (netIncome < killLine) {
    const shortfallRatio = (killLine - netIncome) / denom;
    return Math.min(P.upMax, Math.max(P.upMin, Math.round(shortfallRatio * P.upScale)));
  }
  const surplusRatio = (netIncome - killLine) / denom;
  return -Math.min(P.downMax, Math.round(P.downBase + surplusRatio * P.downScale));
}

/**
 * 同步结算当天（Resolving）。返回新状态 + 表现事件日志。
 * 该函数为纯规则调用，不引用 Phaser。
 */
export function resolveDay(state: GameState): SimulationResult {
  const next = clone(state);
  const rng = rngFor(next);

  const event = getDailyEvent(next.activeEventId);
  const guarded = hasMountainGuard(next);
  const immune = event.negative && guarded;

  const events: PresentationEvent[] = [
    { type: "dayStarted", day: next.day, eventId: next.activeEventId },
  ];

  // —— 负面事件：随机停业（可被护山大阵免疫）
  const disabledInstanceIds = new Set<string>();
  if (
    event.effect.kind === "disableRandomBuilding" &&
    !immune
  ) {
    const revenueInstances = [...iterBuildings(next)].filter(
      (b) => getBuildingDef(b.definitionId).baseRevenue > 0,
    );
    const picks = rng.sample(revenueInstances, event.effect.count);
    for (const p of picks) {
      disabledInstanceIds.add(p.instanceId);
      events.push({ type: "buildingDisabled", buildingInstanceId: p.instanceId });
    }
    if (picks.length > 0) {
      events.push({ type: "negativeEvent", eventId: event.id });
    }
  } else if (event.negative && !immune && event.effect.kind !== "none") {
    events.push({ type: "negativeEvent", eventId: event.id });
  }

  // —— 计算建筑收益参数（全局标签加成 → 相邻加成 → 快照）
  const params = computeBuildingParams(next);

  // —— 生成并模拟游客
  const extraStops = totalExtraStops(next);
  const extraThrill =
    event.effect.kind === "extraThrill" ? event.effect.value : 0;
  const visitors = generateVisitors(
    rng,
    next.visitorCount,
    extraStops,
    extraThrill,
  );

  const sim = simulateVisitors({
    state: next,
    params,
    visitors,
    disabledInstanceIds,
    insuranceRatio: insuranceRatio(next),
  });
  events.push(...sim.events);

  let revenue = sim.grossRevenue + sim.recoveredRevenue;

  // —— 结算后：事件全局乘区
  if (event.effect.kind === "globalRevenueMultiplier") {
    const factor = 1 + event.effect.value;
    revenue = Math.round(revenue * factor);
    for (const bd of sim.breakdowns.values()) {
      bd.finalMultipliers.push({ sourceId: event.name, value: event.effect.value });
      bd.result = Math.round(bd.result * factor);
    }
  } else if (event.effect.kind === "revenuePenalty" && !immune) {
    const factor = 1 - event.effect.value;
    revenue = Math.round(revenue * factor);
    for (const bd of sim.breakdowns.values()) {
      bd.finalMultipliers.push({ sourceId: event.name, value: -event.effect.value });
      bd.result = Math.round(bd.result * factor);
    }
  }

  const upkeep = dailyUpkeep(next.day);
  const netIncome = revenue - upkeep;
  next.spiritStones += netIncome;

  // —— 统计
  next.statistics.totalRevenue += Math.max(0, revenue);
  next.statistics.bestDayRevenue = Math.max(
    next.statistics.bestDayRevenue,
    revenue,
  );
  next.statistics.bestCombo = Math.max(next.statistics.bestCombo, sim.bestCombo);
  next.statistics.daysSurvived = next.day;

  // —— 下一天游客加成（招生广场）
  next.nextDayVisitorBonus = totalNextDayVisitorBonus(next);

  events.push({ type: "dayCompleted", revenue: netIncome });

  const breakdowns: RevenueBreakdown[] = [...sim.breakdowns.values()];

  // —— 股东压力（斩杀线机制）：按当天净收益与斩杀线的差额增减压力
  const P = BALANCE.shareholderPressure;
  const killLine = killLineForDay(next.day);
  const delta = pressureDelta(netIncome, killLine);
  next.shareholderPressure = Math.min(
    P.max,
    Math.max(0, next.shareholderPressure + delta),
  );

  // —— 失败判定：股东压力爆表（唯一失败源；灵石允许暂时为负）
  if (next.shareholderPressure >= P.max) {
    next.phase = "gameOver";
    next.statistics.failureReason = "股东压力爆表，董事会将你逐出乐园。";
    commitRng(next, rng);
    return { nextState: next, events, breakdowns };
  }

  // —— 过关：随机刷新底部 3 张建筑卡
  next.ownedBuildingIds = generateDraft(rng);
  commitRng(next, rng);

  // —— 推进到下一天（或触发终局胜利）
  const nextDay = next.day + 1;
  if (nextDay > BALANCE.finalDay) {
    next.phase = "gameOver";
    next.statistics.failureReason = null; // null 表示通关胜利
    next.statistics.daysSurvived = next.day;
    return { nextState: next, events, breakdowns };
  }

  next.day = nextDay;
  const advanced = startDay(next);
  return { nextState: advanced, events, breakdowns };
}

// —————————————————— Planning 阶段的棋盘编辑 ——————————————————

export type ActionResult = { ok: boolean; message?: string };

export function placeBuilding(
  state: GameState,
  definitionId: string,
  index: number,
  rotation = 0,
): ActionResult {
  if (state.phase !== "planning") return { ok: false, message: "当前阶段不可放置" };
  if (!state.ownedBuildingIds.includes(definitionId)) {
    return { ok: false, message: "尚未拥有该建筑" };
  }
  const def = getBuildingDef(definitionId);
  const check = canPlaceFootprint(state, index, def, rotation);
  if (!check.ok) return { ok: false, message: check.reason };

  if (state.spiritStones < def.baseCost) {
    return { ok: false, message: "灵石不足" };
  }

  state.spiritStones -= def.baseCost;
  state.board[index] = makeInstance(definitionId, index, rotation);
  return { ok: true };
}

export function upgradeBuilding(state: GameState, index: number): ActionResult {
  if (state.phase !== "planning") return { ok: false, message: "当前阶段不可升级" };
  const inst = occupantAt(state, index);
  if (!inst) return { ok: false, message: "该格无建筑" };
  const def = getBuildingDef(inst.definitionId);
  if (inst.level >= MAX_LEVEL) return { ok: false, message: "已达最高等级" };
  const cost = def.upgradeCosts[inst.level - 1];
  if (state.spiritStones < cost) return { ok: false, message: "灵石不足" };

  state.spiritStones -= cost;
  inst.level += 1;
  return { ok: true };
}

export function removeBuilding(state: GameState, index: number): ActionResult {
  if (state.phase !== "planning") return { ok: false, message: "当前阶段不可拆除" };
  const inst = occupantAt(state, index);
  if (!inst) return { ok: false, message: "该格无建筑" };
  const def = getBuildingDef(inst.definitionId);
  const refund = Math.floor(def.baseCost * 0.5);
  state.spiritStones += refund;
  state.board[positionToIndex(inst.position)] = null;
  return { ok: true, message: `已拆除，返还 ${refund} 灵石` };
}

/** 升级到下一级的价格（用于 UI 展示），无更多等级返回 null。 */
export function nextUpgradeCost(state: GameState, index: number): number | null {
  const inst = occupantAt(state, index);
  if (!inst) return null;
  const def = getBuildingDef(inst.definitionId);
  if (inst.level >= MAX_LEVEL) return null;
  return def.upgradeCosts[inst.level - 1];
}
