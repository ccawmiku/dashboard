import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { ServerResponse } from 'node:http';
import {
  clockPoint,
  snapshotSchema,
} from '../../../packages/contracts/src/index';
import { clockManifest } from '../../../widgets/digital-clock/src/manifest';
import type { Config } from './config';
import { Store } from './store';
import { TimeState } from './time-state';
import {
  NtpConnector,
  type QueryTime,
} from '../../../connectors/ntp/src/index';

export async function createApp(
  config: Config,
  options: {
    query?: QueryTime;
    startConnector?: boolean;
    staticRoot?: string;
  } = {},
) {
  const app = Fastify({ logger: { level: config.LOG_LEVEL } });
  const store = new Store(config.DATABASE_PATH, config.CLOCK_TIMEZONE);
  const clients = new Set<ServerResponse>();
  const broadcast = () => {
    for (const response of clients) {
      if (!response.write('event: invalidate\ndata: {}\n\n')) {
        response.end();
        clients.delete(response);
      }
    }
  };
  const state = new TimeState(config.NTP_STALE_MS, broadcast);
  const connector = new NtpConnector(
    {
      servers: config.NTP_SERVERS,
      port: config.NTP_PORT,
      timeoutMs: config.NTP_TIMEOUT_MS,
      pollMs: config.NTP_POLL_MS,
    },
    {
      attempt: (at) => state.attempt(at),
      success: (sample) => {
        store.saveSample(sample);
        state.success(sample);
        app.log.info(
          {
            source: sample.server,
            offsetMs: sample.offsetMs,
            roundTripMs: sample.roundTripMs,
          },
          'NTP synchronized',
        );
      },
      failure: (code) => {
        state.failure(code);
        app.log.warn({ code }, 'NTP synchronization failed');
      },
    },
    options.query,
  );
  app.get('/healthz', async () => ({ status: 'ok' }));
  app.get('/readyz', async () => ({ status: 'ready' }));
  app.get('/api/v1/snapshot', async (_request, reply) => {
    reply.header('Cache-Control', 'no-store');
    return snapshotSchema.parse({
      schemaVersion: 1,
      board: store.board(),
      widgets: [clockManifest],
      points: [{ definition: clockPoint, observation: state.snapshot() }],
    });
  });
  app.get('/api/v1/events', (request, reply) => {
    reply.hijack();
    const response = reply.raw;
    response.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    response.write('retry: 3000\nevent: ready\ndata: {}\n\n');
    clients.add(response);
    const heartbeat = setInterval(() => {
      if (!response.write(': heartbeat\n\n')) response.end();
    }, 15000);
    heartbeat.unref();
    request.raw.on('close', () => {
      clearInterval(heartbeat);
      clients.delete(response);
    });
  });
  const staticRoot = options.staticRoot ?? resolve('dist/web');
  if (existsSync(staticRoot))
    await app.register(fastifyStatic, { root: staticRoot, wildcard: true });
  app.setNotFoundHandler((_request, reply) =>
    reply
      .code(404)
      .send({ error: { code: 'NOT_FOUND', message: '路径不存在' } }),
  );
  app.setErrorHandler((error, _request, reply) => {
    app.log.error(error);
    reply
      .code(500)
      .send({ error: { code: 'INTERNAL_ERROR', message: '服务暂时不可用' } });
  });
  app.addHook('preClose', async () => {
    for (const client of clients) client.end();
    clients.clear();
  });
  app.addHook('onClose', async () => {
    await connector.stop();
    store.close();
  });
  await app.ready();
  if (options.startConnector !== false) connector.start();
  return { app, state, store, connector };
}
