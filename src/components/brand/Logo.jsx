import './Logo.css'

/**
 * Marca SpaceShift: uma planta quadrada com um bloco deslocado,
 * a ideia de "mudar o espaço".
 */
export function Logo({ showWordmark = true }) {
  return (
    <span className="logo">
      <svg className="logo__mark" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
        <rect x="1.5" y="1.5" width="21" height="21" rx="5" fill="var(--color-graphite)" />
        <rect x="6" y="6" width="12" height="12" rx="1.5" fill="none" stroke="var(--color-on-graphite)" strokeWidth="1.4" opacity="0.55" />
        <rect x="9.5" y="9.5" width="7" height="7" rx="1" fill="var(--color-accent)" />
      </svg>
      {showWordmark ? (
        <span className="logo__wordmark">
          Space<span>Shift</span>
        </span>
      ) : (
        <span className="visually-hidden">SpaceShift</span>
      )}
    </span>
  )
}
