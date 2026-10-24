import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { findItem, validateProject } from '@/core/model'
import { addCatalogItem } from '@/store/commands.js'
import { resetEditorStore } from '@/store/editorStore.js'
import { resetProjectStore, useProjectStore } from '@/store/projectStore.js'
import { DeliveryDialog } from './DeliveryDialog.jsx'

const doc = () => useProjectStore.getState().project
const store = () => useProjectStore.getState()

let sofa
beforeEach(() => {
  resetProjectStore()
  resetEditorStore()
  sofa = addCatalogItem('sofa-3', { x: 2, z: 1 })
})

const renderDialog = () => render(<DeliveryDialog open onClose={() => {}} item={findItem(doc(), sofa)} />)

describe('«Passa pela porta?»', () => {
  it('sem portas nem caminho, pede os passos', () => {
    renderDialog()
    expect(screen.getByText(/Acrescente os passos do caminho/)).toBeInTheDocument()
    expect(screen.getByRole('note')).toHaveTextContent('A divisão ainda não tem portas')
  })

  it('a porta da divisão entra no fim do caminho e diz quanto falta', () => {
    store().addOpening('door', { wall: 'bottom' })
    renderDialog()
    // Sofá 220 × 92 × 84 numa porta de 80: faltam 4 cm.
    expect(screen.getByRole('status')).toHaveTextContent('Não passa em porta da divisão: faltam 4 cm')
  })

  it('acrescentar, alterar e retirar passos fica no projeto e pode ser anulado', async () => {
    const user = userEvent.setup()
    store().addOpening('door', { wall: 'bottom', width: 1 })
    const { rerender } = renderDialog()
    await user.click(screen.getByRole('button', { name: 'Escada' }))
    expect(doc().room.route.steps).toHaveLength(1)
    rerender(<DeliveryDialog open onClose={() => {}} item={findItem(doc(), sofa)} />)
    const step = screen.getAllByRole('listitem')[0]
    await user.click(within(step).getByRole('switch', { name: 'Patamar com curva a 90°' }))
    expect(doc().room.route.steps[0].turn).toBe(true)
    expect(validateProject(doc()).valid).toBe(true)
    expect(screen.getByRole('status')).toHaveTextContent('Não passa em escada')

    await user.click(within(screen.getAllByRole('listitem')[0]).getByRole('button', { name: 'Retirar Escada' }))
    expect(doc().room.route.steps).toHaveLength(0)
    expect(screen.getByRole('status')).toHaveTextContent('Passa.')
    store().undo()
    expect(doc().room.route.steps).toHaveLength(1)
  })

  it('apagar a porta de entrada limpa a referência no caminho', () => {
    const a = store().addOpening('door', { wall: 'bottom' })
    store().addOpening('door', { wall: 'top' })
    store().setEntryDoor(a)
    expect(doc().room.route.entryDoorId).toBe(a)
    store().removeOpening(a)
    expect(doc().room.route.entryDoorId).toBeNull()
    expect(validateProject(doc()).valid).toBe(true)
  })
})
