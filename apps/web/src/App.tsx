import { useState } from 'react';
import { DigitalClock } from '../../../widgets/digital-clock/src/index';
import {
  fixture,
  previewInstance,
} from '../../../widgets/digital-clock/src/fixtures';
import { useDashboard } from './use-dashboard';
import { WidgetBoundary } from './WidgetBoundary';

export function App() {
  const params = new URLSearchParams(location.search);
  const preview = params.get('preview') === 'clock';
  const previewState = params.get('state') ?? 'good';
  const [anchor] = useState(performance.now());
  const { snapshot, connected, failed } = useDashboard(!preview);
  const data = snapshot?.data;
  const observation = data?.points[0]?.observation;
  const status = preview
    ? '模拟预览'
    : !snapshot
      ? failed
        ? '服务器连接失败'
        : '正在连接服务器'
      : !connected
        ? '连接中断'
        : {
            good: '所有数据源正常',
            stale: '时间同步已过期',
            error: '时间源暂不可用',
            unavailable: '正在同步时间',
          }[observation?.quality ?? 'unavailable'];
  return (
    <main className="shell">
      <header className="header">
        <a href="/" className="brand" aria-label="Dashboard 首页">
          <span className="brand-mark" aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
          </span>
          <span>
            dashboard<span className="brand-dot">.</span>
          </span>
        </a>
        <span className="edition">PERSONAL SPACE</span>
      </header>
      <section className="intro">
        <div>
          <p className="eyebrow">A LITTLE MORE IN SYNC</p>
          <h1>
            {preview ? '组件预览' : (data?.board.name ?? '我的看板')}
            <span className="title-dot">.</span>
          </h1>
          <p className="description">重要的信息，安静地待在这里。</p>
        </div>
        <div className="connection" role="status">
          <span
            className="connection-dot"
            data-ok={preview || (connected && observation?.quality === 'good')}
          />
          {status}
        </div>
      </section>
      <div className="section-label">
        <span>{preview ? '数字时钟 / 固定 1 × 1' : '概览'}</span>
        <span>{preview ? 'PREVIEW' : '01 WIDGET'}</span>
      </div>
      <section className="grid" aria-label="看板组件">
        {preview ? (
          <WidgetBoundary>
            <DigitalClock
              instance={previewInstance}
              observation={fixture(previewState)}
              anchorMonoMs={anchor}
              connected
              preview
            />
          </WidgetBoundary>
        ) : data ? (
          data.board.widgets.map((instance) => {
            const point = data.points.find(
              (p) => p.definition.id === instance.bindings.time,
            );
            if (
              instance.type !== 'digital-clock' ||
              instance.version !== 1 ||
              point?.definition.kind !== 'clock'
            )
              return (
                <div key={instance.id} className="error-card" role="alert">
                  组件配置不受支持
                </div>
              );
            return (
              <WidgetBoundary key={instance.id}>
                <DigitalClock
                  instance={instance}
                  observation={point.observation}
                  anchorMonoMs={snapshot!.anchorMonoMs}
                  connected={connected}
                />
              </WidgetBoundary>
            );
          })
        ) : (
          <div className="loading-card">
            <span className="loading-icon">◷</span>
            <p>{failed ? '暂时无法连接服务器' : '正在准备你的时钟'}</p>
            <small>
              {failed ? '连接恢复后将自动重试' : '从网络时间源开始'}
            </small>
          </div>
        )}
      </section>
      {preview && (
        <nav className="preview-nav" aria-label="预览状态">
          {[
            ['good', '正常'],
            ['stale', '过期'],
            ['error', '失败'],
            ['unavailable', '无数据'],
          ].map(([key, label]) => (
            <a
              key={key}
              href={`/?preview=clock&state=${key}`}
              aria-current={previewState === key ? 'page' : undefined}
            >
              {label}
            </a>
          ))}
          <p>模拟数据 · 不连接真实时间源</p>
        </nav>
      )}
      <footer>
        <span>留一点空间，给接下来的生活。</span>
        <span className="footer-version">
          DASHBOARD <span>/</span> V1.0.0
        </span>
      </footer>
    </main>
  );
}
