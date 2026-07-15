/**
 * 轻量音频服务。
 * MVP 阶段无音频资源文件，使用 Web Audio 合成基础音效与背景音乐，
 * 保留 music / sfx 双通道音量。后续可替换为 Phaser Sound + 真实资源。
 * 需在用户首次交互后 unlock()。
 */

export type SfxName =
  | "ui"
  | "place"
  | "invalid"
  | "upgrade"
  | "income"
  | "thunder"
  | "negative"
  | "win"
  | "lose";

type SfxDef = { freq: number; type: OscillatorType; dur: number; gain: number };

const SFX: Record<SfxName, SfxDef> = {
  ui: { freq: 520, type: "square", dur: 0.06, gain: 0.25 },
  place: { freq: 660, type: "triangle", dur: 0.12, gain: 0.3 },
  invalid: { freq: 150, type: "sawtooth", dur: 0.14, gain: 0.25 },
  upgrade: { freq: 880, type: "triangle", dur: 0.18, gain: 0.3 },
  income: { freq: 1046, type: "sine", dur: 0.1, gain: 0.22 },
  thunder: { freq: 90, type: "sawtooth", dur: 0.3, gain: 0.35 },
  negative: { freq: 120, type: "square", dur: 0.35, gain: 0.3 },
  win: { freq: 784, type: "triangle", dur: 0.5, gain: 0.35 },
  lose: { freq: 196, type: "sawtooth", dur: 0.6, gain: 0.3 },
};

export class AudioService {
  private ctx: AudioContext | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicTimer: number | null = null;
  private unlocked = false;

  musicVolume = 0.5;
  sfxVolume = 0.7;

  unlock(): void {
    if (this.unlocked) return;
    try {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      this.ctx = new Ctor();
      this.musicGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();
      this.musicGain.gain.value = this.musicVolume * 0.4;
      this.sfxGain.gain.value = this.sfxVolume;
      this.musicGain.connect(this.ctx.destination);
      this.sfxGain.connect(this.ctx.destination);
      this.unlocked = true;
    } catch (err) {
      console.warn("[AudioService] 初始化失败：", err);
    }
  }

  setMusicVolume(v: number): void {
    this.musicVolume = Math.max(0, Math.min(1, v));
    if (this.musicGain) this.musicGain.gain.value = this.musicVolume * 0.4;
  }

  setSfxVolume(v: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, v));
    if (this.sfxGain) this.sfxGain.gain.value = this.sfxVolume;
  }

  playSfx(name: SfxName): void {
    if (!this.ctx || !this.sfxGain) return;
    const def = SFX[name];
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = def.type;
    osc.frequency.setValueAtTime(def.freq, now);
    if (name === "income" || name === "upgrade" || name === "win") {
      osc.frequency.exponentialRampToValueAtTime(def.freq * 1.5, now + def.dur);
    }
    if (name === "thunder" || name === "lose") {
      osc.frequency.exponentialRampToValueAtTime(def.freq * 0.5, now + def.dur);
    }
    g.gain.setValueAtTime(def.gain, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + def.dur);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + def.dur);
  }

  /** 简单的五声音阶背景循环。 */
  startMusic(): void {
    if (!this.ctx || !this.musicGain || this.musicTimer != null) return;
    const scale = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25];
    let step = 0;
    const beat = () => {
      if (!this.ctx || !this.musicGain) return;
      const now = this.ctx.currentTime;
      const freq = scale[step % scale.length];
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = "triangle";
      osc.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, now);
      g.gain.linearRampToValueAtTime(0.3, now + 0.05);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);
      osc.connect(g);
      g.connect(this.musicGain);
      osc.start(now);
      osc.stop(now + 0.5);
      // 偶尔加一个低八度根音
      if (step % 4 === 0) {
        const bass = this.ctx.createOscillator();
        const bg = this.ctx.createGain();
        bass.type = "sine";
        bass.frequency.value = scale[0] / 2;
        bg.gain.setValueAtTime(0.0001, now);
        bg.gain.linearRampToValueAtTime(0.25, now + 0.05);
        bg.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);
        bass.connect(bg);
        bg.connect(this.musicGain);
        bass.start(now);
        bass.stop(now + 0.7);
      }
      step++;
    };
    this.musicTimer = window.setInterval(beat, 500);
  }

  stopMusic(): void {
    if (this.musicTimer != null) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }

  suspend(): void {
    this.ctx?.suspend().catch(() => {});
  }

  resume(): void {
    this.ctx?.resume().catch(() => {});
  }
}

/** 全局单例。 */
export const audio = new AudioService();
