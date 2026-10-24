/*
 * Histórico de anular/refazer. Guarda instantâneos do documento: o projeto
 * é imutável, por isso cada instantâneo é apenas uma referência e partes
 * que não mudam são partilhadas entre estados.
 *
 * Cada entrada do passado é o estado ANTES de uma alteração, com o nome
 * dessa alteração ("Mover Sofá"). Um gesto (arrastar, rodar, redimensionar)
 * só altera o documento no fim, por isso dá exatamente uma entrada.
 *
 * Alterações contínuas com a mesma `mergeKey` (ex.: o seletor de cor nativo,
 * que emite uma alteração por cada movimento) feitas em menos de
 * `mergeWindow` ms juntam-se numa única entrada.
 */

export const HISTORY_LIMIT = 100
export const MERGE_WINDOW_MS = 1000

/** @returns {{past: {state: any, label: string}[], future: {state: any, label: string}[], lastKey: string|null, lastTime: number}} */
export function createHistory() {
  return { past: [], future: [], lastKey: null, lastTime: 0 }
}

/**
 * Regista que `previous` foi substituído por um novo estado.
 * @param {{label?: string, mergeKey?: string|null, time?: number, limit?: number}} [options]
 */
export function recordChange(history, previous, { label = 'Alteração', mergeKey = null, time = Date.now(), limit = HISTORY_LIMIT } = {}) {
  const merge = mergeKey !== null && mergeKey === history.lastKey && time - history.lastTime < MERGE_WINDOW_MS && history.past.length > 0
  const past = merge ? history.past : [...history.past, { state: previous, label }].slice(-limit)
  return { past, future: [], lastKey: mergeKey, lastTime: time }
}

export function canUndo(history) {
  return history.past.length > 0
}

export function canRedo(history) {
  return history.future.length > 0
}

/** Nome da alteração que Anular desfaz (ou null). */
export function undoLabel(history) {
  return history.past.at(-1)?.label ?? null
}

/** Nome da alteração que Refazer repõe (ou null). */
export function redoLabel(history) {
  return history.future.at(-1)?.label ?? null
}

/**
 * Anula a última alteração.
 * @returns {{history: object, state: any, label: string} | null}
 */
export function undo(history, current) {
  const entry = history.past.at(-1)
  if (!entry) return null
  return {
    state: entry.state,
    label: entry.label,
    history: {
      past: history.past.slice(0, -1),
      future: [...history.future, { state: current, label: entry.label }],
      lastKey: null,
      lastTime: 0,
    },
  }
}

/**
 * Repõe a última alteração anulada.
 * @returns {{history: object, state: any, label: string} | null}
 */
export function redo(history, current) {
  const entry = history.future.at(-1)
  if (!entry) return null
  return {
    state: entry.state,
    label: entry.label,
    history: {
      past: [...history.past, { state: current, label: entry.label }],
      future: history.future.slice(0, -1),
      lastKey: null,
      lastTime: 0,
    },
  }
}
