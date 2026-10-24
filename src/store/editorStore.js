import { create } from 'zustand'

/**
 * Estado efémero da interface: não é guardado com o projeto.
 *  - viewMode: vista da área central ('2d' | '3d' | 'split', planta e 3D lado a lado)
 *  - mobilePanel: painel visível em ecrãs estreitos ('catalog' | 'plan' | 'properties')
 *  - selectedItemId: móvel selecionado
 *  - selectedOpeningId: porta ou janela selecionada (exclusiva com o móvel)
 *  - interaction: gesto em curso na planta. Durante o arrasto, `preview`
 *    guarda a posição/rotação/dimensões provisórias; o documento só é
 *    alterado uma vez, no fim do gesto (uma única entrada no histórico).
 *  - catalogDragId: móvel do catálogo a ser arrastado para a planta
 *  - analysisOpen: painel de análise (colisões e circulação) aberto
 *  - showCirculation: mostrar a zona de circulação na planta
 *  - focusedIssueId: problema realçado nas vistas (escolhido no painel)
 *  - compareOpen: comparação de disposições lado a lado aberta
 *  - walkTool: ferramenta «percurso a pé» ativa (cliques na planta marcam pontos)
 *  - walkPoints: origem e destino do percurso (0, 1 ou 2 pontos, em metros)
 */
const initialState = {
  viewMode: '2d',
  mobilePanel: 'plan',
  selectedItemId: null,
  selectedOpeningId: null,
  interaction: null,
  catalogDragId: null,
  analysisOpen: false,
  showCirculation: false,
  focusedIssueId: null,
  compareOpen: false,
  walkTool: false,
  walkPoints: [],
}

export const useEditorStore = create((set) => ({
  ...initialState,
  setViewMode: (viewMode) => set({ viewMode }),
  setMobilePanel: (mobilePanel) => set({ mobilePanel }),
  // Mudar a seleção à mão deixa de realçar o problema escolhido no painel.
  selectItem: (selectedItemId) => set({ selectedItemId, selectedOpeningId: null, focusedIssueId: null }),
  selectOpening: (selectedOpeningId) => set({ selectedOpeningId, selectedItemId: null, focusedIssueId: null }),
  /** @param {{type: 'move'|'rotate'|'resize'|'pan', itemId?: string, preview?: object}|null} interaction */
  setInteraction: (interaction) => set({ interaction }),
  setCatalogDrag: (catalogDragId) => set({ catalogDragId }),
  setAnalysisOpen: (analysisOpen) => set(analysisOpen ? { analysisOpen } : { analysisOpen, focusedIssueId: null }),
  setShowCirculation: (showCirculation) => set({ showCirculation }),
  setFocusedIssue: (focusedIssueId) => set({ focusedIssueId }),
  setWalkTool: (walkTool) => set(walkTool ? { walkTool, selectedItemId: null, selectedOpeningId: null } : { walkTool, walkPoints: [] }),
  /** Um clique marca a origem, o seguinte o destino; o terceiro recomeça. */
  addWalkPoint: (point) => set((state) => ({ walkPoints: state.walkPoints.length === 1 ? [state.walkPoints[0], point] : [point] })),
  setCompareOpen: (compareOpen) => set(compareOpen ? { compareOpen, interaction: null } : { compareOpen }),
}))

export function resetEditorStore() {
  useEditorStore.setState(initialState)
}
