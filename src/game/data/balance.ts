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

  /** 失败判定：灵石为负则失败 */
  bankruptcyThreshold: 0,

  /** 三选一候选数量 */
  draftChoices: 3,
} as const;
