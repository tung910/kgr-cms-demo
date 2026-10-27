import { Component, type ErrorInfo, type ReactNode } from 'react';

interface MapErrorBoundaryProps {
  fallback: ReactNode;
  children: ReactNode;
}

// Third-party map failures (rejected key, blocked script) must not take the
// whole page down: the ranking table and filters stay usable.
export class MapErrorBoundary extends Component<
  MapErrorBoundaryProps,
  { failed: boolean }
> {
  override state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Device map failed', error, info.componentStack);
  }

  override render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
