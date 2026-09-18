import 'dotenv/config';
import { queryTime } from '../connectors/ntp/src/index';
import { readConfig } from '../apps/server/src/config';
const config = readConfig();
let success = false;
for (const server of config.NTP_SERVERS) {
  try {
    const sample = await queryTime(
      server,
      config.NTP_PORT,
      config.NTP_TIMEOUT_MS,
    );
    console.log(
      JSON.stringify({
        server,
        utc: new Date(sample.epochMs).toISOString(),
        offsetMs: sample.offsetMs,
        roundTripMs: sample.roundTripMs,
      }),
    );
    success = true;
  } catch {
    console.log(JSON.stringify({ server, status: 'unavailable' }));
  }
}
if (!success) process.exitCode = 1;
