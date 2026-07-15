import { indexOf } from "../src/game/config";
import { getBuildingDef } from "../src/game/data/buildings";
import type { GameState } from "../src/game/models/game-state";
import { createNewGame } from "../src/game/controllers/TurnController";
import { makeInstance } from "../src/game/systems/PlacementSystem";

/** 直接在棋盘上放建筑（跳过灵石校验，用于测试规则）。 */
export function forcePlace(
  state: GameState,
  definitionId: string,
  x: number,
  y: number,
  level = 1,
  rotation = 0,
): void {
  const idx = indexOf(x, y);
  const inst = makeInstance(definitionId, idx, rotation);
  inst.level = level;
  // 确保图鉴包含
  if (!state.ownedBuildingIds.includes(definitionId)) {
    state.ownedBuildingIds.push(definitionId);
  }
  getBuildingDef(definitionId); // 校验存在
  state.board[idx] = inst;
}

export function newGame(seed: number): GameState {
  return createNewGame(seed);
}
