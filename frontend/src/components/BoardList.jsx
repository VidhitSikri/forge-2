import { useState } from 'react'
import BoardFormModal from './BoardFormModal'
import Button from './Button'
import EmptyState from './EmptyState'
import { BoardListSkeleton } from './Skeleton'
import { useKanban } from '../store/KanbanContext'

// Rotating accent gradients for board cards
const BOARD_GRADIENTS = [
  'linear-gradient(135deg, #7c3aed, #4f46e5)',
  'linear-gradient(135deg, #06b6d4, #0891b2)',
  'linear-gradient(135deg, #ec4899, #db2777)',
  'linear-gradient(135deg, #10b981, #059669)',
  'linear-gradient(135deg, #f59e0b, #d97706)',
  'linear-gradient(135deg, #8b5cf6, #ec4899)',
]

export default function BoardList() {
  const { state, actions } = useKanban()
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)

  if (state.loading.boards) return <BoardListSkeleton />

  return (
    <div className="board-list">
      <header className="board-list__header">
        <div className="board-list__heading">
          <h1 className="board-list__title">My Boards</h1>
          <p className="board-list__subtitle">
            {state.boards.length === 0
              ? 'No boards yet — create your first one'
              : `${state.boards.length} board${state.boards.length !== 1 ? 's' : ''} total`}
          </p>
        </div>
        <Button id="btn-new-board" onClick={() => setCreating(true)}>
          + New Board
        </Button>
      </header>

      {state.boards.length === 0 ? (
        <EmptyState
          icon="🗂️"
          title="No boards yet"
          message="Create your first Kanban board to start organizing your work."
          action={<Button id="btn-new-board-empty" onClick={() => setCreating(true)}>+ New Board</Button>}
        />
      ) : (
        <ul className="board-list__items" role="list">
          {state.boards.map((board, idx) => (
            <li key={board.id} className="board-list__item">
              <div
                className="board-list__item-accent"
                style={{ background: BOARD_GRADIENTS[idx % BOARD_GRADIENTS.length] }}
              />
              <div className="board-list__item-content">
                <button
                  type="button"
                  id={`btn-board-${board.id}`}
                  className="board-list__item-main"
                  onClick={() => actions.selectBoard(board.id)}
                >
                  <h3 className="board-list__item-name">{board.name}</h3>
                  {board.description ? (
                    <p className="board-list__item-desc">{board.description}</p>
                  ) : (
                    <p className="board-list__item-desc board-list__item-desc--muted">
                      No description.
                    </p>
                  )}
                </button>
              </div>
              <div className="board-list__item-footer">
                <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>
                  {board.columns?.length ?? 0} columns
                </span>
                <div className="board-list__item-actions">
                  <Button
                    size="sm"
                    variant="ghost"
                    id={`btn-edit-board-${board.id}`}
                    onClick={() => setEditing(board)}
                    aria-label={`Edit board ${board.name}`}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    id={`btn-delete-board-${board.id}`}
                    onClick={() => setConfirmDelete(board)}
                    aria-label={`Delete board ${board.name}`}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <BoardFormModal
        open={creating}
        mode="create"
        onClose={() => setCreating(false)}
        onSubmit={async (payload) => {
          await actions.createBoard(payload)
        }}
      />

      <BoardFormModal
        open={!!editing}
        mode="edit"
        initial={editing}
        onClose={() => setEditing(null)}
        onSubmit={async (payload) => {
          await actions.updateBoard(editing.id, payload)
        }}
      />

      {confirmDelete ? (
        <div className="confirm-dialog-overlay" onClick={() => setConfirmDelete(null)}>
          <div
            className="confirm-dialog"
            role="alertdialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="confirm-dialog__icon">🗑️</div>
            <div>
              <h2 className="confirm-dialog__title">Delete board?</h2>
              <p className="confirm-dialog__message">
                This will permanently delete <strong style={{ color: 'var(--text-primary)' }}>{confirmDelete.name}</strong> and all of its columns and cards.
              </p>
            </div>
            <div className="confirm-dialog__actions">
              <Button variant="ghost" onClick={() => setConfirmDelete(null)}>
                Cancel
              </Button>
              <Button
                id="btn-confirm-delete-board"
                variant="danger"
                onClick={async () => {
                  const b = confirmDelete
                  setConfirmDelete(null)
                  await actions.deleteBoard(b.id)
                }}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
