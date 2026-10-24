import { Box, Columns2, Square } from 'lucide-react'

/** Modos da área central, partilhados pela barra de topo e pelo seletor móvel. */
export const VIEW_MODE_OPTIONS = [
  { value: '2d', label: '2D', icon: Square },
  { value: '3d', label: '3D', icon: Box },
  { value: 'split', label: 'Dividido', icon: Columns2 },
]
