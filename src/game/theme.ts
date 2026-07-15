/** 全局视觉主题（占位配色，正式美术后置）。 */
export const THEME = {
  bg: 0x141020,
  bgPanel: 0x211a33,
  bgPanelLight: 0x2e2447,
  grid: 0x3a2f57,
  gridLine: 0x4b3d70,
  tileEven: 0x241d38,
  tileOdd: 0x2a2240,
  road: 0x33507a,
  entrance: 0x2e8b57,
  exit: 0x8b2e4a,
  validGreen: 0x4caf50,
  invalidRed: 0xe53935,
  textLight: "#f0e9ff",
  textDim: "#b9addb",
  textGold: "#ffd54f",
  accent: 0x8e6bd6,
  accentText: "#c9a8ff",
  danger: "#ff6b81",
  success: "#7ce0a3",
} as const;

export const FONT_FAMILY =
  '"PingFang SC", "Microsoft YaHei", "Segoe UI", sans-serif';

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
