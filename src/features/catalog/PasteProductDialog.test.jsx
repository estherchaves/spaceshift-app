import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { findItem, validateProject } from '@/core/model'
import { resetEditorStore, useEditorStore } from '@/store/editorStore.js'
import { resetProjectStore, useProjectStore } from '@/store/projectStore.js'
import { PasteProductDialog } from './PasteProductDialog.jsx'

const doc = () => useProjectStore.getState().project

beforeEach(() => {
  resetProjectStore()
  resetEditorStore()
})

describe('móvel com as medidas de uma loja', () => {
  it('reconhece as medidas, o tipo e o nome, e põe o móvel na planta', async () => {
    const user = userEvent.setup()
    render(<PasteProductDialog open onClose={() => {}} />)
    await user.click(screen.getByRole('button', { name: 'Usar um exemplo' }))
    expect(screen.getByRole('status')).toHaveTextContent('Reconhecido: 228 × 95 × 83 cm')
    expect(screen.getByLabelText('Nome')).toHaveValue('Sofá KIVIK 3 lugares')
    expect(screen.getByLabelText('Desenho e modelo 3D')).toHaveValue('sofa-3')
    await user.click(screen.getByRole('button', { name: 'Pôr na planta' }))

    const item = findItem(doc(), useEditorStore.getState().selectedItemId)
    expect(item).toMatchObject({ name: 'Sofá KIVIK 3 lugares', catalogId: 'sofa-3', customSize: true, dimensions: { width: 2.28, depth: 0.95, height: 0.83 } })
    expect(validateProject(doc()).valid).toBe(true)
  })

  it('medidas fora dos limites do modelo não são cortadas', () => {
    const id = useProjectStore.getState().addFromCatalog('sofa-3', null, { customSize: true, dimensions: { width: 3.4, depth: 1.2, height: 0.7 } })
    useProjectStore.getState().updateItem(id, { dimensions: { width: 3.5 } })
    expect(findItem(doc(), id).dimensions).toEqual({ width: 3.5, depth: 1.2, height: 0.7 })
  })

  it('sem medidas, o botão fica desativado', async () => {
    const user = userEvent.setup()
    render(<PasteProductDialog open onClose={() => {}} />)
    await user.type(screen.getByLabelText('Texto da loja'), 'Sofá bonito')
    expect(screen.getByRole('status')).toHaveTextContent('Não encontrei o comprimento e a largura')
    expect(screen.getByRole('button', { name: /Pôr na planta/ })).toHaveAttribute('aria-disabled', 'true')
  })
})
