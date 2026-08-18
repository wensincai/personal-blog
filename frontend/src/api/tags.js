// 标签相关 API
import api from './config'

export const tagsApi = {
  getTags: () => api.get('/tags/'),
  createTag: (data) => api.post('/tags/', data),
  deleteTag: (id) => api.delete(`/tags/${id}`)
}
