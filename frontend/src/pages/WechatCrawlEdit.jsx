// 微信公众号文章采集页面
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { AdminLayout } from '../components-preline/Sidebar'
import { Card, CardHeader, CardTitle, CardDescription, CardBody } from '../components-preline/Card'
import { Button } from '../components-preline/Button'
import { Input, Textarea, Label } from '../components-preline/Input'
import api from '../api/config'

export function WechatCrawlEdit() {
  const navigate = useNavigate()
  const [step, setStep] = useState('input') // input | preview | saving | done
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // 预览数据
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [summary, setSummary] = useState('')
  const [author, setAuthor] = useState('')
  const [coverImage, setCoverImage] = useState('')
  const [sourceUrl, setSourceUrl] = useState('')
  const [crawledImages, setCrawledImages] = useState([])

  // 分类和标签
  const [categories, setCategories] = useState([])
  const [categoryId, setCategoryId] = useState('')
  const [tagInput, setTagInput] = useState('')
  const [saving, setSaving] = useState(false)

  // 获取分类列表
  useEffect(() => {
    api.get('/categories').then(res => {
      setCategories(res.data || [])
    }).catch(() => {})
  }, [])

  const handleCrawl = async () => {
    setError('')
    if (!url.trim()) {
      setError('请输入文章链接')
      return
    }
    if (!url.includes('mp.weixin.qq.com')) {
      setError('请输入微信公众号文章链接')
      return
    }
    setLoading(true)
    try {
      const res = await api.post('/wechat-crawl/preview', { url: url.trim() })
      const data = res.data
      setTitle(data.title || '')
      setContent(data.content_md || '')
      setSummary(data.summary || '')
      setAuthor(data.author || '')
      setCoverImage(data.cover_image || '')
      setSourceUrl(data.source_url || '')
      setCrawledImages(data.images || [])
      setStep('preview')
    } catch (err) {
      setError(err.response?.data?.detail || '采集失败，请检查链接是否有效')
    } finally {
      setLoading(false)
    }
  }

  const savePost = async (asDraft = false) => {
    if (!title.trim()) {
      setError('请输入文章标题')
      return
    }
    if (!content.trim()) {
      setError('请输入文章内容')
      return
    }

    setSaving(true)
    setError('')

    try {
      const tagNames = tagInput.split(/[,，]/).map(t => t.trim()).filter(Boolean)
      await api.post('/wechat-crawl/save', {
        title: title.trim(),
        content,
        summary: summary.trim(),
        cover_image: coverImage,
        category_id: categoryId ? parseInt(categoryId) : null,
        tag_names: tagNames,
        source_url: sourceUrl,
        author: author,
        is_draft: asDraft,
      })

      setStep('done')
    } catch (err) {
      console.error('保存失败:', err)
      setError(err.response?.data?.detail || '保存失败，请重试')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveDraft = () => savePost(true)
  const handlePublish = () => savePost(false)

  const handleCancel = () => {
    navigate('/admin/posts')
  }

  const handleReset = () => {
    setStep('input')
    setUrl('')
    setTitle('')
    setContent('')
    setSummary('')
    setAuthor('')
    setCoverImage('')
    setSourceUrl('')
    setCrawledImages([])
    setCategoryId('')
    setTagInput('')
    setError('')
  }

  // 将图片插入正文光标位置
  const insertImageIntoContent = (src) => {
    const textarea = document.getElementById('article-content')
    if (!textarea) return

    const imageMarkdown = `\n\n![图片](${src})\n\n`
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const newContent = content.substring(0, start) + imageMarkdown + content.substring(end)
    setContent(newContent)

    // 重新设置光标位置
    setTimeout(() => {
      textarea.focus()
      const newCursorPosition = start + imageMarkdown.length
      textarea.setSelectionRange(newCursorPosition, newCursorPosition)
    }, 0)
  }

  return (
    <AdminLayout>
      {/* 步骤1：输入 URL */}
      {step === 'input' && (
        <div className="p-6">
          <div className="max-w-2xl mx-auto">
            {/* 错误提示 */}
            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <Card>
              <CardHeader>
                <CardTitle>公众号文章采集</CardTitle>
                <CardDescription>输入微信公众号文章链接，自动采集并入库</CardDescription>
              </CardHeader>
              <CardBody>
                <div className="space-y-4">
                  <div>
                    <Label>文章链接</Label>
                    <Input
                      placeholder="https://mp.weixin.qq.com/s/xxxxxx"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleCrawl()}
                    />
                    <p className="text-xs text-gray-500 mt-1">支持 mp.weixin.qq.com 域名</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button
                      variant="primary"
                      onClick={handleCrawl}
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          采集中...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                          开始采集
                        </>
                      )}
                    </Button>
                    <Button variant="secondary" onClick={() => navigate('/admin/posts')}>
                      返回文章列表
                    </Button>
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>
        </div>
      )}

      {/* 步骤2：预览编辑 */}
      {step === 'preview' && (
        <div className="p-6">
          {/* 错误提示 */}
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* 顶部操作栏 */}
          <div className="mb-6 flex items-center justify-between">
            <Button variant="ghost" onClick={() => navigate('/admin/posts')} className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              返回文章列表
            </Button>
            <div className="flex items-center gap-3">
              <Button variant="secondary" onClick={handleSaveDraft} disabled={saving}>
                {saving ? '保存中...' : '保存草稿'}
              </Button>
              <Button variant="primary" onClick={handlePublish} disabled={saving}>
                {saving ? '发布中...' : '发布文章'}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_384px] gap-6">
            {/* 左侧：文章内容 */}
            <div className="space-y-6">
              <Card>
                <CardBody className="p-6">
                  <div className="space-y-5">
                    {/* 文章标题 */}
                    <div>
                      <Label className="text-sm font-medium text-gray-700 mb-1.5 block">
                        文章标题 <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="请输入文章标题"
                      />
                    </div>

                    {/* 文章摘要 */}
                    <div>
                      <Label className="text-sm font-medium text-gray-700 mb-1.5 block">
                        文章摘要
                      </Label>
                      <Textarea
                        rows={3}
                        value={summary}
                        onChange={(e) => setSummary(e.target.value)}
                        placeholder="请输入文章摘要..."
                      />
                    </div>

                    {/* 公众号/作者 */}
                    <div>
                      <Label className="text-sm font-medium text-gray-700 mb-1.5 block">
                        公众号/作者
                      </Label>
                      <Input
                        value={author}
                        onChange={(e) => setAuthor(e.target.value)}
                        placeholder="公众号名称"
                      />
                    </div>

                    {/* 来源链接 */}
                    <div>
                      <Label className="text-sm font-medium text-gray-700 mb-1.5 block">
                        来源链接
                      </Label>
                      <Input
                        value={sourceUrl}
                        onChange={(e) => setSourceUrl(e.target.value)}
                        placeholder="原文链接"
                      />
                    </div>

                    {/* 文章内容 */}
                    <div>
                      <Label className="text-sm font-medium text-gray-700 mb-1.5 block">
                        文章内容 <span className="text-red-500">*</span>
                      </Label>
                      <Textarea
                        id="article-content"
                        rows={25}
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="请输入文章内容..."
                        className="font-mono text-sm"
                      />
                    </div>
                  </div>
                </CardBody>
              </Card>
            </div>

            {/* 右侧：文章设置 */}
            <div className="space-y-6">
              {/* 文章设置 */}
              <Card>
                <CardHeader>
                  <CardTitle>文章设置</CardTitle>
                </CardHeader>
                <CardBody className="p-6">
                  <div className="space-y-5">
                    {/* 分类 */}
                    <div>
                      <Label className="text-sm font-medium text-gray-700 mb-1.5 block">
                        分类
                      </Label>
                      <select
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                        value={categoryId}
                        onChange={(e) => setCategoryId(e.target.value)}
                      >
                        <option value="">选择分类</option>
                        {categories.map(category => (
                          <option key={category.id} value={category.id}>{category.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* 标签 */}
                    <div>
                      <Label className="text-sm font-medium text-gray-700 mb-1.5 block">
                        标签
                      </Label>
                      <Input
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        placeholder="用逗号分隔多个标签"
                      />
                      <p className="text-xs text-gray-500 mt-1">例如：技术, 教程, 笔记</p>
                    </div>

                    {/* 封面图 */}
                    {coverImage && (
                      <div>
                        <Label className="text-sm font-medium text-gray-700 mb-1.5 block">
                          封面图
                        </Label>
                        <div className="border border-gray-200 rounded-lg overflow-hidden">
                          <img
                            src={coverImage}
                            alt="封面图"
                            referrerPolicy="no-referrer"
                            className="w-full h-40 object-cover"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </CardBody>
              </Card>

              {/* 采集的图片 */}
              <Card>
                <CardHeader>
                  <CardTitle>采集的图片</CardTitle>
                  <CardDescription>点击缩略图可插入到正文中</CardDescription>
                </CardHeader>
                <CardBody className="p-6">
                  {crawledImages.length === 0 ? (
                    <div className="text-center py-6 text-gray-500 text-sm">
                      未采集到图片
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      {crawledImages.map((image, index) => (
                        <button
                          key={index}
                          onClick={() => insertImageIntoContent(image.original_url)}
                          className="relative aspect-square border border-gray-200 rounded-lg overflow-hidden hover:border-blue-500 hover:ring-2 hover:ring-blue-200 transition-all cursor-pointer"
                          title="点击插入正文"
                        >
                          <img
                            src={image.original_url}
                            alt={image.description || `图片 ${index + 1}`}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </CardBody>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* 步骤3：完成 */}
      {step === 'done' && (
        <div className="p-6">
          <div className="max-w-lg mx-auto">
            <Card>
              <CardBody className="text-center py-12">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">文章已保存</h3>
                <p className="text-gray-500 mb-6">公众号文章已成功采集并入库</p>
                <div className="flex items-center justify-center gap-3">
                  <Button variant="primary" onClick={() => navigate('/admin/posts')}>
                    返回文章列表
                  </Button>
                  <Button variant="secondary" onClick={handleReset}>
                    继续采集
                  </Button>
                </div>
              </CardBody>
            </Card>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}

export default WechatCrawlEdit
