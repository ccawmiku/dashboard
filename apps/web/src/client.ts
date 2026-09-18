import {
  snapshotSchema,
  type Snapshot,
} from '../../../packages/contracts/src/index';
export interface CalibratedSnapshot {
  data: Snapshot;
  anchorMonoMs: number;
}
export async function readSnapshot(
  signal: AbortSignal,
): Promise<CalibratedSnapshot> {
  const started = performance.now();
  const response = await fetch('/api/v1/snapshot', {
    cache: 'no-store',
    signal,
  });
  if (!response.ok) throw new Error('SNAPSHOT_FAILED');
  const data = snapshotSchema.parse(await response.json());
  const received = performance.now();
  for (const point of data.points)
    if (point.observation.value !== null)
      point.observation.value += (received - started) / 2;
  return { data, anchorMonoMs: received };
}
