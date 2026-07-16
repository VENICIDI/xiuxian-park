import Phaser from "phaser";
import { DESIGN_HEIGHT, DESIGN_WIDTH } from "./config";

/**
 * 高分屏（HiDPI）清晰度：
 * Phaser 的 Scale.FIT 会把画布后备缓冲固定为游戏逻辑尺寸（1280×720），
 * 再由 CSS 放大到实际窗口 → 在大屏 / 系统缩放（devicePixelRatio>1）下整体发虚。
 *
 * 解决办法（超采样）：
 *   1) 画布后备缓冲放大 SUPERSAMPLE 倍（main.ts 里把 game width/height ×SS）；
 *   2) 每个场景主相机 setZoom(SS) 把 1280×720 逻辑世界放大填满高分画布；
 *   3) 所有 Text 以 SS 分辨率渲染（main.ts 全局补丁），避免相机放大导致文字糊。
 * 逻辑坐标仍是 1280×720，输入 worldX/worldY 由相机换算，业务代码无需改动。
 */
export const SUPERSAMPLE: number = (() => {
  const dpr =
    typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
  return Math.min(3, Math.max(2, Math.ceil(dpr * 1.5)));
})();

/** 让场景主相机把 1280×720 逻辑世界放大 SUPERSAMPLE 倍并居中填满画布。 */
export function applyHiDpiCamera(scene: Phaser.Scene): void {
  const cam = scene.cameras.main;
  cam.setZoom(SUPERSAMPLE);
  cam.centerOn(DESIGN_WIDTH / 2, DESIGN_HEIGHT / 2);
}
