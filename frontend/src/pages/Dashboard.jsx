// 控制台首页 - Preline UI 风格
import { useState, useEffect } from 'react'
import { AdminLayout } from '../components-preline/Sidebar'
import { authApi } from '../api/auth'
import { Card, CardHeader, CardTitle, CardDescription, CardBody } from '../components-preline/Card'
import { Button } from '../components-preline/Button'
import { postsApi } from '../api/posts'

// 统计卡片 - Preline 风格
function StatCard({ title, value, icon, trend, trendUp }) {
  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
          {trend && (
            <div className={`flex items-center gap-1 mt-2 text-sm ${trendUp ? 'text-green-600' : 'text-red-600'}`}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={trendUp ? "M5 10l7-7m0 0l7 7m-7-7v18" : "M19 14l-7 7m0 0l-7-7m7 7V3"} />
              </svg>
              <span>{trend}</span>
            </div>
          )}
        </div>
        <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-2xl">
          {icon}
        </div>
      </div>
    </div>
  )
}

// 最近文章列表项
function RecentPostItem({ post }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0 hover:bg-gray-50 px-2 -mx-2 rounded-lg transition-colors">
      <div className="flex-1 min-w-0 mr-4">
        <p className="font-medium text-gray-900 truncate">{post.title}</p>
        <p className="text-sm text-gray-500 mt-0.5">
          {new Date(post.created_at).toLocaleDateString('zh-CN')} · {post.category?.name || '未分类'}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <span className="inline-flex items-center gap-1 text-sm text-gray-500">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          {post.view_count || 0}
        </span>
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
          post.is_published ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
        }`}>
          {post.is_published ? '已发布' : '草稿'}
        </span>
      </div>
    </div>
  )
}

// 分类统计项
function CategoryStatItem({ name, count, total }) {
  const percentage = total > 0 ? Math.round((count / total) * 100) : 0
  
  return (
    <div className="py-3 border-b border-gray-100 last:border-0">
      <div className="flex items-center justify-between mb-2">
        <span className="font-medium text-gray-700">{name}</span>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">{count} 篇</span>
          <span className="text-sm font-medium text-gray-900 w-10 text-right">{percentage}%</span>
        </div>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2">
        <div 
          className="bg-blue-600 h-2 rounded-full transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

export function Dashboard() {
  const [stats, setStats] = useState({
    total_posts: 0,
    total_views: 0,
    category_counts: {}
  })
  const [recentPosts, setRecentPosts] = useState([])
  const [loading, setLoading] = useState(true)
  
  // 获取当前用户信息
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  
  useEffect(() => {
    fetchData()
  }, [])
  
  const fetchData = async () => {
    try {
      // 获取统计
      const statsRes = await postsApi.getStats()
      setStats(statsRes.data)
      
      // 获取最近文章
      const postsRes = await postsApi.getPosts({ limit: 5 })
      setRecentPosts(postsRes.data)
    } catch (error) {
      console.error('获取数据失败:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const handleLogout = async () => {
    localStorage.removeItem('token')
    await authApi.logout()
    localStorage.removeItem('user')
    window.location.href = '/login'
  }
  
  // 计算总文章数用于百分比
  const totalPosts = stats.total_posts || 1
  
  return (
    <AdminLayout user={user} onLogout={handleLogout}>
      <div className="p-6 w-full">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-900">控制台</h1>
          <p className="text-gray-500 mt-1">欢迎回来，{user.username || '管理员'}！这是您的博客概览</p>
        </div>
        
        {/* 统计卡片 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard 
            title="总文章数" 
            value={stats.total_posts} 
            icon="📝" 
            trend="+2 本周"
            trendUp={true}
          />
          <StatCard 
            title="总浏览量" 
            value={stats.total_views?.toLocaleString() || 0} 
            icon="👁️" 
            trend="+12%"
            trendUp={true}
          />
          <StatCard 
            title="分类数" 
            value={Object.keys(stats.category_counts).length} 
            icon="📁" 
          />
          <StatCard 
            title="今日访问" 
            value="--" 
            icon="📈" 
          />
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 最近文章 */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader 
                action={
                  <Button 
                    variant="secondary" 
                    size="sm"
                    onClick={() => window.location.href = '/admin/posts/new'}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    写文章
                  </Button>
                }
              >
                <div>
                  <CardTitle>最近文章</CardTitle>
                  <CardDescription>最近发布的 5 篇文章</CardDescription>
                </div>
              </CardHeader>
              <CardBody>
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <svg className="animate-spin h-5 w-5 text-gray-400" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <span className="ml-2 text-gray-500">加载中...</span>
                  </div>
                ) : recentPosts.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <p className="text-gray-500">暂无文章</p>
                    <Button 
                      variant="primary" 
                      size="sm"
                      className="mt-3"
                      onClick={() => window.location.href = '/admin/posts/new'}
                    >
                      创建第一篇文章
                    </Button>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {recentPosts.map(post => (
                      <RecentPostItem key={post.id} post={post} />
                    ))}
                  </div>
                )}
              </CardBody>
            </Card>
          </div>
          
          {/* 分类统计 */}
          <div>
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>分类统计</CardTitle>
                  <CardDescription>各分类文章数量分布</CardDescription>
                </div>
              </CardHeader>
              <CardBody>
                {Object.keys(stats.category_counts).length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500 text-sm">暂无分类数据</p>
                  </div>
                ) : (
                  <div>
                    {Object.entries(stats.category_counts).map(([name, count]) => (
                      <CategoryStatItem 
                        key={name}
                        name={name}
                        count={count}
                        total={totalPosts}
                      />
                    ))}
                  </div>
                )}
              </CardBody>
            </Card>
            
            {/* 快捷操作 */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>快捷操作</CardTitle>
              </CardHeader>
              <CardBody className="space-y-2">
                <Button 
                  variant="secondary" 
                  className="w-full justify-start"
                  onClick={() => window.location.href = '/admin/posts'}
                >
                  <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  管理文章
                </Button>
                <Button 
                  variant="secondary" 
                  className="w-full justify-start"
                  onClick={() => window.location.href = '/admin/categories'}
                >
                  <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                  管理分类
                </Button>
                <Button 
                  variant="secondary" 
                  className="w-full justify-start"
                  onClick={() => window.location.href = '/admin/settings'}
                >
                  <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  系统设置
                </Button>
              </CardBody>
            </Card>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}

export default Dashboard
