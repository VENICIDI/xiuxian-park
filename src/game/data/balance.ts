/**
 * 全局平衡数值。集中管理便于快速调参。
 */

export const BALANCE = {
  /** 开局灵石 */
  startingSpiritStones: 0,
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
   * 斩杀线（生存线）机制：取代原「股东压力」失败。
   * 每天有一条最低灵石门槛 = base + perDay*(day-1)，随天数递增。
   * 每天结算后若当前灵石 ≤ 当天斩杀线 → 直接被董事会逐出，游戏失败。
   */
  killLine: {
    base: 40,
    perDay: 24,
  },

  /** 三选一候选数量 */
  draftChoices: 3,

  /**
   * 「刺激度」仪表机制：营业期间游客每笔消费按比例积累刺激度，
   * 每满 100 立即触发一段「收益翻倍」狂欢（真实时间计时，可跨天保留余量）。
   */
  thrillMeter: {
    /** 满刻度 */
    max: 100,
    /** 每 1 灵石收益积累的刺激度 */
    perStone: 0.6,
    /** 狂欢持续时长（毫秒，真实时间，不随快进缩短） */
    frenzyMs: 5000,
    /** 狂欢期间的收益倍率 */
    frenzyMultiplier: 2,
  },
} as const;
