import Phaser from "phaser";
import { getBuildingDef } from "../game/data/buildings";
import { RARITY_COLOR, RARITY_LABEL } from "../game/models/building";
import type { BuildingCategory } from "../game/models/building";
import type { GameState } from "../game/models/game-state";
import { DEPTH, FONT_FAMILY, THEME } from "../game/theme";
import { PANEL_H, PANEL_W, PANEL_X, PANEL_Y } from "../game/rendering/layout";
import { SKIN, fantasyPanel, medallion } from "./skin";

const TABS_Y = PANEL_Y + 44;
const TAB_H = 32;
const LIST_TOP = PANEL_Y + 88;
const LIST_HEIGHT = PANEL_H - 100;
const CARD_H = 88;
const CARD_W = PANEL_W - 24;
const CH = CARD_H - 10;

const CAT_GLYPH: Record<BuildingCategory, string> = {
  ride: "🎢",
  shop: "🛍",
  buff: "✨",
  utility: "⚙",
};

type Filter = "all" | BuildingCategory;

const TABS: Array<{ id: Filter; label: string }> = [
  { id: "all", label: "全部" },
  { id: "ride", label: "🎢" },
  { id: "shop", label: "🛍" },
  { id: "buff", label: "✨" },
  { id: "utility", label: "⚙" },
];

/** 右侧建筑图鉴（仙侠卡牌风）：玉底卡 + 品质发光框 + 图标章 + 金币徽章 + 分类页签。 */
export class CatalogPanel {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private rows = new Map<string, Phaser.GameObjects.Container>();
  private selectedId: string | null = null;
  private onSelect: (id: string) => void;
  private scrollY = 0;
  private contentHeight = 0;
  private filter: Filter = "all";
  private lastState: GameState | null = null;
  private tabCells = new Map<Filter, Phaser.GameObjects.Graphics>();

  constructor(scene: Phaser.Scene, onSelect: (id: string) => void) {
    this.scene = scene;
    this.onSelect = onSelect;

    const g = scene.add.graphics().setDepth(DEPTH.panel);
    fantasyPanel(g, PANEL_X, PANEL_Y, PANEL_W, PANEL_H);

    medallion(scene, PANEL_X + 26, PANEL_Y + 24, 15, "📖", SKIN.gold).setDepth(
      DEPTH.panel + 1,
    );
    scene.add
      .text(PANEL_X + 48, PANEL_Y + 14, "建筑图鉴", {
        fontFamily: FONT_FAMILY,
        fontSize: "18px",
        color: SKIN.textLight,
        fontStyle: "bold",
      })
      .setDepth(DEPTH.panel + 1);

    this.buildTabs(scene);

    this.container = scene.add.container(0, 0).setDepth(DEPTH.panel + 1);
    const mask = scene.make.graphics({});
    mask.fillRect(PANEL_X, LIST_TOP, PANEL_W, LIST_HEIGHT);
    this.container.setMask(mask.createGeometryMask());

    scene.input.on(
      "wheel",
      (
        pointer: Phaser.Input.Pointer,
        _o: unknown,
        _dx: number,
        dy: number,
      ) => {
        if (
          pointer.x >= PANEL_X &&
          pointer.x <= PANEL_X + PANEL_W &&
          pointer.y >= LIST_TOP &&
          pointer.y <= LIST_TOP + LIST_HEIGHT
        ) {
          this.scroll(dy * 0.5);
        }
      },
    );
  }

  private buildTabs(scene: Phaser.Scene): void {
    const tabW = (PANEL_W - 24) / TABS.length;
    TABS.forEach((tab, i) => {
      const x = PANEL_X + 12 + i * tabW;
      const cell = scene.add.graphics().setDepth(DEPTH.panel + 1);
      this.tabCells.set(tab.id, cell);
      scene.add
        .text(x + tabW / 2, TABS_Y + TAB_H / 2, tab.label, {
          fontFamily: FONT_FAMILY,
          fontSize: tab.id === "all" ? "13px" : "16px",
          color: SKIN.textLight,
          fontStyle: "bold",
        })
        .setOrigin(0.5)
        .setDepth(DEPTH.panel + 2);
      const zone = scene.add
        .zone(x, TABS_Y, tabW, TAB_H)
        .setOrigin(0, 0)
        .setInteractive();
      zone.on("pointerdown", () => this.setFilter(tab.id));
    });
    this.drawTabs();
  }

  private drawTabs(): void {
    const tabW = (PANEL_W - 24) / TABS.length;
    TABS.forEach((tab, i) => {
      const x = PANEL_X + 12 + i * tabW;
      const active = this.filter === tab.id;
      const cell = this.tabCells.get(tab.id)!;
      cell.clear();
      if (active) {
        cell.fillGradientStyle(SKIN.jade, SKIN.jade, 0x25534a, 0x25534a, 1);
        cell.fillRoundedRect(x + 2, TABS_Y, tabW - 4, TAB_H, 8);
        cell.lineStyle(1.5, SKIN.gold, 0.8);
        cell.strokeRoundedRect(x + 2, TABS_Y, tabW - 4, TAB_H, 8);
      } else {
        cell.fillStyle(0x11201c, 0.55);
        cell.fillRoundedRect(x + 2, TABS_Y, tabW - 4, TAB_H, 8);
        cell.lineStyle(1, SKIN.edgeDark, 0.6);
        cell.strokeRoundedRect(x + 2, TABS_Y, tabW - 4, TAB_H, 8);
      }
    });
  }

  private setFilter(f: Filter): void {
    if (this.filter === f) return;
    this.filter = f;
    this.scrollY = 0;
    this.drawTabs();
    if (this.lastState) this.rebuild(this.lastState);
  }

  private scroll(delta: number): void {
    const maxScroll = Math.max(0, this.contentHeight - LIST_HEIGHT);
    this.scrollY = Phaser.Math.Clamp(this.scrollY + delta, 0, maxScroll);
    this.layoutRows();
  }

  private layoutRows(): void {
    let i = 0;
    for (const row of this.rows.values()) {
      row.setY(LIST_TOP + i * CARD_H - this.scrollY);
      i++;
    }
  }

  refresh(state: GameState): void {
    this.lastState = state;
    this.rebuild(state);
  }

  private rebuild(state: GameState): void {
    this.container.removeAll(true);
    this.rows.clear();

    const ids = state.ownedBuildingIds.filter(
      (id) => this.filter === "all" || getBuildingDef(id).category === this.filter,
    );

    ids.forEach((id) => {
      const row = this.createCard(id, state);
      this.rows.set(id, row);
      this.container.add(row);
    });
    this.contentHeight = ids.length * CARD_H;
    this.layoutRows();
    this.updateSelectionVisuals(state);
  }

  private createCard(id: string, state: GameState): Phaser.GameObjects.Container {
    const def = getBuildingDef(id);
    const rarity = RARITY_COLOR[def.rarity];
    const row = this.scene.add.container(PANEL_X + 12, 0);

    const bg = this.scene.add.graphics();
    row.add(bg);
    (row as unknown as { _bg: Phaser.GameObjects.Graphics })._bg = bg;

    // 图标章（以品质色为环）
    const med = medallion(this.scene, 34, CH / 2, 22, CAT_GLYPH[def.category], rarity);
    row.add(med);

    // 名称
    row.add(
      this.scene.add.text(68, 10, def.name, {
        fontFamily: FONT_FAMILY,
        fontSize: "16px",
        color: SKIN.textLight,
        fontStyle: "bold",
      }),
    );

    // 分类/尺寸标签胶囊
    const tagText = `${RARITY_LABEL[def.rarity]} · ${this.catName(def.category)} · ${def.size.w}×${def.size.h}`;
    const tag = this.scene.add
      .text(70, 34, tagText, {
        fontFamily: FONT_FAMILY,
        fontSize: "11px",
        color: SKIN.textDim,
        backgroundColor: "#12241f99",
        padding: { x: 6, y: 2 },
      })
      .setOrigin(0, 0);
    row.add(tag);

    // 简述
    row.add(
      this.scene.add.text(68, 56, def.description, {
        fontFamily: FONT_FAMILY,
        fontSize: "11px",
        color: SKIN.textDim,
        wordWrap: { width: CARD_W - 84 },
        maxLines: 1,
      }),
    );

    // 金币徽章（右上）
    const badge = this.scene.add.graphics();
    row.add(badge);
    const cost = this.scene.add
      .text(CARD_W - 14, 14, `💰 ${def.baseCost}`, {
        fontFamily: FONT_FAMILY,
        fontSize: "15px",
        color: SKIN.textGold,
        fontStyle: "bold",
      })
      .setOrigin(1, 0);
    row.add(cost);
    (row as unknown as { _cost: Phaser.GameObjects.Text })._cost = cost;
    (row as unknown as { _badge: Phaser.GameObjects.Graphics })._badge = badge;

    row.setSize(CARD_W, CH);
    row.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, CARD_W, CH),
      Phaser.Geom.Rectangle.Contains,
    );
    row.on("pointerover", () => {
      if (state.phase === "planning" && state.spiritStones >= def.baseCost) {
        this.drawCard(row, def.rarity, id === this.selectedId, true);
      }
    });
    row.on("pointerout", () => {
      this.drawCard(row, def.rarity, id === this.selectedId, false);
    });
    row.on("pointerdown", () => {
      const affordable = state.spiritStones >= def.baseCost;
      if (state.phase === "planning" && affordable) this.onSelect(id);
    });

    return row;
  }

  /** 绘制卡片底板：玉底渐变 + 品质发光框 + 左侧品质竖条 + 金币徽章。 */
  private drawCard(
    row: Phaser.GameObjects.Container,
    rarityKey: keyof typeof RARITY_COLOR,
    selected: boolean,
    hover: boolean,
  ): void {
    const rarity = RARITY_COLOR[rarityKey];
    const bg = (row as unknown as { _bg: Phaser.GameObjects.Graphics })._bg;
    const badge = (row as unknown as { _badge: Phaser.GameObjects.Graphics })._badge;
    const w = CARD_W;
    const h = CH;

    bg.clear();
    // 阴影
    bg.fillStyle(0x000000, 0.2);
    bg.fillRoundedRect(2, 4, w, h, 14);
    // 玉底渐变（选中/悬停更亮）
    const top = selected ? 0x33604f : hover ? 0x2a4b41 : SKIN.plaqueTop;
    const bot = selected ? 0x1e4034 : SKIN.plaqueBottom;
    bg.fillGradientStyle(top, top, bot, bot, 1);
    bg.fillRoundedRect(0, 0, w, h, 14);
    // 顶部高光
    bg.fillStyle(0xffffff, 0.07);
    bg.fillRoundedRect(4, 3, w - 8, h * 0.4, 10);
    // 左侧品质竖条（规范七）
    bg.fillStyle(rarity, 1);
    bg.fillRoundedRect(4, 10, 5, h - 20, 3);
    // 品质发光边框
    bg.lineStyle(selected ? 3 : 2, selected ? SKIN.gold : rarity, selected ? 1 : 0.85);
    bg.strokeRoundedRect(0, 0, w, h, 14);
    bg.lineStyle(1, SKIN.edgeDark, 0.55);
    bg.strokeRoundedRect(1.5, 1.5, w - 3, h - 3, 12);

    // 金币徽章底
    badge.clear();
    badge.fillStyle(0x1a130a, 0.85);
    badge.fillRoundedRect(w - 88, 10, 76, 24, 12);
    badge.lineStyle(1.5, SKIN.gold, 0.8);
    badge.strokeRoundedRect(w - 88, 10, 76, 24, 12);
  }

  private catName(cat: string): string {
    return { ride: "游乐", shop: "商店", buff: "增益", utility: "功能" }[cat] ?? cat;
  }

  setSelected(id: string | null, state: GameState): void {
    this.selectedId = id;
    this.updateSelectionVisuals(state);
  }

  private updateSelectionVisuals(state: GameState): void {
    for (const [id, row] of this.rows) {
      const def = getBuildingDef(id);
      const affordable = state.spiritStones >= def.baseCost;
      const selected = id === this.selectedId;
      this.drawCard(row, def.rarity, selected, false);
      row.setAlpha(affordable && state.phase === "planning" ? 1 : 0.5);
      const cost = (row as unknown as { _cost: Phaser.GameObjects.Text })._cost;
      cost.setColor(affordable ? SKIN.textGold : THEME.danger);
    }
  }
}
