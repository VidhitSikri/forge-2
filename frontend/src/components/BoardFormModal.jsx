import { useEffect, useState } from 'react'
import Button from './Button'
import Modal from './Modal'
import TextField from './TextField'

export default function BoardFormModal({ open, mode, initial, onClose, onSubmit }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    setName(initial?.name ?? '')
    setDescription(initial?.description ?? '')
    setSubmitting(false)
  }, [open, initial])

  if (!open) return null
  const isEdit = mode === 'edit'

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    try {
      await onSubmit({
        name: name.trim(),
        description: description.trim() || null,
      })
      onClose?.()
    } catch {
      /* error already flashed */
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal title={isEdit ? 'Edit board' : 'New board'} open={open} onClose={onClose}>
      <form onSubmit={handleSubmit} className="form">
        <TextField label="Name" name="name" value={name} onChange={setName} required autoFocus />
        <TextField
          label="Description"
          name="description"
          type="textarea"
          value={description}
          onChange={setDescription}
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
