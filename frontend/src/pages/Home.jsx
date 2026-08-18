// 访客首页 - 展示文章列表（支持无限滚动）
import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { API_BASE_URL } from '../api/config'

const POSTS_PER_PAGE = 10  // 每页加载数量

export function Home() {
  const [posts, setPosts] = useState([])
  const [categories, setCategories] = useState([])
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [settings, setSettings] = useState({
    blog_name: '侘寂屋',
    welcome_message: '欢迎来到侘寂屋 👋 分享技术、生活与思考',
    banner_type: 'text',
    layout: 'card'  // card 或 list
  })
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showMoreCategories, setShowMoreCategories] = useState(false)
  const [visibleCatCount, setVisibleCatCount] = useState(null) // null=未测量, number=能显示的分类数(不含"全部")
  const navRowRef = useRef(null)
  
  // 动态测量分类导航：宽度不溢出就不折叠
  useEffect(() => {
    if (categories.length === 0) return
    
    let timeoutId
    const measure = () => {
      const row = navRowRef.current
      if (!row) return
      // 导航容器跟正文内容区一样宽 (max-w-[1366px] mx-auto px-4)
      const containerWidth = row.parentElement?.clientWidth
      if (!containerWidth) return
      
      const buttons = row.querySelectorAll('.cat-nav-btn')
      if (buttons.length === 0) return
      
      // 预留 "更多" 按钮宽度 + gap
      const MORE_RESERVE = 52 // 约等于 ⋮ 按钮宽度 + gap
      const GAP = 8
      
      let total = 0
      for (let i = 0; i < buttons.length; i++) {
        const btnW = buttons[i].offsetWidth + (i > 0 ? GAP : 0)
        const remainingAfter = (i < buttons.length - 1) ? total + btnW + GAP + MORE_RESERVE : total + btnW
        if (remainingAfter > containerWidth) {
          // 第 i 个及之后的放不进，前 i 个可见（i 包含了"全部"按钮，所以可见分类数 = i - 1）
          setVisibleCatCount(Math.max(0, i - 1))
          return
        }
        total += btnW
      }
      setVisibleCatCount(categories.length) // 全部能放下
    }
    
    // 延迟测量等 DOM 渲染完成
    timeoutId = setTimeout(measure, 100)
    
    const ro = new ResizeObserver(() => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(measure, 100)
    })
    const parent = navRowRef.current?.parentElement
    if (parent) ro.observe(parent)
    
    window.addEventListener('resize', measure)
    return () => {
      clearTimeout(timeoutId)
      ro.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [categories])
  
  // 分页状态
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  
  // 用于无限滚动的 ref
  const observerRef = useRef(null)
  const loadMoreRef = useRef(null)

  useEffect(() => {
    fetchCategories()
    fetchSettings()
    // 初始加载第一页
    fetchPosts(0, null, true)
  }, [])
  
  // 当分类变化时，重置并重新加载
  useEffect(() => {
    setPosts([])
    setPage(0)
    setHasMore(true)
    fetchPosts(0, selectedCategory, true)
  }, [selectedCategory])

  const fetchPosts = async (pageNum = 0, categoryId = null, isInitial = false) => {
    try {
      if (isInitial) {
        setInitialLoading(true)
      } else {
        setLoading(true)
      }
      
      const skip = pageNum * POSTS_PER_PAGE
      let url = `${API_BASE_URL}/posts?skip=${skip}&limit=${POSTS_PER_PAGE}`
      if (categoryId) {
        url += `&category_id=${categoryId}`
      }
      
      const response = await fetch(url)
      if (!response.ok) throw new Error('获取文章失败')
      const data = await response.json()
      
      const publishedPosts = data.filter(p => p.is_published)
      
      // 如果返回的数量少于每页数量，说明没有更多数据了
      if (publishedPosts.length < POSTS_PER_PAGE) {
        setHasMore(false)
      }
      
      if (pageNum === 0) {
        // 第一页：替换数据
        setPosts(publishedPosts)
      } else {
        // 后续页：追加数据
        setPosts(prev => {
          // 去重：避免重复添加已存在的文章
          const existingIds = new Set(prev.map(p => p.id))
          const newPosts = publishedPosts.filter(p => !existingIds.has(p.id))
          return [...prev, ...newPosts]
        })
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
      setInitialLoading(false)
    }
  }
  
  // 加载更多
  const loadMore = useCallback(() => {
    if (loading || !hasMore) return
    const nextPage = page + 1
    setPage(nextPage)
    fetchPosts(nextPage, selectedCategory, false)
  }, [page, loading, hasMore, selectedCategory])
  
  // 无限滚动：使用 Intersection Observer
  useEffect(() => {
    if (initialLoading) return
    
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          loadMore()
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    )
    
    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current)
    }
    
    return () => observer.disconnect()
  }, [initialLoading, hasMore, loading, loadMore])

  const fetchCategories = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/categories`)
      if (response.ok) {
        const data = await response.json()
        setCategories(data)
      }
    } catch (err) {
      console.error('获取分类失败:', err)
    }
  }

  const fetchSettings = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/settings`)
      if (response.ok) {
        const data = await response.json()
        setSettings(data)
      }
    } catch (err) {
      console.error('获取设置失败:', err)
    }
  }

  // 处理分类点击
  const handleCategoryClick = (categoryId) => {
    setSelectedCategory(categoryId)
    setShowMoreCategories(false)
    // 分类变化时会触发 useEffect 自动加载
  }

  // 显示全部文章
  const handleShowAll = () => {
    setSelectedCategory(null)
    // 重置分页状态
    setPosts([])
    setPage(0)
    setHasMore(true)
  }

  // 动态可见分类（基于宽度测量，不溢出就不折叠）
  const isMeasured = visibleCatCount !== null
  const displayCategories = isMeasured ? categories.slice(0, visibleCatCount) : categories
  const moreCategories = isMeasured ? categories.slice(visibleCatCount) : []
  const hasMoreCategories = moreCategories.length > 0

  if (initialLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#FEF9E7]">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-black border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="font-bold text-lg">加载中...</p>
      </div>
    </div>
  )
  if (error) return <div className="min-h-screen flex items-center justify-center text-red-500 bg-[#FEF9E7]">{error}</div>

  return (
    <div className="min-h-screen bg-[#FEF9E7] flex flex-col">
      {/* 顶部导航 */}
      <nav className="bg-white border-b-2 border-black sticky top-0 z-10">
        <div className="max-w-[1366px] mx-auto px-4">
          {/* 第一行：博客名 + 管理后台 */}
          <div className="py-4 flex justify-between items-center border-b border-gray-100">
            <button 
              onClick={handleShowAll}
              className="text-2xl font-black tracking-tight hover:text-blue-600 transition-colors flex items-center gap-2"
            >
              <img src="/logo-48.png" alt="logo" className="w-12 h-12" />
              {settings.blog_name || '侘寂屋'}
            </button>
            <Link 
              to="/admin"
              className="px-4 py-2 border-2 border-black bg-white hover:bg-gray-100 transition-colors font-bold"
            >
              管理后台
            </Link>
          </div>
          
          {/* 第二行：分类导航 */}
          {categories.length > 0 && (
            <div ref={navRowRef} className="py-3 flex items-center gap-2 flex-wrap">
              <button
                onClick={handleShowAll}
                className={`cat-nav-btn px-3 py-1.5 text-sm font-bold border-2 border-black transition-all whitespace-nowrap ${
                  selectedCategory === null 
                    ? 'bg-black text-white' 
                    : 'bg-white hover:bg-gray-100'
                }`}
              >
                全部
              </button>
              
              {displayCategories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => handleCategoryClick(cat.id)}
                  className={`cat-nav-btn px-3 py-1.5 text-sm font-bold border-2 border-black transition-all whitespace-nowrap ${
                    selectedCategory === cat.id 
                      ? 'bg-black text-white' 
                      : 'bg-white hover:bg-gray-100'
                  }`}
                >
                  {cat.name}
                  {cat.post_count > 0 && (
                    <span className={`ml-1 text-xs ${selectedCategory === cat.id ? 'text-gray-300' : 'text-gray-500'}`}>
                      ({cat.post_count})
                    </span>
                  )}
                </button>
              ))}
              
              {/* 更多分类下拉菜单 */}
              {hasMoreCategories && (
                <div className="relative">
                  <button
                    onClick={() => setShowMoreCategories(!showMoreCategories)}
                    className={`px-3 py-1.5 text-sm font-bold border-2 border-black transition-all ${
                      showMoreCategories 
                        ? 'bg-black text-white' 
                        : 'bg-white hover:bg-gray-100'
                    }`}
                  >
                    ⋮
                  </button>
                  
                  {showMoreCategories && (
                    <>
                      {/* 点击外部关闭 */}
                      <div 
                        className="fixed inset-0 z-10" 
                        onClick={() => setShowMoreCategories(false)}
                      />
                      {/* 下拉菜单 */}
                      <div className="absolute top-full left-0 mt-2 w-48 bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] z-20">
                        {moreCategories.map(cat => (
                          <button
                            key={cat.id}
                            onClick={() => handleCategoryClick(cat.id)}
                            className={`w-full text-left px-4 py-2 text-sm font-bold border-b border-gray-100 last:border-b-0 transition-colors ${
                              selectedCategory === cat.id 
                                ? 'bg-brutal-yellow' 
                                : 'hover:bg-gray-50'
                            }`}
                          >
                            {cat.name}
                            {cat.post_count > 0 && (
                              <span className="ml-1 text-xs text-gray-500">
                                ({cat.post_count})
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </nav>

      {/* 主要内容 */}
      <main className="flex-1 max-w-[1366px] mx-auto px-4 py-8 w-full">
        {/* 欢迎区域 */}
        {settings.banner_type === 'text' && selectedCategory === null && (
          <div className="mb-10 p-8 bg-gradient-to-r from-yellow-200 via-cyan-200 to-pink-200 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <h1 className="text-3xl md:text-4xl font-black mb-3 text-center">
              {settings.welcome_message?.split('👋')[0]?.trim() || '欢迎来到侘寂屋'}
              {settings.welcome_message?.includes('👋') && <span className="inline-block ml-2">👋</span>}
            </h1>
            {settings.welcome_message?.split('👋')[1] && (
              <p className="text-lg text-gray-800 text-center">
                {settings.welcome_message.split('👋')[1].trim()}
              </p>
            )}
          </div>
        )}
        
        {/* 当前筛选提示 */}
        {selectedCategory !== null && (
          <div className="mb-6 flex items-center justify-between p-4 bg-brutal-yellow border-2 border-black">
            <span className="font-bold">
              当前分类：{categories.find(c => c.id === selectedCategory)?.name}
            </span>
            <button 
              onClick={handleShowAll}
              className="text-sm underline hover:no-underline"
            >
              查看全部 →
            </button>
          </div>
        )}

        {/* 文章列表 */}
        <div className="space-y-6">
          <h2 className="text-2xl font-black border-b-2 border-black pb-2">
            {selectedCategory !== null ? '分类文章' : '最新文章'}
          </h2>
          
          {posts.length === 0 ? (
            <div className="text-center py-10 text-gray-500">
              {selectedCategory !== null 
                ? '该分类暂无文章' 
                : '暂无文章'}
            </div>
          ) : (
            /* 列表 = 单列，卡片 = 双列网格 */
            <div className={settings.layout === 'card' 
              ? 'grid grid-cols-1 md:grid-cols-2 gap-6' 
              : 'space-y-6'
            }>
              {posts.map(post => (
                <article 
                  key={post.id}
                  className="bg-white border-2 border-black p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all flex flex-col"
                >
                  {/* 标题 */}
                  <Link to={`/post/${post.slug || post.id}`}>
                    <h3 className="text-xl font-bold mb-2 hover:text-blue-600 transition-colors line-clamp-2">
                      {post.title}
                    </h3>
                  </Link>
                  
                  {/* 摘要 */}
                  <p className="text-gray-600 mb-4 line-clamp-2 flex-1">
                    {post.summary}
                  </p>
                  
                  {/* 元信息 */}
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span>{new Date(post.created_at).toLocaleDateString('zh-CN')}</span>
                      {post.category && (
                        <>
                          <span className="hidden sm:inline">·</span>
                          <button
                            onClick={() => handleCategoryClick(post.category.id)}
                            className="text-blue-600 hover:underline px-2 py-0.5 bg-blue-50 border border-blue-200 rounded text-xs"
                          >
                            {post.category.name}
                          </button>
                        </>
                      )}
                    </div>
                    <Link 
                      to={`/post/${post.slug || post.id}`}
                      className="text-blue-600 hover:underline font-bold whitespace-nowrap ml-2"
                    >
                      阅读更多 →
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
          
          {/* 加载更多触发器 + 状态显示 */}
          <div ref={loadMoreRef} className="py-8 text-center">
            {loading && posts.length > 0 && (
              <div className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                <span className="text-sm font-medium text-gray-600">加载更多...</span>
              </div>
            )}
            {!hasMore && posts.length > 0 && (
              <div className="text-sm text-gray-500">
                已经到底了，共 {posts.length} 篇文章
              </div>
            )}
            {hasMore && !loading && posts.length >= POSTS_PER_PAGE && (
              <button
                onClick={loadMore}
                className="px-6 py-2 bg-white border-2 border-black font-bold text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] transition-all"
              >
                加载更多 ↓
              </button>
            )}
          </div>
        </div>
      </main>

      {/* 页脚 */}
      <footer className="border-t-2 border-black bg-white">
        <div className="max-w-[1366px] mx-auto px-4 py-6 text-center text-gray-600">
          © 2026 {settings.blog_name || '侘寂屋'} · 用心记录每一刻
        </div>
      </footer>
    </div>
  )
}
