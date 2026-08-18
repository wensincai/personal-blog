import { NavLink, useNavigate } from 'react-router-dom'
import { authApi } from '../api/auth'

// 导航项
function NavItem({ to, icon, label }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-3 px-4 py-3 font-bold transition-all duration-150 ${
          isActive
            ? 'bg-black text-brutal-yellow border-l-4 border-brutal-yellow'
            : 'text-black hover:bg-black/10 border-l-4 border-transparent'
        }`
      }
    >
      <span className="text-lg">{icon}</span>
      <span>{label}</span>
    </NavLink>
  )
}

// 侧边栏组件
export function Sidebar() {
  const navigate = useNavigate()
  
  const handleLogout = async () => {
    // 1) 先调用后端清除 SSO Cookie，避免自动登录
    try {
      await authApi.logout()
    } catch {
      // 即使后端失败也继续本地清理
    }
    // 2) 再清除本地 token
    localStorage.removeItem('token')
    // 3) 跳转登录页
    navigate('/login')
  }
  
  return (
    <aside className="w-64 bg-brutal-yellow border-r-2 border-black flex flex-col min-h-screen">
      {/* Logo */}
      <div className="p-4 border-b-2 border-black">
        <NavLink to="/" className="inline-block -rotate-2 border-2 border-black bg-black px-4 py-2 shadow-brutal hover:rotate-0 transition-transform">
          <span className="font-bold text-xl text-brutal-yellow">BLOG</span>
        </NavLink>
      </div>
      
      {/* 导航菜单 */}
      <nav className="flex-1 py-4 space-y-1">
        <NavItem to="/admin" icon="🏠" label="控制台" />
        <NavItem to="/admin/posts" icon="📝" label="文章管理" />
        <NavItem to="/admin/categories" icon="📁" label="分类管理" />
        <NavItem to="/admin/images" icon="🖼️" label="图片管理" />
        <NavItem to="/admin/settings" icon="⚙️" label="博客设置" />
      </nav>
      
      {/* 退出登录 */}
      <div className="p-4 border-t-2 border-black">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 font-bold text-black hover:bg-red-100 border-l-4 border-transparent hover:border-red-500 transition-all"
        >
          <span className="text-lg">🚪</span>
          <span>退出登录</span>
        </button>
      </div>
      
      {/* 底部信息 */}
      <div className="p-4 border-t-2 border-black">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold text-black/60">
            Personal Blog v1.0
          </p>
          <a 
            href="/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-xs font-bold text-black hover:underline"
          >
            查看首页 →
          </a>
        </div>
      </div>
    </aside>
  )
}
