// 认证相关 API
import api from './config'

export const authApi = {
  // 登录
  login: (username, password) => {
    return api.post('/auth/login', { username, password })
  },

  // 退出登录（同时清除后端 SSO Cookie）
  logout: () => {
    return api.post('/auth/logout')
  },

  // 获取当前用户
  getMe: () => {
    return api.get('/auth/me')
  },

  // 修改密码
  changePassword: (oldPassword, newPassword) => {
    return api.post('/auth/change-password', {
      old_password: oldPassword,
      new_password: newPassword
    })
  }
}
