const relative = new Intl.RelativeTimeFormat('pt-PT', { numeric: 'auto' })
const dateFormat = new Intl.DateTimeFormat('pt-PT', { day: 'numeric', month: 'short', year: 'numeric' })
const timeFormat = new Intl.DateTimeFormat('pt-PT', { hour: '2-digit', minute: '2-digit' })

/** "agora mesmo", "há 5 minutos", "ontem", "12/10/2026"… */
export function formatRelativeTime(iso, now = Date.now()) {
  const time = Date.parse(iso)
  if (!Number.isFinite(time)) return ''
  const seconds = Math.round((time - now) / 1000)
  const abs = Math.abs(seconds)
  if (abs < 45) return 'agora mesmo'
  if (abs < 3600) return relative.format(Math.round(seconds / 60), 'minute')
  if (abs < 86400) return relative.format(Math.round(seconds / 3600), 'hour')
  if (abs < 7 * 86400) return relative.format(Math.round(seconds / 86400), 'day')
  return dateFormat.format(time)
}

/** "14:05" */
export function formatClock(iso) {
  const time = Date.parse(iso)
  return Number.isFinite(time) ? timeFormat.format(time) : ''
}
