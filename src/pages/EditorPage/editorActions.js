import { navigate, projectsPath } from '@/app/router.js'
import { exportProjectJson } from '@/services/export/projectFile.js'
import { saveNow } from '@/store/autosave.js'
import { useProjectStore } from '@/store/projectStore.js'
import { notify } from '@/store/toastStore.js'

/* Ações da barra de topo do editor que saem do editor: lista de projetos e exportações. */

/** Volta à lista de projetos depois de gravar o que falta. */
export async function backToProjects() {
  await saveNow()
  navigate(projectsPath())
}

/** As imagens carregam um módulo à parte (tipo de letra embutido), só quando se exporta. */
export async function exportImage(kind) {
  const project = useProjectStore.getState().project
  try {
    const { exportPlanPng, exportScenePng } = await import('@/features/export/exportImages.jsx')
    const fileName = kind === '3d' ? await exportScenePng(project) : await exportPlanPng(project)
    if (fileName) notify(`Imagem exportada: ${fileName}`, { tone: 'success' })
  } catch {
    notify('Não foi possível criar a imagem.', { tone: 'error' })
  }
}

export function exportJson() {
  const fileName = exportProjectJson(useProjectStore.getState().project)
  notify(`Projeto exportado: ${fileName}`, { tone: 'success' })
}

/** A ficha para imprimir vem num módulo à parte, carregado só quando é pedida. */
export async function printSheet() {
  await saveNow()
  try {
    const { printProjectSheet } = await import('@/features/export/printSheet.jsx')
    printProjectSheet(useProjectStore.getState().project)
  } catch {
    notify('Não foi possível preparar a ficha para imprimir.', { tone: 'error' })
  }
}
