import { describe, expect, it } from 'vitest';
import { TimeState } from '../apps/server/src/time-state';
import { readConfig } from '../apps/server/src/config';
describe('time state', () => {
  it('distinguishes initial failure, good, stale and recovery', () => {
    let mono = 0;
    const state = new TimeState(
      1000,
      () => {},
      () => mono,
    );
    expect(state.snapshot()).toMatchObject({
      quality: 'unavailable',
      value: null,
    });
    state.failure('NTP_UNAVAILABLE');
    expect(state.snapshot()).toMatchObject({ quality: 'error', value: null });
    const sample = {
      epochMs: 100000,
      monotonicMs: 0,
      offsetMs: 100,
      roundTripMs: 10,
      server: 'test',
    };
    state.success(sample);
    mono = 500;
    expect(state.snapshot()).toMatchObject({ quality: 'good', value: 100500 });
    mono = 1000;
    expect(state.snapshot().quality).toBe('stale');
    state.success({ ...sample, monotonicMs: 1000 });
    expect(state.snapshot().quality).toBe('good');
    state.failure('NTP_UNAVAILABLE');
    expect(state.snapshot()).toMatchObject({ quality: 'stale', value: 100000 });
  });
  it('does not use wall clock to advance a synchronized value', () => {
    let mono = 10;
    const state = new TimeState(
      1000,
      () => {},
      () => mono,
    );
    state.success({
      epochMs: 123456,
      monotonicMs: 10,
      offsetMs: 999999,
      roundTripMs: 1,
      server: 'test',
    });
    mono = 1010;
    expect(state.snapshot().value).toBe(124456);
  });
});
describe('configuration', () => {
  it('validates defaults', () =>
    expect(readConfig({}).CLOCK_TIMEZONE).toBe('Asia/Shanghai'));
  it.each([
    { PORT: '0' },
    { NTP_POLL_MS: '0' },
    { NTP_SERVERS: ',' },
    { CLOCK_TIMEZONE: 'invalid' },
    { NTP_STALE_MS: '30000', NTP_POLL_MS: '90000' },
  ])('rejects invalid input %o', (env) =>
    expect(() => readConfig(env)).toThrow(),
  );
});
