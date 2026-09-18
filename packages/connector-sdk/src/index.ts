export interface TimeSample {
  epochMs: number;
  monotonicMs: number;
  offsetMs: number;
  roundTripMs: number;
  server: string;
}
export interface Connector {
  start(): void;
  stop(): Promise<void>;
}
export interface TimeSink {
  attempt(at: number): void;
  success(sample: TimeSample): void;
  failure(code: string): void;
}
