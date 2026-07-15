import Phaser from "phaser";
import { getDailyEvent } from "../game/data/daily-events";
import type { GameState } from "../game/models/game-state";
import { DEPTH, FONT_FAMILY, THEME } from "../game/theme";
import { Button } from "./Button";

/** 开发模式调试面板：seed、阶段、加灵石、清存档等。 */
export class DebugPanel {
  private container: Phaser.GameObjects.Container;
  private info: Phaser.GameObjects.Text;
  private open = false;
  private getState: () => GameState;

  constructor(
    scene: Phaser.Scene,
    getState: () => GameState,
    onAddStones: () => void,
    onClearSave: () => void,
  ) {
    this.getState = getState;
    this.container = scene.add.container(20, 120).setDepth(DEPTH.debug).setVisible(false);

    const bg = scene.add.graphics();
    bg.fillStyle(0x000000, 0.85);
    bg.fillRoundedRect(0, 0, 300, 250, 10);
    bg.lineStyle(1, THEME.accent, 0.6);
    bg.strokeRoundedRect(0, 0, 300, 250, 10);
    this.container.add(bg);

    this.container.add(
      scene.add.text(12, 10, "调试面板 (D 键开关)", {
        fontFamily: FONT_FAMILY,
        fontSize: "14px",
        color: THEME.textGold,
        fontStyle: "bold",
      }),
    );

    this.info = scene.add.text(12, 36, "", {
      fontFamily: FONT_FAMILY,
      fontSize: "13px",
      color: THEME.textLight,
      lineSpacing: 3,
    });
    this.container.add(this.info);

    const b1 = new Button(scene, 90, 200, "+200 灵石", {
      width: 150,
      height: 34,
      fontSize: 15,
      onClick: onAddStones,
    });
    this.container.add(b1);
    const b2 = new Button(scene, 90, 236 - 6, "清存档回主菜单", {
      width: 200,
      height: 30,
      fontSize: 14,
      color: 0x8b3a4a,
      onClick: onClearSave,
    });
    this.container.add(b2);

    scene.input.keyboard?.on("keydown-D", () => this.toggle());
  }

  toggle(): void {
    this.open = !this.open;
    this.container.setVisible(this.open);
    if (this.open) this.refresh();
  }

  refresh(): void {
    if (!this.open) return;
    const s = this.getState();
    const ev = getDailyEvent(s.activeEventId);
    this.info.setText(
      [
        `runId: ${s.runId}`,
        `seed: ${s.seed}`,
        `rngCursor: ${s.rngCursor}`,
        `day: ${s.day} / phase: ${s.phase}`,
        `灵石: ${s.spiritStones}`,
        `游客: ${s.visitorCount}`,
        `事件: ${ev.name}`,
        `建筑数: ${s.board.filter(Boolean).length}`,
        `图鉴数: ${s.ownedBuildingIds.length}`,
        `累计收入: ${s.statistics.totalRevenue}`,
      ].join("\n"),
    );
  }
}
