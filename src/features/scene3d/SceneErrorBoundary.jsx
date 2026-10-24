import { Component } from 'react'

/**
 * Isola falhas da cena 3D (ex.: contexto WebGL perdido ou erro do driver)
 * para não derrubar o editor. `fallback(retry)` desenha a mensagem.
 */
export class SceneErrorBoundary extends Component {
  state = { error: null, attempt: 0 }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error) {
    console.error('Falha na vista 3D:', error)
  }

  retry = () => this.setState((state) => ({ error: null, attempt: state.attempt + 1 }))

  render() {
    if (this.state.error) return this.props.fallback(this.retry)
    return <div key={this.state.attempt} style={{ display: 'contents' }}>{this.props.children}</div>
  }
}
