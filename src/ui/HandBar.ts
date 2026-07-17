import Phaser from "phaser";
import { getBuildingDef } from "../game/data/buildings";
import { RARITY_COLOR } from "../game/models/building";
import type { BuildingCategory, BuildingRarity } from "../game/models/building";
import type { GameState } from "../game/models/game-state";
import { DESIGN_HEIGHT } from "../game/config";
import { DEPTH, FONT_FAMILY } from "../game/theme";
import { SKIN, fantasyPanel } from "./skin";
import { Button } from "./Button";

// 底部「商店栏」（缩小版，靠左下角）：面板内含三张竖版卡片 + 右侧刷新按钮。
const CARD_W = 104;
const CARD_H = 124;
const GAP = 14;
const REFRESH_W = 72; // 刷新按钮宽（与卡片等高的竖条）
const GROUP_GAP = 14; // 卡片区与刷新按钮的间距
const CONTENT_W = CARD_W * 3 + GAP * 2 + GROUP_GAP + REFRESH_W;
const PANEL_PAD_X = 18;
const PANEL_PAD_TOP = 12;
const PANEL_PAD_BOTTOM = 12;
const PANEL_W = CONTENT_W + PANEL_PAD_X * 2;
const PANEL_X = 20; // 靠屏幕左缘
const CARD_CY = DESIGN_HEIGHT - 16 - CARD_H / 2; // 卡底距屏幕底 16px
const CONTENT_X = PANEL_X + PANEL_PAD_X; // 内容（首卡左缘）起始 x
const PANEL_TOP = CARD_CY - CARD_H / 2 - PANEL_PAD_TOP;
const PANEL_H = CARD_CY + CARD_H / 2 + PANEL_PAD_BOTTOM - PANEL_TOP;
const REFRESH_X = CONTENT_X + CARD_W * 3 + GAP * 2 + GROUP_GAP + REFRESH_W / 2;
const LIFT = 12; // 选中时向上抽出的距离
const SEL_SCALE = 1.06;

const CAT_CHAR: Record<BuildingCategory, string> = {
  ride: "乐",
  shop: "商",
  buff: "阵",
  utility: "工",
};

/** 品质对应星级（1~5 星）。 */
const RARITY_STARS: Record<BuildingRarity, number> = {
  common: 1,
  uncommon: 2,
  rare: 3,
  epic: 4,
  legendary: 5,
};

type CardRef = {
  container: Phaser.GameObjects.Container;
  bg: Phaser.GameObjects.Graphics;
  baseY: number;
  rarityKey: keyof typeof RARITY_COLOR;
};

/**
 * 底部「商店栏」：面板内含三张竖版卡片（大图 + 名字 + 星级）与右侧刷新按钮。
 * 点击某张卡会放大并向上「抽出」，具体效果由右侧详情面板展示；点击刷新重随三张手牌。
 */
export class HandBar {
  private scene: Phaser.Scene;
  private panel: Phaser.GameObjects.Graphics;
  private refreshBtn: Button;
  private container: Phaser.GameObjects.Container;
  private cards = new Map<string, CardRef>();
  private selectedId: string | null = null;
  private onSelect: (id: string) => void;

  constructor(
    scene: Phaser.Scene,
    onSelect: (id: string) => void,
    onRefresh: () => void,
  ) {
    this.scene = scene;
    this.onSelect = onSelect;

    // 商店栏底板（持久，不随手牌重建销毁）
    this.panel = scene.add.graphics().setDepth(DEPTH.panel);
    fantasyPanel(this.panel, PANEL_X, PANEL_TOP, PANEL_W, PANEL_H);

    // 卡片容器（每次刷新只重建其中的卡片）
    this.container = scene.add.container(0, 0).setDepth(DEPTH.panel + 1);

    // 右侧刷新按钮（与卡片等高的竖条）
    this.refreshBtn = new Button(scene, REFRESH_X, CARD_CY, "刷新\n商店", {
      width: REFRESH_W,
      height: CARD_H,
      fontSize: 15,
      variant: "secondary",
      color: SKIN.jade,
      hoverColor: SKIN.jadeLight,
      textColor: SKIN.textLight,
      onClick: onRefresh,
    });
    this.refreshBtn.setDepth(DEPTH.panel + 1);
  }

  refresh(state: GameState): void {
    this.rebuild(state);
  }

  private rebuild(state: GameState): void {
    this.container.removeAll(true);
    this.cards.clear();

    state.ownedBuildingIds.forEach((id, i) => {
      const cx = CONTENT_X + i * (CARD_W + GAP) + CARD_W / 2;
      const cy = CARD_CY;
      const card = this.createCard(id, cx, cy, state);
      this.cards.set(id, card);
      this.container.add(card.container);
    });
    this.refreshBtn.setEnabled(state.phase === "planning");
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
    const rarityHex = `#${rarityColor.toString(16).padStart(6, "0")}`;

    const bg = this.scene.add.graphics();
    container.add(bg);

    // —— 上部：建筑图片区（大图，圆角图槽 + 贴图 / 占位字）——
    const picTop = -h / 2 + 6;
    const picH = h - 48; // 下部留 48 给名字 + 星级
    const picCy = picTop + picH / 2;
    const pic = this.scene.add.graphics();
    pic.fillStyle(SKIN.edgeDark, 0.5);
    pic.fillRoundedRect(-w / 2 + 6, picTop, w - 12, picH, 7);
    container.add(pic);

    if (def.sprite && this.scene.textures.exists(def.sprite)) {
      const img = this.scene.add.image(0, picCy, def.sprite).setOrigin(0.5);
      const boxW = w - 16;
      const boxH = picH - 5;
      img.setScale(Math.min(boxW / img.width, boxH / img.height));
      container.add(img);
    } else {
      const r = picH / 2 - 4;
      const disc = this.scene.add.graphics();
      disc.fillStyle(rarityColor, 1);
      disc.fillCircle(0, picCy, r + 2);
      disc.fillStyle(SKIN.jade, 1);
      disc.fillCircle(0, picCy, r);
      disc.fillStyle(SKIN.jadeLight, 0.4);
      disc.fillCircle(-r * 0.32, picCy - r * 0.32, r * 0.55);
      container.add(disc);
      const ch = this.scene.add
        .text(0, picCy, CAT_CHAR[def.category], {
          fontFamily: FONT_FAMILY,
          fontSize: `${Math.round(r * 0.95)}px`,
          color: "#f4f0e2",
          fontStyle: "bold",
        })
        .setOrigin(0.5);
      container.add(ch);
    }

    // —— 下部：建筑名字 ——
    const nameY = picTop + picH + 13;
    container.add(
      this.scene.add
        .text(0, nameY, def.name, {
          fontFamily: FONT_FAMILY,
          fontSize: "13px",
          color: SKIN.textLight,
          fontStyle: "bold",
        })
        .setOrigin(0.5),
    );

    // —— 星级（居中）——
    container.add(
      this.scene.add
        .text(0, nameY + 16, "★".repeat(RARITY_STARS[def.rarity]), {
          fontFamily: FONT_FAMILY,
          fontSize: "12px",
          color: rarityHex,
        })
        .setOrigin(0.5),
    );

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
