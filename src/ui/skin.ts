import Phaser from "phaser";
import { FONT_FAMILY, RADIUS } from "../game/theme";

/**
 * 仙侠玩彩风 UI 皮肤（玉底 + 金边 + 雕花）。
 * 提供可复用的面板/玉牌/图标章绘制函数，供 HUD、操作坞、建筑图鉴统一调用，
 * 避免各处扁平纯色矩形导致的“网页后台感”。
 */
export const SKIN = {
  // 玉底渐变
  panelTop: 0x2c4f47,
  panelBottom: 0x14241f,
  plaqueTop: 0x21382f,
  plaqueBottom: 0x14211c,
  // 描边
  edgeDark: 0x0c1613,
  gold: 0xffd45c,
  goldDim: 0xa9792f,
  jade: 0x3f7a6b,
  jadeLight: 0x77c9b2,
  // 文本
  textLight: "#f4f0e2",
  textDim: "#bfe0d0",
  textGold: "#ffd45c",
} as const;

/** 四角雕花金点（小菱形），营造卷轴/玉牌质感。 */
function cornerGems(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  inset = 9,
  size = 3,
): void {
  const pts: Array<[number, number]> = [
    [x + inset, y + inset],
    [x + w - inset, y + inset],
    [x + inset, y + h - inset],
    [x + w - inset, y + h - inset],
  ];
  g.fillStyle(SKIN.gold, 0.85);
  for (const [cx, cy] of pts) {
    g.beginPath();
    g.moveTo(cx, cy - size);
    g.lineTo(cx + size, cy);
    g.lineTo(cx, cy + size);
    g.lineTo(cx - size, cy);
    g.closePath();
    g.fillPath();
  }
}

/**
 * 仙侠玉牌面板：落地阴影 + 竖向玉底渐变 + 顶部高光 + 金色双描边 + 四角雕花。
 * 用于所有面板/栏/卡片的底板。
 */
export function fantasyPanel(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  opts: { radius?: number; top?: number; bottom?: number; gems?: boolean } = {},
): void {
  const r = opts.radius ?? RADIUS;
  const top = opts.top ?? SKIN.panelTop;
  const bottom = opts.bottom ?? SKIN.panelBottom;

  // 落地软阴影
  g.fillStyle(0x000000, 0.22);
  g.fillRoundedRect(x + 2, y + 5, w, h, r);
  // 玉底渐变
  g.fillGradientStyle(top, top, bottom, bottom, 1);
  g.fillRoundedRect(x, y, w, h, r);
  // 顶部内高光
  g.fillStyle(0xffffff, 0.08);
  g.fillRoundedRect(x + 4, y + 3, w - 8, h * 0.42, Math.max(2, r - 4));
  // 外深边（木/岩）
  g.lineStyle(3, SKIN.edgeDark, 0.9);
  g.strokeRoundedRect(x, y, w, h, r);
  // 内金边
  g.lineStyle(1.5, SKIN.gold, 0.45);
  g.strokeRoundedRect(x + 3, y + 3, w - 6, h - 6, Math.max(2, r - 3));

  if (opts.gems !== false) cornerGems(g, x, y, w, h);
}

/**
 * 圆形玉质图标章：金环 + 玉盘 + 高光 + 居中图标（emoji）。
 * 返回一个已加入场景的容器，可 setDepth / 添加动画。
 */
export function medallion(
  scene: Phaser.Scene,
  x: number,
  y: number,
  radius: number,
  icon: string,
  ringColor: number = SKIN.gold,
): Phaser.GameObjects.Container {
  const g = scene.add.graphics();
  // 金环
  g.fillStyle(SKIN.edgeDark, 0.9);
  g.fillCircle(0, 0, radius + 3);
  g.fillStyle(ringColor, 1);
  g.fillCircle(0, 0, radius + 2);
  // 玉盘
  g.fillStyle(SKIN.jade, 1);
  g.fillCircle(0, 0, radius);
  // 高光
  g.fillStyle(SKIN.jadeLight, 0.4);
  g.fillCircle(-radius * 0.32, -radius * 0.32, radius * 0.55);

  const t = scene.add
    .text(0, 1, icon, {
      fontFamily: FONT_FAMILY,
      fontSize: `${Math.round(radius * 1.15)}px`,
    })
    .setOrigin(0.5);

  return scene.add.container(x, y, [g, t]);
}
