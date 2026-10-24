import './AppShell.css'

/**
 * Grelha principal do editor. Em desktop mostra todos os painéis; em ecrãs
 * estreitos mostra só o painel ativo (`mobilePanel`), escolhido em `mobileNav`.
 */
export function AppShell({ topBar, mobileNav, left, main, right, statusBar, mobilePanel }) {
  return (
    <div className="app-shell" data-mobile-panel={mobilePanel}>
      <div className="app-shell__top">{topBar}</div>
      <div className="app-shell__mobile-nav">{mobileNav}</div>
      <div className="app-shell__left" data-panel="catalog">
        {left}
      </div>
      <main className="app-shell__main" data-panel="plan">
        {main}
      </main>
      <div className="app-shell__right" data-panel="properties">
        {right}
      </div>
      <div className="app-shell__status">{statusBar}</div>
    </div>
  )
}
