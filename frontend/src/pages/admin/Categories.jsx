// 分类管理页面 - Preline UI 风格
import { useState, useEffect } from 'react'
import { AdminLayout } from '../../components-preline/Sidebar'
import { authApi } from '../../api/auth'
import { Card, CardHeader, CardTitle, CardDescription, CardBody, CardFooter } from '../../components-preline/Card'
import { Button } from '../../components-preline/Button'
import { Input, Textarea, Label } from '../../components-preline/Input'
import { categoriesApi } from '../../api/categories'
import { getErrorMessage } from '../../utils/errorMessage'

// 分类列表项
function CategoryItem({ category, isEditing, onEdit, onDelete }) {
  return (
    <div className={`flex items-center justify-between p-4 border-b border-gray-100 last:border-0 transition-colors ${
      isEditing ? 'bg-blue-50' : 'hover:bg-gray-50'
    }`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-medium text-gray-900">{category.name}</h4>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                {category.post_count || 0} 篇
              </span>
            </div>
            {category.description && (
              <p className="text-sm text-gray-500 mt-0.5 truncate">
                {category.description}
              </p>
            )}
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-2 ml-4">
        <Button 
          variant="secondary" 
          size="sm"
          onClick={() => onEdit(category)}
        >
          <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          编辑
        </Button>
        <Button 
          variant="danger" 
          size="sm"
          onClick={() => onDelete(category)}
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

export function Categories() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({ name: '', description: '' })
  const [saving, setSaving] = useState(false)
  
  // 获取当前用户信息
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  
  useEffect(() => {
    fetchCategories()
  }, [])
  
  const fetchCategories = async () => {
    try {
      const res = await categoriesApi.getCategories()
      setCategories(res.data)
    } catch (error) {
      alert('获取分类失败')
    } finally {
      setLoading(false)
    }
  }
  
  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!form.name.trim()) {
      alert('请输入分类名称')
      return
    }
    
    setSaving(true)
    try {
      if (editingId) {
        await categoriesApi.updateCategory(editingId, form)
      } else {
        await categoriesApi.createCategory(form)
      }
      setForm({ name: '', description: '' })
      setEditingId(null)
      fetchCategories()
    } catch (error) {
      alert(error.response?.data?.detail || '保存失败')
    } finally {
      setSaving(false)
    }
  }
  
  const handleEdit = (category) => {
    setEditingId(category.id)
    setForm({
      name: category.name,
      description: category.description || ''
    })
  }
  
  const handleDelete = async (category) => {
    const msg = category?.post_count > 0 
      ? `该分类下有 ${category.post_count} 篇文章，删除后这些文章将变为未分类。确定删除吗？`
      : '确定要删除这个分类吗？'
    
    if (!confirm(msg)) return
    
    try {
      await categoriesApi.deleteCategory(category.id)
      if (editingId === category.id) {
        handleCancel()
      }
      fetchCategories()
    } catch (error) {
      alert('删除失败: ' + getErrorMessage(error))
    }
  }
  
  const handleCancel = () => {
    setEditingId(null)
    setForm({ name: '', description: '' })
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
          <h1 className="text-2xl font-semibold text-gray-900">分类管理</h1>
          <p className="text-gray-500 mt-1">管理博客文章分类（最多 25 个）</p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 分类列表 */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>分类列表</CardTitle>
                  <CardDescription>共 {categories.length} 个分类，最多 25 个</CardDescription>
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
                ) : categories.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                      </svg>
                    </div>
                    <p className="text-gray-500">暂无分类，请在右侧添加</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {categories.map(cat => (
                      <CategoryItem 
                        key={cat.id}
                        category={cat}
                        isEditing={editingId === cat.id}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                      />
                    ))}
                  </div>
                )}
              </CardBody>
            </Card>
          </div>
          
          {/* 添加/编辑表单 */}
          <div>
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>{editingId ? '编辑分类' : '添加分类'}</CardTitle>
                  <CardDescription>{editingId ? '修改分类信息' : '创建新的文章分类'}</CardDescription>
                </div>
              </CardHeader>
              <CardBody>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="category_name">
                      分类名称 <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="category_name"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="如：技术笔记"
                      maxLength={50}
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="category_description">分类描述</Label>
                    <Textarea
                      id="category_description"
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      placeholder="可选，简短描述该分类的内容"
                      rows={3}
                      maxLength={200}
                    />
                    <p className="text-xs text-gray-500 mt-1">最多 200 字</p>
                  </div>
                </form>
              </CardBody>
              <CardFooter>
                {editingId && (
                  <Button
                    variant="secondary"
                    onClick={handleCancel}
                  >
                    取消编辑
                  </Button>
                )}
                <Button
                  variant="primary"
                  onClick={handleSubmit}
                  loading={saving}
                  disabled={!editingId && categories.length >= 25}
                  className="ml-auto"
                >
                  {saving ? '保存中...' : (editingId ? '更新分类' : '添加分类')}
                </Button>
              </CardFooter>
              
              {!editingId && categories.length >= 25 && (
                <div className="px-6 pb-6">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-center gap-2">
                    <svg className="w-5 h-5 text-yellow-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span className="text-sm text-yellow-800">已达到分类数量上限（25个）</span>
                  </div>
                </div>
              )}
            </Card>
            
            {/* 提示信息 */}
            <Card className="mt-6 bg-blue-50 border-blue-100">
              <CardBody>
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="font-medium text-gray-900 mb-1">使用说明</p>
                    <ul className="space-y-1.5 text-sm text-gray-600">
                      <li className="flex items-center gap-1">
                        <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                        最多可创建 25 个分类
                      </li>
                      <li className="flex items-center gap-1">
                        <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                        删除分类不会删除文章
                      </li>
                      <li className="flex items-center gap-1">
                        <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                        文章将变为未分类状态
                      </li>
                      <li className="flex items-center gap-1">
                        <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                        分类名称不能重复
                      </li>
                    </ul>
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}

export default Categories
