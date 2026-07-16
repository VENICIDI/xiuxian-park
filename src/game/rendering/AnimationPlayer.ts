import Phaser from "phaser";
import { SECT_DEFINITIONS } from "../data/visitors";
import type { GameState, PresentationEvent } from "../models/game-state";
import type { Sect } from "../models/visitor";
import { ENTRANCE_INDEX, ROUTE } from "../systems/route";
import { positionToIndex } from "../systems/PlacementSystem";
import { cellCenter, isoRank } from "./layout";

const ISO_DEPTH_BASE = 10;
const ISO_DEPTH_STEP = 1.2;
/** 游客略高于同格建筑，保证行走时的遮挡关系自然。 */
const VISITOR_DEPTH_BIAS = 0.6;

type Purchase = { cell: number; amount: number; thunder: boolean };

type Timeline = {
  visitorId: string;
  sect: Sect;
  /** 路线顺序 → 在该道路格触发的消费（发生在相邻建筑格） */
  purchasesByRoute: Map<number, Purchase[]>;
  /** 该游客最后一次消费的路线顺序（之后即可离场） */
  lastRouteIndex: number;
};

export type PlayOptions = {
  state: GameState;
  events: PresentationEvent[];
  speed: number;
  onCoin?: (worldX: number, worldY: number, amount: number, thunder: boolean) => void;
  onComplete: () => void;
};

/** 依据表现事件日志播放动画。只消费日志，不回写经济状态。 */
export class AnimationPlayer {
  private scene: Phaser.Scene;
  private persons: Phaser.GameObjects.Container[] = [];
  private done = false;
  private remaining = 0;
  private onComplete: (() => void) | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  play(opts: PlayOptions): void {
    this.done = false;
    this.onComplete = opts.onComplete;

    const instanceIndex = new Map<string, number>();
    for (const cell of opts.state.board) {
      if (cell) instanceIndex.set(cell.instanceId, positionToIndex(cell.position));
    }

    const timelines = this.parse(opts.events, instanceIndex);
    if (timelines.length === 0) {
      this.finish();
      return;
    }

    this.remaining = timelines.length;
    const stagger = 90 / opts.speed;

    timelines.forEach((tl, i) => {
      this.scene.time.delayedCall(i * stagger, () => {
        if (this.done) return;
        this.animateVisitor(tl, opts);
      });
    });
  }

  private parse(
    events: PresentationEvent[],
    instanceIndex: Map<string, number>,
  ): Timeline[] {
    const map = new Map<string, Timeline>();
    const currentRoute = new Map<string, number>();
    let lastPurchase: Purchase | null = null;

    for (const ev of events) {
      switch (ev.type) {
        case "visitorSpawned": {
          map.set(ev.visitorId, {
            visitorId: ev.visitorId,
            sect: ev.sect,
            purchasesByRoute: new Map(),
            lastRouteIndex: -1,
          });
          break;
        }
        case "visitorMoved": {
          currentRoute.set(ev.visitorId, ev.routeIndex);
          break;
        }
        case "purchase": {
          const tl = map.get(ev.visitorId);
          if (!tl) break;
          const routeIndex = currentRoute.get(ev.visitorId) ?? 0;
          const cell = instanceIndex.get(ev.buildingInstanceId) ?? ENTRANCE_INDEX;
          const purchase: Purchase = { cell, amount: ev.amount, thunder: false };
          const arr = tl.purchasesByRoute.get(routeIndex) ?? [];
          arr.push(purchase);
          tl.purchasesByRoute.set(routeIndex, arr);
          if (routeIndex > tl.lastRouteIndex) tl.lastRouteIndex = routeIndex;
          lastPurchase = purchase;
          break;
        }
        case "thunder": {
          // thunder 紧跟在对应 purchase 之后
          if (lastPurchase) lastPurchase.thunder = true;
          break;
        }
        default:
          break;
      }
    }
    return [...map.values()];
  }

  private animateVisitor(tl: Timeline, opts: PlayOptions): void {
    const sect = SECT_DEFINITIONS[tl.sect];
    const start = cellCenter(ENTRANCE_INDEX);

    const person = this.scene.add.container(start.x, start.y);
    person.setDepth(ISO_DEPTH_BASE + isoRank(ENTRANCE_INDEX) * ISO_DEPTH_STEP + VISITOR_DEPTH_BIAS);
    const shadow = this.scene.add
      .image(0, 10, "shadow")
      .setAlpha(0.3)
      .setScale(0.55);
    const body = this.scene.add
      .image(0, 0, "person")
      .setTint(sect.color)
      .setScale(0.72)
      .setOrigin(0.5, 0.8);
    person.add([shadow, body]);
    this.persons.push(person);

    // 走路摆动（身体上下轻微起伏）
    const bob = this.scene.tweens.add({
      targets: body,
      y: -4,
      duration: 240 / opts.speed,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    // 只需走到最后一次消费的位置即可离场（无消费的游客快速走一小段后离开）
    const walkUntil =
      tl.lastRouteIndex >= 0
        ? Math.min(tl.lastRouteIndex + 1, ROUTE.length - 1)
        : Math.min(3, ROUTE.length - 1);
    const stepDur = 150 / opts.speed;
    let idx = 0;

    const cleanup = () => {
      bob.stop();
      person.destroy();
    };

    const stepTo = () => {
      if (this.done) {
        cleanup();
        return;
      }
      if (idx > walkUntil) {
        this.scene.tweens.add({
          targets: person,
          alpha: 0,
          y: person.y - 10,
          duration: 200 / opts.speed,
          onComplete: () => {
            cleanup();
            this.visitorDone();
          },
        });
        return;
      }
      const c = cellCenter(ROUTE[idx]);
      // 朝向：根据水平位移翻转
      if (c.x < person.x - 1) body.setFlipX(true);
      else if (c.x > person.x + 1) body.setFlipX(false);
      // 深度随所在格更新，保证与建筑的前后遮挡
      person.setDepth(
        ISO_DEPTH_BASE + isoRank(ROUTE[idx]) * ISO_DEPTH_STEP + VISITOR_DEPTH_BIAS,
      );
      this.scene.tweens.add({
        targets: person,
        x: c.x,
        y: c.y,
        duration: stepDur,
        ease: "Sine.easeInOut",
        onComplete: () => {
          if (this.done) {
            cleanup();
            return;
          }
          const purchases = tl.purchasesByRoute.get(idx);
          if (purchases) {
            for (const p of purchases) {
              const pc = cellCenter(p.cell);
              opts.onCoin?.(pc.x, pc.y, p.amount, p.thunder);
            }
            // 消费时开心一跳
            this.scene.tweens.add({
              targets: body,
              scaleX: 1.05,
              scaleY: 1.15,
              duration: 90 / opts.speed,
              yoyo: true,
            });
          }
          idx++;
          stepTo();
        },
      });
    };

    stepTo();
  }

  private visitorDone(): void {
    this.remaining -= 1;
    if (this.remaining <= 0) this.finish();
  }

  private finish(): void {
    if (this.done) return;
    this.done = true;
    for (const p of this.persons) {
      this.scene.tweens.killTweensOf(p);
      this.scene.tweens.killTweensOf(p.list);
      p.destroy();
    }
    this.persons = [];
    const cb = this.onComplete;
    this.onComplete = null;
    cb?.();
  }

  /** 跳过：立即结束动画。 */
  skip(): void {
    if (this.done) return;
    this.finish();
  }

  setSpeedNote(): void {
    /* 速度在下一次 play 时生效 */
  }
}
