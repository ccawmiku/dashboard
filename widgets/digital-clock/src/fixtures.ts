import type {
  ClockObservation,
  WidgetInstance,
} from '../../../packages/contracts/src/index';
export const previewInstance: WidgetInstance = {
  id: 'clock-preview',
  type: 'digital-clock',
  version: 1,
  bindings: { time: 'dp_000001' },
  options: { title: '数字时钟', timezone: 'Asia/Shanghai' },
  position: { row: 0, column: 0 },
};
export function fixture(state: string): ClockObservation {
  const quality = ['good', 'stale', 'error', 'unavailable'].includes(state)
    ? (state as ClockObservation['quality'])
    : 'good';
  const available = quality === 'good' || quality === 'stale';
  return {
    value: available ? Date.UTC(2026, 8, 18, 1, 41, 0) : null,
    quality,
    sampledAt: available ? Date.UTC(2026, 8, 18, 1, 40) : null,
    ageMs: available ? 60000 : null,
    lastAttemptAt: null,
    source: available ? 'preview.example' : null,
    offsetMs: available ? 2 : null,
    roundTripMs: available ? 14 : null,
    lastError:
      quality === 'error' || quality === 'stale' ? 'NTP_UNAVAILABLE' : null,
  };
}
