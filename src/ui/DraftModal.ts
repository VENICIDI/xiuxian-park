import Phaser from "phaser";
import { DESIGN_HEIGHT, DESIGN_WIDTH } from "../game/config";
import { getBuildingDef } from "../game/data/buildings";
import { RARITY_LABEL } from "../game/models/building";
import type { BuildingCategory, BuildingRarity } from "../game/models/building";
import { DEPTH, FONT_FAMILY, RADIUS } from "../game/theme";
import { SKIN, medallion } from "./skin";

const CAT_GLYPH: Record<BuildingCategory, string> = {
  ride: "🎢",
  shop: "🛍",
  buff: "✨",
  utility: "⚙",
};

const EASE = "Cubic.easeOut";
const HOVER_MS = 150;
const IDLE_MS = 2500;
const SHIMMER_MS = 2000;

type RarityMood = {
  border: number;
  glow: number;
  particle: number;
  glowAlpha: number;
  particleCount: number;
  starlight: boolean;
  flow: boolean;
};

/** 每日结束三选一（机缘抽卡）。 */
export class DraftModal {
  private scene: Phaser.Scene;
  private group: Phaser.GameObjects.Group;
  private selecting = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.group = scene.add.group();
  }

  open(candidates: string[], onChoose: (id: string) => void): void {
    this.group.clear(true, true);
    this.selecting = false;
    const cx = DESIGN_WIDTH / 2;
    const cy = DESIGN_HEIGHT / 2;

    this.createBackdrop(cx, cy);

    // 标题玉牌
    const titleY = 108;
    this.createTitle(cx, titleY);

    const cardW = 250;
    const cardH = 372;
    const gap = 44;
    const totalW = candidates.length * cardW + (candidates.length - 1) * gap;
    const startX = cx - totalW / 2 + cardW / 2;

    candidates.forEach((id, i) => {
      const x = startX + i * (cardW + gap);
      this.createCard(x, cy + 26, cardW, cardH, id, i, () => onChoose(id));
    });
  }

  /** 多层背景：暗幕 + 暗角 + 云雾 + 聚光 + 金色灵气粒子。 */
  private createBackdrop(cx: number, cy: number): void {
    const d = DEPTH.modal;

    // 半透明暗幕（略低于纯黑，便于透出场景氛围）
    const overlay = this.scene.add
      .rectangle(cx, cy, DESIGN_WIDTH, DESIGN_HEIGHT, 0x06110e, 0.62)
      .setDepth(d)
      .setInteractive();
    this.group.add(overlay);
    overlay.setAlpha(0);
    this.scene.tweens.add({ targets: overlay, alpha: 0.62, duration: 280, ease: EASE });

    // 轻微“背景模糊”感：柔焦雾层叠在暗幕上
    const blurLayer = this.scene.add.graphics().setDepth(d);
    for (let i = 0; i < 5; i++) {
      const y = (DESIGN_HEIGHT / 5) * i + DESIGN_HEIGHT / 10;
      blurLayer.fillStyle(0x1a3a32, 0.07);
      blurLayer.fillEllipse(cx + (i % 2 === 0 ? -80 : 90), y, DESIGN_WIDTH * 0.95, 160);
    }
    this.group.add(blurLayer);

    // 四周暗角（Vignette）
    const vignette = this.scene.add.graphics().setDepth(d);
    const corners: Array<[number, number]> = [
      [0, 0],
      [DESIGN_WIDTH, 0],
      [0, DESIGN_HEIGHT],
      [DESIGN_WIDTH, DESIGN_HEIGHT],
    ];
    for (const [x, y] of corners) {
      for (let r = 280; r > 40; r -= 28) {
        vignette.fillStyle(0x020806, 0.045);
        vignette.fillCircle(x, y, r);
      }
    }
    // 边缘压暗带
    vignette.fillStyle(0x020806, 0.35);
    vignette.fillRect(0, 0, DESIGN_WIDTH, 48);
    vignette.fillRect(0, DESIGN_HEIGHT - 56, DESIGN_WIDTH, 56);
    vignette.fillRect(0, 0, 40, DESIGN_HEIGHT);
    vignette.fillRect(DESIGN_WIDTH - 40, 0, 40, DESIGN_HEIGHT);
    this.group.add(vignette);

    // 半透明云雾 Overlay
    for (let i = 0; i < 6; i++) {
      const mist = this.scene.add
        .image(
          Phaser.Math.Between(120, DESIGN_WIDTH - 120),
          Phaser.Math.Between(80, DESIGN_HEIGHT - 80),
          "smoke",
        )
        .setTint(0xc8e6d8)
        .setAlpha(0)
        .setScale(Phaser.Math.FloatBetween(10, 18), Phaser.Math.FloatBetween(4, 7))
        .setDepth(d)
        .setBlendMode(Phaser.BlendModes.ADD);
      this.group.add(mist);
      this.scene.tweens.add({
        targets: mist,
        alpha: Phaser.Math.FloatBetween(0.05, 0.11),
        duration: 420,
        delay: 40 * i,
        ease: EASE,
      });
      this.scene.tweens.add({
        targets: mist,
        x: mist.x + Phaser.Math.Between(-100, 100),
        y: mist.y + Phaser.Math.Between(-30, 30),
        duration: Phaser.Math.Between(7000, 12000),
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
    }

    // 中央柔和聚光
    const spot = this.scene.add
      .image(cx, cy + 20, "glow")
      .setTint(0xd4b56a)
      .setAlpha(0)
      .setScale(28, 20)
      .setDepth(d)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.group.add(spot);
    this.scene.tweens.add({ targets: spot, alpha: 0.16, duration: 350, ease: EASE });
    this.scene.tweens.add({
      targets: spot,
      alpha: 0.22,
      duration: 2200,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    const spotJade = this.scene.add
      .image(cx, cy + 40, "glow")
      .setTint(0x5a9a7e)
      .setAlpha(0)
      .setScale(22, 16)
      .setDepth(d)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.group.add(spotJade);
    this.scene.tweens.add({ targets: spotJade, alpha: 0.1, duration: 350, ease: EASE });

    // 少量金色灵气粒子
    const aura = this.scene.add
      .particles(cx, cy, "spark", {
        tint: [0xffd45c, 0xffe08a, 0xc9a227],
        x: { min: -DESIGN_WIDTH * 0.42, max: DESIGN_WIDTH * 0.42 },
        y: { min: -DESIGN_HEIGHT * 0.38, max: DESIGN_HEIGHT * 0.38 },
        speed: { min: 6, max: 22 },
        lifespan: { min: 1800, max: 3600 },
        scale: { start: 0.55, end: 0 },
        alpha: { start: 0.55, end: 0 },
        frequency: 180,
        blendMode: Phaser.BlendModes.ADD,
        advance: 800,
      })
      .setDepth(d + 1);
    this.group.add(aura);
  }

  private createTitle(cx: number, titleY: number): void {
    const d = DEPTH.modal;

    // 标题外发光
    const titleGlow = this.scene.add
      .image(cx, titleY, "glow")
      .setTint(0xffd45c)
      .setAlpha(0.28)
      .setScale(14, 3.2)
      .setDepth(d + 1)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.group.add(titleGlow);
    this.scene.tweens.add({
      targets: titleGlow,
      alpha: 0.4,
      duration: 1800,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    const plaque = this.scene.add.graphics().setDepth(d + 1);
    this.drawJadePlaque(plaque, cx - 250, titleY - 38, 500, 78);
    this.group.add(plaque);

    const title = this.scene.add
      .text(cx, titleY - 12, "机 缘 · 三 选 一", {
        fontFamily: FONT_FAMILY,
        fontSize: "28px",
        color: SKIN.textGold,
        fontStyle: "bold",
        stroke: "#6a4a12",
        strokeThickness: 5,
      })
      .setOrigin(0.5)
      .setDepth(d + 2)
      .setShadow(0, 0, "#ffd45c", 10, true, true);
    this.group.add(title);

    const subtitle = this.scene.add
      .text(cx, titleY + 22, "请选择一座建筑加入图鉴", {
        fontFamily: FONT_FAMILY,
        fontSize: "14px",
        color: "#cfe8da",
      })
      .setOrigin(0.5)
      .setDepth(d + 2);
    this.group.add(subtitle);
  }

  /** 玉石质感标题牌 + 低透明祥云底纹。 */
  private drawJadePlaque(
    g: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    w: number,
    h: number,
  ): void {
    const r = RADIUS;
    // 厚度/落影
    g.fillStyle(0x000000, 0.35);
    g.fillRoundedRect(x + 3, y + 7, w, h, r);
    g.fillStyle(0x1a2e28, 0.9);
    g.fillRoundedRect(x + 2, y + 4, w, h, r);

    // 玉石渐变
    g.fillGradientStyle(0x2a4f44, 0x2a4f44, 0x142820, 0x142820, 1);
    g.fillRoundedRect(x, y, w, h, r);

    // 玉石纹理（低透明噪点条纹）
    g.fillStyle(0x8fd4bf, 0.06);
    for (let i = 0; i < 7; i++) {
      const ly = y + 10 + i * 9;
      g.fillRoundedRect(x + 18 + (i % 3) * 8, ly, w - 50 - (i % 4) * 12, 2, 1);
    }
    g.fillStyle(0xffffff, 0.05);
    g.fillCircle(x + w * 0.22, y + h * 0.35, 28);
    g.fillCircle(x + w * 0.72, y + h * 0.55, 20);

    // 祥云底纹（极低透明）
    g.lineStyle(1.5, 0xffe6a0, 0.07);
    this.strokeCloud(g, x + 70, y + h * 0.55, 36);
    this.strokeCloud(g, x + w - 90, y + h * 0.48, 32);
    this.strokeCloud(g, x + w * 0.5, y + h * 0.7, 28);

    // 玻璃高光
    g.fillStyle(0xffffff, 0.1);
    g.fillRoundedRect(x + 6, y + 4, w - 12, h * 0.38, Math.max(2, r - 4));

    // 青铜/金边
    g.lineStyle(3, SKIN.edgeDark, 0.95);
    g.strokeRoundedRect(x, y, w, h, r);
    g.lineStyle(2, SKIN.gold, 0.75);
    g.strokeRoundedRect(x + 3, y + 3, w - 6, h - 6, Math.max(2, r - 3));
    g.lineStyle(1, 0xffe6a0, 0.35);
    g.strokeRoundedRect(x + 7, y + 7, w - 14, h - 14, Math.max(2, r - 6));

    // 四角金点
    const gems: Array<[number, number]> = [
      [x + 12, y + 12],
      [x + w - 12, y + 12],
      [x + 12, y + h - 12],
      [x + w - 12, y + h - 12],
    ];
    g.fillStyle(SKIN.gold, 0.9);
    for (const [gx, gy] of gems) {
      g.fillCircle(gx, gy, 2.5);
    }
  }

  private strokeCloud(g: Phaser.GameObjects.Graphics, cx: number, cy: number, s: number): void {
    g.beginPath();
    g.arc(cx - s * 0.35, cy, s * 0.35, Math.PI * 0.15, Math.PI * 1.05, false);
    g.arc(cx, cy - s * 0.12, s * 0.42, Math.PI * 0.9, Math.PI * 2.05, false);
    g.arc(cx + s * 0.38, cy, s * 0.32, Math.PI * 1.1, Math.PI * 1.95, false);
    g.strokePath();
  }

  private rarityMood(r: BuildingRarity): RarityMood {
    switch (r) {
      case "common":
        return {
          border: 0xd8dde4,
          glow: 0xc5cad2,
          particle: 0xb8bec8,
          glowAlpha: 0.1,
          particleCount: 2,
          starlight: false,
          flow: false,
        };
      case "uncommon":
        return {
          border: 0x56d364,
          glow: 0x7fd37b,
          particle: 0x6ee7a0,
          glowAlpha: 0.28,
          particleCount: 3,
          starlight: false,
          flow: true,
        };
      case "rare":
        return {
          border: 0x3b82f6,
          glow: 0x69b7ff,
          particle: 0x7ec8ff,
          glowAlpha: 0.3,
          particleCount: 3,
          starlight: false,
          flow: true,
        };
      case "epic":
        return {
          border: 0xa855f7,
          glow: 0x9c7dff,
          particle: 0xc4a8ff,
          glowAlpha: 0.42,
          particleCount: 5,
          starlight: true,
          flow: true,
        };
      case "legendary":
        return {
          border: 0xf59e0b,
          glow: 0xffd45c,
          particle: 0xffe08a,
          glowAlpha: 0.48,
          particleCount: 6,
          starlight: true,
          flow: true,
        };
    }
  }

  private createCard(
    x: number,
    y: number,
    w: number,
    h: number,
    id: string,
    index: number,
    onClick: () => void,
  ): void {
    const def = getBuildingDef(id);
    const mood = this.rarityMood(def.rarity);
    const rarityColor = mood.border;

    const container = this.scene.add.container(x, y).setDepth(DEPTH.modal + 2);
    const baseY = y;

    // 品质氛围光晕
    const aura = this.scene.add
      .image(0, 0, "glow")
      .setTint(mood.glow)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(9.5, 12.5)
      .setAlpha(mood.glowAlpha);
    container.add(aura);
    this.scene.tweens.add({
      targets: aura,
      alpha: mood.glowAlpha + 0.12,
      duration: 1400,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    // 仙品/神品星光
    if (mood.starlight) {
      const stars = this.scene.add
        .particles(0, 0, "spark", {
          tint: [mood.particle, 0xffffff],
          x: { min: -w * 0.4, max: w * 0.4 },
          y: { min: -h * 0.42, max: h * 0.42 },
          speed: { min: 4, max: 18 },
          lifespan: { min: 900, max: 1800 },
          scale: { start: 0.45, end: 0 },
          alpha: { start: 0.7, end: 0 },
          frequency: 220,
          blendMode: Phaser.BlendModes.ADD,
          advance: 400,
        })
        .setDepth(0);
      container.add(stars);
    } else if (mood.particleCount > 0) {
      const drift = this.scene.add.particles(0, 0, "spark", {
        tint: mood.particle,
        x: { min: -w * 0.38, max: w * 0.38 },
        y: { min: -h * 0.4, max: h * 0.4 },
        speed: { min: 3, max: 12 },
        lifespan: { min: 1200, max: 2400 },
        scale: { start: 0.35, end: 0 },
        alpha: { start: def.rarity === "common" ? 0.35 : 0.55, end: 0 },
        frequency: def.rarity === "common" ? 420 : 280,
        blendMode: Phaser.BlendModes.ADD,
        advance: 300,
        quantity: 1,
      });
      container.add(drift);
    }

    // 卡底阴影 / 厚度 / 玻璃 / 内阴影 / 纹理
    const shadow = this.scene.add.graphics();
    const bg = this.scene.add.graphics();
    const borderGlow = this.scene.add.graphics();
    container.add(shadow);
    container.add(bg);
    container.add(borderGlow);

    const drawCard = (hover: boolean) => {
      shadow.clear();
      // 更明显的多层阴影
      shadow.fillStyle(0x000000, hover ? 0.42 : 0.32);
      shadow.fillRoundedRect(-w / 2 + 6, -h / 2 + 14, w, h, RADIUS);
      shadow.fillStyle(0x000000, hover ? 0.28 : 0.18);
      shadow.fillRoundedRect(-w / 2 + 2, -h / 2 + 8, w, h, RADIUS);

      bg.clear();
      // 厚度（青铜侧边）
      bg.fillStyle(0x0a1411, 0.95);
      bg.fillRoundedRect(-w / 2 + 4, -h / 2 + 6, w, h, RADIUS);
      bg.fillStyle(0x1c332c, 1);
      bg.fillRoundedRect(-w / 2 + 2, -h / 2 + 3, w, h, RADIUS);

      // 玉底渐变
      const top = hover ? 0x3a6a5c : 0x2c4f47;
      const bot = 0x101c19;
      bg.fillGradientStyle(top, top, bot, bot, 1);
      bg.fillRoundedRect(-w / 2, -h / 2, w, h, RADIUS);

      // 玻璃质感顶部高光
      bg.fillStyle(0xffffff, hover ? 0.12 : 0.08);
      bg.fillRoundedRect(-w / 2 + 5, -h / 2 + 4, w - 10, h * 0.36, Math.max(2, RADIUS - 4));
      // 轻微斜向高光
      bg.fillStyle(0xffffff, 0.04);
      bg.fillTriangle(-w / 2 + 8, -h / 2 + 8, -w / 2 + 70, -h / 2 + 8, -w / 2 + 8, -h / 2 + 90);

      // Inner Shadow（边缘压暗）
      bg.lineStyle(10, 0x000000, 0.18);
      bg.strokeRoundedRect(-w / 2 + 5, -h / 2 + 5, w - 10, h - 10, Math.max(2, RADIUS - 2));
      bg.lineStyle(4, 0x000000, 0.22);
      bg.strokeRoundedRect(-w / 2 + 3, -h / 2 + 3, w - 6, h - 6, Math.max(2, RADIUS - 1));

      // 祥云 / 阵法 / 玉石纹理（5~10%）
      this.drawCardTextures(bg, -w / 2, -h / 2, w, h, rarityColor);

      // 外深边 + 品质描边
      bg.lineStyle(3, SKIN.edgeDark, 0.95);
      bg.strokeRoundedRect(-w / 2, -h / 2, w, h, RADIUS);
      bg.lineStyle(2.5, rarityColor, hover ? 1 : 0.88);
      bg.strokeRoundedRect(-w / 2 + 3, -h / 2 + 3, w - 6, h - 6, Math.max(2, RADIUS - 3));
      bg.lineStyle(1, SKIN.gold, hover ? 0.55 : 0.28);
      bg.strokeRoundedRect(-w / 2 + 7, -h / 2 + 7, w - 14, h - 14, Math.max(2, RADIUS - 6));

      // Hover 边框外发光
      borderGlow.clear();
      if (hover) {
        borderGlow.lineStyle(6, rarityColor, 0.35);
        borderGlow.strokeRoundedRect(-w / 2 - 2, -h / 2 - 2, w + 4, h + 4, RADIUS + 2);
        borderGlow.lineStyle(2, 0xffe6a0, 0.4);
        borderGlow.strokeRoundedRect(-w / 2 + 1, -h / 2 + 1, w - 2, h - 2, RADIUS);
      }
    };
    drawCard(false);

    // 边框流光（每 2 秒扫过）
    const shimmer = this.scene.add
      .rectangle(-w * 0.7, 0, 36, h - 20, 0xffffff, 0.0)
      .setBlendMode(Phaser.BlendModes.ADD);
    if (mood.flow) shimmer.setFillStyle(mood.glow, 0.14);
    else shimmer.setFillStyle(0xffffff, 0.07);
    container.add(shimmer);
    this.scene.tweens.add({
      targets: shimmer,
      x: w * 0.7,
      duration: 700,
      ease: EASE,
      delay: 400 + index * 180,
      repeat: -1,
      repeatDelay: SHIMMER_MS - 700,
      onStart: () => {
        shimmer.setAlpha(1);
      },
      onRepeat: () => {
        shimmer.x = -w * 0.7;
      },
    });

    // 顶部品质缎带
    const ribbonW = w - 40;
    const ribbon = this.scene.add.graphics();
    ribbon.fillStyle(rarityColor, 1);
    ribbon.fillRoundedRect(-ribbonW / 2, -h / 2 + 18, ribbonW, 28, 8);
    ribbon.fillStyle(0xffffff, 0.18);
    ribbon.fillRoundedRect(-ribbonW / 2 + 2, -h / 2 + 19, ribbonW - 4, 10, 6);
    ribbon.fillStyle(0x000000, 0.16);
    ribbon.fillRoundedRect(-ribbonW / 2, -h / 2 + 34, ribbonW, 12, 6);
    container.add(ribbon);
    container.add(
      this.scene.add
        .text(0, -h / 2 + 32, this.rarityText(def.rarity), {
          fontFamily: FONT_FAMILY,
          fontSize: "15px",
          color: "#1a2320",
          fontStyle: "bold",
        })
        .setOrigin(0.5),
    );

    // 建筑展示区：玉石底座 + 放大图标
    const artCy = -h / 2 + 138;
    const discR = Math.round(62 * 1.3); // ≈30% 放大
    const iconRoot = this.scene.add.container(0, artCy);
    container.add(iconRoot);

    // 玉石底座
    const pedestal = this.scene.add.graphics();
    pedestal.fillStyle(0x000000, 0.28);
    pedestal.fillEllipse(0, discR + 10, discR * 1.55, 18);
    pedestal.fillGradientStyle(0x3a6b5c, 0x3a6b5c, 0x1a3028, 0x1a3028, 1);
    pedestal.fillEllipse(0, discR + 6, discR * 1.4, 14);
    pedestal.lineStyle(1.5, SKIN.gold, 0.45);
    pedestal.strokeEllipse(0, discR + 6, discR * 1.4, 14);
    pedestal.fillStyle(0xffffff, 0.08);
    pedestal.fillEllipse(-discR * 0.15, discR + 3, discR * 0.55, 5);
    iconRoot.add(pedestal);

    // 图标外发光（品质越高越明显）
    const iconGlow = this.scene.add
      .image(0, 0, "glow")
      .setTint(mood.glow)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(discR / 6)
      .setAlpha(0.22 + mood.glowAlpha * 0.7);
    iconRoot.add(iconGlow);
    this.scene.tweens.add({
      targets: iconGlow,
      alpha: 0.3 + mood.glowAlpha,
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    // 柔和阴影
    const iconShadow = this.scene.add.graphics();
    iconShadow.fillStyle(0x000000, 0.35);
    iconShadow.fillEllipse(3, 6, discR * 1.15, discR * 0.35);
    iconRoot.add(iconShadow);

    const disc = this.scene.add.graphics();
    disc.fillStyle(SKIN.edgeDark, 0.95);
    disc.fillCircle(0, 0, discR + 4);
    disc.fillStyle(rarityColor, 0.95);
    disc.fillCircle(0, 0, discR + 2.5);
    disc.fillGradientStyle(SKIN.panelTop, SKIN.panelTop, 0x0f1c18, 0x0f1c18, 1);
    disc.fillCircle(0, 0, discR);
    disc.fillStyle(0xffffff, 0.1);
    disc.fillCircle(-discR * 0.28, -discR * 0.28, discR * 0.45);
    iconRoot.add(disc);

    let iconTarget: Phaser.GameObjects.GameObject = iconRoot;
    if (def.sprite && this.scene.textures.exists(def.sprite)) {
      const img = this.scene.add.image(0, 0, def.sprite).setOrigin(0.5);
      const box = discR * 1.9;
      const s = Math.min(box / img.width, box / img.height);
      img.setScale(s);
      iconRoot.add(img);
      iconTarget = img;
    } else {
      const med = medallion(this.scene, 0, 0, discR - 10, CAT_GLYPH[def.category], rarityColor);
      iconRoot.add(med);
      iconTarget = med;
    }

    // 名称（更突出）
    container.add(
      this.scene.add
        .text(0, -h / 2 + 236, def.name, {
          fontFamily: FONT_FAMILY,
          fontSize: "24px",
          color: SKIN.textLight,
          fontStyle: "bold",
        })
        .setOrigin(0.5)
        .setShadow(0, 1, "#000000", 4, false, true),
    );

    // 灵石价签（缩小）
    const badge = this.scene.add.graphics();
    const bw = 84;
    const bh = 22;
    const by = -h / 2 + 262;
    badge.fillStyle(SKIN.edgeDark, 0.9);
    badge.fillRoundedRect(-bw / 2, by, bw, bh, 11);
    badge.fillGradientStyle(SKIN.gold, SKIN.gold, SKIN.goldDim, SKIN.goldDim, 1);
    badge.fillRoundedRect(-bw / 2 + 2, by + 2, bw - 4, bh - 4, 9);
    container.add(badge);
    container.add(
      this.scene.add
        .text(0, by + bh / 2, `◈ ${def.baseCost}`, {
          fontFamily: FONT_FAMILY,
          fontSize: "13px",
          color: "#2a1e07",
          fontStyle: "bold",
        })
        .setOrigin(0.5),
    );

    // 描述（略提亮）
    container.add(
      this.scene.add
        .text(0, -h / 2 + 298, def.description, {
          fontFamily: FONT_FAMILY,
          fontSize: "13px",
          color: "#d5efe4",
          align: "center",
          wordWrap: { width: w - 40 },
          lineSpacing: 4,
        })
        .setOrigin(0.5, 0),
    );

    container.setSize(w, h);
    container.setInteractive(
      new Phaser.Geom.Rectangle(-w / 2, -h / 2, w, h),
      Phaser.Geom.Rectangle.Contains,
    );

    // Idle：呼吸 + 轻浮（与 hover 共用容器）
    let idleScale: Phaser.Tweens.Tween | null = null;
    let idleFloat: Phaser.Tweens.Tween | null = null;
    const startIdle = () => {
      idleScale?.stop();
      idleFloat?.stop();
      container.setScale(1);
      container.y = baseY;
      idleScale = this.scene.tweens.add({
        targets: container,
        scaleX: 1.01,
        scaleY: 1.01,
        duration: IDLE_MS / 2,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
      idleFloat = this.scene.tweens.add({
        targets: container,
        y: baseY - 4,
        duration: IDLE_MS / 2,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
    };
    const stopIdle = () => {
      idleScale?.stop();
      idleFloat?.stop();
      idleScale = null;
      idleFloat = null;
    };

    let hovering = false;

    container.on("pointerover", () => {
      if (this.selecting) return;
      hovering = true;
      stopIdle();
      this.scene.tweens.killTweensOf(container);
      drawCard(true);
      this.scene.tweens.add({
        targets: container,
        scaleX: 1.05,
        scaleY: 1.05,
        y: baseY - 8,
        duration: HOVER_MS,
        ease: EASE,
      });
      this.scene.tweens.add({
        targets: iconTarget,
        angle: 3,
        duration: HOVER_MS,
        ease: EASE,
      });
      this.scene.tweens.add({
        targets: aura,
        alpha: mood.glowAlpha + 0.22,
        duration: HOVER_MS,
        ease: EASE,
      });
    });

    container.on("pointerout", () => {
      if (this.selecting) return;
      hovering = false;
      this.scene.tweens.killTweensOf(container);
      drawCard(false);
      this.scene.tweens.add({
        targets: container,
        scaleX: 1,
        scaleY: 1,
        y: baseY,
        duration: HOVER_MS,
        ease: EASE,
        onComplete: () => {
          if (!hovering && !this.selecting) startIdle();
        },
      });
      this.scene.tweens.add({
        targets: iconTarget,
        angle: 0,
        duration: HOVER_MS,
        ease: EASE,
      });
      this.scene.tweens.add({
        targets: aura,
        alpha: mood.glowAlpha,
        duration: HOVER_MS,
        ease: EASE,
      });
    });

    container.on("pointerdown", () => {
      if (this.selecting) return;
      this.selecting = true;
      stopIdle();
      this.scene.tweens.killTweensOf(container);

      // 选中：放大 → 边框发光 → 粒子爆开 → 淡出 → 回调
      drawCard(true);
      borderGlow.clear();
      borderGlow.lineStyle(8, rarityColor, 0.55);
      borderGlow.strokeRoundedRect(-w / 2 - 4, -h / 2 - 4, w + 8, h + 8, RADIUS + 3);
      borderGlow.lineStyle(3, 0xffe6a0, 0.7);
      borderGlow.strokeRoundedRect(-w / 2, -h / 2, w, h, RADIUS);

      this.scene.tweens.add({
        targets: container,
        scaleX: 1.12,
        scaleY: 1.12,
        y: baseY - 12,
        duration: 220,
        ease: EASE,
      });
      this.scene.tweens.add({
        targets: aura,
        alpha: Math.min(0.85, mood.glowAlpha + 0.45),
        scaleX: 12,
        scaleY: 15,
        duration: 220,
        ease: EASE,
      });

      const burst = this.scene.add
        .particles(container.x, container.y, "spark", {
          tint: [mood.particle, mood.glow, 0xffd45c],
          speed: { min: 80, max: 260 },
          lifespan: 520,
          scale: { start: 0.9, end: 0 },
          alpha: { start: 1, end: 0 },
          blendMode: Phaser.BlendModes.ADD,
          frequency: -1,
        })
        .setDepth(DEPTH.modal + 8);
      this.group.add(burst);
      burst.explode(22);

      this.scene.tweens.add({
        targets: container,
        alpha: 0,
        duration: 280,
        delay: 120,
        ease: EASE,
        onComplete: () => {
          burst.stop();
          onClick();
        },
      });
    });

    this.group.add(container);

    // 入场：错峰升起淡入（无弹簧）
    container.setAlpha(0);
    container.y = y + 46;
    this.scene.tweens.add({
      targets: container,
      y,
      alpha: 1,
      duration: 320,
      delay: 90 * index,
      ease: EASE,
      onComplete: () => {
        if (!this.selecting) startIdle();
      },
    });
  }

  /** 卡面低透明纹理：祥云 + 阵法 + 玉石。 */
  private drawCardTextures(
    g: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    w: number,
    h: number,
    accent: number,
  ): void {
    // 阵法纹理
    g.lineStyle(1, accent, 0.08);
    const cx = x + w / 2;
    const cy = y + h * 0.42;
    g.strokeCircle(cx, cy, 48);
    g.strokeCircle(cx, cy, 68);
    g.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI * 2 * i) / 6 - Math.PI / 2;
      const px = cx + Math.cos(a) * 68;
      const py = cy + Math.sin(a) * 68;
      if (i === 0) g.moveTo(px, py);
      else g.lineTo(px, py);
    }
    g.closePath();
    g.strokePath();

    // 祥云
    g.lineStyle(1.2, 0xffe6a0, 0.07);
    this.strokeCloud(g, x + 52, y + h - 70, 30);
    this.strokeCloud(g, x + w - 56, y + h - 88, 26);

    // 玉石纹理斑点
    g.fillStyle(0xffffff, 0.05);
    g.fillCircle(x + w * 0.2, y + h * 0.25, 18);
    g.fillCircle(x + w * 0.78, y + h * 0.55, 14);
    g.fillStyle(0x8fd4bf, 0.06);
    for (let i = 0; i < 5; i++) {
      g.fillRoundedRect(x + 20 + i * 18, y + h * 0.72 + (i % 2) * 6, 28, 1.5, 1);
    }
  }

  private rarityText(r: BuildingRarity): string {
    return RARITY_LABEL[r];
  }

  close(): void {
    this.selecting = false;
    this.group.clear(true, true);
  }
}
