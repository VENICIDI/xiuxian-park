/**
 * 每日事件配置。使用有限的可辨识联合效果，规则引擎按 kind 处理。
 */

export type DailyEventEffect =
  | { kind: "globalRevenueMultiplier"; value: number } // 天降祥瑞 / 宗门团建
  | { kind: "visitorCountMultiplier"; value: number } // 魔修夜场
  | { kind: "disableRandomBuilding"; count: number } // 炼丹炸炉
  | { kind: "revenuePenalty"; value: number } // 仙盟检查（罚款比例）
  | { kind: "extraThrill"; value: number } // 雷劫提前（全场刺激提升）
  | { kind: "none" };

export type DailyEventDefinition = {
  id: string;
  name: string;
  description: string;
  /** 是否为负面事件（可被护山大阵免疫） */
  negative: boolean;
  effect: DailyEventEffect;
  /** 抽取权重 */
  weight: number;
};
