import './AppShell.css'

/**
 * Grelha principal do editor. Em desktop mostra todos os painéis; em ecrãs
 * estreitos mostra só o painel ativo (`mobilePanel`), escolhido em `mobileNav`.
 * `overlay` (ex.: comparação de disposições) ocupa a largura toda entre a
 * barra de topo e a barra inferior; os painéis ficam montados por baixo.
 */
export function AppShell({ topBar, mobileNav, left, main, right, statusBar, mobilePanel, overlay = null }) {
  return (
    <div className="app-shell" data-mobile-panel={mobilePanel} data-overlay={overlay ? true : undefined}>
      <div className="app-shell__top">{topBar}</div>
      <nav className="app-shell__mobile-nav" aria-label="Painéis do editor">{mobileNav}</nav>
      <div className="app-shell__left" data-panel="catalog">
        {left}
      </div>
      <main className="app-shell__main" data-panel="plan">
        {main}
      </main>
      <div className="app-shell__right" data-panel="properties">
        {right}
      </div>
      {overlay && <main className="app-shell__overlay">{overlay}</main>}
      <div className="app-shell__status">{statusBar}</div>
    </div>
  )
}
