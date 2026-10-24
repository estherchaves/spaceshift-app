import { create } from 'zustand'

/**
 * Estado efémero da interface: não é guardado com o projeto.
 *  - viewMode: vista da área central ('2d' | '3d')
 *  - mobilePanel: painel visível em ecrãs estreitos ('catalog' | 'plan' | 'properties')
 *  - selectedItemId: móvel selecionado (Fases 3–4)
 */
const initialState = {
  viewMode: '2d',
  mobilePanel: 'plan',
  selectedItemId: null,
}

export const useEditorStore = create((set) => ({
  ...initialState,
  setViewMode: (viewMode) => set({ viewMode }),
  setMobilePanel: (mobilePanel) => set({ mobilePanel }),
  selectItem: (selectedItemId) => set({ selectedItemId }),
}))

export function resetEditorStore() {
  useEditorStore.setState(initialState)
}
