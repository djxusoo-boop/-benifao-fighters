"use client";

import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";

type Props = { children: (resetKey: number) => ReactNode };
type State = { error: string | null; resetKey: number };

export const LAST_ERROR_KEY = "hardcore-last-error";

// If anything in the game throws, show a recovery card instead of a blank
// white page, and remember what failed so it can be fixed.
export default class GameErrorBoundary extends Component<Props, State> {
  state: State = { error: null, resetKey: 0 };

  static getDerivedStateFromError(error: unknown): Partial<State> {
    return { error: error instanceof Error ? error.message : String(error) };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    try {
      const detail = `${new Date().toISOString()} · ${error instanceof Error ? `${error.message}\n${error.stack ?? ""}` : String(error)}\n${info.componentStack ?? ""}`;
      window.localStorage.setItem(LAST_ERROR_KEY, detail.slice(0, 4000));
    } catch { /* Storage is optional. */ }
  }

  private restart = () => this.setState((state) => ({ error: null, resetKey: state.resetKey + 1 }));

  render() {
    if (this.state.error) {
      return (
        <main className="game-crash-card" role="alert">
          <strong>¡UPS! ALGO HA FALLADO</strong>
          <p>El combate se ha interrumpido. Pulsa para volver a jugar.</p>
          <button type="button" className="fight-button" onClick={this.restart}>VOLVER A JUGAR</button>
          <small>{this.state.error}</small>
        </main>
      );
    }
    return this.props.children(this.state.resetKey);
  }
}
