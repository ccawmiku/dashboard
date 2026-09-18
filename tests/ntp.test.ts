import { afterEach, describe, expect, it, vi } from 'vitest';
import { NtpConnector, queryTime } from '../connectors/ntp/src/index';
import { fakeNtp } from './helpers/ntp-server';

describe('NTP UDP protocol', () => {
  it('measures a real UDP response with an offset', async () => {
    const server = await fakeNtp({ offsetMs: 5000 });
    try {
      const sample = await queryTime('127.0.0.1', server.port, 1000);
      expect(sample.offsetMs).toBeCloseTo(5000, -2);
      expect(sample.epochMs - Date.now()).toBeGreaterThan(4800);
    } finally {
      await server.close();
    }
  });
  it.each([{ invalid: true }, { stratum: 0 }, { alarm: true }])(
    'rejects untrusted protocol status %o',
    async (options) => {
      const server = await fakeNtp(options);
      try {
        await expect(
          queryTime('127.0.0.1', server.port, 200),
        ).rejects.toThrow();
      } finally {
        await server.close();
      }
    },
  );
  it('bounds a silent server by timeout', async () => {
    const server = await fakeNtp({ silent: true });
    try {
      await expect(queryTime('127.0.0.1', server.port, 100)).rejects.toThrow();
    } finally {
      await server.close();
    }
  });
});

describe('connector lifecycle', () => {
  afterEach(() => vi.useRealTimers());
  it('falls back, does not overlap, and stops future work', async () => {
    vi.useFakeTimers();
    const sink = { attempt: vi.fn(), success: vi.fn(), failure: vi.fn() };
    const sample = {
      epochMs: 1,
      monotonicMs: 0,
      offsetMs: 0,
      roundTripMs: 1,
      server: 'b',
    };
    const query = vi
      .fn()
      .mockRejectedValueOnce(new Error('timeout'))
      .mockResolvedValue(sample);
    const connector = new NtpConnector(
      { servers: ['a', 'b'], port: 123, timeoutMs: 100, pollMs: 300000 },
      sink,
      query,
    );
    connector.start();
    connector.start();
    await vi.advanceTimersByTimeAsync(1);
    expect(query).toHaveBeenCalledTimes(2);
    expect(sink.success).toHaveBeenCalledWith(sample);
    await connector.stop();
    await vi.advanceTimersByTimeAsync(600000);
    expect(query).toHaveBeenCalledTimes(2);
  });
  it('backs off failures then recovers', async () => {
    vi.useFakeTimers();
    const sink = { attempt: vi.fn(), success: vi.fn(), failure: vi.fn() };
    const query = vi
      .fn()
      .mockRejectedValueOnce(new Error('timeout'))
      .mockResolvedValue({
        epochMs: 1,
        monotonicMs: 0,
        offsetMs: 0,
        roundTripMs: 1,
        server: 'a',
      });
    const connector = new NtpConnector(
      { servers: ['a'], port: 123, timeoutMs: 100, pollMs: 300000 },
      sink,
      query,
    );
    connector.start();
    await vi.advanceTimersByTimeAsync(1);
    expect(sink.failure).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(29998);
    expect(query).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(2);
    expect(sink.success).toHaveBeenCalledOnce();
    await connector.stop();
  });
  it('does not publish after stop while a query is pending', async () => {
    vi.useFakeTimers();
    let release!: (sample: {
      epochMs: number;
      monotonicMs: number;
      offsetMs: number;
      roundTripMs: number;
      server: string;
    }) => void;
    const query = vi.fn(
      () =>
        new Promise<Parameters<typeof release>[0]>((resolve) => {
          release = resolve;
        }),
    );
    const sink = { attempt: vi.fn(), success: vi.fn(), failure: vi.fn() };
    const connector = new NtpConnector(
      { servers: ['a'], port: 123, timeoutMs: 100, pollMs: 300000 },
      sink,
      query,
    );
    connector.start();
    await vi.advanceTimersByTimeAsync(1);
    const stopped = connector.stop();
    release({
      epochMs: 1,
      monotonicMs: 0,
      offsetMs: 0,
      roundTripMs: 1,
      server: 'a',
    });
    await stopped;
    expect(sink.success).not.toHaveBeenCalled();
  });
});
