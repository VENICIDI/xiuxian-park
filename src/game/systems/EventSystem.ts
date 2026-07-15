import { DAILY_EVENTS } from "../data/daily-events";
import type { DailyEventDefinition } from "../models/daily-event";
import type { RandomService } from "../services/RandomService";

/** 按权重抽取每日事件（随机序列第 1 步）。 */
export function rollDailyEvent(rng: RandomService): DailyEventDefinition {
  return rng.weightedPick(DAILY_EVENTS, (e) => e.weight);
}
