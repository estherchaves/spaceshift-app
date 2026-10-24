import { renderToStaticMarkup } from 'react-dom/server'
import interLatin from '@fontsource-variable/inter/files/inter-latin-wght-normal.woff2?inline'
import symbolStyles from '@/features/editor2d/symbols/PlanSymbol.css?raw'
import tokens from '@/styles/tokens.css?raw'
import { getActiveLayout } from '@/core/model'
import { downloadBlob } from '@/services/export/download.js'
import { svgToPng } from '@/services/export/svgToPng.js'
import { slugify } from '@/utils/fileName.js'
import { captureScene } from '@/features/scene3d/sceneCapture.js'
import { PlanSheet } from './PlanSheet.jsx'
import { SHEET } from './sheetLayout.js'

/*
 * Exportação de imagens. Este módulo é carregado só quando se exporta
 * (import dinâmico), por isso o tipo de letra embutido e o renderizador
 * de servidor do React não pesam no arranque do editor.
 */

/** CSS embutido no SVG: tokens (cores) + estilos dos símbolos + Inter. */
function sheetStyles() {
  return `@font-face{font-family:'Inter Variable';font-weight:100 900;src:url(${interLatin}) format('woff2');}\n${tokens}\n${symbolStyles}`
}

/** SVG da folha da planta (texto), útil também para testes. */
export function renderPlanSheet(project, layout = getActiveLayout(project), date = new Date()) {
  return `<?xml version="1.0" encoding="UTF-8"?>${renderToStaticMarkup(
    <PlanSheet project={project} layout={layout} styles={sheetStyles()} date={date} />,
  )}`
}

function baseName(project, layout) {
  const layoutPart = project.layouts.length > 1 ? `-${slugify(layout.name, 'disposicao')}` : ''
  return `${slugify(project.name)}${layoutPart}`
}

/** Planta da disposição ativa como PNG (3200 × 2000 px). Devolve o nome do ficheiro. */
export async function exportPlanPng(project) {
  const layout = getActiveLayout(project)
  const blob = await svgToPng(renderPlanSheet(project, layout), { width: SHEET.width, height: SHEET.height, scale: 2 })
  const fileName = `${baseName(project, layout)}-planta.png`
  downloadBlob(blob, fileName)
  return fileName
}

/** Vista 3D tal como está no ecrã. Devolve o nome do ficheiro, ou null se a vista 3D não estiver aberta. */
export async function exportScenePng(project) {
  const blob = await captureScene()
  if (!blob) return null
  const fileName = `${baseName(project, getActiveLayout(project))}-3d.png`
  downloadBlob(blob, fileName)
  return fileName
}
