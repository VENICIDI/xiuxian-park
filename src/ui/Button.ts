import Phaser from "phaser";
import {
  BUTTON,
  FONT_FAMILY,
  RADIUS,
  SHADOW,
  THEME,
  type ButtonVariant,
} from "../game/theme";

export type ButtonOptions = {
  width?: number;
  height?: number;
  fontSize?: number;
  /** 变体：主(绿)/次(灰紫)/危险(红)，规范六。 */
  variant?: ButtonVariant;
  /** 覆盖底色（可选，优先级高于 variant）。 */
  color?: number;
  hoverColor?: number;
  textColor?: string;
  onClick?: () => void;
};

/**
 * 通用按钮（规范六）：圆角 16、默认高 56、统一阴影(Y4/Blur12/20%)、
 * 三变体、Hover 提亮、按下缩放 95%。
 */
export class Button extends Phaser.GameObjects.Container {
  private bg: Phaser.GameObjects.Graphics;
  private label: Phaser.GameObjects.Text;
  private bw: number;
  private bh: number;
  private baseColor: number;
  private hoverColor: number;
  private pressColor: number;
  private textColor: string;
  private enabled = true;
  private onClick?: () => void;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    text: string,
    opts: ButtonOptions = {},
  ) {
    super(scene, x, y);
    const variant = BUTTON[opts.variant ?? "primary"];
    this.bw = opts.width ?? 200;
    this.bh = opts.height ?? BUTTON.height;
    this.baseColor = opts.color ?? variant.base;
    this.hoverColor = opts.hoverColor ?? variant.hover;
    this.pressColor = variant.press;
    this.textColor = opts.textColor ?? variant.text;

    this.bg = scene.add.graphics();
    this.label = scene.add
      .text(0, 0, text, {
        fontFamily: FONT_FAMILY,
        fontSize: `${opts.fontSize ?? 20}px`,
        color: this.textColor,
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.add([this.bg, this.label]);
    this.setSize(this.bw, this.bh);
    this.setInteractive(
      new Phaser.Geom.Rectangle(-this.bw / 2, -this.bh / 2, this.bw, this.bh),
      Phaser.Geom.Rectangle.Contains,
    );

    this.on("pointerover", () => {
      this.render(this.hoverColor);
      this.tweenScale(1.04);
    });
    this.on("pointerout", () => {
      this.render(this.baseColor);
      this.tweenScale(1);
    });
    this.on("pointerdown", () => {
      this.render(this.pressColor);
      this.tweenScale(0.95);
    });
    this.on("pointerup", () => {
      this.render(this.hoverColor);
      this.tweenScale(1.04);
      if (this.enabled && this.onClick) this.onClick();
    });

    this.onClick = opts.onClick;
    this.render(this.baseColor);
    scene.add.existing(this);
  }

  private tweenScale(target: number): void {
    if (!this.enabled && target !== 1) return;
    this.scene.tweens.add({
      targets: this,
      scale: target,
      duration: 110,
      ease: "Quad.easeOut",
    });
  }

  private render(color: number): void {
    const enabled = this.enabled;
    const c = enabled ? color : BUTTON.disabled;
    const hw = this.bw / 2;
    const hh = this.bh / 2;
    this.bg.clear();
    // 统一阴影（Y=4，柔和 20%，用两层近似 Blur）
    this.bg.fillStyle(SHADOW.color, SHADOW.alpha * 0.6);
    this.bg.fillRoundedRect(-hw - 1, -hh + SHADOW.offsetY + 2, this.bw + 2, this.bh, RADIUS);
    this.bg.fillStyle(SHADOW.color, SHADOW.alpha);
    this.bg.fillRoundedRect(-hw, -hh + SHADOW.offsetY, this.bw, this.bh, RADIUS);
    // 主体
    this.bg.fillStyle(c, 1);
    this.bg.fillRoundedRect(-hw, -hh, this.bw, this.bh, RADIUS);
    // 顶部高光条（柔和立体）
    this.bg.fillStyle(0xffffff, enabled ? 0.12 : 0.04);
    this.bg.fillRoundedRect(-hw + 4, -hh + 4, this.bw - 8, this.bh * 0.36, RADIUS - 4);
    // 描边（半透明白，规范：不用纯白）
    this.bg.lineStyle(2, THEME.stroke, THEME.strokeAlpha);
    this.bg.strokeRoundedRect(-hw, -hh, this.bw, this.bh, RADIUS);
    this.label.setColor(enabled ? this.textColor : BUTTON.disabledText);
  }

  setEnabled(v: boolean): this {
    this.enabled = v;
    if (v) this.setInteractive();
    else this.disableInteractive();
    this.render(this.baseColor);
    return this;
  }

  setText(text: string): this {
    this.label.setText(text);
    return this;
  }

  setOnClick(fn: () => void): this {
    this.onClick = fn;
    return this;
  }
}
