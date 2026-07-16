/**
 * 全局视觉设计令牌。
 * 严格对齐《美术设计规范.md》：
 *   主色 灵气绿/灵石金/修仙蓝/雷劫紫/危险红；背景深紫灰；圆角统一 16；
 *   阴影 Y4/Blur12/20%；描边半透明白（不用纯白）。
 */

/** 规范主色板（十六进制数值，供 Phaser Graphics 使用）。 */
export const PALETTE = {
  /** 灵气绿：成功 / 收益 / 放置成功 / 主按钮 */
  green: 0x7fd37b,
  /** 灵石金：金币 / 价格 / 奖励 */
  gold: 0xffd45c,
  /** 修仙蓝：Buff / 灵气 / 法阵 */
  blue: 0x69b7ff,
  /** 雷劫紫：稀有 / 传奇 / 雷系 */
  purple: 0x9c7dff,
  /** 危险红：扣钱 / 事件 / 失败 */
  red: 0xff6767,
  /** UI 背景（深紫灰） */
  bgDark: 0x2e2348,
  bgAlt: 0x3a2f5e,
} as const;

export const THEME = {
  // —— 背景 ——
  bg: PALETTE.bgDark,
  bgPanel: 0x342a52,
  bgPanelLight: PALETTE.bgAlt,

  // —— 棋盘：草地 + 路面 ——
  grassA: 0x86c97a,
  grassB: 0x77bd6b,
  grassLine: 0x6bae5f,
  road: 0xe9dcbc,
  roadEdge: 0xcbb98c,

  // —— 旧键兼容（重定向到新配色，避免大范围改名）——
  grid: PALETTE.bgAlt,
  gridLine: 0x6bae5f,
  tileEven: 0x86c97a,
  tileOdd: 0x77bd6b,
  entrance: PALETTE.green,
  exit: PALETTE.red,
  validGreen: PALETTE.green,
  invalidRed: PALETTE.red,

  // —— 文本 ——
  textLight: "#f4eeff",
  textDim: "#c9bfe6",
  textGold: "#ffd45c",
  accent: PALETTE.purple,
  accentText: "#c3b0ff",
  danger: "#ff6767",
  success: "#7fd37b",

  // —— 主色（数值，便于 Graphics 引用）——
  green: PALETTE.green,
  gold: PALETTE.gold,
  blue: PALETTE.blue,
  purple: PALETTE.purple,
  red: PALETTE.red,

  // —— 描边：半透明白（规范：不用纯白）——
  stroke: 0xffffff,
  strokeAlpha: 0.19, // ≈ #FFFFFF30
} as const;

/** 统一圆角（规范四：全项目 16px）。 */
export const RADIUS = 16;

/** 统一阴影（规范五：Y=4 / Blur=12 / 20%）。 */
export const SHADOW = {
  offsetY: 4,
  blur: 12,
  alpha: 0.2,
  color: 0x000000,
} as const;

/** 字号层级（规范三）。 */
export const FONT = {
  title: 32,
  subtitle: 24,
  body: 18,
  caption: 14,
} as const;

/** 按钮三变体（规范六：主=绿 / 次=灰紫 / 危险=红）。 */
export const BUTTON = {
  primary: { base: PALETTE.green, hover: 0x93df8f, press: 0x63c05f, text: "#173a1b" },
  secondary: { base: 0x4a4266, hover: 0x5a527a, press: 0x3d3656, text: "#f4eeff" },
  danger: { base: PALETTE.red, hover: 0xff8585, press: 0xe05555, text: "#ffffff" },
  disabled: 0x453f5c,
  disabledText: "#8a8499",
  height: 56,
} as const;

export type ButtonVariant = keyof Pick<typeof BUTTON, "primary" | "secondary" | "danger">;

/**
 * 推荐字体：阿里妈妈方圆体 / HarmonyOS Sans（在线加载，见 index.html），
 * 加载失败时回退系统字体。
 */
export const FONT_FAMILY =
  '"HarmonyOS Sans SC", "HarmonyOS Sans", "PingFang SC", "Microsoft YaHei", "Segoe UI", sans-serif';

/**
 * 图层顺序（规范十九 Z-Index）。数值保持递增，Phaser setDepth 使用。
 * 背景0 → 道路 → 建筑阴影 → 建筑 → 游客 → 粒子特效 → 格子高亮 → HUD → 弹窗 → 全屏特效
 */
export const DEPTH = {
  board: 0,
  building: 10,
  highlight: 15,
  visitor: 20,
  fx: 30,
  hud: 40,
  panel: 50,
  modal: 60,
  tooltip: 70,
  debug: 80,
} as const;
