import type { ClockObservation } from '../../../packages/contracts/src/index';
import type {
  TimeSample,
  TimeSink,
} from '../../../packages/connector-sdk/src/index';
export class TimeState implements TimeSink {
  private sample?: TimeSample;
  private lastAttemptAt: number | null = null;
  private lastError: string | null = null;
  constructor(
    private staleMs: number,
    private changed: () => void = () => {},
    private mono: () => number = () => performance.now(),
  ) {}
  attempt(at: number) {
    this.lastAttemptAt = at;
  }
  success(sample: TimeSample) {
    this.sample = sample;
    this.lastError = null;
    this.changed();
  }
  failure(code: string) {
    this.lastError = code;
    this.changed();
  }
  snapshot(): ClockObservation {
    const ageMs = this.sample
      ? Math.max(0, this.mono() - this.sample.monotonicMs)
      : null;
    return {
      value: this.sample ? this.sample.epochMs + ageMs! : null,
      quality: this.sample
        ? this.lastError || ageMs! >= this.staleMs
          ? 'stale'
          : 'good'
        : this.lastError
          ? 'error'
          : 'unavailable',
      sampledAt: this.sample?.epochMs ?? null,
      ageMs,
      lastAttemptAt: this.lastAttemptAt,
      source: this.sample?.server ?? null,
      offsetMs: this.sample?.offsetMs ?? null,
      roundTripMs: this.sample?.roundTripMs ?? null,
      lastError: this.lastError,
    };
  }
}
