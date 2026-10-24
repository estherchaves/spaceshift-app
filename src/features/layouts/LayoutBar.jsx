import { ChevronDown, Columns3, Copy, Layers, Pencil, Plus, SquareDashed, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Button, ConfirmDialog, IconButton, Menu } from '@/components/ui'
import { canAddLayout, LIMITS } from '@/core/model'
import { NameDialog } from '@/features/projects/NameDialog.jsx'
import { createLayout, deleteLayout, switchLayout } from '@/store/commands.js'
import { useEditorStore } from '@/store/editorStore.js'
import { useProjectStore } from '@/store/projectStore.js'
import './LayoutBar.css'

/**
 * Disposições do projeto: alternativas de mobiliário para a mesma divisão.
 * Cada separador abre uma; a ativa tem um menu (mudar o nome, duplicar,
 * eliminar). "Comparar" abre a comparação lado a lado.
 */
export function LayoutBar() {
  const project = useProjectStore((state) => state.project)
  const renameLayout = useProjectStore((state) => state.renameLayout)
  const setCompareOpen = useEditorStore((state) => state.setCompareOpen)
  const [dialog, setDialog] = useState(null) // { type: 'rename'|'delete', layout }
  const { layouts, activeLayoutId } = project
  const canAdd = canAddLayout(project)
  const limitReason = `Máximo de ${LIMITS.layoutsPerProject} disposições por projeto`

  return (
    <div className="layout-bar">
      <span className="layout-bar__label">
        <Layers size={14} strokeWidth={1.75} aria-hidden="true" />
        <span>Disposições</span>
      </span>
      <div className="layout-bar__tabs" role="tablist" aria-label="Disposições">
        {layouts.map((layout) => {
          const active = layout.id === activeLayoutId
          return (
            <div key={layout.id} className="layout-tab" data-active={active || undefined}>
              <button
                type="button"
                role="tab"
                aria-selected={active}
                className="layout-tab__button"
                onClick={() => switchLayout(layout.id)}
                onDoubleClick={() => setDialog({ type: 'rename', layout })}
                title={active ? 'Duplo clique para mudar o nome' : undefined}
              >
                <span className="layout-tab__name">{layout.name}</span>
                <span className="layout-tab__count">{layout.items.length}</span>
              </button>
              {active && (
                <Menu
                  label={`Ações de ${layout.name}`}
                  align="start"
                  trigger={(props) => (
                    <button type="button" className="layout-tab__menu" aria-label={`Mais ações para ${layout.name}`} {...props}>
                      <ChevronDown size={13} strokeWidth={2} aria-hidden="true" />
                    </button>
                  )}
                  items={[
                    { label: 'Mudar o nome', icon: Pencil, onSelect: () => setDialog({ type: 'rename', layout }) },
                    { label: 'Duplicar', icon: Copy, disabled: !canAdd, onSelect: () => createLayout({ copyCurrent: true }) },
                    'separator',
                    {
                      label: 'Eliminar',
                      icon: Trash2,
                      danger: true,
                      disabled: layouts.length <= 1,
                      hint: layouts.length <= 1 ? 'é a única' : undefined,
                      onSelect: () => setDialog({ type: 'delete', layout }),
                    },
                  ]}
                />
              )}
            </div>
          )
        })}
        <Menu
          label="Nova disposição"
          align="start"
          trigger={(props) => (
            <IconButton
              icon={Plus}
              size="sm"
              label="Nova disposição"
              disabled={!canAdd}
              disabledReason={limitReason}
              className="layout-bar__add"
              {...props}
              onClick={canAdd ? props.onClick : undefined}
            />
          )}
          items={[
            { label: 'Copiar a disposição atual', icon: Copy, onSelect: () => createLayout({ copyCurrent: true }) },
            { label: 'Começar vazia', icon: SquareDashed, onSelect: () => createLayout({ copyCurrent: false }) },
          ]}
        />
      </div>
      <Button
        size="sm"
        icon={Columns3}
        className="layout-bar__compare"
        disabled={layouts.length < 2}
        disabledReason="Crie uma segunda disposição para comparar"
        tooltipAlign="end"
        onClick={() => setCompareOpen(true)}
      >
        Comparar
      </Button>

      <NameDialog
        open={dialog?.type === 'rename'}
        title="Mudar o nome da disposição"
        label="Nome da disposição"
        initialName={dialog?.layout.name ?? ''}
        onConfirm={(name) => {
          renameLayout(dialog.layout.id, name)
          setDialog(null)
        }}
        onCancel={() => setDialog(null)}
      />
      <ConfirmDialog
        open={dialog?.type === 'delete'}
        danger
        title={`Eliminar «${dialog?.layout.name}»?`}
        description="Os móveis desta disposição são removidos. A divisão e as outras disposições ficam iguais. Pode anular com Ctrl+Z."
        confirmLabel="Eliminar disposição"
        onConfirm={() => {
          deleteLayout(dialog.layout.id)
          setDialog(null)
        }}
        onCancel={() => setDialog(null)}
      />
    </div>
  )
}
