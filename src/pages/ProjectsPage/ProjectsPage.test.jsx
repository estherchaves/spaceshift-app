import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import App from '@/app/App.jsx'
import { createProject, serializeProject } from '@/core/model'
import { getRepository } from '@/services/persistence'
import { useProjectStore } from '@/store/projectStore.js'

beforeEach(() => {
  window.location.hash = '#/'
})

const card = (name) => screen.getByRole('button', { name: `Abrir ${name}` }).closest('article')

async function openMenu(user, name) {
  await user.click(within(card(name)).getByRole('button', { name: `Mais ações para ${name}` }))
  return screen.getByRole('menu', { name: `Ações de ${name}` })
}

describe('página de projetos', () => {
  it('sem projetos mostra o convite e abre o exemplo no editor', async () => {
    const user = userEvent.setup()
    render(<App />)
    expect(await screen.findByRole('heading', { name: 'Comece pela sua primeira divisão' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Abrir projeto de exemplo' }))
    await waitFor(() => expect(window.location.hash).toMatch(/^#\/projeto\//))
    expect(await screen.findByRole('tab', { name: /Sofá virado para a TV/ })).toBeInTheDocument()
    expect(useProjectStore.getState().project.name).toBe('Sala de exemplo')
  })

  it('cria um projeto com tipo e medidas e abre-o', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(await screen.findByRole('button', { name: 'Criar projeto' }))
    const dialog = screen.getByRole('dialog', { name: 'Novo projeto' })
    await user.type(within(dialog).getByLabelText('Nome do projeto'), 'Quarto da Inês')
    await user.click(within(dialog).getByRole('radio', { name: 'Quarto' }))
    expect(within(dialog).getByLabelText('Comprimento')).toHaveValue('4')
    const depth = within(dialog).getByLabelText('Largura')
    await user.clear(depth)
    await user.type(depth, '3,2{Enter}')
    await user.click(within(dialog).getByRole('button', { name: 'Criar projeto' }))
    await waitFor(() => expect(useProjectStore.getState().project.name).toBe('Quarto da Inês'))
    const { room } = useProjectStore.getState().project
    expect(room).toMatchObject({ type: 'bedroom', width: 4, depth: 3.2 })
    expect(await getRepository().list()).toHaveLength(1)
  })

  it('muda o nome, duplica e elimina com confirmação', async () => {
    const user = userEvent.setup()
    await getRepository().save(createProject({ name: 'Sala' }))
    render(<App />)
    await screen.findByRole('button', { name: 'Abrir Sala' })

    await user.click(within(await openMenu(user, 'Sala')).getByRole('menuitem', { name: 'Mudar o nome' }))
    const nameField = screen.getByLabelText('Nome do projeto')
    await user.clear(nameField)
    await user.type(nameField, 'Sala grande{Enter}')
    expect(await screen.findByRole('button', { name: 'Abrir Sala grande' })).toBeInTheDocument()

    await user.click(within(await openMenu(user, 'Sala grande')).getByRole('menuitem', { name: 'Duplicar' }))
    expect(await screen.findByRole('button', { name: 'Abrir Sala grande (cópia)' })).toBeInTheDocument()

    await user.click(within(await openMenu(user, 'Sala grande')).getByRole('menuitem', { name: 'Eliminar' }))
    const confirm = screen.getByRole('alertdialog', { name: 'Eliminar «Sala grande»?' })
    expect(confirm).toHaveAccessibleDescription(/não pode ser anulada/)
    // Cancelar não apaga nada.
    await user.click(within(confirm).getByRole('button', { name: 'Cancelar' }))
    expect(await getRepository().list()).toHaveLength(2)
    await user.click(within(await openMenu(user, 'Sala grande')).getByRole('menuitem', { name: 'Eliminar' }))
    await user.click(screen.getByRole('button', { name: 'Eliminar projeto' }))
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Abrir Sala grande' })).not.toBeInTheDocument())
    expect((await getRepository().list()).map((s) => s.name)).toEqual(['Sala grande (cópia)'])
  })

  it('importa um ficheiro exportado e recusa ficheiros inválidos com uma explicação', async () => {
    const user = userEvent.setup()
    render(<App />)
    const input = await screen.findByLabelText('Importar projeto (ficheiro JSON)')
    const project = createProject({ name: 'Importada' })
    await user.upload(input, new File([serializeProject(project)], 'sala.spaceshift.json', { type: 'application/json' }))
    expect(await screen.findByRole('button', { name: 'Abrir Importada' })).toBeInTheDocument()
    // O mesmo ficheiro outra vez: cópia, não substitui.
    await user.upload(input, new File([serializeProject(project)], 'sala.spaceshift.json', { type: 'application/json' }))
    expect(await screen.findByRole('button', { name: 'Abrir Importada (cópia)' })).toBeInTheDocument()
    await user.upload(input, new File(['{"format":"outra-coisa"}'], 'x.json', { type: 'application/json' }))
    expect(await screen.findByText(/Não foi possível importar: Este ficheiro não é um projeto SpaceShift/)).toBeInTheDocument()
  })

  it('procura projetos pelo nome, sem acentos', async () => {
    const user = userEvent.setup()
    await getRepository().save(createProject({ name: 'Escritório' }))
    await getRepository().save(createProject({ name: 'Sala' }))
    render(<App />)
    await screen.findByRole('button', { name: 'Abrir Sala' })
    await user.type(screen.getByRole('searchbox', { name: 'Procurar projetos' }), 'escritorio')
    expect(screen.getByRole('button', { name: 'Abrir Escritório' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Abrir Sala' })).not.toBeInTheDocument()
  })

  it('um endereço de projeto inexistente explica e volta à lista', async () => {
    const user = userEvent.setup()
    window.location.hash = '#/projeto/project_nao_existe'
    render(<App />)
    expect(await screen.findByRole('heading', { name: 'Projeto não encontrado' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Voltar aos projetos' }))
    expect(await screen.findByRole('heading', { name: 'Projetos' })).toBeInTheDocument()
  })
})
