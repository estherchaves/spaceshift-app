import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { resetEditorStore } from '@/store/editorStore.js'
import { SceneView } from './SceneView.jsx'

// A cena real precisa de WebGL; aqui substitui-se por um componente simples
// para testar o carregamento diferido e o isolamento de erros.
const sceneControl = vi.hoisted(() => ({ fail: false }))
vi.mock('./Scene3D.jsx', () => ({
  default: function FakeScene() {
    if (sceneControl.fail) throw new Error('contexto WebGL perdido')
    return <p>cena carregada</p>
  },
}))
vi.mock('./webgl.js', () => ({ isWebGLAvailable: () => true }))

beforeEach(() => {
  resetEditorStore()
  sceneControl.fail = false
})
afterEach(() => vi.restoreAllMocks())

describe('SceneView', () => {
  it('mostra o estado de carregamento e depois a cena', async () => {
    render(<SceneView />)
    expect(screen.getByRole('status')).toHaveTextContent('A preparar a cena 3D…')
    expect(await screen.findByText('cena carregada')).toBeInTheDocument()
  })

  it('um erro na cena não derruba o editor e pode tentar-se de novo', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    sceneControl.fail = true
    const user = userEvent.setup()
    render(<SceneView />)
    expect(await screen.findByText('Não foi possível mostrar a cena 3D')).toBeInTheDocument()
    sceneControl.fail = false
    await user.click(screen.getByRole('button', { name: /Tentar novamente/ }))
    expect(await screen.findByText('cena carregada')).toBeInTheDocument()
  })
})
