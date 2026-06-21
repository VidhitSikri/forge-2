import { api } from './client'

export const cardsApi = {
  listForColumn: (columnId) => api.get(`/columns/${columnId}/cards`),
  get: (id) => api.get(`/cards/${id}`),
  create: (columnId, payload) => api.post(`/columns/${columnId}/cards`, payload),
  update: (id, payload) => api.patch(`/cards/${id}`, payload),
  remove: (id) => api.del(`/cards/${id}`),
  move: (id, targetColumnId, position = null) =>
    api.post(`/cards/${id}/move`, {
      target_column_id: targetColumnId,
      ...(position != null ? { position } : {}),
    }),
}

export const columnsApiExtra = {
  reorderCards: (columnId, cardIds) =>
    api.post(`/columns/${columnId}/cards/reorder`, { card_ids: cardIds }),
}
