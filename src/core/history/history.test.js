import { describe, expect, it } from 'vitest'
import { canRedo, canUndo, createHistory, HISTORY_LIMIT, recordChange, redo, redoLabel, undo, undoLabel } from './history.js'

describe('histórico', () => {
  it('anula e refaz pela ordem certa, com o nome de cada alteração', () => {
    let h = createHistory()
    h = recordChange(h, 'A', { label: 'Mover Sofá', time: 0 })
    h = recordChange(h, 'B', { label: 'Rodar Sofá', time: 10 })
    expect(undoLabel(h)).toBe('Rodar Sofá')
    const u1 = undo(h, 'C')
    expect(u1.state).toBe('B')
    expect(redoLabel(u1.history)).toBe('Rodar Sofá')
    const u2 = undo(u1.history, u1.state)
    expect(u2.state).toBe('A')
    expect(canUndo(u2.history)).toBe(false)
    const r1 = redo(u2.history, u2.state)
    expect(r1.state).toBe('B')
    const r2 = redo(r1.history, r1.state)
    expect(r2.state).toBe('C')
    expect(canRedo(r2.history)).toBe(false)
  })

  it('uma alteração nova apaga o que havia para refazer', () => {
    let h = recordChange(createHistory(), 'A', { label: 'x', time: 0 })
    const u = undo(h, 'B')
    h = recordChange(u.history, 'A', { label: 'y', time: 5000 })
    expect(canRedo(h)).toBe(false)
    expect(undoLabel(h)).toBe('y')
  })

  it('junta alterações contínuas com a mesma chave (seletor de cor)', () => {
    let h = createHistory()
    h = recordChange(h, 'A', { label: 'Cor', mergeKey: 'color:1', time: 0 })
    h = recordChange(h, 'A1', { label: 'Cor', mergeKey: 'color:1', time: 300 })
    h = recordChange(h, 'A2', { label: 'Cor', mergeKey: 'color:1', time: 600 })
    expect(h.past).toHaveLength(1)
    expect(undo(h, 'A3').state).toBe('A')
    // Depois de uma pausa já é outra alteração.
    h = recordChange(h, 'A3', { label: 'Cor', mergeKey: 'color:1', time: 5000 })
    expect(h.past).toHaveLength(2)
    // Sem chave nunca junta.
    h = recordChange(h, 'A4', { label: 'Mover', time: 5001 })
    h = recordChange(h, 'A5', { label: 'Mover', time: 5002 })
    expect(h.past).toHaveLength(4)
  })

  it('guarda no máximo HISTORY_LIMIT passos', () => {
    let h = createHistory()
    for (let i = 0; i < HISTORY_LIMIT + 20; i++) h = recordChange(h, i, { time: i * 10000 })
    expect(h.past).toHaveLength(HISTORY_LIMIT)
    expect(h.past[0].state).toBe(20)
  })

  it('sem nada para anular ou refazer devolve null', () => {
    expect(undo(createHistory(), 'x')).toBeNull()
    expect(redo(createHistory(), 'x')).toBeNull()
  })
})
