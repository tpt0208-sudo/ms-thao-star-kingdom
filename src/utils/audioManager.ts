import { AudioSettings } from '../types';

const STORAGE_KEY = 'star_kingdom_audio_settings';

export const DEFAULT_AUDIO_SETTINGS: AudioSettings = {
  masterSound: true,
  clickSound: false, // Default false as required to prevent disturbance
  starSound: true,
  celebrationSound: true,
  toolsSound: true,
  volume: 0.7,
};

class AudioManagerService {
  private settings: AudioSettings;
  private audioCtx: AudioContext | null = null;
  private lastClickTime = 0;
  private clickDebounceMs = 85;
  private listeners: Set<(settings: AudioSettings) => void> = new Set();
  private activeSources: Set<AudioNode> = new Set();

  constructor() {
    this.settings = this.loadSettings();
  }

  private loadSettings(): AudioSettings {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return { ...DEFAULT_AUDIO_SETTINGS, ...JSON.parse(stored) };
      }
    } catch (e) {
      console.debug('Failed to load audio settings from localStorage:', e);
    }
    return { ...DEFAULT_AUDIO_SETTINGS };
  }

  public getSettings(): AudioSettings {
    return { ...this.settings };
  }

  public updateSettings(partial: Partial<AudioSettings>): AudioSettings {
    this.settings = { ...this.settings, ...partial };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
    } catch (e) {
      console.debug('Failed to save audio settings:', e);
    }
    this.listeners.forEach((fn) => fn(this.settings));
    return this.settings;
  }

  public subscribe(listener: (settings: AudioSettings) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private getContext(): AudioContext | null {
    try {
      if (!this.audioCtx) {
        const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtxClass) {
          this.audioCtx = new AudioCtxClass();
        }
      }
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      return this.audioCtx;
    } catch (e) {
      console.debug('Web Audio not supported:', e);
      return null;
    }
  }

  /**
   * 1. Âm thanh click nhẹ, đáng yêu (Soft friendly bubble / wooden droplet)
   */
  public playClick(force = false): void {
    if (!force) {
      if (!this.settings.masterSound || !this.settings.clickSound) return;
    }
    const now = Date.now();
    if (now - this.lastClickTime < this.clickDebounceMs) return;
    this.lastClickTime = now;

    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const vol = this.settings.volume * 0.16;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      // Crisp subtle pop: 850Hz drops swiftly to 440Hz in 40ms
      osc.frequency.setValueAtTime(860, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(420, ctx.currentTime + 0.045);

      gain.gain.setValueAtTime(vol, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.05);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.055);
    } catch (e) {
      console.debug('Click sound failed:', e);
    }
  }

  /**
   * 2. Âm thanh thưởng sao (Twinkling star chime & bell harmony)
   */
  public playStarReward(force = false): void {
    if (!force) {
      if (!this.settings.masterSound || !this.settings.starSound) return;
    }

    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const vol = this.settings.volume * 0.22;
      // High celestial chord: C6 (1046.5), E6 (1318.5), G6 (1567.98), B6 (1975.5), C7 (2093.0)
      const notes = [1046.5, 1318.5, 1567.98, 1975.5, 2093.0];

      notes.forEach((freq, idx) => {
        const startTime = ctx.currentTime + idx * 0.055;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0.001, startTime);
        gain.gain.linearRampToValueAtTime(vol, startTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.45);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + 0.5);
      });
    } catch (e) {
      console.debug('Star reward sound failed:', e);
    }
  }

  /**
   * 3. Âm thanh vinh danh (Triumphant celebratory royal fanfare)
   */
  public playCelebration(force = false): void {
    if (!force) {
      if (!this.settings.masterSound || !this.settings.celebrationSound) return;
    }

    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const vol = this.settings.volume * 0.24;

      // Fanfare sequence: G4, C5, E5, G5, long C6
      const fanfare = [
        { freq: 392.0, time: 0.0, dur: 0.12 },
        { freq: 523.25, time: 0.12, dur: 0.14 },
        { freq: 659.25, time: 0.26, dur: 0.14 },
        { freq: 783.99, time: 0.4, dur: 0.22 },
        { freq: 1046.5, time: 0.65, dur: 0.8 },
      ];

      fanfare.forEach((note) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(note.freq, ctx.currentTime + note.time);

        gain.gain.setValueAtTime(0.001, ctx.currentTime + note.time);
        gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + note.time + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + note.time + note.dur);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(ctx.currentTime + note.time);
        osc.stop(ctx.currentTime + note.time + note.dur + 0.05);
      });

      // Shimmering high sparkles along with celebration
      const sparkles = [1318.5, 1567.98, 2093.0, 2637.0];
      sparkles.forEach((freq, idx) => {
        const startTime = ctx.currentTime + 0.7 + idx * 0.07;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0.001, startTime);
        gain.gain.linearRampToValueAtTime(vol * 0.7, startTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + 0.4);
      });
    } catch (e) {
      console.debug('Celebration sound failed:', e);
    }
  }

  /**
   * 4. Âm thanh bộ công cụ (Countdown tick, spin click, ding)
   */
  public playToolSound(type: 'tick' | 'ding' | 'spin', force = false): void {
    if (!force) {
      if (!this.settings.masterSound || !this.settings.toolsSound) return;
    }

    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const vol = this.settings.volume * 0.18;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      if (type === 'tick') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(900, ctx.currentTime);
        gain.gain.setValueAtTime(vol * 0.6, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.03);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.04);
      } else if (type === 'ding') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(1046.5, ctx.currentTime);
        gain.gain.setValueAtTime(vol, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.65);
      } else if (type === 'spin') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(550, ctx.currentTime);
        gain.gain.setValueAtTime(vol * 0.7, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.06);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.07);
      }

      osc.connect(gain);
      gain.connect(ctx.destination);
    } catch (e) {
      console.debug('Tool sound failed:', e);
    }
  }

  public stopAll(): void {
    if (this.audioCtx && this.audioCtx.state === 'running') {
      try {
        this.audioCtx.suspend();
      } catch (e) {
        console.debug('Suspend error:', e);
      }
    }
  }
}

export const audioManager = new AudioManagerService();
