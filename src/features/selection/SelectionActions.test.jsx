import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { findItem } from '@/core/model'
import { addCatalogItem, addOpening, clearSelection } from '@/store/commands.js'
import { resetEditorStore, useEditorStore } from '@/store/editorStore.js'
import { resetProjectStore, useProjectStore } from '@/store/projectStore.js'
import { SelectionActions } from './SelectionActions.jsx'

const doc = () => useProjectStore.getState().project
const bar = (name) => within(screen.getByRole('toolbar', { name }))

let sofa
beforeEach(() => {
  resetProjectStore()
  resetEditorStore()
  sofa = addCatalogItem('sofa-3', { x: 2, z: 1 })
})

describe('barra do móvel selecionado', () => {
  it('sem seleção mostra a divisão', () => {
    clearSelection()
    render(<SelectionActions />)
    expect(screen.getByRole('toolbar', { name: 'Divisão' })).toHaveTextContent('Divisão')
    expect(screen.queryByRole('toolbar', { name: /Ações/ })).toBeNull()
  })

  it('elimina o móvel selecionado', async () => {
    const user = userEvent.setup()
    const name = findItem(doc(), sofa).name
    render(<SelectionActions />)
    await user.click(bar(`Ações de ${name}`).getByRole('button', { name: 'Eliminar' }))
    expect(findItem(doc(), sofa)).toBeFalsy()
    expect(useEditorStore.getState().selectedItemId).toBeNull()
    expect(screen.queryByRole('toolbar', { name: /Ações/ })).toBeNull()
  })

  it('roda, duplica e bloqueia; bloqueado não se elimina', async () => {
    const user = userEvent.setup()
    const name = findItem(doc(), sofa).name
    render(<SelectionActions />)
    await user.click(bar(`Ações de ${name}`).getByRole('button', { name: 'Rodar' }))
    expect(findItem(doc(), sofa).rotation).not.toBe(0)
    await user.click(bar(`Ações de ${name}`).getByRole('button', { name: 'Bloquear' }))
    expect(findItem(doc(), sofa).locked).toBe(true)
    await user.click(bar(`Ações de ${name}`).getByRole('button', { name: 'Eliminar' }))
    expect(findItem(doc(), sofa)).toBeTruthy()
    await user.click(bar(`Ações de ${name}`).getByRole('button', { name: 'Duplicar' }))
    expect(useEditorStore.getState().selectedItemId).not.toBe(sofa)
  })

  it('elimina a porta selecionada', async () => {
    const user = userEvent.setup()
    const before = doc().room.openings.length
    addOpening('door')
    render(<SelectionActions />)
    await user.click(bar('Ações da porta').getByRole('button', { name: 'Eliminar porta' }))
    expect(doc().room.openings.length).toBe(before)
  })

  it('fica escondida durante um gesto', () => {
    render(<SelectionActions hidden />)
    expect(screen.queryByRole('toolbar')).toBeNull()
  })
})

describe('medidas da divisão', () => {
  const room = () => doc().room

  it('muda comprimento, largura e altura num só passo', async () => {
    const user = userEvent.setup()
    clearSelection()
    render(<SelectionActions />)
    await user.click(screen.getByRole('button', { name: 'Alterar medidas' }))
    const dialog = within(screen.getByRole('dialog', { name: 'Medidas da divisão' }))
    for (const [label, value] of [['Comprimento', '6,4'], ['Largura', '3.8'], ['Altura do teto', '2,9']]) {
      const field = dialog.getByLabelText(label)
      await user.clear(field)
      await user.type(field, value)
      await user.tab()
    }
    await user.click(dialog.getByRole('button', { name: 'Aplicar' }))
    expect(room()).toMatchObject({ width: 6.4, depth: 3.8, wallHeight: 2.9 })
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByRole('toolbar', { name: 'Divisão' })).toHaveTextContent('6,40 m × 3,80 m')
    useProjectStore.getState().undo()
    expect(room().width).not.toBe(6.4)
  })

  it('avisa quando um móvel fica de fora e cancelar não muda nada', async () => {
    const user = userEvent.setup()
    const before = room()
    clearSelection()
    render(<SelectionActions />)
    await user.click(screen.getByRole('button', { name: 'Alterar medidas' }))
    const dialog = within(screen.getByRole('dialog', { name: 'Medidas da divisão' }))
    const field = dialog.getByLabelText('Largura')
    await user.clear(field)
    await user.type(field, '1,2')
    await user.tab()
    expect(dialog.getByRole('status')).toHaveTextContent('fica fora da divisão')
    await user.click(dialog.getByRole('button', { name: 'Cancelar' }))
    expect(room()).toBe(before)
  })
})
