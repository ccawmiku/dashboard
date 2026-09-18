import 'dotenv/config';
import { createApp } from './app';
import { readConfig } from './config';
const config = readConfig();
const { app } = await createApp(config);
await app.listen({ host: config.HOST, port: config.PORT });
let stopping = false;
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, async () => {
    if (stopping) return;
    stopping = true;
    await app.close();
  });
}
