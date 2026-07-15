import { BALANCE } from "../data/balance";
import { ALL_BUILDING_IDS, getBuildingDef } from "../data/buildings";
import type { BuildingRarity } from "../models/building";
import type { RandomService } from "../services/RandomService";

/** 品质抽取权重：越稀有越少见。 */
const RARITY_WEIGHT: Record<BuildingRarity, number> = {
  common: 40,
  uncommon: 30,
  rare: 18,
  epic: 9,
  legendary: 3,
};

/**
 * 生成三选一候选（随机序列第 4 步）。
 * 按品质权重不重复抽取，优先未拥有的建筑，保证候选池不为空。
 */
export function generateDraft(rng: RandomService, ownedIds: string[] = []): string[] {
  let pool = ALL_BUILDING_IDS.filter((id) => !ownedIds.includes(id));
  // 若未拥有的不足，退回全量池，保证候选不为空
  if (pool.length < BALANCE.draftChoices) {
    pool = ALL_BUILDING_IDS.slice();
  }
  const chosen: string[] = [];
  const n = Math.min(BALANCE.draftChoices, pool.length);

  for (let i = 0; i < n; i++) {
    const pick = rng.weightedPick(
      pool,
      (id) => RARITY_WEIGHT[getBuildingDef(id).rarity],
    );
    chosen.push(pick);
    pool.splice(pool.indexOf(pick), 1);
  }
  return chosen;
}
