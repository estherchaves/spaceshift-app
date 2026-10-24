import { useId, useState } from 'react'
import { Button, Dialog, FieldGrid, NumberField, Select, TextField } from '@/components/ui'
import { guessCatalogId, guessProductName, LIMITS, parseProductDimensions } from '@/core/model'
import { closestCatalogEntry, FURNITURE_CATALOG, getCatalogEntry } from '@/data/catalog/furniture.js'
import { addProductItem } from '@/store/commands.js'
import './PasteProductDialog.css'

const cm = (m) => Math.round(m * 1000) / 10
const SAMPLE = 'Sofá KIVIK 3 lugares\nLargura: 228 cm\nProfundidade: 95 cm\nAltura: 83 cm'
const MODEL_OPTIONS = FURNITURE_CATALOG.map((entry) => ({ value: entry.id, label: entry.name }))
const LABELS = { width: 'Comprimento', depth: 'Largura', height: 'Altura' }

/**
 * Criar um móvel a partir do texto de uma loja: cola-se a descrição (ou só
 * as medidas) e a aplicação reconhece as medidas, o tipo de móvel e o
 * nome. Tudo pode ser corrigido antes de pôr o móvel na planta.
 */
export function PasteProductDialog({ open, onClose }) {
  const [text, setText] = useState('')
  const [edits, setEdits] = useState({})
  const textId = useId()
  const hintId = useId()

  const parsed = parseProductDimensions(text)
  const guessedId = guessCatalogId(text, { round: parsed.round }) ?? (parsed.ok ? closestCatalogEntry(parsed.dimensions).id : 'sofa-3')
  const catalogId = edits.catalogId ?? guessedId
  const entry = getCatalogEntry(catalogId)
  const dimensions = { ...entry.dimensions, ...parsed.dimensions, ...edits.dimensions }
  const name = edits.name ?? guessProductName(text) ?? entry.name
  const ready = parsed.ok || Boolean(edits.dimensions?.width && edits.dimensions?.depth)
  const missingHeight = parsed.ok && parsed.missing.includes('height') && edits.dimensions?.height === undefined

  const setDimension = (key, value) => setEdits((e) => ({ ...e, dimensions: { ...e.dimensions, [key]: value } }))
  const changeText = (value) => {
    setText(value)
    // Texto novo: o que se reconhecer volta a mandar.
    setEdits({})
  }
  const submit = () => {
    if (!ready) return
    addProductItem({ catalogId, name, dimensions })
    onClose()
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Móvel de uma loja"
      description="Cole o texto da página do produto ou só as medidas. As medidas reconhecidas podem ser corrigidas antes de pôr o móvel na planta."
      footer={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant="primary" disabled={!ready} disabledReason="Faltam o comprimento e a largura" onClick={submit}>
            Pôr na planta
          </Button>
        </>
      }
    >
      <div className="paste-product__field">
        <div className="paste-product__label-row">
          <label htmlFor={textId} className="text-field__label">
            Texto da loja
          </label>
          <button type="button" className="paste-product__sample" onClick={() => changeText(SAMPLE)}>
            Usar um exemplo
          </button>
        </div>
        <textarea
          id={textId}
          className="text-field__input paste-product__text"
          value={text}
          rows={4}
          data-autofocus
          aria-describedby={hintId}
          placeholder="Ex.: L 220 x P 95 x A 85 cm"
          onChange={(event) => changeText(event.target.value)}
        />
        <p id={hintId} className="paste-product__hint">
          Serve «L 220 x P 95 x A 85 cm», «220x95x85», «Largura: 2,2 m», «Ø 110 cm» e o mesmo em inglês (W × D × H).
        </p>
      </div>

      {text.trim() && !parsed.ok && (
        <p className="paste-product__status" data-state="fail" role="status">
          Não encontrei o comprimento e a largura neste texto. Escreva-os abaixo ou cole as medidas da loja.
        </p>
      )}
      {parsed.ok && (
        <p className="paste-product__status" data-state="ok" role="status">
          Reconhecido: {cm(parsed.dimensions.width)} × {cm(parsed.dimensions.depth)}
          {parsed.dimensions.height !== undefined ? ` × ${cm(parsed.dimensions.height)}` : ''} cm
          {parsed.round ? ' (redondo)' : ''}, desenhado como «{getCatalogEntry(guessedId).name}».
        </p>
      )}

      <div className="paste-product__result" data-ready={ready || undefined}>
        <TextField label="Nome" value={name} maxLength={60} onChange={(value) => setEdits((e) => ({ ...e, name: value }))} />
        <Select label="Desenho e modelo 3D" value={catalogId} options={MODEL_OPTIONS} onChange={(id) => setEdits((e) => ({ ...e, catalogId: id }))} />
        <FieldGrid columns={3}>
          {['width', 'depth', 'height'].map((key) => (
            <NumberField
              key={key}
              label={LABELS[key]}
              unit="cm"
              precision={1}
              value={cm(dimensions[key])}
              min={(key === 'height' ? LIMITS.itemHeight.min : LIMITS.item.min) * 100}
              max={(key === 'height' ? LIMITS.itemHeight.max : LIMITS.item.max) * 100}
              onCommit={(value) => setDimension(key, value / 100)}
            />
          ))}
        </FieldGrid>
        {missingHeight && <p className="paste-product__hint">A altura não vinha no texto: fica a do modelo ({cm(entry.dimensions.height)} cm).</p>}
      </div>
    </Dialog>
  )
}
