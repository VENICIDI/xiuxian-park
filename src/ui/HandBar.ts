import Phaser from "phaser";
import { getBuildingDef } from "../game/data/buildings";
import { RARITY_COLOR, RARITY_LABEL } from "../game/models/building";
import type { BuildingCategory } from "../game/models/building";
import type { GameState } from "../game/models/game-state";
import { DESIGN_WIDTH } from "../game/config";
import { DEPTH, FONT_FAMILY } from "../game/theme";
import { HAND_H, HAND_Y } from "../game/rendering/layout";
import { SKIN } from "./skin";

// 三张固定窄卡，水平居中，两侧留白（不再铺满整宽）。
const CARD_W = 236;
const CARD_H = 80;
const GAP = 20;
const ROW_W = CARD_W * 3 + GAP * 2;
const ROW_X = Math.round((DESIGN_WIDTH - ROW_W) / 2);
const CARD_CY = HAND_Y + HAND_H / 2;
const LIFT = 12; // 选中时向上抽出的距离
const SEL_SCALE = 1.06;

const CAT_CHAR: Record<BuildingCategory, string> = {
  ride: "乐",
  shop: "商",
  buff: "阵",
  utility: "工",
};

const CAT_NAME: Record<BuildingCategory, string> = {
  ride: "游乐设施",
  shop: "商店",
  buff: "增益法阵",
  utility: "功能建筑",
};

type CardRef = {
  container: Phaser.GameObjects.Container;
  bg: Phaser.GameObjects.Graphics;
  baseY: number;
  rarityKey: keyof typeof RARITY_COLOR;
};

/**
 * 底部建筑卡坞（极简卡面）：只展示 图片 + 种类 + 品质。
 * 点击某张卡会放大并向上「抽出」，具体效果由右侧详情面板展示。
 */
export class HandBar {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private cards = new Map<string, CardRef>();
  private selectedId: string | null = null;
  private onSelect: (id: string) => void;

  constructor(scene: Phaser.Scene, onSelect: (id: string) => void) {
    this.scene = scene;
    this.onSelect = onSelect;
    this.container = scene.add.container(0, 0).setDepth(DEPTH.panel + 1);
  }

  refresh(state: GameState): void {
    this.rebuild(state);
  }

  private rebuild(state: GameState): void {
    this.container.removeAll(true);
    this.cards.clear();

    state.ownedBuildingIds.forEach((id, i) => {
      const cx = ROW_X + i * (CARD_W + GAP) + CARD_W / 2;
      const cy = CARD_CY;
      const card = this.createCard(id, cx, cy, state);
      this.cards.set(id, card);
      this.container.add(card.container);
    });
    this.updateSelectionVisuals(state);
  }

  private createCard(
    id: string,
    cx: number,
    cy: number,
    state: GameState,
  ): CardRef {
    const def = getBuildingDef(id);
    const w = CARD_W;
    const h = CARD_H;
    const container = this.scene.add.container(cx, cy);
    const rarityColor = RARITY_COLOR[def.rarity];

    const bg = this.scene.add.graphics();
    container.add(bg);

    // 内容整体居中：[圆形图标] + [种类名 / 品质角标]
    const r = h / 2 - 9;
    const textBlockW = 74;
    const groupW = r * 2 + 12 + textBlockW;
    const iconCx = -groupW / 2 + r;
    const textX = iconCx + r + 12;

    // 图片 / 品类图标章（圆形玉盘 + 品质环）
    const disc = this.scene.add.graphics();
    disc.fillStyle(SKIN.edgeDark, 0.9);
    disc.fillCircle(iconCx, 0, r + 3);
    disc.fillStyle(rarityColor, 1);
    disc.fillCircle(iconCx, 0, r + 2);
    disc.fillStyle(SKIN.jade, 1);
    disc.fillCircle(iconCx, 0, r);
    disc.fillStyle(SKIN.jadeLight, 0.4);
    disc.fillCircle(iconCx - r * 0.32, -r * 0.32, r * 0.55);
    container.add(disc);

    if (def.sprite && this.scene.textures.exists(def.sprite)) {
      const img = this.scene.add.image(iconCx, 0, def.sprite).setOrigin(0.5);
      const box = r * 2;
      img.setScale(Math.min(box / img.width, box / img.height));
      container.add(img);
    } else {
      const ch = this.scene.add
        .text(iconCx, 0, CAT_CHAR[def.category], {
          fontFamily: FONT_FAMILY,
          fontSize: `${Math.round(r * 0.95)}px`,
          color: "#f4f0e2",
          fontStyle: "bold",
        })
        .setOrigin(0, 0.5);
      ch.setX(iconCx - ch.width / 2);
      container.add(ch);
    }

    // 种类名
    container.add(
      this.scene.add
        .text(textX, -11, CAT_NAME[def.category], {
          fontFamily: FONT_FAMILY,
          fontSize: "15px",
          color: SKIN.textLight,
          fontStyle: "bold",
        })
        .setOrigin(0, 0.5),
    );

    // 品质小角标
    const label = RARITY_LABEL[def.rarity];
    const pillW = 40;
    const pillH = 19;
    const pill = this.scene.add.graphics();
    pill.fillStyle(rarityColor, 1);
    pill.fillRoundedRect(textX, 5, pillW, pillH, pillH / 2);
    pill.fillStyle(0xffffff, 0.18);
    pill.fillRoundedRect(textX + 2, 6, pillW - 4, pillH / 2 - 1, 5);
    container.add(pill);
    const pillText = this.scene.add
      .text(textX, 5 + pillH / 2, label, {
        fontFamily: FONT_FAMILY,
        fontSize: "12px",
        color: "#1a2320",
        fontStyle: "bold",
      })
      .setOrigin(0, 0.5);
    pillText.setX(textX + (pillW - pillText.width) / 2);
    container.add(pillText);

    container.setSize(w, h);
    container.setInteractive(
      new Phaser.Geom.Rectangle(-w / 2, -h / 2, w, h),
      Phaser.Geom.Rectangle.Contains,
    );
    container.on("pointerover", () => {
      if (state.phase === "planning") {
        this.drawCard(bg, def.rarity, id === this.selectedId, true);
      }
    });
    container.on("pointerout", () => {
      this.drawCard(bg, def.rarity, id === this.selectedId, false);
    });
    container.on("pointerdown", () => {
      if (state.phase === "planning") this.onSelect(id);
    });

    return { container, bg, baseY: cy, rarityKey: def.rarity };
  }

  /** 绘制卡片底板：玉底渐变 + 品质发光框 + 左侧品质竖条。 */
  private drawCard(
    bg: Phaser.GameObjects.Graphics,
    rarityKey: keyof typeof RARITY_COLOR,
    selected: boolean,
    hover: boolean,
  ): void {
    const rarity = RARITY_COLOR[rarityKey];
    const w = CARD_W;
    const h = CARD_H;
    const x = -w / 2;
    const y = -h / 2;

    bg.clear();
    // 阴影
    bg.fillStyle(0x000000, selected ? 0.3 : 0.18);
    bg.fillRoundedRect(x + 2, y + 4, w, h, 12);
    // 玉底渐变（选中/悬停更亮）
    const top = selected ? 0x33604f : hover ? 0x2a4b41 : SKIN.plaqueTop;
    const bot = selected ? 0x1e4034 : SKIN.plaqueBottom;
    bg.fillGradientStyle(top, top, bot, bot, 1);
    bg.fillRoundedRect(x, y, w, h, 12);
    // 顶部高光
    bg.fillStyle(0xffffff, 0.06);
    bg.fillRoundedRect(x + 4, y + 3, w - 8, h * 0.42, 10);
    // 品质发光边框
    bg.lineStyle(selected ? 3 : 2, selected ? SKIN.gold : rarity, selected ? 1 : 0.8);
    bg.strokeRoundedRect(x, y, w, h, 12);
  }

  setSelected(id: string | null, state: GameState): void {
    this.selectedId = id;
    this.updateSelectionVisuals(state);
  }

  private updateSelectionVisuals(state: GameState): void {
    for (const [id, card] of this.cards) {
      const selected = id === this.selectedId;
      this.drawCard(card.bg, card.rarityKey, selected, false);
      card.container.setAlpha(state.phase === "planning" ? 1 : 0.5);

      // 抽出 / 归位动画
      this.scene.tweens.killTweensOf(card.container);
      if (selected) {
        this.container.bringToTop(card.container);
        this.scene.tweens.add({
          targets: card.container,
          y: card.baseY - LIFT,
          scaleX: SEL_SCALE,
          scaleY: SEL_SCALE,
          duration: 180,
          ease: "Back.easeOut",
        });
      } else {
        this.scene.tweens.add({
          targets: card.container,
          y: card.baseY,
          scaleX: 1,
          scaleY: 1,
          duration: 160,
          ease: "Quad.easeOut",
        });
      }
    }
  }
}
