/**
 * Glimwood Audio Engine
 *
 * Pure Web Audio API synthesis — no external sample files. All sounds are
 * generated procedurally so the game is fully self-contained.
 *
 * - SFX: oscillator-based blips with envelope shaping for that 8-bit feel.
 * - Music: simple chiptune loop with a melody on a square wave and a bass
 *   line on a triangle wave.
 */

type EnvelopeOptions = {
  attack?: number;
  decay?: number;
  sustain?: number;
  release?: number;
  peak?: number;
};

export class GlimwoodAudio {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private musicNodes: { osc: OscillatorNode; gain: GainNode }[] = [];
  private musicTimer: number | null = null;
  private musicEnabled = true;
  private sfxEnabled = true;
  private started = false;

  /** Must be called from a user gesture (click / keypress) to satisfy browser autoplay rules. */
  ensureStarted() {
    if (this.started) return;
    try {
      const AudioCtx =
        (window.AudioContext as typeof AudioContext) ||
        ((window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext as typeof AudioContext);
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.6;
      this.masterGain.connect(this.ctx.destination);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 0.8;
      this.sfxGain.connect(this.masterGain);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.22;
      this.musicGain.connect(this.masterGain);

      this.started = true;
    } catch {
      // Audio not available — silent fallback.
    }
  }

  setMusicEnabled(enabled: boolean) {
    this.musicEnabled = enabled;
    if (!enabled) this.stopMusic();
    else if (this.started) this.startMusic();
  }

  setSfxEnabled(enabled: boolean) {
    this.sfxEnabled = enabled;
  }

  private playTone(
    frequency: number,
    duration: number,
    type: OscillatorType = "square",
    options: EnvelopeOptions = {},
    destination?: AudioNode,
  ) {
    if (!this.ctx || !this.sfxGain) return;
    if (!this.sfxEnabled && !destination) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, now);

    const peak = options.peak ?? 0.5;
    const attack = options.attack ?? 0.005;
    const decay = options.decay ?? 0.05;
    const sustain = options.sustain ?? 0.3;
    const release = options.release ?? 0.1;

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(peak, now + attack);
    gain.gain.linearRampToValueAtTime(
      peak * sustain,
      now + attack + decay,
    );
    gain.gain.linearRampToValueAtTime(0, now + duration + release);

    osc.connect(gain);
    gain.connect(destination ?? this.sfxGain);
    osc.start(now);
    osc.stop(now + duration + release + 0.05);
  }

  jump() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    if (!this.sfxGain || !this.sfxEnabled) return;
    osc.type = "square";
    osc.frequency.setValueAtTime(420, now);
    osc.frequency.exponentialRampToValueAtTime(820, now + 0.12);
    gain.gain.setValueAtTime(0.0, now);
    gain.gain.linearRampToValueAtTime(0.35, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
    osc.connect(gain).connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  land() {
    this.playTone(180, 0.06, "triangle", { peak: 0.25, decay: 0.04, sustain: 0.0, release: 0.05 });
  }

  coin() {
    if (!this.ctx || !this.sfxGain || !this.sfxEnabled) return;
    const now = this.ctx.currentTime;
    [988, 1318].forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = "square";
      osc.frequency.setValueAtTime(freq, now + i * 0.04);
      gain.gain.setValueAtTime(0, now + i * 0.04);
      gain.gain.linearRampToValueAtTime(0.25, now + i * 0.04 + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.04 + 0.12);
      osc.connect(gain).connect(this.sfxGain!);
      osc.start(now + i * 0.04);
      osc.stop(now + i * 0.04 + 0.15);
    });
  }

  gem() {
    if (!this.ctx || !this.sfxGain || !this.sfxEnabled) return;
    const now = this.ctx.currentTime;
    [880, 1108, 1760].forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, now + i * 0.05);
      gain.gain.setValueAtTime(0, now + i * 0.05);
      gain.gain.linearRampToValueAtTime(0.28, now + i * 0.05 + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.05 + 0.25);
      osc.connect(gain).connect(this.sfxGain!);
      osc.start(now + i * 0.05);
      osc.stop(now + i * 0.05 + 0.3);
    });
  }

  enemyDefeat() {
    if (!this.ctx || !this.sfxGain || !this.sfxEnabled) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.2);
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    osc.connect(gain).connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.25);
  }

  hurt() {
    if (!this.ctx || !this.sfxGain || !this.sfxEnabled) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.linearRampToValueAtTime(110, now + 0.25);
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
    osc.connect(gain).connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.3);
  }

  checkpoint() {
    if (!this.ctx || !this.sfxGain || !this.sfxEnabled) return;
    [523, 659, 784, 1047].forEach((freq, i) => {
      this.playTone(freq, 0.08, "square", { peak: 0.22, release: 0.05 });
      const now = this.ctx!.currentTime + i * 0.06;
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = "square";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.22, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc.connect(gain).connect(this.sfxGain!);
      osc.start(now);
      osc.stop(now + 0.2);
    });
  }

  win() {
    if (!this.ctx || !this.sfxGain || !this.sfxEnabled) return;
    const notes = [523, 659, 784, 1047, 1319];
    notes.forEach((freq, i) => {
      const now = this.ctx!.currentTime + i * 0.12;
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = "square";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.3, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc.connect(gain).connect(this.sfxGain!);
      osc.start(now);
      osc.stop(now + 0.45);
    });
  }

  startMusic() {
    if (!this.musicEnabled || !this.ctx || !this.musicGain) return;
    this.stopMusic();

    // Lead melody (square) — looping 16-step chiptune in C minor pentatonic-ish.
    // Notes encoded as MIDI-ish frequencies (Hz).
    const melody = [
      392, 0, 523, 587, 659, 587, 523, 0,
      440, 523, 659, 784, 698, 659, 523, 0,
    ];
    // Bass line (triangle) — quarter notes.
    const bass = [131, 131, 175, 175, 196, 196, 175, 175];

    const stepDuration = 0.18; // seconds per step
    const startTime = this.ctx.currentTime + 0.05;

    // Schedule a few loops, then re-trigger via timer.
    const scheduleLoop = (baseTime: number) => {
      melody.forEach((freq, i) => {
        if (freq <= 0 || !this.ctx || !this.musicGain) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = "square";
        osc.frequency.value = freq;
        const t = baseTime + i * stepDuration;
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.18, t + 0.01);
        gain.gain.linearRampToValueAtTime(0.12, t + stepDuration * 0.6);
        gain.gain.linearRampToValueAtTime(0, t + stepDuration * 0.95);
        osc.connect(gain).connect(this.musicGain);
        osc.start(t);
        osc.stop(t + stepDuration);
        this.musicNodes.push({ osc, gain });
      });

      bass.forEach((freq, i) => {
        if (freq <= 0 || !this.ctx || !this.musicGain) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = "triangle";
        osc.frequency.value = freq;
        const t = baseTime + i * stepDuration * 2;
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.22, t + 0.01);
        gain.gain.linearRampToValueAtTime(0.16, t + stepDuration * 1.2);
        gain.gain.linearRampToValueAtTime(0, t + stepDuration * 1.9);
        osc.connect(gain).connect(this.musicGain);
        osc.start(t);
        osc.stop(t + stepDuration * 2);
        this.musicNodes.push({ osc, gain });
      });
    };

    const loopLength = melody.length * stepDuration;
    scheduleLoop(startTime);
    scheduleLoop(startTime + loopLength);

    // Re-schedule every loopLength ms to keep looping.
    this.musicTimer = window.setInterval(() => {
      if (!this.ctx || !this.musicEnabled) return;
      const t = this.ctx.currentTime + 0.05;
      scheduleLoop(t);
    }, loopLength * 1000);
  }

  stopMusic() {
    if (this.musicTimer !== null) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
    this.musicNodes.forEach(({ osc, gain }) => {
      try {
        osc.stop();
        osc.disconnect();
        gain.disconnect();
      } catch {
        // already stopped
      }
    });
    this.musicNodes = [];
  }

  dispose() {
    this.stopMusic();
    try {
      this.ctx?.close();
    } catch {
      // ignore
    }
    this.ctx = null;
    this.started = false;
  }
}
