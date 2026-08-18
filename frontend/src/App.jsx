import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { Home } from './pages/Home'
import { PostDetail } from './pages/PostDetail'
import { Login } from './pages/Login'
import { Dashboard } from './pages/Dashboard'
import { Posts } from './pages/Posts'
import { PostEdit } from './pages/PostEdit'
import { CrawlEdit } from './pages/CrawlEdit'
import { WechatCrawlEdit } from './pages/WechatCrawlEdit'
import { UniversalCrawlEdit } from './pages/UniversalCrawlEdit'
import { Images } from './pages/admin/Images'
import { Settings } from './pages/admin/Settings'
import { Categories } from './pages/admin/Categories'
import { authApi } from './api/auth'

// 路由守卫 - 需要登录才能访问（支持本地 Token + SSO Cookie 双模式）
function PrivateRoute({ children }) {
  const [authState, setAuthState] = useState('checking') // checking / ok / redirect

  useEffect(() => {
    // 本地 token 优先
    const token = localStorage.getItem('token')
    if (token) {
      setAuthState('ok')
      return
    }
    // 无本地 token 时，尝试用 SSO Cookie 调用后端
    authApi.getMe()
      .then(() => setAuthState('ok'))
      .catch(() => setAuthState('redirect'))
  }, [])

  if (authState === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">加载中...</div>
      </div>
    )
  }
  if (authState === 'ok') {
    return children
  }
  return <Navigate to="/login" />
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* === 访客公开路由 === */}
        <Route path="/" element={<Home />} />
        <Route path="/post/:slug" element={<PostDetail />} />
        
        {/* === 登录路由 === */}
        <Route path="/login" element={<Login />} />
        
        {/* === 管理后台路由（需要登录）=== */}
        <Route 
          path="/admin" 
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          } 
        />
        <Route 
          path="/admin/posts" 
          element={
            <PrivateRoute>
              <Posts />
            </PrivateRoute>
          } 
        />
        <Route 
          path="/admin/posts/new" 
          element={
            <PrivateRoute>
              <PostEdit />
            </PrivateRoute>
          } 
        />
        <Route 
          path="/admin/posts/edit/:id" 
          element={
            <PrivateRoute>
              <PostEdit />
            </PrivateRoute>
          } 
        />
        {/* 文章采集 */}
        <Route
          path="/admin/crawl"
          element={
            <PrivateRoute>
              <CrawlEdit />
            </PrivateRoute>
          }
        />
        {/* 公众号采集 */}
        <Route
          path="/admin/wechat-crawl"
          element={
            <PrivateRoute>
              <WechatCrawlEdit />
            </PrivateRoute>
          }
        />
        {/* 通用采集 */}
        <Route
          path="/admin/universal-crawl"
          element={
            <PrivateRoute>
              <UniversalCrawlEdit />
            </PrivateRoute>
          }
        />
        {/* 分类管理 */}
        <Route 
          path="/admin/categories" 
          element={
            <PrivateRoute>
              <Categories />
            </PrivateRoute>
          } 
        />
        <Route 
          path="/admin/tags" 
          element={
            <PrivateRoute>
              <div className="p-8">标签管理（开发中）</div>
            </PrivateRoute>
          } 
        />
        <Route 
          path="/admin/images" 
          element={
            <PrivateRoute>
              <Images />
            </PrivateRoute>
          } 
        />
        <Route 
          path="/admin/pages" 
          element={
            <PrivateRoute>
              <div className="p-8">页面管理（开发中）</div>
            </PrivateRoute>
          } 
        />
        <Route
          path="/admin/settings"
          element={
            <PrivateRoute>
              <Settings />
            </PrivateRoute>
          }
        />
        {/* 旧路由兼容（重定向到新路由） */}
        <Route path="/posts" element={<Navigate to="/admin/posts" />} />
        <Route path="/posts/new" element={<Navigate to="/admin/posts/new" />} />
        <Route path="/posts/edit/:id" element={<Navigate to="/admin/posts/edit/:id" />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
