// 文章管理页面 - Preline UI 风格
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { AdminLayout } from '../components-preline/Sidebar'
import { authApi } from '../api/auth'
import { Card, CardHeader, CardTitle, CardDescription, CardBody } from '../components-preline/Card'
import { Button } from '../components-preline/Button'
import { Input } from '../components-preline/Input'
import { postsApi } from '../api/posts'
import { categoriesApi } from '../api/categories'

// 状态标签
function StatusBadge({ isDraft }) {
  if (isDraft) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
        草稿
      </span>
    )
  }
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
      已发布
    </span>
  )
}

// 格式标签
function FormatBadge({ contentType }) {
  const isHtml = contentType === 'html'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
      isHtml
        ? 'bg-purple-50 text-purple-700 border border-purple-200'
        : 'bg-gray-100 text-gray-700 border border-gray-200'
    }`}>
      {isHtml ? 'HTML' : 'MD'}
    </span>
  )
}

// 文章列表项
function PostItem({ post, onEdit, onDelete }) {
  return (
    <div className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0">
      {/* 封面 */}
      <div className="w-16 h-16 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden border border-gray-200">
        {post.cover_image ? (
          <img 
            src={post.cover_image} 
            alt="" 
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-2xl bg-gradient-to-br from-blue-50 to-indigo-50">
            📝
          </div>
        )}
      </div>
      
      {/* 信息 */}
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-gray-900 truncate">{post.title}</h4>
        <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
          <span>{new Date(post.created_at).toLocaleDateString('zh-CN')}</span>
          <span className="text-gray-300">|</span>
          <span className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            {post.view_count || 0}
          </span>
          {post.category_name && (
            <>
              <span className="text-gray-300">|</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">
                {post.category_name}
              </span>
            </>
          )}
          <span className="text-gray-300">|</span>
          <FormatBadge contentType={post.content_type} />
          <span className="text-gray-300">|</span>
          <StatusBadge isDraft={post.is_draft} />
        </div>
      </div>
      
      {/* 操作 */}
      <div className="flex items-center gap-2">
        <Button 
          variant="secondary" 
          size="sm"
          onClick={() => onEdit(post.id)}
        >
          <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          编辑
        </Button>
        <Button 
          variant="danger" 
          size="sm"
          onClick={() => onDelete(post.id)}
        >
          <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          删除
        </Button>
      </div>
    </div>
  )
}

export function Posts() {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [categories, setCategories] = useState([])
  const navigate = useNavigate()
  
  // 获取当前用户信息
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  
  useEffect(() => {
    fetchPosts()
    fetchCategories()
  }, [])

  useEffect(() => {
    fetchPosts()
  }, [categoryId])
  
  const fetchPosts = async () => {
    try {
      setLoading(true)
      const params = { limit: 100 }
      if (categoryId) params.category_id = categoryId
      const res = await postsApi.getPosts(params)
      setPosts(res.data)
    } catch (error) {
      console.error('获取文章失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchCategories = async () => {
    try {
      const res = await categoriesApi.getCategories()
      setCategories(res.data)
    } catch (error) {
      console.error('获取分类失败:', error)
    }
  }
  
  const handleDelete = async (id) => {
    if (!confirm('确定要删除这篇文章吗？')) return
    
    try {
      await postsApi.deletePost(id)
      fetchPosts()
    } catch (error) {
      alert('删除失败')
    }
  }
  
  const handleLogout = async () => {
    localStorage.removeItem('token')
    await authApi.logout()
    localStorage.removeItem('user')
    window.location.href = '/login'
  }
  
  const filteredPosts = posts.filter(post => 
    post.title.toLowerCase().includes(search.toLowerCase())
  )
  
  return (
    <AdminLayout user={user} onLogout={handleLogout}>
      <div className="p-6 w-full">
        {/* 页面标题 */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">文章管理</h1>
          <p className="text-gray-500 mt-1">管理您的博客文章</p>
        </div>
        
        <Card>
          <CardHeader 
            action={
              <div className="flex items-center gap-3">
                <div className="w-64 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <Input
                    placeholder="搜索文章..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="py-2 px-3 pr-8 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white appearance-none cursor-pointer"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                    backgroundPosition: 'right 0.5rem center',
                    backgroundRepeat: 'no-repeat',
                    backgroundSize: '1.5em 1.5em'
                  }}
                >
                  <option value="">全部分类</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name} ({cat.post_count})</option>
                  ))}
                </select>
                <Button
                  variant="secondary"
                  onClick={() => navigate('/admin/crawl')}
                >
                  <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                  </svg>
                  采集文章
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => navigate('/admin/wechat-crawl')}
                >
                  <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  公众号采集
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => navigate('/admin/universal-crawl')}
                >
                  <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                  </svg>
                  通用采集
                </Button>
                <Button
                  variant="primary"
                  onClick={() => navigate('/admin/posts/new')}
                >
                  <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  写文章
                </Button>
              </div>
            }
          >
            <div>
              <CardTitle>文章列表</CardTitle>
              <CardDescription>共 {posts.length} 篇文章</CardDescription>
            </div>
          </CardHeader>
          
          <CardBody className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <svg className="animate-spin h-5 w-5 text-gray-400" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span className="ml-2 text-gray-500">加载中...</span>
              </div>
            ) : filteredPosts.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-gray-500 mb-4">暂无文章</p>
                <Button 
                  variant="primary"
                  onClick={() => navigate('/admin/posts/new')}
                >
                  写第一篇文章
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filteredPosts.map(post => (
                  <PostItem 
                    key={post.id}
                    post={post}
                    onEdit={(id) => navigate(`/admin/posts/edit/${id}`)}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </AdminLayout>
  )
}

export default Posts
