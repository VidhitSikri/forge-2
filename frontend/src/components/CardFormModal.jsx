import { useState } from 'react'
import Button from './Button'
import Modal from './Modal'
import TextField from './TextField'
import { useKanban } from '../store/KanbanContext'

export default function CardFormModal({ column, state, onClose }) {
  const { actions } = useKanban()
  if (!state) return null
  const isEdit = state.mode === 'edit'
  const initial = isEdit ? state.card : { title: '', description: '', due_date: '' }

  return (
    <CardFormModalBase
      column={column}
      open={true}
      onClose={onClose}
      initial={initial}
      isEdit={isEdit}
      onSubmit={async (payload) => {
        if (isEdit) {
          await actions.updateCard(state.card.id, payload)
        } else {
          await actions.createCard(column.id, payload)
        }
      }}
    />
  )
}

function CardFormModalBase({ column, open, onClose, initial, isEdit, onSubmit }) {
  const [title, setTitle] = useState(initial.title || '')
  const [description, setDescription] = useState(initial.description || '')
  const [dueDate, setDueDate] = useState(toLocalDateTimeInputValue(initial.due_date))
  const [submitting, setSubmitting] = useState(false)

  if (!open) return null

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim() || null,
        due_date: dueDate ? toIsoFromLocalDateTimeInput(dueDate) : null,
      })
      onClose?.()
    } catch {
      /* error already flashed */
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      title={isEdit ? `Edit card in "${column.name}"` : `New card in "${column.name}"`}
      open={open}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="form">
        <TextField label="Title" name="title" value={title} onChange={setTitle} required autoFocus />
        <TextField
          label="Description"
          name="description"
          type="textarea"
          value={description}
          onChange={setDescription}
        />
        <TextField
          label="Due date"
          name="due_date"
          type="datetime-local"
          value={dueDate}
          onChange={setDueDate}
        />
        <div className="form__actions">
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={submitting}>
            {isEdit ? 'Save' : 'Create'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

function toLocalDateTimeInputValue(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function toIsoFromLocalDateTimeInput(local) {
  if (!local) return null
  const d = new Date(local)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString()
}
