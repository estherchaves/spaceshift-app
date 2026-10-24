import { create } from 'zustand'

/**
 * Estado efémero da interface: não é guardado com o projeto.
 *  - viewMode: vista da área central ('2d' | '3d' | 'split', planta e 3D lado a lado)
 *  - mobilePanel: painel visível em ecrãs estreitos ('catalog' | 'plan' | 'properties')
 *  - selectedItemId: móvel selecionado
 *  - interaction: gesto em curso na planta. Durante o arrasto, `preview`
 *    guarda a posição/rotação/dimensões provisórias; o documento só é
 *    alterado uma vez, no fim do gesto (uma única entrada no histórico).
 *  - catalogDragId: móvel do catálogo a ser arrastado para a planta
 */
const initialState = {
  viewMode: '2d',
  mobilePanel: 'plan',
  selectedItemId: null,
  interaction: null,
  catalogDragId: null,
}

export const useEditorStore = create((set) => ({
  ...initialState,
  setViewMode: (viewMode) => set({ viewMode }),
  setMobilePanel: (mobilePanel) => set({ mobilePanel }),
  selectItem: (selectedItemId) => set({ selectedItemId }),
  /** @param {{type: 'move'|'rotate'|'resize'|'pan', itemId?: string, preview?: object}|null} interaction */
  setInteraction: (interaction) => set({ interaction }),
  setCatalogDrag: (catalogDragId) => set({ catalogDragId }),
}))

export function resetEditorStore() {
  useEditorStore.setState(initialState)
}
