import Phaser from "phaser";
import { DESIGN_HEIGHT, DESIGN_WIDTH } from "../game/config";
import { getBuildingDef } from "../game/data/buildings";
import { RARITY_COLOR, RARITY_LABEL } from "../game/models/building";
import type { BuildingCategory } from "../game/models/building";
import { DEPTH, FONT_FAMILY, RADIUS, THEME } from "../game/theme";

const CAT_GLYPH: Record<BuildingCategory, string> = {
  ride: "🎢",
  shop: "🛍",
  buff: "✨",
  utility: "⚙",
};

/** 每日结束三选一。 */
export class DraftModal {
  private scene: Phaser.Scene;
  private group: Phaser.GameObjects.Group;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.group = scene.add.group();
  }

  open(candidates: string[], onChoose: (id: string) => void): void {
    this.group.clear(true, true);
    const cx = DESIGN_WIDTH / 2;
    const cy = DESIGN_HEIGHT / 2;

    const overlay = this.scene.add
      .rectangle(cx, cy, DESIGN_WIDTH, DESIGN_HEIGHT, 0x000000, 0.72)
      .setDepth(DEPTH.modal)
      .setInteractive();
    this.group.add(overlay);

    const title = this.scene.add
      .text(cx, 120, "选择一座建筑加入你的图鉴", {
        fontFamily: FONT_FAMILY,
        fontSize: "30px",
        color: THEME.textLight,
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.modal + 1);
    this.group.add(title);

    const cardW = 260;
    const cardH = 360;
    const gap = 40;
    const totalW = candidates.length * cardW + (candidates.length - 1) * gap;
    const startX = cx - totalW / 2 + cardW / 2;

    candidates.forEach((id, i) => {
      const x = startX + i * (cardW + gap);
      this.createCard(x, cy + 20, cardW, cardH, id, () => onChoose(id));
    });
  }

  private createCard(
    x: number,
    y: number,
    w: number,
    h: number,
    id: string,
    onClick: () => void,
  ): void {
    const def = getBuildingDef(id);
    const container = this.scene.add.container(x, y).setDepth(DEPTH.modal + 1);

    const bg = this.scene.add.graphics();
    const draw = (hover: boolean) => {
      bg.clear();
      bg.fillStyle(hover ? THEME.bgPanelLight : THEME.bgPanel, 1);
      bg.fillRoundedRect(-w / 2, -h / 2, w, h, RADIUS);
      bg.lineStyle(4, RARITY_COLOR[def.rarity], 1);
      bg.strokeRoundedRect(-w / 2, -h / 2, w, h, RADIUS);
    };
    draw(false);
    container.add(bg);

    const swatch = this.scene.add.graphics();
    swatch.fillStyle(def.color, 1);
    swatch.fillRoundedRect(-50, -h / 2 + 30, 100, 100, RADIUS);
    swatch.lineStyle(2, THEME.stroke, THEME.strokeAlpha);
    swatch.strokeRoundedRect(-50, -h / 2 + 30, 100, 100, RADIUS);
    container.add(swatch);
    container.add(
      this.scene.add
        .text(0, -h / 2 + 80, CAT_GLYPH[def.category], {
          fontFamily: FONT_FAMILY,
          fontSize: "48px",
        })
        .setOrigin(0.5),
    );

    container.add(
      this.scene.add
        .text(0, -h / 2 + 150, def.name, {
          fontFamily: FONT_FAMILY,
          fontSize: "22px",
          color: THEME.textLight,
          fontStyle: "bold",
        })
        .setOrigin(0.5),
    );
    container.add(
      this.scene.add
        .text(0, -h / 2 + 180, `${RARITY_LABEL[def.rarity]} · 💰${def.baseCost}`, {
          fontFamily: FONT_FAMILY,
          fontSize: "15px",
          color: THEME.textGold,
          fontStyle: "bold",
        })
        .setOrigin(0.5),
    );
    container.add(
      this.scene.add
        .text(0, -h / 2 + 210, def.description, {
          fontFamily: FONT_FAMILY,
          fontSize: "14px",
          color: THEME.textDim,
          align: "center",
          wordWrap: { width: w - 30 },
          lineSpacing: 4,
        })
        .setOrigin(0.5, 0),
    );

    container.setSize(w, h);
    container.setInteractive(
      new Phaser.Geom.Rectangle(-w / 2, -h / 2, w, h),
      Phaser.Geom.Rectangle.Contains,
    );
    container.on("pointerover", () => {
      draw(true);
      container.setScale(1.03);
    });
    container.on("pointerout", () => {
      draw(false);
      container.setScale(1);
    });
    container.on("pointerdown", onClick);

    this.group.add(container);
  }

  close(): void {
    this.group.clear(true, true);
  }
}
