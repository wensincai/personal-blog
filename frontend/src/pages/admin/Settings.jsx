// 博客设置页面 - Preline UI 风格
import { useState, useEffect } from 'react'
import { AdminLayout } from '../../components-preline/Sidebar'
import { authApi } from '../../api/auth'
import { Card, CardHeader, CardTitle, CardDescription, CardBody, CardFooter } from '../../components-preline/Card'
import { Button } from '../../components-preline/Button'
import { Input, Textarea, Select, Label, FormError, FormHelp } from '../../components-preline/Input'
import { API_BASE_URL } from '../../api/config'
import { generateShades, generateHarmony, randomPalette, hexToHsl, hslToHex, SHADE_STOPS } from '../../utils/colorPalette'

export function Settings() {
  const [activeTab, setActiveTab] = useState('general')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  // 获取当前用户信息
  const user = JSON.parse(localStorage.getItem('user') || '{}')

  // ============ 网站配色 ============
  const [baseColor, setBaseColor] = useState('#2563EB')
  const [shades, setShades] = useState({})
  const [harmony, setHarmony] = useState({})
  const [paletteMode, setPaletteMode] = useState('shades') // 'shades' | 'harmony'
  
  // 博客设置
  const [settings, setSettings] = useState({
    blog_name: '侘寂屋',
    blog_description: '',
    welcome_message: '欢迎来到侘寂屋 👋 分享技术、生活与思考',
    banner_type: 'text',
    banner_images: '[]',
    theme: 'neobrutalism',
    layout: 'card',
    theme_colors: '{"primary":"#2563EB","secondary":"#06b6d4","bg":"#F8FAFC","text":"#0F172A","sidebar":"#1E293B"}'
  })

  // 配色对象（由 theme_colors JSON 解析而来）
  const [colors, setColors] = useState({
    primary: '#2563EB',
    secondary: '#06b6d4',
    bg: '#F8FAFC',
    text: '#0F172A',
    sidebar: '#1E293B',
  })
  
  // 密码修改
  const [passwordData, setPasswordData] = useState({
    old_password: '',
    new_password: '',
    confirm_password: ''
  })
  const [passwordError, setPasswordError] = useState('')
  
  const token = localStorage.getItem('token')

  // 注入完整主题变量到 CSS
  const injectThemeVars = (themeColors, shadeMap, harmonyMap) => {
    const root = document.documentElement

    // 语义变量
    const semanticMap = {
      primary: '--color-primary',
      secondary: '--color-secondary',
      bg: '--color-bg',
      text: '--color-text',
      sidebar: '--color-sidebar',
      'sidebar-active': '--color-sidebar-active',
      border: '--color-border',
      card: '--color-card',
    }

    // 色阶优先映射关键语义变量
    if (shadeMap) {
      if (shadeMap[500]) root.style.setProperty('--color-primary', shadeMap[500])
      if (shadeMap[600]) root.style.setProperty('--color-primary-hover', shadeMap[600])
      if (shadeMap[100]) root.style.setProperty('--color-primary-light', shadeMap[100])
    }

    Object.entries(semanticMap).forEach(([key, cssVar]) => {
      if (key === 'primary' && shadeMap?.[500]) return // 已用色阶覆盖
      if (themeColors[key]) root.style.setProperty(cssVar, themeColors[key])
    })

    // Primary 色阶 (50-950)
    if (shadeMap) {
      SHADE_STOPS.forEach(stop => {
        if (shadeMap[stop]) {
          root.style.setProperty(`--color-primary-${stop}`, shadeMap[stop])
        }
      })
    }

    // Secondary 色阶 (50-950)
    if (themeColors.secondary) {
      const secondaryShades = generateShades(themeColors.secondary)
      SHADE_STOPS.forEach(stop => {
        root.style.setProperty(`--color-secondary-${stop}`, secondaryShades[stop])
      })
    }
  }

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/settings`)
      if (response.ok) {
        const data = await response.json()
        setSettings(prev => ({ ...prev, ...data }))
        // 解析 theme_colors JSON
        if (data.theme_colors) {
          try {
            const parsed = JSON.parse(data.theme_colors)
            // 初始化网站配色
            const base = parsed.base || parsed.primary || '#2563EB'
            setColors(prev => ({ ...prev, ...parsed, primary: base }))
            const loadedShades = parsed.shades || generateShades(base)
            const loadedHarmony = parsed.harmony || generateHarmony(base)
            setBaseColor(base)
            setShades(loadedShades)
            setHarmony(loadedHarmony)
            // 加载后立即注入，刷新后配色不丢失
            injectThemeVars(parsed, loadedShades, loadedHarmony)
          } catch (e) {
            console.warn('theme_colors 解析失败', e)
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const handleSave = async () => {
    setSaving(true)
    setMessage('')

    // 把 colors + 网站配色数据合并到 settings.theme_colors
    const themeColorsPayload = {
      ...colors,
      base: baseColor,
      shades,
      harmony,
    }
    const payload = {
      ...settings,
      theme_colors: JSON.stringify(themeColorsPayload)
    }

    try {
      const response = await fetch(`${API_BASE_URL}/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      })

      if (response.ok) {
        setMessage('设置保存成功！配色已实时生效。')
        setSettings(payload)
        // 实时预览：立即把完整色阶注入 CSS 变量
        injectThemeVars({ ...colors, primary: baseColor }, shades, harmony)
      } else {
        setMessage('保存失败，请重试')
      }
    } catch (error) {
      setMessage('保存失败，请重试')
    } finally {
      setSaving(false)
    }
  }
  
  const handlePasswordChange = async () => {
    setPasswordError('')
    
    if (passwordData.new_password !== passwordData.confirm_password) {
      setPasswordError('两次输入的新密码不一致')
      return
    }
    
    if (passwordData.new_password.length < 6) {
      setPasswordError('新密码至少需要6位')
      return
    }
    
    try {
      const response = await fetch(`${API_BASE_URL}/auth/password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          old_password: passwordData.old_password,
          new_password: passwordData.new_password
        })
      })
      
      if (response.ok) {
        setMessage('密码修改成功！')
        setPasswordData({ old_password: '', new_password: '', confirm_password: '' })
        setTimeout(() => setMessage(''), 3000)
      } else {
        const data = await response.json()
        setPasswordError(data.detail || '密码修改失败')
      }
    } catch (error) {
      setPasswordError('密码修改失败，请重试')
    }
  }
  
  const handleLogout = async () => {
    localStorage.removeItem('token')
    await authApi.logout()
    localStorage.removeItem('user')
    window.location.href = '/login'
  }
  
  // 标签页配置
  const tabs = [
    { id: 'general', label: '基本设置', icon: '⚙️' },
    { id: 'appearance', label: '外观设置', icon: '🎨' },
    { id: 'color', label: '网站配色', icon: '🌈' },
    { id: 'security', label: '安全设置', icon: '🔒' },
  ]
  
  if (loading) {
    return (
      <AdminLayout user={user} onLogout={handleLogout}>
          <div className="p-8 flex items-center justify-center min-h-[400px]">
            <div className="flex items-center gap-3 text-preline-text-secondary">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span>加载中...</span>
            </div>
          </div>
      </AdminLayout>
    )
  }
  
  return (
    <AdminLayout user={user} onLogout={handleLogout}>
      <div className="p-6 w-full">
        {/* 页面标题 */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-preline-text">系统设置</h1>
          <p className="text-preline-text-secondary mt-1">管理博客的基本信息、外观和安全设置</p>
        </div>
        
        {/* 成功提示 */}
        {message && (
          <div className="mb-6 bg-preline-success-bg border border-preline-success-border rounded-lg p-4 flex items-center gap-3">
            <svg className="w-5 h-5 text-preline-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-preline-success-text font-medium">{message}</span>
          </div>
        )}
        
        {/* 标签页 */}
        <div className="mb-6 border-b border-preline-border">
          <nav className="flex gap-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors duration-200 ${
                  activeTab === tab.id
                    ? 'border-preline-primary-600 text-preline-primary-600'
                    : 'border-transparent text-preline-text-secondary hover:text-preline-gray-700 hover:border-preline-gray-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
        
        {/* 基本设置 */}
        {activeTab === 'general' && (
          <Card>
            <CardHeader>
              <div>
                <CardTitle>博客信息</CardTitle>
                <CardDescription>设置博客的基本信息，这些将显示在网站标题和描述中</CardDescription>
              </div>
            </CardHeader>
            <CardBody className="space-y-6">
              <div>
                <Label htmlFor="blog_name">博客名称</Label>
                <Input
                  id="blog_name"
                  value={settings.blog_name}
                  onChange={(e) => setSettings({ ...settings, blog_name: e.target.value })}
                  placeholder="输入博客名称"
                />
                <FormHelp>显示在浏览器标签页和网站头部</FormHelp>
              </div>
              
              <div>
                <Label htmlFor="blog_description">博客描述</Label>
                <Textarea
                  id="blog_description"
                  value={settings.blog_description}
                  onChange={(e) => setSettings({ ...settings, blog_description: e.target.value })}
                  placeholder="输入博客描述"
                  rows={3}
                />
                <FormHelp>用于 SEO 和社交媒体分享</FormHelp>
              </div>
              
              <div>
                <Label htmlFor="welcome_message">欢迎语</Label>
                <Textarea
                  id="welcome_message"
                  value={settings.welcome_message}
                  onChange={(e) => setSettings({ ...settings, welcome_message: e.target.value })}
                  placeholder="输入首页欢迎语"
                  rows={2}
                />
                <FormHelp>显示在首页顶部的欢迎文字</FormHelp>
              </div>
            </CardBody>
            <CardFooter>
              <Button
                variant="secondary"
                onClick={() => fetchSettings()}
                disabled={saving}
              >
                重置
              </Button>
              <Button
                variant="primary"
                onClick={handleSave}
                loading={saving}
              >
                保存设置
              </Button>
            </CardFooter>
          </Card>
        )}
        
        {/* 外观设置 */}
        {activeTab === 'appearance' && (
          <Card>
            <CardHeader>
              <div>
                <CardTitle>外观设置</CardTitle>
                <CardDescription>自定义博客的视觉风格</CardDescription>
              </div>
            </CardHeader>
            <CardBody className="space-y-6">
              <div>
                <Label htmlFor="layout">布局样式</Label>
                <Select
                  id="layout"
                  value={settings.layout}
                  onChange={(e) => setSettings({ ...settings, layout: e.target.value })}
                >
                  <option value="card">卡片布局</option>
                  <option value="list">列表布局</option>
                  <option value="magazine">杂志布局</option>
                </Select>
                <FormHelp>文章列表的展示方式</FormHelp>
              </div>

              <div>
                <Label htmlFor="banner_type">首页横幅</Label>
                <Select
                  id="banner_type"
                  value={settings.banner_type}
                  onChange={(e) => setSettings({ ...settings, banner_type: e.target.value })}
                >
                  <option value="text">文字横幅</option>
                  <option value="image">图片横幅</option>
                  <option value="carousel">轮播横幅</option>
                  <option value="none">不显示</option>
                </Select>
                <FormHelp>首页顶部横幅的展示方式</FormHelp>
              </div>

              <hr className="border-preline-border" />

              {/* 主题配色 */}
              <div>
                <h3 className="text-base font-semibold text-preline-text mb-1">主题配色</h3>
                <p className="text-sm text-preline-text-secondary mb-4">调整后台管理界面的配色方案，保存后刷新页面即可生效。</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {/* 主色 */}
                  <div className="flex items-center gap-3">
                    <input
                      id="color-primary"
                      type="color"
                      value={colors.primary}
                      onChange={(e) => setColors({ ...colors, primary: e.target.value })}
                      className="w-10 h-10 rounded cursor-pointer border border-preline-gray-300 p-0.5"
                    />
                    <div className="flex-1">
                      <Label htmlFor="color-primary" className="mb-0">主色调</Label>
                      <div className="text-xs text-preline-text-secondary font-mono mt-0.5">{colors.primary}</div>
                    </div>
                  </div>

                  {/* 次色 */}
                  <div className="flex items-center gap-3">
                    <input
                      id="color-secondary"
                      type="color"
                      value={colors.secondary}
                      onChange={(e) => setColors({ ...colors, secondary: e.target.value })}
                      className="w-10 h-10 rounded cursor-pointer border border-preline-gray-300 p-0.5"
                    />
                    <div className="flex-1">
                      <Label htmlFor="color-secondary" className="mb-0">次色调</Label>
                      <div className="text-xs text-preline-text-secondary font-mono mt-0.5">{colors.secondary}</div>
                    </div>
                  </div>

                  {/* 背景色 */}
                  <div className="flex items-center gap-3">
                    <input
                      id="color-bg"
                      type="color"
                      value={colors.bg}
                      onChange={(e) => setColors({ ...colors, bg: e.target.value })}
                      className="w-10 h-10 rounded cursor-pointer border border-preline-gray-300 p-0.5"
                    />
                    <div className="flex-1">
                      <Label htmlFor="color-bg" className="mb-0">背景色</Label>
                      <div className="text-xs text-preline-text-secondary font-mono mt-0.5">{colors.bg}</div>
                    </div>
                  </div>

                  {/* 文字色 */}
                  <div className="flex items-center gap-3">
                    <input
                      id="color-text"
                      type="color"
                      value={colors.text}
                      onChange={(e) => setColors({ ...colors, text: e.target.value })}
                      className="w-10 h-10 rounded cursor-pointer border border-preline-gray-300 p-0.5"
                    />
                    <div className="flex-1">
                      <Label htmlFor="color-text" className="mb-0">文字色</Label>
                      <div className="text-xs text-preline-text-secondary font-mono mt-0.5">{colors.text}</div>
                    </div>
                  </div>

                  {/* 侧边栏色 */}
                  <div className="flex items-center gap-3">
                    <input
                      id="color-sidebar"
                      type="color"
                      value={colors.sidebar}
                      onChange={(e) => setColors({ ...colors, sidebar: e.target.value })}
                      className="w-10 h-10 rounded cursor-pointer border border-preline-gray-300 p-0.5"
                    />
                    <div className="flex-1">
                      <Label htmlFor="color-sidebar" className="mb-0">侧边栏背景</Label>
                      <div className="text-xs text-preline-text-secondary font-mono mt-0.5">{colors.sidebar}</div>
                    </div>
                  </div>
                </div>
              </div>
            </CardBody>
            <CardFooter>
              <Button
                variant="secondary"
                onClick={() => fetchSettings()}
                disabled={saving}
              >
                重置
              </Button>
              <Button
                variant="primary"
                onClick={handleSave}
                loading={saving}
              >
                保存设置
              </Button>
            </CardFooter>
          </Card>
        )}
        
        {/* 网站配色 */}
        {activeTab === 'color' && (
          <div className="space-y-6">
            {/* 基色控制 */}
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>配色生成器</CardTitle>
                  <CardDescription>选择一个基色，自动生成 Tailwind 风格色阶与和谐配色</CardDescription>
                </div>
              </CardHeader>
              <CardBody className="space-y-6">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={baseColor}
                      onChange={(e) => {
                        const c = e.target.value
                        setBaseColor(c)
                        const newShades = generateShades(c)
                        setShades(newShades)
                        setHarmony(generateHarmony(c))
                        setColors(prev => ({ ...prev, primary: c }))
                        injectThemeVars({ ...colors, primary: c }, newShades, harmony)
                      }}
                      className="w-12 h-12 rounded-lg cursor-pointer border-2 border-preline-border p-1"
                    />
                    <div>
                      <div className="text-sm font-medium text-preline-text">基色</div>
                      <div className="text-xs text-preline-text-secondary font-mono">{baseColor}</div>
                    </div>
                  </div>
                  <input
                    type="text"
                    value={baseColor}
                    onChange={(e) => {
                      const c = e.target.value
                      if (/^#[0-9A-Fa-f]{6}$/.test(c)) {
                        setBaseColor(c)
                        const newShades = generateShades(c)
                        setShades(newShades)
                        setHarmony(generateHarmony(c))
                        setColors(prev => ({ ...prev, primary: c }))
                        injectThemeVars({ ...colors, primary: c }, newShades, harmony)
                      } else {
                        setBaseColor(c)
                      }
                    }}
                    className="px-3 py-2 border border-preline-gray-300 rounded-lg text-sm font-mono w-28"
                  />
                  <Button
                    variant="secondary"
                    onClick={() => {
                      const p = randomPalette()
                      setBaseColor(p.base)
                      setShades(p.shades)
                      setHarmony(p.harmony)
                      setColors(prev => ({ ...prev, primary: p.base }))
                      injectThemeVars({ ...colors, primary: p.base }, p.shades, p.harmony)
                    }}
                  >
                    🎲 随机配色
                  </Button>
                </div>

                {/* 模式切换 */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setPaletteMode('shades')}
                    className={`px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${
                      paletteMode === 'shades'
                        ? 'bg-preline-primary-600 text-white border-preline-primary-600'
                        : 'bg-preline-card text-preline-gray-700 border-preline-gray-300 hover:bg-preline-gray-50'
                    }`}
                  >
                    色阶 (Shades)
                  </button>
                  <button
                    onClick={() => setPaletteMode('harmony')}
                    className={`px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${
                      paletteMode === 'harmony'
                        ? 'bg-preline-primary-600 text-white border-preline-primary-600'
                        : 'bg-preline-card text-preline-gray-700 border-preline-gray-300 hover:bg-preline-gray-50'
                    }`}
                  >
                    和谐配色 (Harmony)
                  </button>
                </div>
              </CardBody>
            </Card>

            {/* 色阶预览 */}
            {paletteMode === 'shades' && (
              <Card>
                <CardHeader>
                  <div>
                    <CardTitle>Tailwind 色阶</CardTitle>
                    <CardDescription>基于基色自动生成的 50-950 色阶，可直接用于 Tailwind CSS</CardDescription>
                  </div>
                </CardHeader>
                <CardBody>
                  <div className="space-y-2">
                    {SHADE_STOPS.map((stop) => {
                      const color = shades[stop] || baseColor
                      const { l } = hexToHsl(color)
                      const textColor = l > 55 ? '#000000' : '#ffffff'
                      return (
                        <div key={stop} className="flex items-center gap-3">
                          <div className="w-12 text-xs text-preline-text-secondary font-mono text-right">{stop}</div>
                          <div
                            className="flex-1 h-10 rounded-lg flex items-center px-3 text-xs font-mono"
                            style={{ backgroundColor: color, color: textColor }}
                          >
                            {color}
                          </div>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(color)
                              setMessage(`已复制 ${color}`)
                              setTimeout(() => setMessage(''), 1500)
                            }}
                            className="text-xs text-preline-text-secondary hover:text-preline-primary-600 px-2"
                            title="复制"
                          >
                            📋
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </CardBody>
              </Card>
            )}

            {/* 和谐配色预览 */}
            {paletteMode === 'harmony' && (
              <Card>
                <CardHeader>
                  <div>
                    <CardTitle>和谐配色</CardTitle>
                    <CardDescription>基于色彩理论生成的互补色、类比色、三角色等和谐组合</CardDescription>
                  </div>
                </CardHeader>
                <CardBody>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Object.entries(harmony).map(([name, color]) => {
                      const labelMap = {
                        complementary: '互补色',
                        analogous1: '类比色 +30°',
                        analogous2: '类比色 -30°',
                        triadic1: '三角色 1',
                        triadic2: '三角色 2',
                        split1: '分裂互补 1',
                        split2: '分裂互补 2',
                        monoLight: '单色调亮',
                        monoDark: '单色调暗',
                      }
                      const { l } = hexToHsl(color)
                      const textColor = l > 55 ? '#000000' : '#ffffff'
                      return (
                        <div key={name} className="rounded-lg overflow-hidden border border-preline-border">
                          <div
                            className="h-20 flex items-end p-3 text-xs font-mono"
                            style={{ backgroundColor: color, color: textColor }}
                          >
                            {color}
                          </div>
                          <div className="p-3 flex items-center justify-between bg-preline-card">
                            <span className="text-sm font-medium text-preline-gray-700">{labelMap[name] || name}</span>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(color)
                                setMessage(`已复制 ${color}`)
                                setTimeout(() => setMessage(''), 1500)
                              }}
                              className="text-xs text-preline-text-secondary hover:text-preline-primary-600"
                            >
                              📋
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardBody>
              </Card>
            )}

            {/* 保存按钮 */}
            <Card>
              <CardFooter>
                <Button
                  variant="secondary"
                  onClick={() => fetchSettings()}
                  disabled={saving}
                >
                  重置
                </Button>
                <Button
                  variant="primary"
                  onClick={handleSave}
                  loading={saving}
                >
                  保存配色方案
                </Button>
              </CardFooter>
            </Card>
          </div>
        )}

        {/* 安全设置 */}
        {activeTab === 'security' && (
          <Card>
            <CardHeader>
              <div>
                <CardTitle>修改密码</CardTitle>
                <CardDescription>定期更换密码可以提高账户安全性</CardDescription>
              </div>
            </CardHeader>
            <CardBody className="space-y-6">
              <div>
                <Label htmlFor="old_password">当前密码</Label>
                <Input
                  id="old_password"
                  type="password"
                  value={passwordData.old_password}
                  onChange={(e) => setPasswordData({ ...passwordData, old_password: e.target.value })}
                  placeholder="输入当前密码"
                />
              </div>
              
              <div>
                <Label htmlFor="new_password">新密码</Label>
                <Input
                  id="new_password"
                  type="password"
                  value={passwordData.new_password}
                  onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                  placeholder="输入新密码（至少6位）"
                />
              </div>
              
              <div>
                <Label htmlFor="confirm_password">确认新密码</Label>
                <Input
                  id="confirm_password"
                  type="password"
                  value={passwordData.confirm_password}
                  onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                  placeholder="再次输入新密码"
                  error={passwordError}
                />
                {passwordError && <FormError>{passwordError}</FormError>}
              </div>
            </CardBody>
            <CardFooter>
              <Button
                variant="secondary"
                onClick={() => {
                  setPasswordData({ old_password: '', new_password: '', confirm_password: '' })
                  setPasswordError('')
                }}
              >
                重置
              </Button>
              <Button
                variant="primary"
                onClick={handlePasswordChange}
              >
                修改密码
              </Button>
            </CardFooter>
          </Card>
        )}
      </div>
    </AdminLayout>
  )
}

export default Settings
