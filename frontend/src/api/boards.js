import { api } from './client'

export const boardsApi = {
  list: () => api.get('/boards'),
  get: (id) => api.get(`/boards/${id}`),
  create: (payload) => api.post('/boards', payload),
  update: (id, payload) => api.patch(`/boards/${id}`, payload),
  remove: (id) => api.del(`/boards/${id}`),
}
