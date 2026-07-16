import type { EffectSpec } from "./effect";

export type GridPosition = {
  x: number;
  y: number;
};

export type BuildingCategory = "ride" | "shop" | "buff" | "utility";

export type BuildingRarity =
  | "common"
  | "uncommon"
  | "rare"
  | "epic"
  | "legendary";

export type BuildingTag =
  | "sword"
  | "flight"
  | "speed"
  | "thunder"
  | "ghost"
  | "beast"
  | "food"
  | "meditation"
  | "stimulating";

/** 占地尺寸（以格为单位），未旋转时的宽高。 */
export type BuildingSize = {
  w: number;
  h: number;
};

/** 只读配置：不写入存档。 */
export type BuildingDefinition = {
  id: string;
  name: string;
  category: BuildingCategory;
  tags: BuildingTag[];
  rarity: BuildingRarity;
  /** 占地尺寸（格）；默认 1×1 */
  size: BuildingSize;
  baseCost: number;
  /** 升级价格（Lv1->2, 2->3, 3->4），长度 3 */
  upgradeCosts: number[];
  baseRevenue: number;
  /** 每个等级的收益基数，长度 4（Lv1..Lv4） */
  levelRevenue: number[];
  /** 占位美术颜色（十六进制），正式美术后置 */
  color: number;
  /** 正式美术贴图的纹理 key（在 PreloadScene 加载）；缺省则回退到程序化方块渲染。 */
  sprite?: string;
  effects: EffectSpec[];
  /** 简短说明，用于卡片/详情 */
  description: string;
};

/** 本局变化，写入存档。 */
export type BuildingInstance = {
  instanceId: string;
  definitionId: string;
  /** 占地锚点（左上角格）。 */
  position: GridPosition;
  /** 旋转方向 0/1/2/3（顺时针 90°）；偶数与原尺寸相同，奇数宽高交换。 */
  rotation: number;
  level: number;
  /** 剩余停业天数（被负面事件禁用） */
  disabledDays: number;
};

/** 旋转后的有效宽高。 */
export function effectiveSize(
  def: BuildingDefinition,
  rotation: number,
): BuildingSize {
  return (rotation & 1) === 0
    ? { w: def.size.w, h: def.size.h }
    : { w: def.size.h, h: def.size.w };
}

/** 品质对收益的乘区系数。 */
export const RARITY_MULTIPLIER: Record<BuildingRarity, number> = {
  common: 1.0,
  uncommon: 1.15,
  rare: 1.35,
  epic: 1.6,
  legendary: 2.0,
};

/** 品质颜色（对齐《美术设计规范.md》十、建筑品质颜色）。 */
export const RARITY_COLOR: Record<BuildingRarity, number> = {
  common: 0xbfc5ce, // 普通
  uncommon: 0x56d364, // 优秀
  rare: 0x3b82f6, // 稀有
  epic: 0xa855f7, // 史诗
  legendary: 0xf59e0b, // 传说
};

export const RARITY_LABEL: Record<BuildingRarity, string> = {
  common: "凡品",
  uncommon: "灵品",
  rare: "宝品",
  epic: "仙品",
  legendary: "神品",
};

export const MAX_LEVEL = 4;
