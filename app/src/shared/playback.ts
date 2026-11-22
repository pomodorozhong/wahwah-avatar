// One playback timeline for audio and animation.
// The utterance is rendered to a buffer up front, so its start time on the
// AudioContext clock is known exactly; the face reads the same clock.

import { PlaybackClock } from './clock';

export class Player {
  readonly ctx: AudioContext;
  readonly analyser: AnalyserNode;
  private source: AudioBufferSourceNode | null = null;
  private buffer: AudioBuffer | null = null;
  private clock = new PlaybackClock(0);
  private rateValue = 1;
  private generation = 0;
  private disposed = false;
  private readonly meterBuf: Float32Array<ArrayBuffer>;
  onEnded: (() => void) | null = null;

  constructor() {
    this.ctx = new AudioContext({ latencyHint: 'interactive' });
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 1024;
    this.analyser.connect(this.ctx.destination);
    this.meterBuf = new Float32Array(this.analyser.fftSize);
  }

  get sampleRate(): number {
    return this.ctx.sampleRate;
  }

  get playing(): boolean {
    return this.source !== null;
  }

  /** Length of the loaded utterance in seconds, 0 before one is loaded. */
  get duration(): number {
    return this.buffer?.duration ?? 0;
  }

  /**
   * Playback speed: 1 is normal, 0.5 half speed. Audio follows the rate, so its
   * pitch shifts with it. A change during playback takes effect at once.
   */
  get rate(): number {
    return this.rateValue;
  }

  set rate(rate: number) {
    this.rateValue = rate;
    const src = this.source;
    if (!src) return;
    const at = this.ctx.currentTime;
    src.playbackRate.setValueAtTime(rate, at);
    this.clock.setRate(at, rate);
  }

  /** Stop any playback and keep `samples` as the utterance to play. */
  load(samples: Float32Array<ArrayBuffer>): void {
    this.stop();
    const buffer = this.ctx.createBuffer(1, Math.max(1, samples.length), this.ctx.sampleRate);
    buffer.copyToChannel(samples, 0);
    this.buffer = buffer;
  }

  /** Play the loaded utterance from `offset` seconds. */
  async play(offset = 0, leadSeconds = 0.03): Promise<void> {
    if (this.disposed || !this.buffer) return;
    this.stop();
    const generation = this.generation;
    if (this.ctx.state !== 'running') {
      try {
        await this.ctx.resume();
      } catch (error) {
        if (this.generation === generation) throw error;
        return;
      }
      // A different play, stop or mode switch may have occurred during resume().
      if (generation !== this.generation) return;
    }
    const buffer = this.buffer;
    offset = Math.min(Math.max(0, offset), buffer.duration);
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    src.playbackRate.value = this.rateValue;
    src.connect(this.analyser);
    const startTime = this.ctx.currentTime + leadSeconds;
    this.clock = new PlaybackClock(buffer.duration);
    this.clock.start(startTime, offset, this.rateValue);
    src.onended = () => {
      if (this.source !== src) return;
      this.source = null;
      src.disconnect();
      this.onEnded?.();
    };
    src.start(startTime, offset);
    this.source = src;
  }

  stop(): void {
    this.generation++;
    const src = this.source;
    if (!src) return;
    this.source = null;
    src.onended = null;
    try {
      src.stop();
    } catch {
      // Already stopped.
    }
    src.disconnect();
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.stop();
    this.onEnded = null;
    this.analyser.disconnect();
    if (this.ctx.state !== 'closed') void this.ctx.close();
  }

  /**
   * Seconds into the utterance, as heard at the speakers. Uses the output
   * timestamp so the face is not ahead of the audio by the output latency.
   * Null when nothing is playing.
   */
  position(): number | null {
    if (!this.source) return null;
    let audibleCtxTime = this.ctx.currentTime - (this.ctx.outputLatency || 0);
    const ts = this.ctx.getOutputTimestamp?.();
    if (ts && ts.contextTime !== undefined && ts.performanceTime !== undefined && ts.performanceTime > 0) {
      audibleCtxTime = ts.contextTime + (performance.now() - ts.performanceTime) / 1000;
    }
    return this.clock.positionAt(audibleCtxTime);
  }

  /** Output level (RMS) right now, from the analyser. */
  level(): number {
    this.analyser.getFloatTimeDomainData(this.meterBuf);
    let sum = 0;
    for (const v of this.meterBuf) sum += v * v;
    return Math.sqrt(sum / this.meterBuf.length);
  }
}
