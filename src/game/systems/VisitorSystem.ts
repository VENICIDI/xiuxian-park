import { SECT_DEFINITIONS, ALL_SECTS } from "../data/visitors";
import type { VisitorState } from "../models/visitor";
import type { RandomService } from "../services/RandomService";

/**
 * 生成当天游客（步骤：门派 → 属性）。
 * 全部随机走统一 RandomService，保证可复现。
 */
export function generateVisitors(
  rng: RandomService,
  count: number,
  extraStops: number,
  extraThrill: number,
): VisitorState[] {
  const visitors: VisitorState[] = [];
  for (let i = 0; i < count; i++) {
    const sect = rng.pick(ALL_SECTS);
    const def = SECT_DEFINITIONS[sect];
    const walletVariance = rng.range(0.8, 1.25);
    visitors.push({
      id: `v${i}`,
      sect,
      wallet: Math.round(def.baseWallet * walletVariance),
      satisfaction: def.baseSatisfaction,
      thrill: extraThrill,
      fatigue: 0,
      remainingStops: def.baseStops + extraStops,
    });
  }
  return visitors;
}
