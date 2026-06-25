import Button from './Button'
import { TAG_PRESETS } from './CardFormModal'

function formatDueDate(iso) {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function isOverdue(iso) {
  if (!iso) return false
  return new Date(iso).getTime() < Date.now()
}

function tagColor(label) {
  const preset = TAG_PRESETS.find((p) => p.label === label)
  return preset?.color ?? '#64748b'
}

export default function Card({ card, onEdit, onDelete, draggable = false, onDragStart, onDragEnd, isDragging = false }) {
  const dueLabel = formatDueDate(card.due_date)
  const overdue = isOverdue(card.due_date)
  const tags = card.tags || []
  const members = card.members || []

  return (
    <article
      className={`card ${overdue ? 'card--overdue' : ''} ${isDragging ? 'card--dragging' : ''}`}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      data-card-id={card.id}
      aria-grabbed={isDragging || undefined}
    >
      {draggable ? (
        <span className="card__drag-handle" aria-hidden title="Drag to move">
          ⠿
        </span>
      ) : null}

      <h4 className="card__title">{card.title}</h4>

      {card.description ? (
        <p className="card__description">{card.description}</p>
      ) : null}

      {/* Tags row */}
      {tags.length > 0 ? (
        <div className="card__tags">
          {tags.map((tag) => (
            <span
              key={tag}
              className="tag-chip tag-chip--display"
              style={{ '--tag-color': tagColor(tag) }}
            >
              {tag}
            </span>
          ))}
        </div>
      ) : null}

      {/* Due date */}
      {dueLabel ? (
        <div className={`card__due ${overdue ? 'card__due--overdue' : ''}`}>
          <span aria-hidden>📅</span>
          <span>{overdue ? `Overdue · ${dueLabel}` : dueLabel}</span>
        </div>
      ) : null}

      {/* Members row */}
      {members.length > 0 ? (
        <div className="card__members">
          {members.map((m) => (
            <span
              key={m.name}
              className="member-avatar member-avatar--sm"
              style={{ background: m.color }}
              title={m.name}
            >
              {m.initials}
            </span>
          ))}
        </div>
      ) : null}

      <footer className="card__actions">
        <Button size="sm" variant="ghost" id={`btn-edit-card-${card.id}`} onClick={() => onEdit?.(card)}>
          Edit
        </Button>
        <Button size="sm" variant="danger" id={`btn-delete-card-${card.id}`} onClick={() => onDelete?.(card)}>
          Delete
        </Button>
      </footer>
    </article>
  )
}
