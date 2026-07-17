import Phaser from "phaser";
import { DESIGN_HEIGHT, DESIGN_WIDTH } from "../game/config";
import { getBuildingDef } from "../game/data/buildings";
import { RARITY_LABEL } from "../game/models/building";
import type { GameState } from "../game/models/game-state";
import { occupantAt } from "../game/systems/PlacementSystem";
import { effectiveSize } from "../game/models/building";
import { DEPTH, FONT_FAMILY, RADIUS, THEME } from "../game/theme";
import { Button } from "./Button";

/** 建筑详情弹窗：查看 / 拆除。 */
export class DetailPanel {
  private scene: Phaser.Scene;
  private group: Phaser.GameObjects.Group;
  private visible = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.group = scene.add.group();
  }

  isOpen(): boolean {
    return this.visible;
  }

  open(
    state: GameState,
    index: number,
    onRemove: () => void,
  ): void {
    this.close();
    const inst = occupantAt(state, index);
    if (!inst) return;
    const def = getBuildingDef(inst.definitionId);
    this.visible = true;

    const cx = DESIGN_WIDTH / 2;
    const cy = DESIGN_HEIGHT / 2;

    const overlay = this.scene.add
      .rectangle(cx, cy, DESIGN_WIDTH, DESIGN_HEIGHT, 0x000000, 0.6)
      .setDepth(DEPTH.modal)
      .setInteractive();
    overlay.on("pointerdown", () => this.close());
    this.group.add(overlay);

    const pw = 460;
    const ph = 360;
    const panel = this.scene.add.graphics().setDepth(DEPTH.modal + 1);
    panel.fillStyle(THEME.bgPanelLight, 1);
    panel.fillRoundedRect(cx - pw / 2, cy - ph / 2, pw, ph, RADIUS);
    panel.lineStyle(2, THEME.stroke, THEME.strokeAlpha);
    panel.strokeRoundedRect(cx - pw / 2, cy - ph / 2, pw, ph, RADIUS);
    this.group.add(panel);

    this.addText(cx, cy - ph / 2 + 30, def.name, 26, THEME.textLight, true);
    this.addText(
      cx,
      cy - ph / 2 + 60,
      RARITY_LABEL[def.rarity],
      16,
      THEME.accentText,
    );

    const lines: string[] = [];
    lines.push(def.description);
    lines.push("");
    if (def.baseRevenue > 0) {
      lines.push(`基础客单价：${def.baseRevenue}`);
    } else {
      lines.push("增益/功能类建筑（自身不直接产出）");
    }
    const eff = effectiveSize(def, inst.rotation ?? 0);
    lines.push(`占地：${eff.w}×${eff.h} 格`);
    if (def.tags.length > 0) lines.push(`标签：${def.tags.join(" / ")}`);

    this.addMultiline(cx - pw / 2 + 28, cy - ph / 2 + 90, lines, pw - 56);

    const rmBtn = new Button(this.scene, cx, cy + ph / 2 - 44, "拆除", {
      width: 200,
      height: 50,
      variant: "danger",
      onClick: () => {
        onRemove();
      },
    });
    rmBtn.setDepth(DEPTH.modal + 2);
    this.group.add(rmBtn);

    const close = this.scene.add
      .text(cx + pw / 2 - 24, cy - ph / 2 + 16, "✕", {
        fontFamily: FONT_FAMILY,
        fontSize: "22px",
        color: THEME.textDim,
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.modal + 2)
      .setInteractive();
    close.on("pointerdown", () => this.close());
    this.group.add(close);
  }

  private addText(
    x: number,
    y: number,
    text: string,
    size: number,
    color: string,
    bold = false,
  ): void {
    const t = this.scene.add
      .text(x, y, text, {
        fontFamily: FONT_FAMILY,
        fontSize: `${size}px`,
        color,
        fontStyle: bold ? "bold" : "normal",
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.modal + 2);
    this.group.add(t);
  }

  private addMultiline(x: number, y: number, lines: string[], wrap: number): void {
    const t = this.scene.add
      .text(x, y, lines.join("\n"), {
        fontFamily: FONT_FAMILY,
        fontSize: "15px",
        color: THEME.textDim,
        wordWrap: { width: wrap },
        lineSpacing: 4,
      })
      .setDepth(DEPTH.modal + 2);
    this.group.add(t);
  }

  close(): void {
    this.group.clear(true, true);
    this.visible = false;
  }
}
