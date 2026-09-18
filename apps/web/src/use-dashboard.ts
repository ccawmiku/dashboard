import { useEffect, useState } from 'react';
import { readSnapshot, type CalibratedSnapshot } from './client';
export function useDashboard(enabled: boolean) {
  const [snapshot, setSnapshot] = useState<CalibratedSnapshot | null>(null);
  const [connected, setConnected] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!enabled) return;
    let disposed = false;
    let busy = false;
    let pending = false;
    let controller: AbortController | undefined;
    const refresh = async () => {
      if (disposed) return;
      if (busy) {
        pending = true;
        return;
      }
      busy = true;
      controller = new AbortController();
      const timeout = setTimeout(() => controller?.abort(), 8000);
      try {
        const next = await readSnapshot(controller.signal);
        if (!disposed) {
          setSnapshot(next);
          setConnected(true);
          setFailed(false);
        }
      } catch {
        if (!disposed) {
          setConnected(false);
          setFailed(true);
        }
      } finally {
        clearTimeout(timeout);
        busy = false;
        if (pending && !disposed) {
          pending = false;
          void refresh();
        }
      }
    };
    void refresh();
    const events = new EventSource('/api/v1/events');
    events.addEventListener('ready', refresh);
    events.addEventListener('invalidate', refresh);
    const visible = () => {
      if (!document.hidden) void refresh();
    };
    const offline = () => {
      setConnected(false);
    };
    document.addEventListener('visibilitychange', visible);
    window.addEventListener('online', refresh);
    window.addEventListener('offline', offline);
    const interval = setInterval(refresh, 30000);
    return () => {
      disposed = true;
      controller?.abort();
      events.close();
      clearInterval(interval);
      document.removeEventListener('visibilitychange', visible);
      window.removeEventListener('online', refresh);
      window.removeEventListener('offline', offline);
    };
  }, [enabled]);
  return { snapshot, connected, failed };
}
