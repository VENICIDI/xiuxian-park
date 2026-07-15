import type { BuildingTag } from "./building";

export type Sect =
  | "sword"
  | "alchemy"
  | "buddhist"
  | "demonic"
  | "demon"
  | "ghost";

export type VisitorState = {
  id: string;
  sect: Sect;
  wallet: number;
  satisfaction: number;
  thrill: number;
  fatigue: number;
  remainingStops: number;
};

/** 门派配置：偏好差异驱动消费与满意度。 */
export type SectDefinition = {
  id: Sect;
  name: string;
  color: number;
  /** 初始钱包基准 */
  baseWallet: number;
  /** 初始满意度 */
  baseSatisfaction: number;
  /** 基础停留次数（可被悟道台等增加） */
  baseStops: number;
  /** 喜欢的标签：消费加成 */
  likedTags: BuildingTag[];
  /** 厌恶的标签：消费惩罚、满意度下降 */
  dislikedTags: BuildingTag[];
  /** 对刺激的耐受度（高耐受 -> 刺激带来满意度；低耐受 -> 刺激降低满意度） */
  thrillTolerance: number;
};
