import { describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';
import { Store } from '../apps/server/src/store';
import { createApp } from '../apps/server/src/app';
import { readConfig } from '../apps/server/src/config';
import { snapshotSchema } from '../packages/contracts/src/index';
describe('storage and API', () => {
  it('retains the initialized configuration across reopen', () => {
    const root = resolve('.cache/test-databases');
    mkdirSync(root, { recursive: true });
    const dir = mkdtempSync(join(root, 'dashboard-test-'));
    if (!resolve(dir).startsWith(root + sep))
      throw new Error('Invalid test cleanup path');
    try {
      const first = new Store(join(dir, 'test.sqlite'), 'Asia/Shanghai');
      const before = first.board();
      first.close();
      const second = new Store(join(dir, 'test.sqlite'), 'UTC');
      expect(second.board()).toEqual(before);
      second.close();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
  it('returns a validated snapshot, health, and JSON 404', async () => {
    const { app, state } = await createApp(
      readConfig({ DATABASE_PATH: ':memory:', LOG_LEVEL: 'silent' }),
      { startConnector: false, staticRoot: 'nonexistent-static-root' },
    );
    try {
      expect((await app.inject('/healthz')).json()).toEqual({ status: 'ok' });
      expect((await app.inject('/readyz')).statusCode).toBe(200);
      let response = await app.inject('/api/v1/snapshot');
      expect(response.headers['cache-control']).toBe('no-store');
      expect(
        snapshotSchema.parse(response.json()).points[0].observation.quality,
      ).toBe('unavailable');
      state.success({
        epochMs: Date.UTC(2026, 0, 1),
        monotonicMs: performance.now(),
        offsetMs: 0,
        roundTripMs: 3,
        server: 'test',
      });
      response = await app.inject('/api/v1/snapshot');
      expect(
        snapshotSchema.parse(response.json()).points[0].observation.quality,
      ).toBe('good');
      expect((await app.inject('/api/nope')).json()).toEqual({
        error: { code: 'NOT_FOUND', message: '路径不存在' },
      });
    } finally {
      await app.close();
    }
  });
  it('sends ready and invalidates a live SSE connection', async () => {
    const { app, state } = await createApp(
      readConfig({ DATABASE_PATH: ':memory:', LOG_LEVEL: 'silent' }),
      { startConnector: false, staticRoot: 'nonexistent-static-root' },
    );
    const address = await app.listen({ host: '127.0.0.1', port: 0 });
    const controller = new AbortController();
    try {
      const response = await fetch(`${address}/api/v1/events`, {
        signal: controller.signal,
      });
      expect(response.headers.get('content-type')).toBe('text/event-stream');
      const reader = response.body!.getReader();
      expect(new TextDecoder().decode((await reader.read()).value)).toContain(
        'event: ready',
      );
      state.failure('NTP_UNAVAILABLE');
      expect(new TextDecoder().decode((await reader.read()).value)).toContain(
        'event: invalidate',
      );
      await reader.cancel();
    } finally {
      controller.abort();
      await app.close();
    }
  });
});
