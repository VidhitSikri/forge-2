import { api } from './client'

export const columnsApi = {
  listForBoard: (boardId) => api.get(`/boards/${boardId}/columns`),
  get: (id) => api.get(`/columns/${id}`),
  create: (boardId, payload) => api.post(`/boards/${boardId}/columns`, payload),
  update: (id, payload) => api.patch(`/columns/${id}`, payload),
  remove: (id) => api.del(`/columns/${id}`),
}
