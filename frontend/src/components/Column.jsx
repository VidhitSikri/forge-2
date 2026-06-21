import { useState } from 'react'
import Button from './Button'
import Card from './Card'
import CardFormModal from './CardFormModal'
import ConfirmDialog from './ConfirmDialog'
import Modal from './Modal'
import TextField from './TextField'
import { useKanban } from '../store/KanbanContext'

// Column accent colors cycling
const COLUMN_COLORS = [
  '#7c3aed',
  '#06b6d4',
  '#ec4899',
  '#10b981',
  '#f59e0b',
  '#a78bfa',
  '#f43f5e',
]

let columnColorIndex = 0
const columnColorMap = {}

function getColumnColor(id) {
  if (!columnColorMap[id]) {
    columnColorMap[id] = COLUMN_COLORS[columnColorIndex % COLUMN_COLORS.length]
    columnColorIndex++
  }
  return columnColorMap[id]
}

export default function Column({ column, dragHandlers, isDragOver = false, isAnyDragActive = false }) {
  const { actions, state } = useKanban()
  const [isEditing, setEditing] = useState(false)
  const [editName, setEditName] = useState(column.name)
  const [editOrder, setEditOrder] = useState(String(column.order))
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [cardModal, setCardModal] = useState(null)

  const cards = column.cards || []
  const accentColor = getColumnColor(column.id)

  async function saveEdit(e) {
    e.preventDefault()
    try {
      await actions.updateColumn(column.id, {
        name: editName.trim(),
        order: editOrder === '' ? undefined : Number(editOrder),
      })
      setEditing(false)
    } catch {
      /* error already flashed */
    }
  }

  function resolveDropPosition(event) {
    const cards = Array.from(event.currentTarget.querySelectorAll('[data-card-id]'))
    for (const el of cards) {
      const rect = el.getBoundingClientRect()
      const middleY = rect.top + rect.height / 2
      if (event.clientY < middleY) {
        return { beforeCardId: Number(el.dataset.cardId) }
      }
    }
    return { beforeCardId: null }
  }

  async function handleDrop(event) {
    if (!dragHandlers) return
    dragHandlers.handleColumnDragOver(column.id)(event)
    const raw =
      event.dataTransfer.getData('application/x-kanban-card') ||
      event.dataTransfer.getData('text/plain')
    const draggedCardId = Number(raw)
    if (!Number.isFinite(draggedCardId)) return

    const { beforeCardId } = resolveDropPosition(event)

    let sourceColumnId = null
    state.selectedBoard?.columns?.forEach((col) => {
      ;(col.cards || []).forEach((c) => {
        if (c.id === draggedCardId) sourceColumnId = col.id
      })
    })

    const targetCards = column.cards || []
    const withoutDragged = targetCards.filter((c) => c.id !== draggedCardId)

    let targetIndex
    if (beforeCardId == null) {
      targetIndex = withoutDragged.length
    } else {
      const idx = withoutDragged.findIndex((c) => c.id === beforeCardId)
      targetIndex = idx === -1 ? withoutDragged.length : idx
    }
    const targetPosition = targetIndex + 1

    if (sourceColumnId === column.id) {
      const newOrder = [...withoutDragged]
      newOrder.splice(targetIndex, 0, { id: draggedCardId })
      try {
        await actions.reorderCards(column.id, newOrder.map((c) => c.id))
      } catch {
        /* error already flashed */
      }
    } else {
      try {
        await actions.moveCard(draggedCardId, column.id, targetPosition)
      } catch {
        /* error already flashed */
      }
    }
  }

  return (
    <section
      className={`column ${isDragOver ? 'column--drag-over' : ''} ${isAnyDragActive && !isDragOver ? 'column--drag-active' : ''}`}
      aria-label={`Column ${column.name}`}
      onDragOver={dragHandlers?.handleColumnDragOver(column.id)}
      onDragLeave={dragHandlers?.handleColumnDragLeave(column.id)}
      onDrop={dragHandlers ? handleDrop : undefined}
    >
      <header className="column__header">
        <div className="column__title-wrap">
          <span
            className="column__color-dot"
            style={{ background: accentColor, boxShadow: `0 0 6px ${accentColor}` }}
          />
          <h3 className="column__title">{column.name}</h3>
        </div>
        <span className="column__count">{cards.length}</span>
      </header>

      <div className="column__cards">
        {cards.length === 0 ? (
          <p className="column__empty">
            {isDragOver ? '✦ Drop here' : 'No cards yet'}
          </p>
        ) : (
          cards.map((c) => (
            <Card
              key={c.id}
              card={c}
              draggable={!!dragHandlers}
              onDragStart={dragHandlers?.handleDragStart(c)}
              onDragEnd={dragHandlers?.handleDragEnd}
              isDragging={dragHandlers?.draggingCardId === c.id}
              onEdit={(card) => setCardModal({ mode: 'edit', card })}
              onDelete={async (card) => {
                if (window.confirm(`Delete card "${card.title}"?`)) {
                  await actions.deleteCard(card.id, column.id)
                }
              }}
            />
          ))
        )}
      </div>

      <footer className="column__footer">
        <Button
          size="sm"
          variant="primary"
          id={`btn-add-card-${column.id}`}
          onClick={() => setCardModal({ mode: 'create' })}
        >
          + Add Card
        </Button>
        <div className="column__footer-right">
          <Button
            size="sm"
            variant="ghost"
            id={`btn-edit-column-${column.id}`}
            onClick={() => {
              setEditName(column.name)
              setEditOrder(String(column.order))
              setEditing(true)
            }}
          >
            ✎
          </Button>
          <Button
            size="sm"
            variant="danger"
            id={`btn-delete-column-${column.id}`}
            onClick={() => setConfirmDelete(true)}
          >
            ✕
          </Button>
        </div>
      </footer>

      <Modal title="Edit Column" open={isEditing} onClose={() => setEditing(false)}>
        <form onSubmit={saveEdit} className="form">
          <TextField label="Name" name="name" value={editName} onChange={setEditName} required autoFocus />
          <TextField label="Order" name="order" type="number" value={editOrder} onChange={setEditOrder} />
          <div className="form__actions">
            <Button variant="ghost" onClick={() => setEditing(false)} type="button">
              Cancel
            </Button>
            <Button id="btn-save-column" type="submit" loading={state.loading.action}>
              Save
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        title="Delete column?"
        message={`This will permanently delete "${column.name}" and all its cards.`}
        confirmLabel="Delete"
        danger
        open={confirmDelete}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={async () => {
          setConfirmDelete(false)
          await actions.deleteColumn(column.id)
        }}
      />

      <CardFormModal
        key={`${cardModal?.mode ?? 'none'}-${cardModal?.card?.id ?? 'new'}`}
        column={column}
        state={cardModal}
        onClose={() => setCardModal(null)}
      />
    </section>
  )
}
