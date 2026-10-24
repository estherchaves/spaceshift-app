import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { findWalkingPath } from '@/core/analysis'
import { clearSelection } from '@/store/commands.js'
import { resetEditorStore, useEditorStore } from '@/store/editorStore.js'
import { WalkPanel } from './WalkLayer.jsx'

const editor = () => useEditorStore.getState()

beforeEach(() => resetEditorStore())

describe('percurso a pé', () => {
  it('um clique marca A, o seguinte B e o terceiro recomeça', () => {
    editor().setWalkTool(true)
    editor().addWalkPoint({ x: 1, z: 1 })
    editor().addWalkPoint({ x: 2, z: 2 })
    expect(editor().walkPoints).toHaveLength(2)
    editor().addWalkPoint({ x: 3, z: 3 })
    expect(editor().walkPoints).toEqual([{ x: 3, z: 3 }])
  })

  it('Escape sai da ferramenta e apaga os pontos', () => {
    editor().setWalkTool(true)
    editor().addWalkPoint({ x: 1, z: 1 })
    clearSelection()
    expect(editor().walkTool).toBe(false)
    expect(editor().walkPoints).toEqual([])
  })

  it('o painel mostra o comprimento e avisa quando a passagem é estreita', () => {
    const room = { width: 4, depth: 3 }
    const wall = [[{ x: 1.9, z: 0 }, { x: 2.1, z: 0 }, { x: 2.1, z: 2.4 }, { x: 1.9, z: 2.4 }]]
    const points = [{ x: 0.5, z: 0.5 }, { x: 3.5, z: 0.5 }]
    const path = { ...findWalkingPath(room, [wall], points[0], points[1]), body: 0.5, passage: 0.7 }
    render(<WalkPanel points={points} path={path} onClose={() => {}} />)
    expect(screen.getByRole('status')).toHaveTextContent(/passagem mais estreita: 60 cm \(abaixo dos 70 cm recomendados\)/)
    expect(screen.getByRole('status')).toHaveAttribute('data-state', 'warn')
  })
})
