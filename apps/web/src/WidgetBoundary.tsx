import { Component, type ReactNode } from 'react';
export class WidgetBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <div className="error-card" role="alert">
        组件暂时无法显示
      </div>
    ) : (
      this.props.children
    );
  }
}
