/**
 * 建筑效果模型：使用有限的可辨识联合类型（EffectSpec）。
 * 每种 kind 对应规则引擎中的一个处理器，禁止任意回调。
 */

import type { BuildingTag } from "./building";

export type EffectSpec =
  | {
      kind: "adjacentRevenueMultiplier";
      value: number;
      targetTags?: BuildingTag[];
    }
  | {
      kind: "globalTagRevenueMultiplier";
      value: number;
      targetTags: BuildingTag[];
    }
  | {
      kind: "extraVisitorStops";
      value: number;
    }
  | {
      kind: "restoreFatigue";
      value: number;
    }
  | {
      kind: "repeatPurchaseChance";
      chance: number;
    }
  | {
      kind: "preventNegativeEvent";
      radius: number;
    }
  | {
      kind: "nextDayVisitorBonus";
      value: number;
    }
  | {
      kind: "failureRevenueRatio";
      value: number;
      targetTags: BuildingTag[];
    }
  // 相邻刺激类建筑越多收益越高（九转大摆锤）
  | {
      kind: "adjacentStimulatingBonus";
      valuePerNeighbor: number;
    }
  // 路径越靠后（越长）收益越高（黄泉漂流）
  | {
      kind: "routePositionBonus";
      valuePerStep: number;
    }
  // 高满意度游客额外消费（法宝纪念馆）
  | {
      kind: "highSatisfactionBonus";
      threshold: number;
      value: number;
    };

export type EffectKind = EffectSpec["kind"];
