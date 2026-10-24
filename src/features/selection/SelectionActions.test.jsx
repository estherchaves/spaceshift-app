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
  it('não aparece sem seleção', () => {
    clearSelection()
    render(<SelectionActions />)
    expect(screen.queryByRole('toolbar')).toBeNull()
  })

  it('elimina o móvel selecionado', async () => {
    const user = userEvent.setup()
    const name = findItem(doc(), sofa).name
    render(<SelectionActions />)
    await user.click(bar(`Ações de ${name}`).getByRole('button', { name: 'Eliminar' }))
    expect(findItem(doc(), sofa)).toBeFalsy()
    expect(useEditorStore.getState().selectedItemId).toBeNull()
    expect(screen.queryByRole('toolbar')).toBeNull()
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
