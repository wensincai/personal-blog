// 文章采集编辑页面 - Preline UI 风格
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { AdminLayout } from '../components-preline/Sidebar'
import { authApi } from '../api/auth'
import { Card, CardHeader, CardTitle, CardDescription, CardBody, CardFooter } from '../components-preline/Card'
import { Button } from '../components-preline/Button'
import { Input, Textarea, Label, FormError } from '../components-preline/Input'
import { categoriesApi } from '../api/categories'
import { tagsApi } from '../api/tags'
import { API_BASE_URL } from '../api/config'
import { getErrorMessage } from '../utils/errorMessage'

// 错误弹窗组件
function ErrorModal({ message, onClose, onClear }) {
  if (!message) return null
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900">采集失败</h3>
        </div>
        <p className="text-gray-600 mb-6 leading-relaxed">
          {message}
        </p>
        <div className="flex gap-3">
          <Button 
            onClick={onClose} 
            variant="primary"
            className="flex-1"
          >
            确定
          </Button>
          <Button 
            onClick={() => {
              onClose()
              onClear()
            }} 
            variant="secondary"
          >
            清空链接
          </Button>
        </div>
      </div>
    </div>
  )
}

export function UniversalCrawlEdit() {
  const navigate = useNavigate()
  
  // 获取当前用户信息
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  
  // 采集步骤
  const [step, setStep] = useState('input') // input -> crawling -> edit
  const [crawlUrl, setCrawlUrl] = useState('')
  const [crawling, setCrawling] = useState(false)
  const [crawlError, setCrawlError] = useState('')
  
  // 表单数据
  const [form, setForm] = useState({
    title: '',
    content: '',
    summary: '',
    category_id: '',
    tag_ids: [],
    is_published: false,
    is_draft: true
  })
  
  // 采集的图片
  const [crawledImages, setCrawledImages] = useState([])
  
  // 分类和标签
  const [categories, setCategories] = useState([])
  const [tags, setTags] = useState([])
  
  // 保存状态
  const [saving, setSaving] = useState(false)
  
  // 错误弹窗
  const [showErrorModal, setShowErrorModal] = useState(false)
  const [errorModalMessage, setErrorModalMessage] = useState('')
  
  // 加载分类和标签，并清空之前的状态
  useEffect(() => {
    // 清空表单状态，防止显示之前缓存的数据
    setForm({
      title: '',
      content: '',
      summary: '',
      category_id: '',
      tag_ids: [],
      is_published: false,
      is_draft: true
    })
    setCrawledImages([])
    setStep('input')
    setCrawlError('')
    
    const loadData = async () => {
      try {
        const [catRes, tagRes] = await Promise.all([
          categoriesApi.getCategories(),
          tagsApi.getTags()
        ])
        setCategories(catRes.data)
        setTags(tagRes.data)
      } catch (error) {
        console.error('加载数据失败:', error)
      }
    }
    loadData()
  }, [])
  
  // 开始采集
  const handleCrawl = async (e) => {
    e.preventDefault()
    
    if (!crawlUrl.trim()) {
      alert('请输入文章链接')
      return
    }
    
    if (!crawlUrl.startsWith('http://') && !crawlUrl.startsWith('https://')) {
      alert('请输入有效的URL（以 http:// 或 https:// 开头）')
      return
    }
    
    setCrawling(true)
    setCrawlError('')
    
    try {
      const token = localStorage.getItem('token')
      // 添加随机数防止缓存
      const nocache = Date.now()

      // 构造请求头：有 token 则带 Bearer，同时启用 credentials 以支持 SSO Cookie 认证
      const headers = {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const response = await fetch(`${API_BASE_URL}/universal-crawl/fetch?_=${nocache}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ url: crawlUrl }),
        credentials: 'include'
      })
      
      const data = await response.json()
      
      if (!data.success) {
        const errorMsg = data.error || '采集失败，请检查链接是否有效'
        setCrawlError(errorMsg)
        setErrorModalMessage(errorMsg)
        setShowErrorModal(true)
        setCrawling(false)
        return
      }
      
      // 填充表单
      setForm({
        title: data.title || '',
        content: data.content || '',
        summary: data.summary || '',
        category_id: '',
        tag_ids: [],
        is_published: false,
        is_draft: true
      })
      
      // 设置图片
      setCrawledImages(data.images || [])
      
      // 进入编辑步骤
      setStep('edit')
      
    } catch (error) {
      const errorMsg = '采集失败: ' + (error.message || '网络错误，请稍后重试')
      setCrawlError(errorMsg)
      setErrorModalMessage(errorMsg)
      setShowErrorModal(true)
    } finally {
      setCrawling(false)
    }
  }
  
  // 保存文章
  const handleSubmit = async (e, isDraft = false) => {
    e.preventDefault()

    if (!form.title.trim() || !form.content.trim()) {
      alert('请填写标题和内容')
      return
    }

    setSaving(true)
    try {
      const token = localStorage.getItem('token')
      // 将 tag_ids 转换为 tag 名称数组
      const tagNames = form.tag_ids.map(tid => {
        const tag = tags.find(t => t.id === Number(tid))
        return tag ? tag.name : ''
      }).filter(Boolean)

      const response = await fetch(`${API_BASE_URL}/universal-crawl/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          title: form.title,
          content: form.content,
          content_html: '',
          images: crawledImages,
          summary: form.summary,
          category_id: form.category_id || null,
          is_draft: isDraft,
          is_published: !isDraft,
          tags: tagNames,
          source_url: crawlUrl
        }),
        credentials: 'include'
      })

      const data = await response.json()
      if (!data.success) {
        throw new Error(data.detail || data.message || '保存失败')
      }

      // 提示图片下载情况
      if (data.images_failed > 0) {
        alert(`文章已保存成功！\n图片：${data.images_saved} 张下载成功，${data.images_failed} 张下载失败（保留原始链接）。`)
      }

      navigate('/admin/posts')
    } catch (error) {
      alert('保存失败: ' + getErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }
  
  // 在内容中插入图片
  const insertImageToContent = (imagePath) => {
    const imageMarkdown = `\n\n![图片](${imagePath})\n\n`
    setForm({
      ...form,
      content: form.content + imageMarkdown
    })
  }
  
  // 取消/返回
  const handleCancel = () => {
    if (confirm('确定要取消吗？未保存的内容将丢失。')) {
      navigate('/admin/posts')
    }
  }
  
  // 退出登录
  const handleLogout = async () => {
    localStorage.removeItem('token')
    await authApi.logout()
    localStorage.removeItem('user')
    window.location.href = '/login'
  }
  
  // 输入URL界面
  if (step === 'input') {
    return (
      <AdminLayout user={user} onLogout={handleLogout}>
        <ErrorModal 
          message={showErrorModal ? errorModalMessage : ''}
          onClose={() => setShowErrorModal(false)}
          onClear={() => setCrawlUrl('')}
        />
        
        <div className="p-6 w-full">
          {/* 页面标题 */}
          <div className="mb-6">
            <h1 className="text-2xl font-semibold text-gray-900">通用采集</h1>
            <p className="text-gray-500 mt-1">从网页自动采集文章内容（增强反爬能力）</p>
          </div>
          
          <Card>
            <CardHeader>
              <div>
                <CardTitle>从网页自动采集</CardTitle>
                <CardDescription>输入文章链接，自动提取标题、正文和图片，自动处理编码和数学公式</CardDescription>
              </div>
            </CardHeader>
            <CardBody>
              <form onSubmit={handleCrawl} className="space-y-6">
                <div>
                  <Label htmlFor="url">文章链接 URL</Label>
                  <Input
                    id="url"
                    type="url"
                    value={crawlUrl}
                    onChange={(e) => setCrawlUrl(e.target.value)}
                    placeholder="https://example.com/article"
                    disabled={crawling}
                    required
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    支持各类网站的反爬场景采集
                  </p>
                </div>
                
                {crawlError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="font-medium text-red-800">采集失败</span>
                    </div>
                    <p className="text-red-600 mt-1 text-sm">{crawlError}</p>
                  </div>
                )}
                
                <div className="flex gap-3">
                  <Button 
                    type="submit" 
                    variant="primary" 
                    disabled={crawling}
                    loading={crawling}
                  >
                    {crawling ? '采集中...' : '开始采集'}
                  </Button>
                  <Button 
                    type="button" 
                    variant="secondary" 
                    onClick={handleCancel}
                    disabled={crawling}
                  >
                    取消
                  </Button>
                </div>
                
                {crawling && (
                  <div className="text-center py-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-50 rounded-full mb-4">
                      <svg className="animate-spin w-8 h-8 text-blue-600" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    </div>
                    <p className="text-gray-500">正在分析网页内容...</p>
                  </div>
                )}
              </form>
            </CardBody>
          </Card>
          
          <Card className="mt-6">
            <CardHeader>
              <div>
                <CardTitle>使用说明</CardTitle>
                <CardDescription>采集功能的使用注意事项</CardDescription>
              </div>
            </CardHeader>
            <CardBody>
              <ul className="space-y-3 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>支持各类网站、技术博客、学术论文等公开内容的增强采集</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>采集后需要人工编辑确认内容准确性</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>系统会自动提取标题、正文和图片</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>采集的内容默认保存为草稿，需要手动发布</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>请尊重原作者版权，仅用于个人学习参考</span>
                </li>
              </ul>
            </CardBody>
          </Card>
        </div>
      </AdminLayout>
    )
  }
  
  // 编辑界面
  return (
    <AdminLayout user={user} onLogout={handleLogout}>
      <div className="p-6 w-full">
        {/* 页面标题 */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">编辑通用采集内容</h1>
            <p className="text-gray-500 mt-1">确认并编辑通用采集的文章内容</p>
          </div>
          <div className="flex gap-3">
            <Button onClick={handleCancel} variant="secondary">
              取消
            </Button>
            <Button 
              onClick={(e) => handleSubmit(e, true)} 
              variant="secondary"
              disabled={saving}
            >
              {saving ? '保存中...' : '保存草稿'}
            </Button>
            <Button 
              onClick={(e) => handleSubmit(e, false)} 
              variant="primary"
              disabled={saving}
            >
              {saving ? '发布中...' : '发布文章'}
            </Button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左侧：主要内容 */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>文章内容</CardTitle>
                  <CardDescription>编辑文章标题、摘要和正文</CardDescription>
                </div>
              </CardHeader>
              <CardBody className="space-y-6">
                <div>
                  <Label htmlFor="title">文章标题 <span className="text-red-500">*</span></Label>
                  <Input
                    id="title"
                    value={form.title}
                    onChange={(e) => setForm({...form, title: e.target.value})}
                    placeholder="请输入标题"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="summary">文章摘要</Label>
                  <Textarea
                    id="summary"
                    value={form.summary}
                    onChange={(e) => setForm({...form, summary: e.target.value})}
                    placeholder="简短描述文章内容（可选）"
                    rows={3}
                  />
                </div>
                
                <div>
                  <Label htmlFor="content">正文内容 <span className="text-red-500">*</span></Label>
                  <Textarea
                    id="content"
                    value={form.content}
                    onChange={(e) => setForm({...form, content: e.target.value})}
                    placeholder="支持 Markdown 格式"
                    rows={20}
                    required
                  />
                </div>
              </CardBody>
            </Card>
          </div>
          
          {/* 右侧：设置和图片 */}
          <div className="space-y-6">
            {/* 分类和标签 */}
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>文章设置</CardTitle>
                  <CardDescription>设置分类和标签</CardDescription>
                </div>
              </CardHeader>
              <CardBody className="space-y-4">
                <div>
                  <Label htmlFor="category">分类</Label>
                  <select
                    id="category"
                    value={form.category_id}
                    onChange={(e) => setForm({...form, category_id: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">未分类</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <Label>标签</Label>
                  <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-lg p-3 space-y-2">
                    {tags.map(tag => (
                      <label key={tag.id} htmlFor={`tag-${tag.id}`} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                        <input
                          id={`tag-${tag.id}`}
                          type="checkbox"
                          checked={form.tag_ids.includes(tag.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setForm({...form, tag_ids: [...form.tag_ids, tag.id]})
                            } else {
                              setForm({...form, tag_ids: form.tag_ids.filter(id => id !== tag.id)})
                            }
                          }}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">{tag.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </CardBody>
            </Card>
            
            {/* 采集的图片 */}
            {crawledImages.length > 0 && (
              <Card>
                <CardHeader>
                  <div>
                    <CardTitle>采集的图片</CardTitle>
                    <CardDescription>共 {crawledImages.length} 张图片，点击插入到文章</CardDescription>
                  </div>
                </CardHeader>
                <CardBody>
                  <div className="grid grid-cols-2 gap-3">
                    {crawledImages.map((img, index) => {
                      const displayUrl = img.local_path || img.original_url
                      const insertUrl = img.local_path || img.original_url
                      
                      return (
                        <div key={index} className="relative group rounded-lg overflow-hidden border border-gray-200">
                          <img
                            src={displayUrl.startsWith('/uploads/') ? `${API_BASE_URL.replace('/api', '')}${displayUrl}` : displayUrl}
                            alt={`图片${index + 1}`}
                            referrerPolicy="no-referrer"
                            className="w-full h-24 object-cover cursor-pointer"
                            onClick={() => insertImageToContent(insertUrl)}
                          />
                          <div 
                            className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs cursor-pointer transition-opacity"
                            onClick={() => insertImageToContent(insertUrl)}
                          >
                            点击插入
                          </div>
                          {img.id && (
                            <div className="absolute top-1 right-1 bg-green-500 text-white text-[10px] px-1.5 py-0.5 rounded">
                              ✓ 已保存
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                  <p className="text-xs text-gray-500 mt-3">
                    点击图片可插入到文章末尾（带✓的已保存到图库）
                  </p>
                </CardBody>
              </Card>
            )}
            
            {/* 来源信息 */}
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>来源</CardTitle>
                  <CardDescription>文章来源链接</CardDescription>
                </div>
              </CardHeader>
              <CardBody>
                <a 
                  href={crawlUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:text-blue-800 break-all hover:underline"
                >
                  {crawlUrl}
                </a>
              </CardBody>
            </Card>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}

export default UniversalCrawlEdit
