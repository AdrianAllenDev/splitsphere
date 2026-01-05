// Simple retro synth sound manager using Web Audio API

class SoundManager {
  private ctx: AudioContext | null = null;
  private enabled: boolean = false;

  constructor() {
    // Initialize on first user interaction to comply with browser autoplay policies
    window.addEventListener('click', () => this.init(), { once: true });
    window.addEventListener('touchstart', () => this.init(), { once: true });
  }

  private init() {
    if (this.ctx) return;
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    this.ctx = new AudioContext();
    this.enabled = true;
  }

  private playTone(freq: number, type: OscillatorType, duration: number, vol: number = 0.1) {
    if (!this.ctx || !this.enabled) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    
    gain.gain.setValueAtTime(vol, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  playSplit() {
    // High pitched "ping"
    this.playTone(600, 'square', 0.1, 0.1);
    setTimeout(() => this.playTone(800, 'square', 0.1, 0.1), 50);
  }

  playMerge() {
    // Lower "thud"
    this.playTone(200, 'sine', 0.2, 0.2);
  }

  playBounce() {
    // Very short "tick"
    this.playTone(400, 'triangle', 0.05, 0.05);
  }

  playBlackHoleAbsorb() {
    // Low rumble
    this.playTone(100, 'sawtooth', 0.3, 0.05);
  }

  playExplosion() {
    // Noise-like effect (simulated with multiple dissonant oscillators)
    this.playTone(100, 'sawtooth', 0.5, 0.2);
    this.playTone(150, 'square', 0.5, 0.2);
    this.playTone(80, 'sawtooth', 0.5, 0.2);
  }

  playGameOver() {
    // Descending tone
    this.playTone(400, 'sawtooth', 0.3, 0.2);
    setTimeout(() => this.playTone(300, 'sawtooth', 0.3, 0.2), 200);
    setTimeout(() => this.playTone(200, 'sawtooth', 0.6, 0.2), 400);
  }
}

export const soundManager = new SoundManager();

export const vibrate = (ms: number) => {
  if (navigator.vibrate) {
    navigator.vibrate(ms);
  }
};
