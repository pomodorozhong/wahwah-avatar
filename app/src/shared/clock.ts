// Maps a time on the audio context clock to a position in the utterance when
// the playback rate can change mid-play. Free of Web Audio, so it can be tested.

interface Segment {
  /** Context time at which this rate took effect. */
  at: number;
  /** Utterance position at that time, in seconds. */
  position: number;
  rate: number;
}

export class PlaybackClock {
  private segments: Segment[] = [];

  constructor(private readonly duration: number) {}

  /** Start playing from `position` at context time `at`. */
  start(at: number, position: number, rate: number): void {
    this.segments = [{ at, position, rate }];
  }

  /**
   * Change the rate from context time `at` on. Earlier segments are kept, since
   * the speakers lag the context clock and still play audio from before `at`.
   */
  setRate(at: number, rate: number): void {
    const last = this.segments.at(-1);
    if (!last) return;
    at = Math.max(at, last.at);
    this.segments.push({ at, position: this.positionAt(at), rate });
    // Keep a second of history; the output latency is far less than that.
    while (this.segments.length > 2 && this.segments[1].at < at - 1) this.segments.shift();
  }

  /** Utterance position heard at context time `t`, between 0 and the duration. */
  positionAt(t: number): number {
    let segment = this.segments[0];
    if (!segment) return 0;
    for (const s of this.segments) if (s.at <= t) segment = s;
    const position = segment.position + (t - segment.at) * segment.rate;
    return Math.min(this.duration, Math.max(0, position));
  }
}
