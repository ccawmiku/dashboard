import type {
  ClockObservation,
  WidgetInstance,
} from '../../contracts/src/index';
export interface ClockWidgetProps {
  instance: WidgetInstance;
  observation: ClockObservation;
  anchorMonoMs: number;
  connected: boolean;
  preview?: boolean;
}
