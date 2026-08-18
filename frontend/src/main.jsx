import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Preline UI JavaScript
import 'preline'

import { generateShades } from './utils/colorPalette.js'

// 后端 API 地址（见 .env.example，开发环境可走 Vite 代理 /api）
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'
const SHADE_STOPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950]

/**
 * 从后端加载配色配置并注入 CSS 变量
 * 这个请求在登录前也能访问，确保访客和管理员都能看到统一主题
 */
async function loadThemeColors() {
  try {
    const res = await fetch(`${API_BASE_URL}/settings/public`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })
    if (!res.ok) return
    const data = await res.json()
    let colors = data.theme_colors || {}
    if (typeof colors === 'string') {
      try {
        colors = JSON.parse(colors)
      } catch (e) {
        colors = {}
      }
    }
    const root = document.documentElement

    const shades = colors.shades || {}
    const primaryFallback = shades[500] || colors.primary
    const hoverFallback = shades[600] || colors['primary-hover'] || primaryFallback
    const lightFallback = shades[100] || colors['primary-light'] || primaryFallback

    // 语义变量（色阶优先）
    if (primaryFallback) root.style.setProperty('--color-primary', primaryFallback)
    if (hoverFallback) root.style.setProperty('--color-primary-hover', hoverFallback)
    if (lightFallback) root.style.setProperty('--color-primary-light', lightFallback)

    const mapping = {
      secondary: '--color-secondary',
      bg: '--color-bg',
      text: '--color-text',
      sidebar: '--color-sidebar',
      'sidebar-active': '--color-sidebar-active',
      card: '--color-card',
      border: '--color-border',
      'text-secondary': '--color-text-secondary',
    }

    Object.entries(mapping).forEach(([key, cssVar]) => {
      if (colors[key]) {
        root.style.setProperty(cssVar, colors[key])
      }
    })

    // Primary 色阶 (50-950)
    if (shades && Object.keys(shades).length > 0) {
      SHADE_STOPS.forEach(stop => {
        if (shades[stop]) {
          root.style.setProperty(`--color-primary-${stop}`, shades[stop])
        }
      })
    }

    // Secondary 色阶 (50-950)
    if (colors.secondary) {
      const secShades = generateShades(colors.secondary)
      SHADE_STOPS.forEach(stop => {
        root.style.setProperty(`--color-secondary-${stop}`, secShades[stop])
      })
    }
  } catch (e) {
    // 静默失败，使用默认 CSS 变量值
    console.warn('加载主题配色失败，使用默认值', e)
  }
}

// 先加载主题，再渲染应用
loadThemeColors().then(() => {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
})
