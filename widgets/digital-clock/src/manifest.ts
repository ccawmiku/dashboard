import type { WidgetManifest } from '../../../packages/contracts/src/index';
export const clockManifest: WidgetManifest = {
  type: 'digital-clock',
  version: 1,
  name: '数字时钟',
  size: { width: 1, height: 1 },
  inputs: { time: { kind: 'clock', required: true } },
};
