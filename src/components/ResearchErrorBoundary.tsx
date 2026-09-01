import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Link } from 'react-router-dom'

type Props = { children: ReactNode }
type State = { failed: boolean }

export class ResearchErrorBoundary extends Component<Props, State> {
  state: State = { failed: false }

  static getDerivedStateFromError(): State {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('LabTerra view error', error, info.componentStack)
  }

  render() {
    if (!this.state.failed) return this.props.children

    return <section className="card lab-error-fallback" role="alert">
      <h1>Nie udało się wyświetlić części raportu</h1>
      <p>Strona nie została wygaszona. Zapis archiwum jest odczytywany niezależnie od tego widoku.</p>
      <div className="toolbar">
        <button type="button" onClick={() => this.setState({ failed: false })}>Spróbuj ponownie</button>
        <Link className="button-link" to="/research-archive">Otwórz archiwum badań</Link>
      </div>
    </section>
  }
}
