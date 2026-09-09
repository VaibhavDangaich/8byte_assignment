'use client';

import { Component, type ReactNode } from 'react';

type Props = { children: ReactNode };
type State = { failed: boolean };

export default class Decorative extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.warn('decorative element disabled', error);
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}
