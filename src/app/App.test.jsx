import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App.jsx'

describe('App (Fase 1)', () => {
  it('mostra a marca e um projeto de exemplo válido', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: 'SpaceShift' })).toBeInTheDocument()
    const facts = within(screen.getByLabelText('Projeto de exemplo'))
    expect(facts.getByText('Sala de estar')).toBeInTheDocument()
    expect(facts.getByText('5,00 m × 4,00 m')).toBeInTheDocument()
    expect(facts.getByText('20,00 m²')).toBeInTheDocument()
    expect(facts.getByText('v1 · válido')).toBeInTheDocument()
  })
})
