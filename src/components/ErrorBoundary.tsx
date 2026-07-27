import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallbackTitle?: string
}

interface State {
  hasError: boolean
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Dashboard section failed to render', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="section-error" role="alert">
          <strong>{this.props.fallbackTitle ?? '此區塊暫時無法顯示'}</strong>
          <span>其他市場資料仍可正常瀏覽，請稍後重新整理。</span>
        </div>
      )
    }
    return this.props.children
  }
}
