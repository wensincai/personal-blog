// 登录页面 - Preline UI 风格
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card } from '../components-preline/Card'
import { Button } from '../components-preline/Button'
import { Input, Label } from '../components-preline/Input'
import { authApi } from '../api/auth'

export function Login() {
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  
  // 自动检测：如果已有本地 token，或 SSO Cookie 已登录，则跳转
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      navigate('/admin')
      return
    }
    // 无本地 token 时，尝试用 SSO Cookie 调用 /api/auth/me
    authApi.getMe()
      .then(() => navigate('/admin'))
      .catch(() => {
        // SSO 也未登录，留在登录页
      })
  }, [navigate])
  
  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    
    try {
      const response = await authApi.login(username, password)
      localStorage.setItem('token', response.data.access_token)
      localStorage.setItem('user', JSON.stringify({ username }))
      navigate('/admin')
    } catch (err) {
      setError(err.response?.data?.detail || '登录失败')
    } finally {
      setLoading(false)
    }
  }
  
  const handleSSOLogin = () => {
    // 跳转到 SSO 中心，携带 redirect 参数（SSO 地址见 .env.example）
    const redirect = window.location.origin
    const ssoUrl = import.meta.env.VITE_SSO_URL || 'http://localhost:9000'
    window.location.href = `${ssoUrl}/?redirect=${encodeURIComponent(redirect + '/admin')}`
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl shadow-lg mb-4">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">个人博客</h1>
          <p className="text-gray-500 mt-1">管理系统</p>
        </div>
        
        <Card className="shadow-xl">
          <div className="p-8">
            <div className="text-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">管理员登录</h2>
              <p className="text-sm text-gray-500 mt-1">请输入您的账号密码</p>
            </div>
            
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm text-red-700">{error}</span>
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <Label htmlFor="username" required>用户名</Label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <Input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="请输入用户名"
                    required
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="password" required>密码</Label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="请输入密码"
                    required
                    className="pl-10"
                  />
                </div>
              </div>
              
              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full mt-2"
                loading={loading}
              >
                {loading ? '登录中...' : '登录'}
              </Button>
            </form>
            
            {/* SSO 登录入口 */}
            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">或使用</span>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="w-full mt-4"
                onClick={handleSSOLogin}
              >
                🔐 SSO 统一登录
              </Button>
            </div>
          </div>
          
          {/* Footer */}
          <div className="px-8 py-4 bg-gray-50 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-500">
              © {new Date().getFullYear()} 个人博客 · All rights reserved
            </p>
          </div>
        </Card>
      </div>
    </div>
  )
}

export default Login
