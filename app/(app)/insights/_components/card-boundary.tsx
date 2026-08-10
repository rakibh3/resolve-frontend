"use client"

import { Component, type ReactNode } from "react"

import { InsightCardError } from "./insight-card"

type Props = { title: string; children: ReactNode }
type State = { error: Error | null; resetKey: number }

/**
 * A component-level error boundary, one per insights card.
 *
 * `error.tsx` is route-level and would take the whole page down; each card
 * streams independently, so each one recovers independently too.
 */
export class CardBoundary extends Component<Props, State> {
  state: State = { error: null, resetKey: 0 }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <InsightCardError
          title={this.props.title}
          message={
            this.state.error.message ||
            "This section could not be loaded."
          }
          reset={() =>
            this.setState((state) => ({
              error: null,
              resetKey: state.resetKey + 1,
            }))
          }
        />
      )
    }

    return <div key={this.state.resetKey}>{this.props.children}</div>
  }
}
