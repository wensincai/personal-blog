import api from './config'

/**
 * 获取博客设置（需要登录）
 */
export async function getSettings() {
  const res = await api.get('/settings')
  return res.data
}

/**
 * 更新博客设置（需要登录）
 */
export async function updateSettings(data) {
  const res = await api.put('/settings', data)
  return res.data
}

/**
 * 公开获取博客设置（无需登录，用于主题预加载）
 */
export async function getPublicSettings() {
  const res = await fetch(`${api.defaults.baseURL}/settings/public`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  })
  if (!res.ok) throw new Error('获取公开设置失败')
  return res.json()
}
