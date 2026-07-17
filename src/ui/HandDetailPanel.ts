import Phaser from "phaser";
import { DESIGN_WIDTH } from "../game/config";
import { RARITY_COLOR, RARITY_LABEL } from "../game/models/building";
import type { BuildingCategory, BuildingDefinition } from "../game/models/building";
import { DEPTH, FONT_FAMILY } from "../game/theme";
import { HAND_Y, HUD_H, MARGIN } from "../game/rendering/layout";
import { SKIN, fantasyPanel } from "./skin";

const PANEL_W = 300;
const PANEL_X = DESIGN_WIDTH - MARGIN - PANEL_W; // 956
const PANEL_Y = HUD_H + 16; // 88
const PANEL_H = HAND_Y - 12 - PANEL_Y;

const CAT_GLYPH: Record<BuildingCategory, string> = {
  ride: "🎢",
  shop: "🛍",
  buff: "✨",
  utility: "⚙",
};

const CAT_NAME: Record<BuildingCategory, string> = {
  ride: "游乐设施",
  shop: "商店",
  buff: "增益法阵",
  utility: "功能建筑",
};

/** 按固定字数手动换行（中文无空格，Phaser wordWrap 不可靠，故手动断行）。 */
function wrapCJK(text: string, perLine: number): string {
  const chars = [...text];
  const lines: string[] = [];
  for (let i = 0; i < chars.length; i += perLine) {
    lines.push(chars.slice(i, i + perLine).join(""));
  }
  return lines.join("\n");
}

/** 右侧建筑详情面板：选中底部卡后滑入，展示品质/种类/花费/收益/具体效果。 */
export class HandDetailPanel {
  private scene: Phaser.Scene;
  private root: Phaser.GameObjects.Container;
  private content: Phaser.GameObjects.Container;
  private currentId: string | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.root = scene.add.container(0, 0).setDepth(DEPTH.panel + 4).setVisible(false);

    const bg = scene.add.graphics();
    fantasyPanel(bg, PANEL_X, PANEL_Y, PANEL_W, PANEL_H);
    this.root.add(bg);

    this.content = scene.add.container(0, 0);
    this.root.add(this.content);
  }

  open(def: BuildingDefinition): void {
    if (this.currentId === def.id && this.root.visible) return;
    this.currentId = def.id;
    this.build(def);

    this.root.setVisible(true);
    this.content.x = 0;
    this.scene.tweens.killTweensOf(this.root);
    this.root.setAlpha(0);
    this.scene.tweens.add({
      targets: this.root,
      alpha: 1,
      duration: 180,
      ease: "Cubic.easeOut",
    });
  }

  close(): void {
    if (!this.root.visible) return;
    this.currentId = null;
    this.scene.tweens.killTweensOf(this.root);
    this.scene.tweens.add({
      targets: this.root,
      alpha: 0,
      duration: 140,
      ease: "Cubic.easeIn",
      onComplete: () => this.root.setVisible(false),
    });
  }

  private build(def: BuildingDefinition): void {
    this.content.removeAll(true);
    const rarityColor = RARITY_COLOR[def.rarity];
    const cx = PANEL_X + PANEL_W / 2;

    // —— 顶部图标预览 ——
    const iconY = PANEL_Y + 78;
    const disc = this.scene.add.graphics();
    const r = 54;
    disc.fillStyle(SKIN.edgeDark, 0.95);
    disc.fillCircle(cx, iconY, r + 4);
    disc.fillStyle(rarityColor, 0.95);
    disc.fillCircle(cx, iconY, r + 2.5);
    disc.fillGradientStyle(SKIN.panelTop, SKIN.panelTop, 0x0f1c18, 0x0f1c18, 1);
    disc.fillCircle(cx, iconY, r);
    disc.fillStyle(0xffffff, 0.1);
    disc.fillCircle(cx - r * 0.28, iconY - r * 0.28, r * 0.45);
    this.content.add(disc);

    if (def.sprite && this.scene.textures.exists(def.sprite)) {
      const img = this.scene.add.image(cx, iconY, def.sprite).setOrigin(0.5);
      const box = r * 1.9;
      img.setScale(Math.min(box / img.width, box / img.height));
      this.content.add(img);
    } else {
      this.content.add(
        this.scene.add
          .text(cx, iconY, CAT_GLYPH[def.category], {
            fontFamily: FONT_FAMILY,
            fontSize: `${Math.round(r * 1.1)}px`,
          })
          .setOrigin(0.5),
      );
    }

    // —— 名称 ——
    this.content.add(
      this.scene.add
        .text(cx, PANEL_Y + 152, def.name, {
          fontFamily: FONT_FAMILY,
          fontSize: "24px",
          color: SKIN.textLight,
          fontStyle: "bold",
        })
        .setOrigin(0.5)
        .setShadow(0, 1, "#000000", 4, false, true),
    );

    // —— 品质缎带 ——
    const ribbonW = 172;
    const ribbonY = PANEL_Y + 178;
    const ribbon = this.scene.add.graphics();
    ribbon.fillStyle(rarityColor, 1);
    ribbon.fillRoundedRect(cx - ribbonW / 2, ribbonY, ribbonW, 28, 10);
    ribbon.fillStyle(0xffffff, 0.16);
    ribbon.fillRoundedRect(cx - ribbonW / 2 + 2, ribbonY + 1, ribbonW - 4, 10, 6);
    this.content.add(ribbon);
    this.content.add(
      this.scene.add
        .text(cx, ribbonY + 14, `${RARITY_LABEL[def.rarity]} · ${CAT_NAME[def.category]}`, {
          fontFamily: FONT_FAMILY,
          fontSize: "14px",
          color: "#1a2320",
          fontStyle: "bold",
        })
        .setOrigin(0.5),
    );

    // —— 属性行 ——
    let y = PANEL_Y + 226;
    const left = PANEL_X + 24;
    const valueX = PANEL_X + 150;

    const stat = (label: string, value: string, valueColor: string = SKIN.textLight) => {
      this.content.add(
        this.scene.add.text(left, y, label, {
          fontFamily: FONT_FAMILY,
          fontSize: "14px",
          color: SKIN.textDim,
        }),
      );
      this.content.add(
        this.scene.add.text(valueX, y, value, {
          fontFamily: FONT_FAMILY,
          fontSize: "15px",
          color: valueColor,
          fontStyle: "bold",
        }),
      );
      y += 28;
    };

    stat("占地尺寸", `${def.size.w} × ${def.size.h}`);
    stat("灵石花费", `◈ ${def.baseCost}`, SKIN.textGold);
    if (def.baseRevenue > 0) {
      stat("基础收益", `+${def.baseRevenue} / 场`, "#9ff0a6");
    } else {
      stat("建筑类型", "辅助型", SKIN.textDim);
    }

    // —— 分隔线 ——
    y += 4;
    const sep = this.scene.add.graphics();
    sep.lineStyle(1, SKIN.gold, 0.35);
    sep.lineBetween(left, y, PANEL_X + PANEL_W - 24, y);
    this.content.add(sep);
    y += 14;

    // —— 具体效果 ——
    this.content.add(
      this.scene.add.text(left, y, "效果", {
        fontFamily: FONT_FAMILY,
        fontSize: "14px",
        color: SKIN.textGold,
        fontStyle: "bold",
      }),
    );
    y += 24;
    this.content.add(
      this.scene.add.text(left, y, wrapCJK(def.description, 12), {
        fontFamily: FONT_FAMILY,
        fontSize: "14px",
        color: SKIN.textDim,
        lineSpacing: 5,
      }),
    );

    // —— 底部放置提示 ——
    this.content.add(
      this.scene.add
        .text(cx, PANEL_Y + PANEL_H - 20, "点击地面放置 · 中键/R 旋转", {
          fontFamily: FONT_FAMILY,
          fontSize: "12px",
          color: SKIN.textDim,
        })
        .setOrigin(0.5),
    );
  }
}
