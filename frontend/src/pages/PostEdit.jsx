// 文章编辑页面 - 支持 Markdown / HTML 双格式
import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AdminLayout } from '../components-preline/Sidebar'
import { authApi } from '../api/auth'
import { Card, CardHeader, CardTitle, CardDescription, CardBody, CardFooter } from '../components-preline/Card'
import { Button } from '../components-preline/Button'
import { Input, Textarea, Label } from '../components-preline/Input'
import { postsApi } from '../api/posts'
import { categoriesApi } from '../api/categories'
import { tagsApi } from '../api/tags'
import { API_BASE_URL } from '../api/config'
import { getErrorMessage } from '../utils/errorMessage'

import MDEditor from '@uiw/react-md-editor'
import '@uiw/react-md-editor/markdown-editor.css'

import ReactQuill from 'react-quill-new'
import 'react-quill-new/dist/quill.snow.css'

// 图片上传组件
function ImageUploader({ uploadedImages, setUploadedImages, onInsertImage }) {
  const fileInputRef = useRef(null)
  const [uploading, setUploading] = useState(false)

  const handleImageUpload = async (e) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploading(true)
    const formData = new FormData()
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i])
    }

    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${API_BASE_URL}/images/upload-multiple`, {
        method: 'POST',
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        credentials: 'include',
        body: formData
      })
      const data = await res.json()
      if (data.uploaded && data.uploaded.length > 0) {
        setUploadedImages(prev => [...prev, ...data.uploaded])
      }
    } catch (error) {
      alert('上传失败')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-4">
      <input
        type="file"
        multiple
        accept="image/*"
        ref={fileInputRef}
        onChange={handleImageUpload}
        className="hidden"
      />
      <Button
        type="button"
        variant="secondary"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="w-full"
      >
        {uploading ? '上传中...' : '上传图片'}
      </Button>

      {uploadedImages.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">本次上传的图片</p>
          <div className="grid grid-cols-3 gap-2">
            {uploadedImages.map((img) => (
              <div
                key={img.id}
                className="relative group aspect-square rounded-lg overflow-hidden cursor-pointer bg-gray-100 border border-gray-200 hover:border-blue-400 transition-colors"
                onClick={() => onInsertImage(img)}
                title="点击插入到文章"
              >
                <img
                  src={`${API_BASE_URL.replace('/api', '')}${img.thumb_path || img.file_path}`}
                  alt={img.original_name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500">点击图片插入到文章末尾</p>
        </div>
      )}

      <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
        <p className="text-xs font-medium text-blue-800 mb-1">使用说明</p>
        <ul className="text-xs text-blue-700 space-y-0.5">
          <li>1. 点击上传图片</li>
          <li>2. 点击缩略图插入文章</li>
          <li>3. Markdown 模式插入 <code className="bg-blue-100 px-1 rounded">![描述](/uploads/xxx.jpg)</code></li>
          <li>4. HTML 模式插入图片标签</li>
        </ul>
      </div>
    </div>
  )
}

// 标签选择器
function TagSelector({ tags, selectedIds, onToggle }) {
  return (
    <div className="flex flex-wrap gap-2">
      {tags.map(tag => (
        <button
          key={tag.id}
          type="button"
          onClick={() => onToggle(tag.id)}
          className={`px-3 py-1.5 text-sm rounded-full border transition-all ${
            selectedIds.includes(tag.id)
              ? 'bg-blue-500 text-white border-blue-500'
              : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400 hover:text-blue-600'
          }`}
        >
          {tag.name}
        </button>
      ))}
    </div>
  )
}

export function PostEdit() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = Boolean(id)
  const quillRef = useRef(null)

  const [form, setForm] = useState({
    title: '',
    content: '',
    content_type: 'markdown',
    summary: '',
    category_id: '',
    tag_ids: [],
    is_published: true,
    is_draft: false
  })
  const [categories, setCategories] = useState([])
  const [tags, setTags] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploadedImages, setUploadedImages] = useState([])

  const user = JSON.parse(localStorage.getItem('user') || '{}')

  useEffect(() => {
    fetchCategories()
    fetchTags()
    if (isEdit) {
      fetchPost()
    } else {
      // 新建文章时重置表单，防止从编辑页切换过来残留旧数据
      setForm({
        title: '',
        content: '',
        content_type: 'markdown',
        summary: '',
        category_id: '',
        tag_ids: [],
        is_published: true,
        is_draft: false
      })
    }
  }, [id])

  const fetchCategories = async () => {
    try {
      const res = await categoriesApi.getCategories()
      setCategories(res.data)
    } catch (error) {
      console.error('获取分类失败', error)
    }
  }

  const fetchTags = async () => {
    try {
      const res = await tagsApi.getTags()
      setTags(res.data)
    } catch (error) {
      console.error('获取标签失败', error)
    }
  }

  const fetchPost = async () => {
    setLoading(true)
    try {
      const res = await postsApi.getPost(id)
      const post = res.data
      setForm({
        title: post.title,
        content: post.content,
        content_type: post.content_type || 'markdown',
        summary: post.summary || '',
        category_id: post.category_id || '',
        tag_ids: post.tags.map(t => t.id),
        is_published: post.is_published,
        is_draft: post.is_draft
      })
    } catch (error) {
      alert('获取文章失败')
      navigate('/admin/posts')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e, isDraft = false) => {
    e.preventDefault()

    if (!form.title.trim() || !form.content.trim()) {
      alert('请填写标题和内容')
      return
    }

    setSaving(true)
    try {
      const data = {
        ...form,
        category_id: form.category_id || null,
        is_draft: isDraft
      }

      if (isEdit) {
        await postsApi.updatePost(id, data)
      } else {
        await postsApi.createPost(data)
      }

      navigate('/admin/posts')
    } catch (error) {
      alert('保存失败: ' + getErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleTagToggle = (tagId) => {
    setForm(prev => ({
      ...prev,
      tag_ids: prev.tag_ids.includes(tagId)
        ? prev.tag_ids.filter(id => id !== tagId)
        : [...prev.tag_ids, tagId]
    }))
  }

  // 插入图片：根据当前模式决定格式
  const insertImageToEditor = useCallback((image) => {
    if (form.content_type === 'html') {
      // HTML 模式：通过 Quill API 插入
      if (quillRef.current) {
        const quill = quillRef.current.getEditor()
        const range = quill.getSelection(true)
        const index = range ? range.index : quill.getLength()
        quill.insertEmbed(index, 'image', image.file_path, 'user')
        quill.setSelection(index + 1, 0, 'silent')
      }
    } else {
      // Markdown 模式：追加 markdown 图片语法
      const markdown = `\n![${image.original_name}](${image.file_path})\n`
      setForm(prev => ({
        ...prev,
        content: prev.content + markdown
      }))
    }
  }, [form.content_type])

  const handleLogout = async () => {
    localStorage.removeItem('token')
    await authApi.logout()
    localStorage.removeItem('user')
    window.location.href = '/login'
  }

  const quillModules = {
    toolbar: [
      [{ header: [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ list: 'ordered' }, { list: 'bullet' }],
      [{ indent: '-1' }, { indent: '+1' }],
      ['link', 'image'],
      ['blockquote', 'code-block'],
      [{ color: [] }, { background: [] }],
      ['clean']
    ]
  }

  if (loading) {
    return (
      <AdminLayout user={user} onLogout={handleLogout}>
        <div className="p-6 w-full flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <svg className="animate-spin h-8 w-8 text-blue-500 mx-auto mb-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-gray-500">加载中...</p>
          </div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout user={user} onLogout={handleLogout}>
      <div className="p-6 w-full">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">
            {isEdit ? '编辑文章' : '写文章'}
          </h1>
          <p className="text-gray-500 mt-1">
            {isEdit ? '修改文章内容和设置' : '创建新的博客文章'}
          </p>
        </div>

        <form onSubmit={(e) => handleSubmit(e, false)}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 主编辑区 */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardBody className="space-y-6">
                  {/* 标题 */}
                  <div>
                    <Label htmlFor="title" required>文章标题</Label>
                    <Input
                      id="title"
                      name="title"
                      value={form.title}
                      onChange={handleChange}
                      placeholder="请输入文章标题"
                      required
                    />
                  </div>

                  {/* 格式切换 */}
                  <div>
                    <Label>编辑格式</Label>
                    <div className="flex gap-2 mt-1">
                      <button
                        type="button"
                        onClick={() => setForm(prev => ({
                          ...prev,
                          content_type: 'markdown',
                          // 从 HTML 切回 Markdown 时，如果 content 是空的段落标签，清空它
                          content: /^<p\s*>(\s*|<br\s*\/?>)<\/p>\s*$/i.test(prev.content) ? '' : prev.content
                        }))}
                        className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                          form.content_type === 'markdown'
                            ? 'bg-blue-500 text-white border-blue-500'
                            : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                        }`}
                      >
                        Markdown
                      </button>
                      <button
                        type="button"
                        onClick={() => setForm(prev => ({ ...prev, content_type: 'html' }))}
                        className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                          form.content_type === 'html'
                            ? 'bg-blue-500 text-white border-blue-500'
                            : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                        }`}
                      >
                        富文本 HTML
                      </button>
                    </div>
                  </div>

                  {/* 摘要 */}
                  <div>
                    <Label htmlFor="summary">摘要</Label>
                    <Textarea
                      id="summary"
                      name="summary"
                      value={form.summary}
                      onChange={handleChange}
                      rows={2}
                      placeholder="文章摘要（可选，不填则自动截取正文前200字）"
                    />
                  </div>

                  {/* 正文 - Markdown 模式 */}
                  {form.content_type === 'markdown' && (
                    <div>
                      <Label required>正文内容（Markdown）</Label>
                      <div className="mt-1 border border-gray-300 rounded-lg overflow-hidden" data-color-mode="light">
                        <MDEditor
                          value={/^<p\s*>(\s*|<br\s*\/?>)<\/p>\s*$/i.test(form.content) ? '' : form.content}
                          onChange={(val) => setForm(prev => ({ ...prev, content: val || '' }))}
                          height={500}
                          preview="edit"
                        />
                      </div>
                    </div>
                  )}

                  {/* 正文 - HTML 模式 */}
                  {form.content_type === 'html' && (
                    <div>
                      <Label required>正文内容（富文本）</Label>
                      <div className="mt-1">
                        <ReactQuill
                          ref={quillRef}
                          theme="snow"
                          value={form.content}
                          onChange={(val) => setForm(prev => ({ ...prev, content: /^<p\s*>(\s*|<br\s*\/?>)<\/p>\s*$/i.test(val) ? '' : val }))}
                          modules={quillModules}
                          style={{ height: 450 }}
                        />
                      </div>
                    </div>
                  )}
                </CardBody>
              </Card>
            </div>

            {/* 侧边栏 */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <div>
                    <CardTitle>图片管理</CardTitle>
                    <CardDescription>上传并插入图片到文章</CardDescription>
                  </div>
                </CardHeader>
                <CardBody>
                  <ImageUploader
                    uploadedImages={uploadedImages}
                    setUploadedImages={setUploadedImages}
                    onInsertImage={insertImageToEditor}
                  />
                </CardBody>
              </Card>

              <Card>
                <CardHeader>
                  <div>
                    <CardTitle>发布设置</CardTitle>
                    <CardDescription>选择分类和标签</CardDescription>
                  </div>
                </CardHeader>
                <CardBody className="space-y-6">
                  <div>
                    <Label htmlFor="category_id">分类</Label>
                    <select
                      id="category_id"
                      name="category_id"
                      value={form.category_id}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">未分类</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label>标签</Label>
                    <TagSelector
                      tags={tags}
                      selectedIds={form.tag_ids}
                      onToggle={handleTagToggle}
                    />
                  </div>
                </CardBody>
                <CardFooter className="flex-col gap-2">
                  <Button
                    type="submit"
                    variant="primary"
                    className="w-full"
                    loading={saving}
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {saving ? '保存中...' : (isEdit ? '更新文章' : '发布文章')}
                  </Button>

                  <Button
                    type="button"
                    variant="secondary"
                    className="w-full"
                    onClick={(e) => handleSubmit(e, true)}
                    disabled={saving}
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    保存为草稿
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full"
                    onClick={() => navigate('/admin/posts')}
                    disabled={saving}
                  >
                    取消
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </div>
        </form>
      </div>
    </AdminLayout>
  )
}

export default PostEdit
