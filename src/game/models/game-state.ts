import type { BuildingInstance } from "./building";
import type { Sect } from "./visitor";

export type GamePhase =
  | "planning"
  | "resolving"
  | "animating"
  | "gameOver";

export type RunStatistics = {
  totalRevenue: number;
  bestDayRevenue: number;
  bestCombo: number;
  daysSurvived: number;
  failureReason: string | null;
};

export type GameState = {
  schemaVersion: number;
  runId: string;
  seed: number;
  rngCursor: number;
  day: number;
  phase: GamePhase;
  spiritStones: number;
  /** 股东压力 0..100：达到 100 被董事会罢免（斩杀线机制，取代破产失败）。 */
  shareholderPressure: number;
  visitorCount: number;
  /** 固定 48 项一维数组，索引 y*8+x */
  board: Array<BuildingInstance | null>;
  /** 当前底部可放置的建筑卡（固定 3 张手牌，每次过关随机刷新，可重复放置） */
  ownedBuildingIds: string[];
  activeEventId: string | null;
  /** 下一天额外游客加成（招生广场等结算后效果累积） */
  nextDayVisitorBonus: number;
  statistics: RunStatistics;
};

/** 规则引擎返回：新状态 + 表现事件日志。 */
export type SimulationResult = {
  nextState: GameState;
  events: PresentationEvent[];
  breakdowns: RevenueBreakdown[];
};

export type PresentationEvent =
  | { type: "dayStarted"; day: number; eventId: string | null }
  | { type: "visitorSpawned"; visitorId: string; sect: Sect }
  | { type: "visitorMoved"; visitorId: string; routeIndex: number }
  | { type: "buildingTriggered"; buildingInstanceId: string }
  | {
      type: "purchase";
      visitorId: string;
      buildingInstanceId: string;
      amount: number;
    }
  | { type: "satisfactionChanged"; visitorId: string; delta: number }
  | { type: "thunder"; buildingInstanceId: string }
  | { type: "buildingDisabled"; buildingInstanceId: string }
  | { type: "negativeEvent"; eventId: string }
  | { type: "dayCompleted"; revenue: number };

export type RevenueBreakdown = {
  buildingInstanceId: string;
  definitionId: string;
  base: number;
  rarityMultiplier: number;
  levelMultiplier: number;
  additiveBonuses: Array<{ sourceId: string; value: number }>;
  finalMultipliers: Array<{ sourceId: string; value: number }>;
  result: number;
};
