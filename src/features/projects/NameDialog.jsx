import { useState } from 'react'
import { Button, Dialog, TextField } from '@/components/ui'
import { LIMITS } from '@/core/model'

/** Pede um nome (mudar o nome de um projeto ou de uma disposição). */
export function NameDialog({ open, title, label = 'Nome', initialName = '', confirmLabel = 'Guardar', onConfirm, onCancel }) {
  return open ? (
    <NameDialogContent title={title} label={label} initialName={initialName} confirmLabel={confirmLabel} onConfirm={onConfirm} onCancel={onCancel} />
  ) : null
}

function NameDialogContent({ title, label, initialName, confirmLabel, onConfirm, onCancel }) {
  const [name, setName] = useState(initialName)
  const [error, setError] = useState(null)
  const submit = (event) => {
    event.preventDefault()
    if (!name.trim()) {
      setError('Escreva um nome.')
      return
    }
    onConfirm(name.trim())
  }
  return (
    <Dialog
      open
      title={title}
      onClose={onCancel}
      size="sm"
      footer={
        <>
          <Button onClick={onCancel}>Cancelar</Button>
          <Button variant="primary" type="submit" form="name-dialog-form">
            {confirmLabel}
          </Button>
        </>
      }
    >
      <form id="name-dialog-form" onSubmit={submit} noValidate>
        <TextField
          label={label}
          value={name}
          maxLength={LIMITS.projectName.maxLength}
          autoFocus
          error={error}
          onFocus={(event) => event.target.select()}
          onChange={(value) => {
            setName(value)
            setError(null)
          }}
        />
      </form>
    </Dialog>
  )
}
