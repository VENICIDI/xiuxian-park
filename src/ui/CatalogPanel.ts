import Phaser from "phaser";
import { getBuildingDef } from "../game/data/buildings";
import { RARITY_COLOR, RARITY_LABEL } from "../game/models/building";
import type { BuildingCategory } from "../game/models/building";
import type { GameState } from "../game/models/game-state";
import { DEPTH, FONT_FAMILY, RADIUS, THEME } from "../game/theme";
import { PANEL_H, PANEL_W, PANEL_X, PANEL_Y } from "../game/rendering/layout";

const LIST_TOP = PANEL_Y + 48;
const LIST_HEIGHT = PANEL_H - 56;
const ROW_H = 76;

const CAT_GLYPH: Record<BuildingCategory, string> = {
  ride: "🎢",
  shop: "🛍",
  buff: "✨",
  utility: "⚙",
};

/** 右侧建筑手牌/图鉴面板（规范七：左图右文 + 品质竖条）。 */
export class CatalogPanel {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private rows = new Map<string, Phaser.GameObjects.Container>();
  private selectedId: string | null = null;
  private onSelect: (id: string) => void;
  private scrollY = 0;
  private contentHeight = 0;

  constructor(scene: Phaser.Scene, onSelect: (id: string) => void) {
    this.scene = scene;
    this.onSelect = onSelect;

    const bg = scene.add.graphics().setDepth(DEPTH.panel);
    bg.fillStyle(THEME.bgPanel, 1);
    bg.fillRoundedRect(PANEL_X, PANEL_Y, PANEL_W, LIST_HEIGHT + 56, RADIUS);
    bg.lineStyle(2, THEME.stroke, THEME.strokeAlpha);
    bg.strokeRoundedRect(PANEL_X, PANEL_Y, PANEL_W, LIST_HEIGHT + 56, RADIUS);

    scene.add
      .text(PANEL_X + 18, PANEL_Y + 14, "建筑图鉴 · 点击后到棋盘放置", {
        fontFamily: FONT_FAMILY,
        fontSize: "16px",
        color: THEME.textLight,
        fontStyle: "bold",
      })
      .setDepth(DEPTH.panel + 1);

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

  private scroll(delta: number): void {
    const maxScroll = Math.max(0, this.contentHeight - LIST_HEIGHT);
    this.scrollY = Phaser.Math.Clamp(this.scrollY + delta, 0, maxScroll);
    this.layoutRows();
  }

  private layoutRows(): void {
    let i = 0;
    for (const row of this.rows.values()) {
      row.setY(LIST_TOP + i * ROW_H - this.scrollY);
      i++;
    }
  }

  refresh(state: GameState): void {
    this.container.removeAll(true);
    this.rows.clear();

    state.ownedBuildingIds.forEach((id) => {
      const row = this.createRow(id, state);
      this.rows.set(id, row);
      this.container.add(row);
    });
    this.contentHeight = state.ownedBuildingIds.length * ROW_H;
    this.layoutRows();
    this.updateSelectionVisuals(state);
  }

  private createRow(id: string, state: GameState): Phaser.GameObjects.Container {
    const def = getBuildingDef(id);
    const w = PANEL_W - 24;
    const rh = ROW_H - 10;
    const row = this.scene.add.container(PANEL_X + 12, 0);

    const bg = this.scene.add.graphics();
    row.add(bg);
    (row as unknown as { _bg: Phaser.GameObjects.Graphics })._bg = bg;

    // 品质竖条（规范七）
    const bar = this.scene.add.graphics();
    bar.fillStyle(RARITY_COLOR[def.rarity], 1);
    bar.fillRoundedRect(6, 10, 6, rh - 20, 3);
    row.add(bar);

    // 左侧图标块（左图）
    const iconBox = this.scene.add.graphics();
    iconBox.fillStyle(def.color, 1);
    iconBox.fillRoundedRect(20, 12, rh - 24, rh - 24, 12);
    iconBox.lineStyle(2, THEME.stroke, THEME.strokeAlpha);
    iconBox.strokeRoundedRect(20, 12, rh - 24, rh - 24, 12);
    row.add(iconBox);
    row.add(
      this.scene.add
        .text(20 + (rh - 24) / 2, 12 + (rh - 24) / 2, CAT_GLYPH[def.category], {
          fontFamily: FONT_FAMILY,
          fontSize: "26px",
        })
        .setOrigin(0.5),
    );

    // 右侧文字
    const tx = rh + 6;
    row.add(
      this.scene.add.text(tx, 10, def.name, {
        fontFamily: FONT_FAMILY,
        fontSize: "17px",
        color: THEME.textLight,
        fontStyle: "bold",
      }),
    );
    row.add(
      this.scene.add.text(
        tx,
        32,
        `${RARITY_LABEL[def.rarity]} · ${this.catName(def.category)} · ${def.size.w}×${def.size.h}`,
        { fontFamily: FONT_FAMILY, fontSize: "12px", color: THEME.accentText },
      ),
    );
    row.add(
      this.scene.add.text(tx, 50, def.description, {
        fontFamily: FONT_FAMILY,
        fontSize: "11px",
        color: THEME.textDim,
        wordWrap: { width: w - tx - 84 },
      }),
    );

    const cost = this.scene.add
      .text(w - 12, 12, `💰 ${def.baseCost}`, {
        fontFamily: FONT_FAMILY,
        fontSize: "18px",
        color: THEME.textGold,
        fontStyle: "bold",
      })
      .setOrigin(1, 0);
    row.add(cost);
    (row as unknown as { _cost: Phaser.GameObjects.Text })._cost = cost;

    row.setSize(w, rh);
    row.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, w, rh),
      Phaser.Geom.Rectangle.Contains,
    );
    row.on("pointerdown", () => {
      const affordable = state.spiritStones >= def.baseCost;
      if (state.phase === "planning" && affordable) {
        this.onSelect(id);
      }
    });

    return row;
  }

  private catName(cat: string): string {
    return { ride: "游乐", shop: "商店", buff: "增益", utility: "功能" }[cat] ?? cat;
  }

  setSelected(id: string | null, state: GameState): void {
    this.selectedId = id;
    this.updateSelectionVisuals(state);
  }

  private updateSelectionVisuals(state: GameState): void {
    const w = PANEL_W - 24;
    const rh = ROW_H - 10;
    for (const [id, row] of this.rows) {
      const def = getBuildingDef(id);
      const affordable = state.spiritStones >= def.baseCost;
      const selected = id === this.selectedId;
      const bg = (row as unknown as { _bg: Phaser.GameObjects.Graphics })._bg;
      bg.clear();
      bg.fillStyle(selected ? THEME.purple : THEME.bgPanelLight, selected ? 0.85 : 1);
      bg.fillRoundedRect(0, 0, w, rh, RADIUS);
      bg.lineStyle(2, selected ? THEME.gold : THEME.stroke, selected ? 1 : THEME.strokeAlpha);
      bg.strokeRoundedRect(0, 0, w, rh, RADIUS);
      row.setAlpha(affordable && state.phase === "planning" ? 1 : 0.45);
      const cost = (row as unknown as { _cost: Phaser.GameObjects.Text })._cost;
      cost.setColor(affordable ? THEME.textGold : THEME.danger);
    }
  }
}
