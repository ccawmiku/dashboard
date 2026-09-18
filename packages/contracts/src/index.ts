import { z } from 'zod';

export const timezoneSchema = z.string().refine((value) => {
  try {
    new Intl.DateTimeFormat('zh-CN', { timeZone: value });
    return true;
  } catch {
    return false;
  }
}, '必须使用有效 IANA 时区');
export const qualitySchema = z.enum(['good', 'stale', 'error', 'unavailable']);
export const definitionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  kind: z.literal('clock'),
  unit: z.literal('unix-ms'),
  sourceId: z.string().min(1),
});
export const observationSchema = z.object({
  value: z.number().finite().nullable(),
  quality: qualitySchema,
  sampledAt: z.number().finite().nullable(),
  ageMs: z.number().nonnegative().nullable(),
  lastAttemptAt: z.number().finite().nullable(),
  source: z.string().nullable(),
  offsetMs: z.number().finite().nullable(),
  roundTripMs: z.number().finite().nullable(),
  lastError: z.string().nullable(),
});
export const manifestSchema = z.object({
  type: z.string(),
  version: z.number().int().positive(),
  name: z.string(),
  size: z.object({
    width: z.union([z.literal(1), z.literal(2)]),
    height: z.union([z.literal(1), z.literal(2)]),
  }),
  inputs: z.record(
    z.string(),
    z.object({ kind: z.literal('clock'), required: z.boolean() }),
  ),
});
export const instanceSchema = z.object({
  id: z.string(),
  type: z.string(),
  version: z.number().int().positive(),
  bindings: z.record(z.string(), z.string()),
  options: z.object({
    title: z.string().min(1).max(60),
    timezone: timezoneSchema,
  }),
  position: z.object({
    column: z.number().int().nonnegative(),
    row: z.number().int().nonnegative(),
  }),
});
export const boardSchema = z.object({
  id: z.string(),
  name: z.string(),
  widgets: z.array(instanceSchema),
});
export const snapshotSchema = z.object({
  schemaVersion: z.literal(1),
  board: boardSchema,
  widgets: z.array(manifestSchema),
  points: z.array(
    z.object({ definition: definitionSchema, observation: observationSchema }),
  ),
});
export type ClockObservation = z.infer<typeof observationSchema>;
export type PointDefinition = z.infer<typeof definitionSchema>;
export type WidgetManifest = z.infer<typeof manifestSchema>;
export type WidgetInstance = z.infer<typeof instanceSchema>;
export type Board = z.infer<typeof boardSchema>;
export type Snapshot = z.infer<typeof snapshotSchema>;
export const clockPoint: PointDefinition = {
  id: 'dp_000001',
  name: '网络标准时间',
  kind: 'clock',
  unit: 'unix-ms',
  sourceId: 'ntp-primary',
};
