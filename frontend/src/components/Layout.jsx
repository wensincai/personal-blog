import { Sidebar } from './Sidebar'

// 页面布局组件
export function Layout({ children, title, actions }) {
  return (
    <div className="flex min-h-screen bg-brutal-cream">
      <Sidebar />
      
      <main className="flex-1 flex flex-col">
        {/* 顶部标题栏 */}
        <header className="bg-white border-b-2 border-black px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">{title}</h1>
            {actions && (
              <div className="flex items-center gap-3">
                {actions}
              </div>
            )}
          </div>
        </header>
        
        {/* 内容区域 */}
        <div className="flex-1 p-6 overflow-auto">
          {children}
        </div>
      </main>
    </div>
  )
}

// 简单布局（无侧边栏，用于登录页）
export function SimpleLayout({ children }) {
  return (
    <div className="min-h-screen bg-brutal-cream flex items-center justify-center p-4">
      {children}
    </div>
  )
}
