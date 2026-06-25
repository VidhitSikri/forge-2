import { useState } from 'react'
import Button from './Button'
import Modal from './Modal'
import TextField from './TextField'
import { useKanban } from '../store/KanbanContext'

// Predefined tag options with colors
export const TAG_PRESETS = [
  { label: 'Bug',       color: '#f43f5e' },
  { label: 'Feature',   color: '#7c3aed' },
  { label: 'Urgent',    color: '#f59e0b' },
  { label: 'Design',    color: '#06b6d4' },
  { label: 'Backend',   color: '#10b981' },
  { label: 'Frontend',  color: '#ec4899' },
  { label: 'Research',  color: '#a78bfa' },
  { label: 'Blocked',   color: '#ef4444' },
  { label: 'Review',    color: '#3b82f6' },
  { label: 'Testing',   color: '#84cc16' },
]

// Generate a deterministic color from a name string
function colorFromName(name) {
  const palette = [
    '#7c3aed', '#06b6d4', '#ec4899', '#10b981',
    '#f59e0b', '#a78bfa', '#f43f5e', '#3b82f6',
    '#14b8a6', '#f97316',
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return palette[Math.abs(hash) % palette.length]
}

function initials(name) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
}

export default function CardFormModal({ column, state, onClose }) {
  const { actions } = useKanban()
  if (!state) return null
  const isEdit = state.mode === 'edit'
  const initial = isEdit
    ? state.card
    : { title: '', description: '', due_date: '', tags: [], members: [] }

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
  const [tags, setTags] = useState(initial.tags || [])
  const [members, setMembers] = useState(initial.members || [])
  const [memberInput, setMemberInput] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (!open) return null

  // --- Tag helpers ---
  function toggleTag(label) {
    setTags((prev) =>
      prev.includes(label) ? prev.filter((t) => t !== label) : [...prev, label]
    )
  }

  // --- Member helpers ---
  function addMember() {
    const name = memberInput.trim()
    if (!name) return
    if (members.some((m) => m.name.toLowerCase() === name.toLowerCase())) {
      setMemberInput('')
      return
    }
    setMembers((prev) => [
      ...prev,
      { name, initials: initials(name), color: colorFromName(name) },
    ])
    setMemberInput('')
  }

  function removeMember(name) {
    setMembers((prev) => prev.filter((m) => m.name !== name))
  }

  function handleMemberKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault()
      addMember()
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim() || null,
        due_date: dueDate ? toIsoFromLocalDateTimeInput(dueDate) : null,
        tags,
        members,
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

        {/* ---- Tags ---- */}
        <div className="field">
          <span className="field__label">Tags</span>
          <div className="tag-picker">
            {TAG_PRESETS.map((preset) => {
              const active = tags.includes(preset.label)
              return (
                <button
                  key={preset.label}
                  type="button"
                  className={`tag-chip tag-chip--pick ${active ? 'tag-chip--active' : ''}`}
                  style={{ '--tag-color': preset.color }}
                  onClick={() => toggleTag(preset.label)}
                  aria-pressed={active}
                >
                  {preset.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* ---- Members ---- */}
        <div className="field">
          <span className="field__label">Members</span>
          <div className="member-input-row">
            <input
              type="text"
              className="field__input"
              placeholder="Type a name and press Enter"
              value={memberInput}
              onChange={(e) => setMemberInput(e.target.value)}
              onKeyDown={handleMemberKeyDown}
              id="member-input"
            />
            <Button type="button" variant="ghost" size="sm" onClick={addMember}>
              Add
            </Button>
          </div>
          {members.length > 0 && (
            <div className="member-list">
              {members.map((m) => (
                <div key={m.name} className="member-tag">
                  <span
                    className="member-avatar"
                    style={{ background: m.color }}
                    title={m.name}
                  >
                    {m.initials}
                  </span>
                  <span className="member-name">{m.name}</span>
                  <button
                    type="button"
                    className="member-remove"
                    onClick={() => removeMember(m.name)}
                    aria-label={`Remove ${m.name}`}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

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
