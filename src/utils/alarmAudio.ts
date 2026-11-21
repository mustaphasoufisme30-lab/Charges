/**
 * Synthesizes an unmistakable dual-tone Android alarm pattern using Web Audio API.
 * Gracefully handles autoplay restrictions without throwing unhandled errors.
 */
class AlarmAudioController {
  private ctx: AudioContext | null = null;
  private timerId: number | null = null;
  private isPlaying = false;

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;
    if (!this.ctx) {
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private playPulse(): void {
    const ctx = this.ensureContext();
    if (!ctx || ctx.state !== 'running') return;

    const now = ctx.currentTime;
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.001, now);
    masterGain.connect(ctx.destination);

    // Classic 3-beep high-urgency Android alarm burst (880Hz + 1174.66Hz)
    const beeps = [0, 0.16, 0.32];
    for (const offset of beeps) {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const env = ctx.createGain();

      osc1.type = 'triangle';
      osc2.type = 'sine';
      osc1.frequency.setValueAtTime(880, now + offset);
      osc2.frequency.setValueAtTime(1174.66, now + offset);

      env.gain.setValueAtTime(0.0001, now + offset);
      env.gain.exponentialRampToValueAtTime(0.18, now + offset + 0.015);
      env.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.12);

      osc1.connect(env);
      osc2.connect(env);
      env.connect(masterGain);

      osc1.start(now + offset);
      osc2.start(now + offset);
      osc1.stop(now + offset + 0.13);
      osc2.stop(now + offset + 0.13);
    }
  }

  public start(): void {
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.playPulse();
    this.timerId = window.setInterval(() => {
      if (this.isPlaying) {
        this.playPulse();
      }
    }, 950);
  }

  public stop(): void {
    this.isPlaying = false;
    if (this.timerId !== null) {
      window.clearInterval(this.timerId);
      this.timerId = null;
    }
  }
}

export const alarmAudio = new AlarmAudioController();
