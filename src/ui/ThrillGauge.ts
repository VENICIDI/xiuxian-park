import Phaser from "phaser";
import { DESIGN_WIDTH } from "../game/config";
import { BALANCE } from "../game/data/balance";
import type { GameState } from "../game/models/game-state";
import { DEPTH, FONT_FAMILY, THEME } from "../game/theme";
import { HUD_H } from "../game/rendering/layout";
import { SKIN, fantasyPanel } from "./skin";

// 右上「刺激度」面板：竖直灵力能量槽（玉管 + 液面）。
// 消费时液面上涨；满 100 触发「收益翻倍」狂欢，狂欢期间液面在 frenzyMs 内线性回落到 0。
const PW = 104;
const PH = 132;
const PX = DESIGN_WIDTH - 20 - PW; // 贴右缘（与左侧仪表盘对称）
const PY = HUD_H + 16;
const CX = PX + PW / 2;

// 竖直玉管几何
const TUBE_W = 40;
const TUBE_H = 74;
const TUBE_X = CX - TUBE_W / 2;
const TUBE_TOP = PY + 30;
const INNER_PAD = 3;
const INNER_X = TUBE_X + INNER_PAD;
const INNER_W = TUBE_W - INNER_PAD * 2;
const INNER_TOP = TUBE_TOP + INNER_PAD;
const INNER_H = TUBE_H - INNER_PAD * 2;
const INNER_BOTTOM = INNER_TOP + INNER_H;

const MAX = BALANCE.thrillMeter.max;
const PER_STONE = BALANCE.thrillMeter.perStone;
const FRENZY_MS = BALANCE.thrillMeter.frenzyMs;

const IDLE_COLOR = THEME.purple; // 刺激度紫
const IDLE_TOP = 0xc3b0ff; // 液面高光（偏亮紫）
const FRENZY_COLOR = THEME.gold; // 狂欢金
const FRENZY_TOP = 0xfff0b8;
const TRACK_COLOR = 0x241d38;

/**
 * 右上「刺激度」竖直能量槽：
 * - 平时：液面随营业消费平滑上涨（缓动）。
 * - 满 100：进入「收益翻倍」狂欢，液面在 frenzyMs 内线性回落到 0（回落即翻倍剩余时间）。
 * - 回落到 0：恢复常态，重新蓄力。
 */
export class ThrillGauge {
  private scene: Phaser.Scene;
  private tube: Phaser.GameObjects.Graphics;
  private glow: Phaser.GameObjects.Image;
  private valueText: Phaser.GameObjects.Text;
  private frenzyText: Phaser.GameObjects.Text;
  /** 逻辑刺激度（目标值），0..MAX。 */
  private value = 0;
  /** 实际绘制值（向 value 缓动，制造上涨动画）。 */
  private rendered = 0;
  private live = false;
  private frenzyUntil = 0; // 基于 scene.time.now 的狂欢到期时刻
  private shownFrenzy = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    const bg = scene.add.graphics().setDepth(DEPTH.panel);
    fantasyPanel(bg, PX, PY, PW, PH);

    scene.add
      .text(CX, PY + 11, "刺激度", {
        fontFamily: FONT_FAMILY,
        fontSize: "12px",
        color: SKIN.textGold,
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.panel + 1);

    // 管后发光（狂欢时点亮）
    this.glow = scene.add
      .image(CX, TUBE_TOP + TUBE_H / 2, "glow")
      .setTint(FRENZY_COLOR)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(2.4, 3.0)
      .setAlpha(0)
      .setDepth(DEPTH.panel);

    this.tube = scene.add.graphics().setDepth(DEPTH.panel + 1);

    // 狂欢横幅（管上方，平时隐藏）
    this.frenzyText = scene.add
      .text(CX, TUBE_TOP - 8, "", {
        fontFamily: FONT_FAMILY,
        fontSize: "12px",
        color: THEME.textGold,
        fontStyle: "bold",
        stroke: "#3a2a08",
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.panel + 3)
      .setVisible(false);

    // 底部数值
    this.valueText = scene.add
      .text(CX, PY + PH - 15, "0", {
        fontFamily: FONT_FAMILY,
        fontSize: "16px",
        color: THEME.accentText,
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.panel + 2);

    this.paint();

    scene.events.on(Phaser.Scenes.Events.UPDATE, this.onUpdate, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      scene.events.off(Phaser.Scenes.Events.UPDATE, this.onUpdate, this);
    });
  }

  private paint(): void {
    const frenzy = this.isFrenzyActive();
    const frac = Phaser.Math.Clamp(this.rendered / MAX, 0, 1);
    const color = frenzy ? FRENZY_COLOR : IDLE_COLOR;
    const topColor = frenzy ? FRENZY_TOP : IDLE_TOP;
    const g = this.tube;
    g.clear();

    // 管内暗槽
    g.fillStyle(TRACK_COLOR, 1);
    g.fillRoundedRect(INNER_X, INNER_TOP, INNER_W, INNER_H, 6);

    // 液体
    const fh = INNER_H * frac;
    if (fh > 1) {
      const liquidY = INNER_BOTTOM - fh;
      const r = Math.min(6, fh / 2);
      g.fillStyle(color, 1);
      g.fillRoundedRect(INNER_X, liquidY, INNER_W, fh, {
        tl: 0,
        tr: 0,
        bl: r,
        br: r,
      });
      // 液面波纹高光（随时间轻微上下浮动）
      const wob = Math.sin(this.scene.time.now / 220) * 1.2;
      g.fillStyle(topColor, 0.95);
      g.fillRect(INNER_X, liquidY + wob, INNER_W, 2.5);
      // 液体内竖直高光条
      g.fillStyle(0xffffff, 0.14);
      g.fillRect(INNER_X + 3, liquidY + 2, 3, Math.max(0, fh - 4));
    }

    // 25/50/75 刻度线
    g.lineStyle(1, 0xffffff, 0.14);
    for (const m of [0.25, 0.5, 0.75]) {
      const ty = INNER_BOTTOM - INNER_H * m;
      g.lineBetween(INNER_X + 2, ty, INNER_X + INNER_W - 2, ty);
    }

    // 玻璃管壁
    g.lineStyle(2.5, SKIN.edgeDark, 0.9);
    g.strokeRoundedRect(TUBE_X, TUBE_TOP, TUBE_W, TUBE_H, 8);
    g.lineStyle(1.5, frenzy ? SKIN.gold : 0x8f79c9, 0.6);
    g.strokeRoundedRect(TUBE_X + 2, TUBE_TOP + 2, TUBE_W - 4, TUBE_H - 4, 6);
    // 管左侧玻璃反光
    g.fillStyle(0xffffff, 0.1);
    g.fillRoundedRect(TUBE_X + 4, TUBE_TOP + 4, 5, TUBE_H - 10, 3);

    this.valueText
      .setColor(frenzy ? THEME.textGold : THEME.accentText)
      .setText(`${Math.round(this.rendered)}`);
  }

  private onUpdate(): void {
    const frenzy = this.isFrenzyActive();

    if (frenzy) {
      // 狂欢：液面按剩余时间线性回落到 0
      const remainFrac = Phaser.Math.Clamp(
        (this.frenzyUntil - this.scene.time.now) / FRENZY_MS,
        0,
        1,
      );
      this.value = MAX * remainFrac;
      this.rendered = this.value;
    } else {
      // 常态：绘制值向目标平滑缓动
      this.rendered += (this.value - this.rendered) * 0.18;
      if (Math.abs(this.value - this.rendered) < 0.5) this.rendered = this.value;
    }

    this.handleFrenzyToggle(frenzy);
    this.paint();
  }

  private handleFrenzyToggle(active: boolean): void {
    if (active === this.shownFrenzy) return;
    this.shownFrenzy = active;
    this.frenzyText.setVisible(active);
    this.scene.tweens.killTweensOf(this.frenzyText);
    this.scene.tweens.killTweensOf(this.glow);
    if (active) {
      this.frenzyText.setText("收益翻倍");
      this.frenzyText.setScale(0.8);
      this.scene.tweens.add({
        targets: this.frenzyText,
        scale: 1.08,
        duration: 420,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
      this.scene.tweens.add({
        targets: this.glow,
        alpha: 0.5,
        duration: 220,
      });
    } else {
      this.frenzyText.setScale(1);
      this.scene.tweens.add({ targets: this.glow, alpha: 0, duration: 300 });
    }
  }

  /** 当前是否处于收益翻倍狂欢中。 */
  isFrenzyActive(): boolean {
    return this.scene.time.now < this.frenzyUntil;
  }

  /** 当前刺激度值（用于结算后写回状态）。 */
  getValue(): number {
    return Phaser.Math.Clamp(this.value, 0, MAX);
  }

  /** 规划阶段静态展示当前刺激度。 */
  update(state: GameState): void {
    this.live = false;
    this.value = Phaser.Math.Clamp(state.thrill ?? 0, 0, MAX);
    this.rendered = this.value;
    this.paint();
  }

  /** 营业开始：进入实时积累模式。 */
  beginLive(startThrill: number): void {
    this.live = true;
    this.value = Phaser.Math.Clamp(startThrill, 0, MAX);
    this.rendered = this.value;
    this.paint();
  }

  /**
   * 游客消费：按收益比例积累刺激度；满 MAX 触发狂欢（狂欢期间积累暂停）。
   * 返回本次是否触发了新的狂欢。
   */
  addThrill(amount: number): boolean {
    if (!this.live || this.isFrenzyActive()) return false;
    this.value += amount * PER_STONE;
    if (this.value >= MAX) {
      this.value = MAX;
      this.rendered = MAX;
      this.frenzyUntil = this.scene.time.now + FRENZY_MS;
      return true;
    }
    return false;
  }

  /** 营业结束：退出实时模式（狂欢余量由 onUpdate 自然收尾）。 */
  endLive(): void {
    this.live = false;
  }
}
