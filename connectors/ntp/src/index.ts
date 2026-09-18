import * as Sntp from '@hapi/sntp';
import type {
  Connector,
  TimeSample,
  TimeSink,
} from '../../../packages/connector-sdk/src/index';

export interface NtpOptions {
  servers: string[];
  port: number;
  timeoutMs: number;
  pollMs: number;
}
export type QueryTime = (
  server: string,
  port: number,
  timeoutMs: number,
) => Promise<TimeSample>;

export const queryTime: QueryTime = async (server, port, timeoutMs) => {
  const wallStart = Date.now();
  const monoStart = performance.now();
  const result = await Sntp.time({
    host: server,
    port,
    timeout: timeoutMs,
    resolveReference: false,
  });
  const monoEnd = performance.now();
  const wallEnd = Date.now();
  if (Math.abs(wallEnd - wallStart - (monoEnd - monoStart)) > 100)
    throw new Error('SYSTEM_CLOCK_CHANGED');
  if (
    !result.isValid ||
    !['primary', 'secondary'].includes(result.stratum) ||
    result.leapIndicator === 'alarm' ||
    !Number.isFinite(result.t) ||
    !Number.isFinite(result.d) ||
    result.d < -2 ||
    result.d > timeoutMs
  )
    throw new Error('INVALID_NTP_RESULT');
  return {
    epochMs: wallEnd + result.t,
    monotonicMs: monoEnd,
    offsetMs: result.t,
    roundTripMs: Math.max(0, result.d),
    server,
  };
};

export class NtpConnector implements Connector {
  private stopped = true;
  private timer?: ReturnType<typeof setTimeout>;
  private running?: Promise<void>;
  private failures = 0;
  constructor(
    private options: NtpOptions,
    private sink: TimeSink,
    private query: QueryTime = queryTime,
  ) {}
  start() {
    if (!this.stopped) return;
    this.stopped = false;
    this.schedule(0);
  }
  private schedule(ms: number) {
    this.timer = setTimeout(() => {
      this.running = this.poll().finally(() => {
        this.running = undefined;
        if (!this.stopped)
          this.schedule(
            this.failures
              ? Math.min(300000, 30000 * 2 ** Math.min(this.failures - 1, 4))
              : this.options.pollMs,
          );
      });
    }, ms);
  }
  private async poll() {
    this.sink.attempt(Date.now());
    for (const server of this.options.servers) {
      try {
        const sample = await this.query(
          server,
          this.options.port,
          this.options.timeoutMs,
        );
        if (this.stopped) return;
        this.failures = 0;
        this.sink.success(sample);
        return;
      } catch {
        if (this.stopped) return;
      }
    }
    this.failures++;
    this.sink.failure('NTP_UNAVAILABLE');
  }
  async stop() {
    this.stopped = true;
    clearTimeout(this.timer);
    await this.running;
  }
}
