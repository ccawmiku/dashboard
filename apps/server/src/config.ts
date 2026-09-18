import { z } from 'zod';
import { timezoneSchema } from '../../../packages/contracts/src/index';
const integer = (fallback: number, min: number, max: number) =>
  z.coerce.number().int().min(min).max(max).default(fallback);
const schema = z
  .object({
    HOST: z.string().default('127.0.0.1'),
    PORT: integer(3000, 1, 65535),
    DATABASE_PATH: z.string().min(1).default('data/dashboard.sqlite'),
    NTP_SERVERS: z
      .string()
      .default('ntp.aliyun.com,time.cloudflare.com')
      .transform((s) =>
        s
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      )
      .pipe(
        z
          .array(z.string().regex(/^[a-zA-Z0-9.-]+$/))
          .min(1)
          .max(8),
      ),
    NTP_PORT: integer(123, 1, 65535),
    NTP_TIMEOUT_MS: integer(3000, 100, 10000),
    NTP_POLL_MS: integer(300000, 30000, 86400000),
    NTP_STALE_MS: integer(900000, 30000, 172800000),
    CLOCK_TIMEZONE: timezoneSchema.default('Asia/Shanghai'),
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),
  })
  .refine(
    (c) => c.NTP_STALE_MS >= c.NTP_POLL_MS,
    'NTP_STALE_MS must be >= NTP_POLL_MS',
  );
export const readConfig = (env: NodeJS.ProcessEnv = process.env) =>
  schema.parse(env);
export type Config = ReturnType<typeof readConfig>;
