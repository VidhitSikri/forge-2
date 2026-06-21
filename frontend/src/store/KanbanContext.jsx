import { createContext, useCallback, useContext, useEffect, useReducer, useRef } from 'react'
import { boardsApi } from '../api/boards'
import { columnsApi } from '../api/columns'
import { cardsApi, columnsApiExtra } from '../api/cards'
import { ApiError } from '../api/client'

const KanbanContext = createContext(null)

// ---------------- State / reducer ----------------

const initialState = {
  boards: [],
  selectedBoardId: null,
  selectedBoard: null, // includes columns + cards
  loading: {
    boards: false,
    board: false,
    action: false, // generic busy flag for write operations
  },
  error: null, // global banner error
}

function reducer(state, action) {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: { ...state.loading, ...action.payload } }
    case 'SET_ERROR':
      return { ...state, error: action.payload }
    case 'BOARDS_LOADED':
      return { ...state, boards: action.payload }
    case 'BOARD_SELECTED':
      return { ...state, selectedBoardId: action.payload }
    case 'BOARD_LOADED':
      return {
        ...state,
        selectedBoard: action.payload,
        selectedBoardId: action.payload?.id ?? state.selectedBoardId,
      }
    case 'BOARD_UPSERTED': {
      // Update the board in the list (lightweight), and the selectedBoard if matching.
      const board = action.payload
      const exists = state.boards.some((b) => b.id === board.id)
      const boards = exists
        ? state.boards.map((b) => (b.id === board.id ? { ...b, ...board } : b))
        : [...state.boards, board]
      const selectedBoard =
        state.selectedBoard?.id === board.id ? { ...state.selectedBoard, ...board } : state.selectedBoard
      return { ...state, boards, selectedBoard }
    }
    case 'BOARD_REMOVED': {
      const id = action.payload
      return {
        ...state,
        boards: state.boards.filter((b) => b.id !== id),
        selectedBoardId: state.selectedBoardId === id ? null : state.selectedBoardId,
        selectedBoard: state.selectedBoard?.id === id ? null : state.selectedBoard,
      }
    }
    case 'COLUMN_UPSERTED': {
      const col = action.payload
      if (!state.selectedBoard) return state
      const cols = state.selectedBoard.columns || []
      const exists = cols.some((c) => c.id === col.id)
      const columns = exists ? cols.map((c) => (c.id === col.id ? { ...c, ...col } : c)) : [...cols, col]
      // Sort by 'order' to mirror backend.
      columns.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      return { ...state, selectedBoard: { ...state.selectedBoard, columns } }
    }
    case 'COLUMN_REMOVED': {
      const id = action.payload
      if (!state.selectedBoard) return state
      const columns = (state.selectedBoard.columns || []).filter((c) => c.id !== id)
      return { ...state, selectedBoard: { ...state.selectedBoard, columns } }
    }
    case 'COLUMN_REPLACED': {
      const updated = action.payload
      if (!state.selectedBoard) return state
      const columns = (state.selectedBoard.columns || []).map((c) =>
        c.id === updated.id ? { ...c, ...updated, cards: updated.cards || c.cards } : c,
      )
      return { ...state, selectedBoard: { ...state.selectedBoard, columns } }
    }
    case 'CARD_UPSERTED': {
      const card = action.payload
      if (!state.selectedBoard) return state
      const columns = (state.selectedBoard.columns || []).map((col) => {
        // Remove card from all columns except the target one
        if (col.id !== card.column_id) {
          return { ...col, cards: (col.cards || []).filter((c) => c.id !== card.id) }
        }
        // Add/update card in the target column
        const cards = col.cards || []
        const exists = cards.some((c) => c.id === card.id)
        const next = exists ? cards.map((c) => (c.id === card.id ? { ...c, ...card } : c)) : [...cards, card]
        next.sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
        return { ...col, cards: next }
      })
      return { ...state, selectedBoard: { ...state.selectedBoard, columns } }
    }
    case 'CARD_REMOVED': {
      const { id, columnId } = action.payload
      if (!state.selectedBoard) return state
      const columns = (state.selectedBoard.columns || []).map((col) =>
        col.id === columnId ? { ...col, cards: (col.cards || []).filter((c) => c.id !== id) } : col,
      )
      return { ...state, selectedBoard: { ...state.selectedBoard, columns } }
    }
    default:
      return state
  }
}

// ---------------- Provider ----------------

export function KanbanProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState)
  const errorTimer = useRef(null)

  const flashError = useCallback((message) => {
    dispatch({ type: 'SET_ERROR', payload: message })
    if (errorTimer.current) clearTimeout(errorTimer.current)
    errorTimer.current = setTimeout(() => dispatch({ type: 'SET_ERROR', payload: null }), 5000)
  }, [])

  const clearError = useCallback(() => dispatch({ type: 'SET_ERROR', payload: null }), [])

  // Load boards list on mount.
  useEffect(() => {
    let cancelled = false
    async function load() {
      dispatch({ type: 'SET_LOADING', payload: { boards: true } })
      try {
        const list = await boardsApi.list()
        if (!cancelled) dispatch({ type: 'BOARDS_LOADED', payload: list })
      } catch (err) {
        if (!cancelled) flashError(humanError(err))
      } finally {
        if (!cancelled) dispatch({ type: 'SET_LOADING', payload: { boards: false } })
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [flashError])

  // Load full board (with columns + cards) when selected.
  useEffect(() => {
    if (state.selectedBoardId == null) {
      dispatch({ type: 'BOARD_LOADED', payload: null })
      return
    }
    let cancelled = false
    async function load() {
      dispatch({ type: 'SET_LOADING', payload: { board: true } })
      try {
        const board = await boardsApi.get(state.selectedBoardId)
        if (!cancelled) dispatch({ type: 'BOARD_LOADED', payload: board })
      } catch (err) {
        if (!cancelled) flashError(humanError(err))
      } finally {
        if (!cancelled) dispatch({ type: 'SET_LOADING', payload: { board: false } })
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [state.selectedBoardId, flashError])

  // ---------------- Actions ----------------

  const selectBoard = useCallback((id) => dispatch({ type: 'BOARD_SELECTED', payload: id }), [])

  const createBoard = useCallback(
    async (payload) => {
      dispatch({ type: 'SET_LOADING', payload: { action: true } })
      try {
        const board = await boardsApi.create(payload)
        dispatch({ type: 'BOARD_UPSERTED', payload: board })
        dispatch({ type: 'BOARD_SELECTED', payload: board.id })
        return board
      } catch (err) {
        flashError(humanError(err))
        throw err
      } finally {
        dispatch({ type: 'SET_LOADING', payload: { action: false } })
      }
    },
    [flashError],
  )

  const updateBoard = useCallback(
    async (id, payload) => {
      dispatch({ type: 'SET_LOADING', payload: { action: true } })
      try {
        const board = await boardsApi.update(id, payload)
        dispatch({ type: 'BOARD_UPSERTED', payload: board })
        return board
      } catch (err) {
        flashError(humanError(err))
        throw err
      } finally {
        dispatch({ type: 'SET_LOADING', payload: { action: false } })
      }
    },
    [flashError],
  )

  const deleteBoard = useCallback(
    async (id) => {
      dispatch({ type: 'SET_LOADING', payload: { action: true } })
      try {
        await boardsApi.remove(id)
        dispatch({ type: 'BOARD_REMOVED', payload: id })
      } catch (err) {
        flashError(humanError(err))
        throw err
      } finally {
        dispatch({ type: 'SET_LOADING', payload: { action: false } })
      }
    },
    [flashError],
  )

  const createColumn = useCallback(
    async (boardId, payload) => {
      dispatch({ type: 'SET_LOADING', payload: { action: true } })
      try {
        const col = await columnsApi.create(boardId, payload)
        dispatch({ type: 'COLUMN_UPSERTED', payload: col })
        return col
      } catch (err) {
        flashError(humanError(err))
        throw err
      } finally {
        dispatch({ type: 'SET_LOADING', payload: { action: false } })
      }
    },
    [flashError],
  )

  const updateColumn = useCallback(
    async (id, payload) => {
      dispatch({ type: 'SET_LOADING', payload: { action: true } })
      try {
        const col = await columnsApi.update(id, payload)
        dispatch({ type: 'COLUMN_UPSERTED', payload: col })
        return col
      } catch (err) {
        flashError(humanError(err))
        throw err
      } finally {
        dispatch({ type: 'SET_LOADING', payload: { action: false } })
      }
    },
    [flashError],
  )

  const deleteColumn = useCallback(
    async (id) => {
      dispatch({ type: 'SET_LOADING', payload: { action: true } })
      try {
        await columnsApi.remove(id)
        dispatch({ type: 'COLUMN_REMOVED', payload: id })
      } catch (err) {
        flashError(humanError(err))
        throw err
      } finally {
        dispatch({ type: 'SET_LOADING', payload: { action: false } })
      }
    },
    [flashError],
  )

  const createCard = useCallback(
    async (columnId, payload) => {
      dispatch({ type: 'SET_LOADING', payload: { action: true } })
      try {
        const card = await cardsApi.create(columnId, payload)
        dispatch({ type: 'CARD_UPSERTED', payload: card })
        return card
      } catch (err) {
        flashError(humanError(err))
        throw err
      } finally {
        dispatch({ type: 'SET_LOADING', payload: { action: false } })
      }
    },
    [flashError],
  )

  const updateCard = useCallback(
    async (id, payload) => {
      dispatch({ type: 'SET_LOADING', payload: { action: true } })
      try {
        const card = await cardsApi.update(id, payload)
        dispatch({ type: 'CARD_UPSERTED', payload: card })
        return card
      } catch (err) {
        flashError(humanError(err))
        throw err
      } finally {
        dispatch({ type: 'SET_LOADING', payload: { action: false } })
      }
    },
    [flashError],
  )

  const deleteCard = useCallback(
    async (id, columnId) => {
      dispatch({ type: 'SET_LOADING', payload: { action: true } })
      try {
        await cardsApi.remove(id)
        dispatch({ type: 'CARD_REMOVED', payload: { id, columnId } })
      } catch (err) {
        flashError(humanError(err))
        throw err
      } finally {
        dispatch({ type: 'SET_LOADING', payload: { action: false } })
      }
    },
    [flashError],
  )

  const moveCard = useCallback(
    async (cardId, targetColumnId, position = null) => {
      dispatch({ type: 'SET_LOADING', payload: { action: true } })
      try {
        const card = await cardsApi.move(cardId, targetColumnId, position)
        dispatch({ type: 'CARD_UPSERTED', payload: card })
        return card
      } catch (err) {
        flashError(humanError(err))
        throw err
      } finally {
        dispatch({ type: 'SET_LOADING', payload: { action: false } })
      }
    },
    [flashError],
  )

  const reorderCards = useCallback(
    async (columnId, cardIds) => {
      dispatch({ type: 'SET_LOADING', payload: { action: true } })
      try {
        const column = await columnsApiExtra.reorderCards(columnId, cardIds)
        // The reorder endpoint returns the full column payload with cards in the new order.
        dispatch({ type: 'COLUMN_REPLACED', payload: column })
        return column
      } catch (err) {
        flashError(humanError(err))
        throw err
      } finally {
        dispatch({ type: 'SET_LOADING', payload: { action: false } })
      }
    },
    [flashError],
  )

  const value = {
    state,
    actions: {
      selectBoard,
      createBoard,
      updateBoard,
      deleteBoard,
      createColumn,
      updateColumn,
      deleteColumn,
      createCard,
      updateCard,
      deleteCard,
      moveCard,
      reorderCards,
    },
    clearError,
  }

  return <KanbanContext.Provider value={value}>{children}</KanbanContext.Provider>
}

export function useKanban() {
  const ctx = useContext(KanbanContext)
  if (!ctx) throw new Error('useKanban must be used within KanbanProvider')
  return ctx
}

// ---------------- Helpers ----------------

function humanError(err) {
  if (err instanceof ApiError) {
    if (err.errors && Object.keys(err.errors).length > 0) {
      const first = Object.values(err.errors)[0]
      return Array.isArray(first) ? first[0] : String(first)
    }
    return err.message
  }
  if (err instanceof Error) return err.message
  return 'Something went wrong.'
}
