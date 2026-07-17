/**
 * 全局平衡数值。集中管理便于快速调参。
 */

export const BALANCE = {
  /** 开局灵石 */
  startingSpiritStones: 200,
  /** 开局每日基础游客数 */
  baseVisitorCount: 8,
  /** 每天游客自然增长 */
  visitorGrowthPerDay: 1.5,
  /** 每天游客上限（性能约束 ≤ 40） */
  maxVisitorCount: 40,

  /** 每天需要缴纳的“灵脉维护费”（运营成本），随天数增长 */
  dailyUpkeepBase: 40,
  dailyUpkeepPerDay: 12,

  /** 每个等级的收益乘区系数（Lv1..Lv4） */
  levelMultiplier: [1.0, 1.4, 1.9, 2.5] as number[],

  /** 满意度 -> 消费影响的中心值与斜率 */
  satisfactionPivot: 50,
  satisfactionSlopePerPoint: 0.006,

  /** 疲劳每次停留累加，疲劳过高降低消费欲望 */
  fatiguePerStop: 12,
  fatigueSpendPenaltyPerPoint: 0.004,

  /** 门派喜欢/厌恶标签对消费的加成/惩罚 */
  likedTagBonus: 0.35,
  dislikedTagPenalty: 0.4,

  /** 刺激对满意度的影响系数 */
  thrillSatisfactionScale: 0.5,

  /** 终局天数（撑过则通关） */
  finalDay: 15,

  /**
   * 股东压力（斩杀线机制）：取代原「灵石为负破产」失败。
   * 每天有一条「业绩斩杀线」= 目标净收益（随天数递增）。
   *   净收益 < 斩杀线 → 按缺口比例增加压力；
   *   净收益 ≥ 斩杀线 → 按盈余比例降低压力（达标至少缓解 downBase）。
   *   压力达到 max(100%) → 被董事会罢免，游戏失败。
   */
  shareholderPressure: {
    starting: 0,
    max: 100,
    /** 斩杀线：killLineBase + killLinePerDay*(day-1) */
    killLineBase: 40,
    killLinePerDay: 24,
    /** 未达标加压：clamp(round(shortfallRatio*upScale), upMin, upMax) */
    upScale: 46,
    upMin: 6,
    upMax: 60,
    /** 达标缓解：clamp(round(downBase + surplusRatio*downScale), downBase, downMax) */
    downBase: 12,
    downScale: 28,
    downMax: 45,
  },

  /** 三选一候选数量 */
  draftChoices: 3,
} as const;
