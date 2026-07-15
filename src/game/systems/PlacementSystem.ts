import { BOARD_SIZE, GRID_WIDTH, inBounds, indexOf, xyOf } from "../config";
import { getBuildingDef } from "../data/buildings";
import { effectiveSize } from "../models/building";
import type { BuildingDefinition, BuildingInstance } from "../models/building";
import type { GameState } from "../models/game-state";
import { neighborIndices, indicesWithinRadius } from "./grid";
import { isRoad } from "./route";

export type PlacementCheck =
  | { ok: true }
  | { ok: false; reason: string };

export { neighborIndices, indicesWithinRadius };

export const positionToIndex = (pos: { x: number; y: number }): number =>
  indexOf(pos.x, pos.y);

/**
 * 计算某锚点 + 旋转下的占地格索引；任一格越界则返回 null。
 */
export function footprintIndices(
  anchorIndex: number,
  def: BuildingDefinition,
  rotation: number,
): number[] | null {
  const { x: ax, y: ay } = xyOf(anchorIndex);
  const { w, h } = effectiveSize(def, rotation);
  const cells: number[] = [];
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      const nx = ax + dx;
      const ny = ay + dy;
      if (!inBounds(nx, ny)) return null;
      cells.push(indexOf(nx, ny));
    }
  }
  return cells;
}

/** 某已放置建筑实际占用的所有格（保证在界内）。 */
export function instanceFootprint(inst: BuildingInstance): number[] {
  const def = getBuildingDef(inst.definitionId);
  const cells = footprintIndices(
    positionToIndex(inst.position),
    def,
    inst.rotation ?? 0,
  );
  return cells ?? [positionToIndex(inst.position)];
}

/** 棋盘占用索引：每个被占用的格 → 对应建筑实例（含多格覆盖）。 */
export function buildOccupancy(state: GameState): Map<number, BuildingInstance> {
  const map = new Map<number, BuildingInstance>();
  for (const inst of state.board) {
    if (!inst) continue;
    for (const cell of instanceFootprint(inst)) {
      map.set(cell, inst);
    }
  }
  return map;
}

/** 返回占用某格的建筑实例（覆盖多格），无则 null。 */
export function occupantAt(
  state: GameState,
  index: number,
): BuildingInstance | null {
  if (index < 0 || index >= BOARD_SIZE) return null;
  return buildOccupancy(state).get(index) ?? null;
}

/** 该格的锚点存放的实例（仅锚点格非空）。 */
export function buildingAt(
  state: GameState,
  index: number,
): BuildingInstance | null {
  if (index < 0 || index >= BOARD_SIZE) return null;
  return state.board[index];
}

/**
 * 与某建筑正交相邻的其它建筑实例（去重，基于整块占地的四邻）。
 */
export function adjacentInstances(
  state: GameState,
  inst: BuildingInstance,
  occupancy?: Map<number, BuildingInstance>,
): BuildingInstance[] {
  const occ = occupancy ?? buildOccupancy(state);
  const foot = new Set(instanceFootprint(inst));
  const result = new Map<string, BuildingInstance>();
  for (const cell of foot) {
    for (const n of neighborIndices(cell)) {
      if (foot.has(n)) continue;
      const other = occ.get(n);
      if (other && other.instanceId !== inst.instanceId) {
        result.set(other.instanceId, other);
      }
    }
  }
  return [...result.values()];
}

/** 单格是否可放置（界内、非道路、未被占用）。 */
export function canPlaceAt(state: GameState, index: number): PlacementCheck {
  if (index < 0 || index >= BOARD_SIZE) {
    return { ok: false, reason: "超出边界" };
  }
  if (isRoad(index)) {
    return { ok: false, reason: "道路上不可放置" };
  }
  if (occupantAt(state, index) != null) {
    return { ok: false, reason: "该格已被占用" };
  }
  return { ok: true };
}

/** 校验整块占地能否放置在指定锚点 + 旋转。 */
export function canPlaceFootprint(
  state: GameState,
  anchorIndex: number,
  def: BuildingDefinition,
  rotation: number,
): PlacementCheck {
  const cells = footprintIndices(anchorIndex, def, rotation);
  if (!cells) return { ok: false, reason: "超出边界" };
  const occ = buildOccupancy(state);
  for (const cell of cells) {
    if (isRoad(cell)) return { ok: false, reason: "道路上不可放置" };
    if (occ.get(cell) != null) return { ok: false, reason: "空间被占用" };
  }
  return { ok: true };
}

let _instanceCounter = 0;
export function nextInstanceId(): string {
  _instanceCounter += 1;
  return `b${Date.now().toString(36)}_${_instanceCounter}`;
}

export function makeInstance(
  definitionId: string,
  index: number,
  rotation = 0,
): BuildingInstance {
  return {
    instanceId: nextInstanceId(),
    definitionId,
    position: xyOf(index),
    rotation,
    level: 1,
    disabledDays: 0,
  };
}

export function adjacentBuildings(
  state: GameState,
  index: number,
): BuildingInstance[] {
  const occ = buildOccupancy(state);
  const result = new Map<string, BuildingInstance>();
  for (const n of neighborIndices(index)) {
    const other = occ.get(n);
    if (other) result.set(other.instanceId, other);
  }
  return [...result.values()];
}

export { GRID_WIDTH };
