// 文章详情页 - 访客阅读（支持 Markdown + HTML 双格式渲染）
import { useState, useEffect, useRef } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { API_BASE_URL } from '../api/config'
import DOMPurify from 'dompurify'

export function PostDetail() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [post, setPost] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const contentRef = useRef(null)

  useEffect(() => {
    fetchPost()
  }, [slug])

  // 渲染数学公式
  useEffect(() => {
    if (!post || !contentRef.current) return
    
    const renderMath = () => {
      if (window.renderMathInElement) {
        window.renderMathInElement(contentRef.current, {
          delimiters: [
            { left: '$$', right: '$$', display: true },
            { left: '\\[', right: '\\]', display: true },
            { left: '\\(', right: '\\)', display: false },
            { left: '$', right: '$', display: false }
          ],
          throwOnError: false,
          trust: true,
          strict: false
        })
      }
    }
    
    // 延迟执行，确保KaTeX和DOM都已加载
    const timer = setTimeout(renderMath, 100)
    
    // 如果auto-render还没加载完，再试一次
    const retryTimer = setTimeout(renderMath, 500)
    
    return () => {
      clearTimeout(timer)
      clearTimeout(retryTimer)
    }
  }, [post])

  const fetchPost = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/posts/${slug}`)
      if (!response.ok) throw new Error('获取文章失败')
      const data = await response.json()
      setPost(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // 简单的 Markdown 渲染（不使用外部库，保持轻量）
  const renderMarkdown = (markdown) => {
    if (!markdown) return ''
    
    // API 基础 URL（用于补全图片路径）
    const imageBaseUrl = API_BASE_URL.replace('/api', '')
    
    let html = markdown

    // ---- 步骤 0: 先提取表格，用占位符替换，避免表格内容被后续处理破坏 ----
    const tableBlocks = []
    html = html.replace(/(?:^|\n)((?:\|.+\|\s*\n)+)/gm, (fullMatch) => {
      const lines = fullMatch.trim().split('\n')
      if (lines.length < 2) return fullMatch  // 至少需要表头+分隔行
      // 第二行必须是分隔行（只含 | - : 和空格）
      if (!/^\|[-:\s|]+\|$/.test(lines[1].trim())) return fullMatch
      const idx = tableBlocks.length
      tableBlocks.push(fullMatch.trim())
      return `\n<!--TABLE_${idx}-->\n`
    })

    // 处理表格行内的行内标记（链接、代码等）
    const processInline = (cellText) => {
      let t = cellText.trim()
      // 行内代码
      t = t.replace(/`([^`]+)`/g, '<code class="bg-gray-100 px-1 py-0.5 rounded text-red-600 font-mono text-xs">$1</code>')
      // 粗体
      t = t.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      // 斜体
      t = t.replace(/\*(.*?)\*/g, '<em>$1</em>')
      // 删除线
      t = t.replace(/~~(.*?)~~/g, '<del>$1</del>')
      // 链接
      t = t.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener" class="text-blue-600 hover:underline">$1</a>')
      return t
    }

    // 渲染单个表格为 HTML
    const renderTable = (tableMarkdown) => {
      const lines = tableMarkdown.trim().split('\n')
      if (lines.length < 3) return tableMarkdown  // 至少需要表头+分隔行+1行数据

      const parseRow = (line) => {
        // 按 | 分割，去掉首尾空元素
        return line.split('|').slice(1, -1).map(c => c.trim())
      }

      const headers = parseRow(lines[0])
      const dataRows = lines.slice(2)

      let html = '<div class="overflow-x-auto my-4"><table class="min-w-full border-collapse border-2 border-black text-sm">'
      html += '<thead><tr class="bg-gray-100">'
      headers.forEach(h => {
        html += `<th class="border-2 border-gray-300 px-3 py-2 text-left font-bold whitespace-nowrap">${processInline(h)}</th>`
      })
      html += '</tr></thead><tbody>'
      dataRows.forEach(row => {
        const cells = parseRow(row)
        html += '<tr class="hover:bg-gray-50 border-b border-gray-200">'
        cells.forEach((c, i) => {
          if (i < headers.length) {
            html += `<td class="border border-gray-200 px-3 py-2 align-top">${processInline(c)}</td>`
          }
        })
        html += '</tr>'
      })
      html += '</tbody></table></div>'
      return html
    }
    
    // 代码块（必须在行内代码之前处理）
    html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre class="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto my-4"><code>$2</code></pre>')
    
    // 标题（从大到小依次处理）
    html = html.replace(/^#### (.*$)/gim, '<h4 class="text-lg font-bold mt-4 mb-2 text-gray-800">$1</h4>')
    html = html.replace(/^### (.*$)/gim, '<h3 class="text-xl font-bold mt-6 mb-3">$1</h3>')
    html = html.replace(/^## (.*$)/gim, '<h2 class="text-2xl font-bold mt-8 mb-4 border-b-2 border-gray-200 pb-2">$1</h2>')
    html = html.replace(/^# (.*$)/gim, '<h1 class="text-3xl font-black mt-8 mb-4">$1</h1>')
    
    // 粗体
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    
    // 斜体
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>')
    
    // 删除线
    html = html.replace(/~~(.*?)~~/g, '<del>$1</del>')
    
    // 行内代码
    html = html.replace(/`([^`]+)`/g, '<code class="bg-gray-100 px-1 py-0.5 rounded text-red-600 font-mono text-sm">$1</code>')
    
    // 引用（连续多行 > 合并为一个 blockquote）
    html = html.replace(/((?:^> .*\n?)+)/gm, (match) => {
      const lines = match.split('\n').filter(l => l.trim())
      const content = lines.map(l => l.replace(/^> /, '')).join('<br />')
      return `<blockquote class="border-l-4 border-yellow-400 pl-4 py-2 my-4 bg-yellow-50 italic">${content}</blockquote>`
    })
    
    // 图片（必须在链接之前处理）
    // 支持相对路径 /uploads/xxx 自动补全为完整 URL
    html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, alt, src) => {
      // 如果是相对路径，补全为完整 URL
      const fullSrc = src.startsWith('http') ? src : `${imageBaseUrl}${src.startsWith('/') ? '' : '/'}${src}`
      return `<img src="${fullSrc}" alt="${alt}" class="max-w-full h-auto my-6 rounded-lg border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)]" loading="lazy" />`
    })
    
    // 链接
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener" class="text-blue-600 hover:underline">$1</a>')
    
    // 无序列表（使用占位符区分）
    html = html.replace(/^\s*[-*] (.*$)/gim, '<li data-type="ul" class="ml-4">$1</li>')
    html = html.replace(/(<li data-type="ul"[^>]*>.*?<\/li>\n?)+/g, '<ul class="list-disc my-4 space-y-1">$&</ul>\n')
    html = html.replace(/data-type="ul"/g, '')  // 清理占位符
    
    // 有序列表（使用占位符区分）
    html = html.replace(/^\s*(\d+)\. (.*$)/gim, '<li data-type="ol" class="ml-4">$2</li>')
    html = html.replace(/(<li data-type="ol"[^>]*>.*?<\/li>\n?)+/g, '<ol class="list-decimal my-4 space-y-1">$&</ol>\n')
    html = html.replace(/data-type="ol"/g, '')  // 清理占位符
    
    // 分割线
    html = html.replace(/^---$/gim, '<hr class="my-8 border-t-2 border-gray-300" />')
    
    // 段落
    html = html.replace(/\n\n/g, '</p><p class="my-4 leading-relaxed">')
    html = '<p class="my-4 leading-relaxed">' + html + '</p>'
    
    // 清理空段落
    html = html.replace(/<p class="my-4 leading-relaxed"><\/p>/g, '')

    // ---- 最后: 把表格占位符替换回渲染后的 HTML ----
    html = html.replace(/<!--TABLE_(\d+)-->/g, (match, idx) => {
      return renderTable(tableBlocks[parseInt(idx)])
    })
    
    return html
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center">加载中...</div>
  if (error || !post) return (
    <div className="min-h-screen flex flex-col items-center justify-center">
      <p className="text-red-500 mb-4">{error || '文章不存在'}</p>
      <Link to="/" className="text-blue-600 hover:underline">← 返回首页</Link>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#FEF9E7] flex flex-col">
      {/* 顶部导航 */}
      <nav className="bg-white border-b-2 border-black sticky top-0 z-10">
        <div className="max-w-[1366px] mx-auto px-4 py-4 flex justify-between items-center">
          <Link to="/" className="text-2xl font-black tracking-tight">
            📝 侘寂屋
          </Link>
          <div className="flex gap-4">
            <Link 
              to="/"
              className="px-4 py-2 border-2 border-black hover:bg-gray-100 transition-colors font-bold"
            >
              首页
            </Link>
            <Link 
              to="/admin"
              className="px-4 py-2 border-2 border-black bg-[#FCD34D] hover:bg-[#F59E0B] transition-colors font-bold"
            >
              管理后台
            </Link>
          </div>
        </div>
      </nav>

      {/* 文章内容 */}
      <main className="flex-1 max-w-[1366px] mx-auto px-4 py-8 w-full">
        {/* 返回按钮 */}
        <button 
          onClick={() => navigate(-1)}
          className="mb-6 px-4 py-2 border-2 border-black hover:bg-gray-100 transition-colors font-bold"
        >
          ← 返回
        </button>

        {/* 文章头部 */}
        <header className="mb-8 pb-6 border-b-2 border-black">
          <h1 className="text-3xl md:text-4xl font-black mb-4">{post.title}</h1>
          <div className="flex items-center gap-4 text-gray-600 text-sm">
            <span>📅 {new Date(post.created_at).toLocaleDateString('zh-CN')}</span>
            {post.category && <span>📁 {post.category.name}</span>}
          </div>
        </header>

        {/* 摘要 */}
        {post.summary && (
          <div className="mb-8 p-4 bg-yellow-100 border-l-4 border-yellow-500 italic text-gray-700">
            {post.summary}
          </div>
        )}

        {/* 正文内容 - 根据 content_type 选择渲染方式 */}
        <article
          ref={contentRef}
          className="prose prose-lg max-w-none bg-white p-6 md:p-8 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
          dangerouslySetInnerHTML={{
            __html: post.content_type === 'html'
              ? DOMPurify.sanitize(post.content, {
                  FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input'],
                  FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onmouseenter', 'onmouseleave', 'onfocus', 'onblur', 'onchange', 'onsubmit']
                })
              : renderMarkdown(post.content)
          }}
        />

        {/* 标签 */}
        {post.tags && post.tags.length > 0 && (
          <div className="mt-8 flex flex-wrap gap-2">
            {post.tags.map(tag => (
              <span 
                key={tag.id}
                className="px-3 py-1 bg-gray-100 border-2 border-black text-sm font-bold"
              >
                #{tag.name}
              </span>
            ))}
          </div>
        )}
      </main>

      {/* 页脚 - 固定在底部 */}
      <footer className="border-t-2 border-black bg-white">
        <div className="max-w-[1366px] mx-auto px-4 py-6 text-center text-gray-600">
          © 2026 侘寂屋 · 用心记录每一刻
        </div>
      </footer>
    </div>
  )
}
