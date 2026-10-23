import { describe, expect, it } from 'vitest'

/**
 * Garante que as dependências obrigatórias estão instaladas e expõem as
 * APIs que vamos usar nas fases seguintes (evita descobrir só na Fase 5
 * que um pacote não resolve).
 */
describe('dependências', () => {
  it('three', async () => {
    const THREE = await import('three')
    expect(typeof THREE.WebGLRenderer).toBe('function')
    expect(typeof THREE.MeshStandardMaterial).toBe('function')
  })

  it('@react-three/fiber', async () => {
    const fiber = await import('@react-three/fiber')
    expect(fiber.Canvas).toBeDefined()
    expect(typeof fiber.useFrame).toBe('function')
  })

  it('@react-three/drei', async () => {
    const drei = await import('@react-three/drei')
    expect(drei.OrbitControls).toBeDefined()
    expect(drei.ContactShadows).toBeDefined()
  })

  it('zustand', async () => {
    const { create } = await import('zustand')
    const useStore = create(() => ({ value: 1 }))
    expect(useStore.getState().value).toBe(1)
  })

  it('lucide-react', async () => {
    const icons = await import('lucide-react')
    for (const name of ['Undo2', 'Redo2', 'Save', 'Download', 'Box', 'RotateCw', 'Trash2', 'Lock', 'Copy'])
      expect(icons).toHaveProperty(name)
  })
})
