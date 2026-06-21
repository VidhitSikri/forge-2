import { useCallback, useState } from 'react'

/**
 * Lightweight HTML5 drag-and-drop hook for the Kanban board.
 *
 * Why this exists:
 *  - We don't want a heavy DnD library; HTML5 DnD is sufficient for this scope.
 *  - Centralizes the drag state + handler wiring so Card and Column stay simple.
 *
 * Contract:
 *  - `draggable`  — set on the drag handle (the Card).
 *  - `onDragStart` / `onDragEnd` — handler props.
 *  - `dragOver` / `dragLeave` / `drop` — handler props for drop targets (the Column).
 *  - `getDragData()` returns the in-flight drag payload (Card being dragged).
 */
export function useDragDrop({ onDrop }) {
  const [dragOverColumnId, setDragOverColumnId] = useState(null)
  const [draggingCardId, setDraggingCardId] = useState(null)

  const handleDragStart = useCallback((card) => (event) => {
    // Required for Firefox to initiate drag.
    event.dataTransfer.effectAllowed = 'move'
    // Custom MIME key keeps the payload local to this app.
    event.dataTransfer.setData('application/x-kanban-card', String(card.id))
    // Fallback for browsers that ignore setData on read.
    event.dataTransfer.setData('text/plain', String(card.id))
    setDraggingCardId(card.id)
  }, [])

  const handleDragEnd = useCallback(() => {
    setDraggingCardId(null)
    setDragOverColumnId(null)
  }, [])

  const handleColumnDragOver = useCallback((columnId) => (event) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    setDragOverColumnId(columnId)
  }, [])

  const handleColumnDragLeave = useCallback((columnId) => (event) => {
    // Ignore leave events that bubble up from children; only react when we actually leave the column box.
    if (event.currentTarget.contains(event.relatedTarget)) return
    setDragOverColumnId((current) => (current === columnId ? null : current))
  }, [])

  const handleColumnDrop = useCallback(
    (column) => (event) => {
      event.preventDefault()
      const raw =
        event.dataTransfer.getData('application/x-kanban-card') ||
        event.dataTransfer.getData('text/plain')
      const draggedCardId = Number(raw)
      setDragOverColumnId(null)
      setDraggingCardId(null)
      if (!Number.isFinite(draggedCardId)) return
      onDrop?.({ cardId: draggedCardId, targetColumn: column, event })
    },
    [onDrop],
  )

  return {
    dragOverColumnId,
    draggingCardId,
    handleDragStart,
    handleDragEnd,
    handleColumnDragOver,
    handleColumnDragLeave,
    handleColumnDrop,
  }
}
