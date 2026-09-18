import { useEffect, useState } from 'react';
import type { ClockWidgetProps } from '../../../packages/widget-sdk/src/index';
import { Card } from '../../../packages/ui/src/Card';
import styles from './clock.module.css';

export function DigitalClock({
  instance,
  observation,
  anchorMonoMs,
  connected,
}: ClockWidgetProps) {
  const [tick, setTick] = useState(performance.now());
  useEffect(() => {
    const timer = setInterval(() => setTick(performance.now()), 250);
    return () => clearInterval(timer);
  }, []);
  const now =
    observation.value === null
      ? null
      : new Date(observation.value + Math.max(0, tick - anchorMonoMs));
  const zone = instance.options.timezone;
  const time = now
    ? new Intl.DateTimeFormat('en-GB', {
        timeZone: zone,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h23',
      }).format(now)
    : '--:--:--';
  const [hours, minutes, seconds] = time.split(':');
  const date = now
    ? new Intl.DateTimeFormat('zh-CN', {
        timeZone: zone,
        month: 'long',
        day: 'numeric',
        weekday: 'long',
      }).format(now)
    : '等待首次时间同步';
  const quality = connected ? observation.quality : 'offline';
  const label = {
    good: '已同步',
    stale: '同步过期',
    error: '同步失败',
    unavailable: '正在同步',
    offline: '连接中断',
  }[quality];
  return (
    <Card label={instance.options.title}>
      <div className={styles.top}>
        <span className={styles.title} title={instance.options.title}>
          {instance.options.title}
        </span>
        <span className={styles.icon} aria-hidden="true">
          ◷
        </span>
      </div>
      <div className={styles.center}>
        <time
          className={styles.time}
          dateTime={now?.toISOString()}
          data-testid="clock-time"
          aria-label={now ? `${time}，${zone}` : '尚未获得网络时间'}
        >
          <span>
            {hours}
            <span className={styles.colon}>:</span>
            {minutes}
          </span>
          <span className={styles.seconds}>{seconds}</span>
        </time>
        <div className={styles.date} data-testid="clock-date">
          {date}
        </div>
      </div>
      <div className={styles.bottom}>
        <span className={styles.zone}>{zone.replaceAll('_', ' ')}</span>
        <span className={styles.status} data-quality={quality} role="status">
          <i aria-hidden="true" />
          {label}
        </span>
      </div>
    </Card>
  );
}
