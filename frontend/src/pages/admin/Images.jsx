// 图片管理页面 - Preline UI 风格
import { useState, useEffect, useRef } from 'react'
import { AdminLayout } from '../../components-preline/Sidebar'
import { authApi } from '../../api/auth'
import { Card, CardHeader, CardTitle, CardDescription, CardBody, CardFooter } from '../../components-preline/Card'
import { Button } from '../../components-preline/Button'
import api, { API_BASE_URL } from '../../api/config'

// 图片网格项
function ImageGridItem({ image, onClick, getImageUrl, formatFileSize }) {
  return (
    <div
      className="group relative aspect-square rounded-lg overflow-hidden cursor-pointer bg-gray-100 border border-gray-200 hover:border-blue-400 hover:shadow-md transition-all"
      onClick={() => onClick(image)}
    >
      {/* 缩略图 */}
      <img
        src={image.thumb_path ? getImageUrl(image.thumb_path) : getImageUrl(image.file_path)}
        alt={image.original_name}
        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        loading="lazy"
      />
      
      {/* 悬停遮罩 */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-end pb-4 text-white text-xs">
        <p className="truncate w-full px-2 text-center font-medium mb-1">
          {image.original_name}
        </p>
        <div className="flex items-center gap-2 text-gray-300">
          <span>{formatFileSize(image.file_size)}</span>
          {image.width && image.height && (
            <span>• {image.width}×{image.height}</span>
          )}
        </div>
      </div>
    </div>
  )
}

// 图片预览弹窗
function ImagePreviewModal({ image, onClose, onCopyMarkdown, onCopyUrl, onDelete, getImageUrl, formatFileSize }) {
  if (!image) return null

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 图片 */}
        <div className="bg-gray-100 flex items-center justify-center p-6 min-h-[300px]">
          <img
            src={getImageUrl(image.file_path)}
            alt={image.original_name}
            className="max-w-full max-h-[50vh] object-contain rounded-lg shadow-lg"
          />
        </div>
        
        {/* 信息栏 */}
        <div className="p-6 border-t border-gray-100">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h3 className="font-semibold text-gray-900 text-lg truncate max-w-md" title={image.original_name}>
                {image.original_name}
              </h3>
              <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                  </svg>
                  {formatFileSize(image.file_size)}
                </span>
                {image.width && image.height && (
                  <span className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {image.width}×{image.height}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {new Date(image.created_at).toLocaleString('zh-CN')}
                </span>
              </div>
            </div>
            
            <div className="flex gap-2 flex-wrap">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onCopyMarkdown(image)}
              >
                <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Markdown
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onCopyUrl(image)}
              >
                <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                URL
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => onDelete(image.id)}
              >
                <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                删除
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
              >
                关闭
              </Button>
            </div>
          </div>
          
          {/* Markdown 预览 */}
          <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <p className="text-xs text-gray-500 mb-1 font-medium">Markdown 格式</p>
            <code className="text-sm font-mono text-gray-700 break-all">
              {`![${image.original_name}](${image.file_path})`}
            </code>
          </div>
        </div>
      </div>
    </div>
  )
}

export function Images() {
  const [images, setImages] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [selectedImage, setSelectedImage] = useState(null)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const limit = 20
  const fileInputRef = useRef(null)
  
  // 清理统计
  const [cleanupStats, setCleanupStats] = useState(null)
  const [cleaning, setCleaning] = useState(false)
  
  // 获取当前用户信息
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  
  // 获取图片列表
  const fetchImages = async (skip = 0, append = false) => {
    try {
      setLoading(true)
      const response = await api.get(`/images?skip=${skip}&limit=${limit}`)
      
      const data = response.data
      
      if (append) {
        setImages(prev => [...prev, ...data.items])
      } else {
        setImages(data.items)
      }
      
      setHasMore(data.items.length === limit && (skip + data.items.length) < data.total)
    } catch (error) {
      alert('获取图片失败: ' + error.message)
    } finally {
      setLoading(false)
    }
  }
  
  useEffect(() => {
    fetchImages()
  }, [])
  
  // 获取清理统计
  const fetchCleanupStats = async () => {
    try {
      const response = await api.get('/images/usage-stats')
      const data = response.data
      setCleanupStats(data)
    } catch (error) {
      // 静默失败，不影响主功能
    }
  }
  
  useEffect(() => {
    fetchCleanupStats()
  }, [images])
  
  // 上传图片
  const handleUpload = async (e) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    
    setUploading(true)
    const formData = new FormData()
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i])
    }
    
    try {
      const response = await api.post('/images/upload-multiple', formData)
      
      const data = response.data
      
      if (data.uploaded && data.uploaded.length > 0) {
        setImages(prev => [...data.uploaded, ...prev])
        alert(`成功上传 ${data.uploaded.length} 张图片`)
      }
      
      if (data.errors && data.errors.length > 0) {
        alert('部分上传失败: ' + data.errors.join(', '))
      }
    } catch (error) {
      alert('上传失败: ' + error.message)
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }
  
  // 删除图片
  const handleDelete = async (imageId) => {
    if (!confirm('确定要删除这张图片吗？')) return
    
    try {
      await api.delete(`/images/${imageId}`)
      
      setImages(prev => prev.filter(img => img.id !== imageId))
      if (selectedImage?.id === imageId) {
        setSelectedImage(null)
      }
    } catch (error) {
      alert('删除失败: ' + error.message)
    }
  }
  
  // 复制 Markdown 格式
  const copyMarkdown = (image) => {
    const markdown = `![${image.original_name}](${image.file_path})`
    navigator.clipboard.writeText(markdown).then(() => {
      alert('已复制 Markdown: ' + markdown)
    }).catch(() => {
      // 使用 requestAnimationFrame 确保不在 React 渲染周期内操作 DOM
      requestAnimationFrame(() => {
        const textarea = document.createElement('textarea')
        textarea.value = markdown
        textarea.style.cssText = 'position:fixed;left:-9999px;opacity:0;'
        document.body.appendChild(textarea)
        textarea.select()
        try {
          document.execCommand('copy')
          alert('已复制 Markdown: ' + markdown)
        } catch (e) {
          console.error('复制失败:', e)
        }
        // 延迟移除避免竞态
        setTimeout(() => {
          if (textarea.parentNode) {
            textarea.parentNode.removeChild(textarea)
          }
        }, 0)
      })
    })
  }
  
  // 复制 URL
  const copyUrl = (image) => {
    const url = `${API_BASE_URL.replace('/api', '')}${image.file_path}`
    navigator.clipboard.writeText(url).then(() => {
      alert('已复制 URL: ' + url)
    })
  }
  
  // 清理未使用图片
  const handleCleanup = async () => {
    if (!cleanupStats || cleanupStats.unused_images === 0) {
      alert('没有可清理的未使用图片')
      return
    }
    
    const msg = `确定要清理 ${cleanupStats.unused_images} 张未使用的图片吗？\n将释放约 ${cleanupStats.unused_space_mb} MB 空间。\n\n⚠️ 注意：此操作不可恢复！`
    if (!confirm(msg)) return
    
    setCleaning(true)
    try {
      const response = await api.post('/images/cleanup-unused')
      const data = response.data
      alert(`✅ ${data.message}\n释放空间: ${data.freed_space_mb} MB`)
      fetchImages()
      fetchCleanupStats()
    } catch (error) {
      alert('清理失败: ' + error.message)
    } finally {
      setCleaning(false)
    }
  }
  
  // 加载更多
  const loadMore = () => {
    const nextPage = page + 1
    setPage(nextPage)
    fetchImages(nextPage * limit, true)
  }
  
  // 格式化文件大小
  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }
  
  // 获取图片完整 URL
  const getImageUrl = (path) => {
    return `${API_BASE_URL.replace('/api', '')}${path}`
  }
  
  const handleLogout = async () => {
    localStorage.removeItem('token')
    await authApi.logout()
    localStorage.removeItem('user')
    window.location.href = '/login'
  }
  
  return (
    <AdminLayout user={user} onLogout={handleLogout}>
      <div className="p-6 w-full">
        {/* 页面标题 */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">图片管理</h1>
          <p className="text-gray-500 mt-1">上传、管理和清理博客图片</p>
        </div>
        
        <div className="space-y-6">
          {/* 上传区域 */}
          <Card>
            <CardBody>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleUpload}
                accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
                multiple
                className="hidden"
              />
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">上传新图片</h3>
                    <p className="text-sm text-gray-500 mt-0.5">
                      支持 JPG、PNG、GIF、WebP、SVG，单张最大 10MB，自动生成缩略图
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  loading={uploading}
                >
                  <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  {uploading ? '上传中...' : '选择图片'}
                </Button>
              </div>
            </CardBody>
          </Card>
          
          {/* 清理统计警告 */}
          {cleanupStats && cleanupStats.unused_images > 0 && (
            <Card className="bg-yellow-50 border-yellow-200">
              <CardBody>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <svg className="w-6 h-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-yellow-800">发现未使用图片</h3>
                      <p className="text-sm text-yellow-700 mt-0.5">
                        共有 {cleanupStats.unused_images} 张图片未被引用，占用 {cleanupStats.unused_space_mb} MB 空间
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={handleCleanup}
                    loading={cleaning}
                    className="bg-yellow-500 hover:bg-yellow-600 text-white"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    一键清理
                  </Button>
                </div>
              </CardBody>
            </Card>
          )}
          
          {/* 图片网格 */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>图片库</CardTitle>
                  <CardDescription>
                    共 {images.length} 张图片
                    {cleanupStats && (
                      <span className="ml-2 text-gray-400">
                        · 已使用 {cleanupStats.used_images} 张 · 未使用 {cleanupStats.unused_images} 张
                      </span>
                    )}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardBody>
              {loading && images.length === 0 ? (
                <div className="flex items-center justify-center py-16">
                  <svg className="animate-spin h-8 w-8 text-gray-300" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                </div>
              ) : images.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-10 h-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <p className="text-gray-500 mb-2">暂无图片</p>
                  <p className="text-sm text-gray-400">点击上方按钮上传图片</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {images.map((image) => (
                      <ImageGridItem
                        key={image.id}
                        image={image}
                        onClick={setSelectedImage}
                        getImageUrl={getImageUrl}
                        formatFileSize={formatFileSize}
                      />
                    ))}
                  </div>
                  
                  {/* 加载更多 */}
                  {hasMore && (
                    <div className="text-center mt-8">
                      <Button
                        variant="secondary"
                        onClick={loadMore}
                        loading={loading}
                      >
                        {loading ? '加载中...' : '加载更多'}
                      </Button>
                    </div>
                  )}
                </>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
      
      {/* 图片预览弹窗 */}
      <ImagePreviewModal
        image={selectedImage}
        onClose={() => setSelectedImage(null)}
        onCopyMarkdown={copyMarkdown}
        onCopyUrl={copyUrl}
        onDelete={handleDelete}
        getImageUrl={getImageUrl}
        formatFileSize={formatFileSize}
      />
    </AdminLayout>
  )
}

export default Images
