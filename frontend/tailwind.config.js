/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    // Preline UI 支持
    "./node_modules/preline/dist/*.js",
  ],
  theme: {
    extend: {
      colors: {
        // Neobrutalism 配色
        'brutal': {
          'cream': '#FEF9E7',
          'yellow': '#FFDE59',
          'pink': '#FF6B9D',
          'cyan': '#00D9FF',
          'lavender': '#C084FC',
          'green': '#4ADE80',
        },
        // Preline 配色（使用 CSS 变量，支持动态主题）
        'preline': {
          // 语义变量
          'primary': 'var(--color-primary, #2563EB)',
          'primary-hover': 'var(--color-primary-hover, #1D4ED8)',
          'primary-light': 'var(--color-primary-light, #EFF6FF)',
          'secondary': 'var(--color-secondary, #06B6D4)',
          'sidebar': 'var(--color-sidebar, #1E293B)',
          'sidebar-active': 'var(--color-sidebar-active, #334155)',
          'bg': 'var(--color-bg, #F8FAFC)',
          'card': 'var(--color-card, #FFFFFF)',
          'border': 'var(--color-border, #E2E8F0)',
          'text': 'var(--color-text, #0F172A)',
          'text-secondary': 'var(--color-text-secondary, #64748B)',

          // Primary 色阶 (50-950)
          'primary-50': 'var(--color-primary-50, #EFF6FF)',
          'primary-100': 'var(--color-primary-100, #DBEAFE)',
          'primary-200': 'var(--color-primary-200, #BFDBFE)',
          'primary-300': 'var(--color-primary-300, #93C5FD)',
          'primary-400': 'var(--color-primary-400, #60A5FA)',
          'primary-500': 'var(--color-primary-500, #3B82F6)',
          'primary-600': 'var(--color-primary-600, #2563EB)',
          'primary-700': 'var(--color-primary-700, #1D4ED8)',
          'primary-800': 'var(--color-primary-800, #1E40AF)',
          'primary-900': 'var(--color-primary-900, #1E3A8A)',
          'primary-950': 'var(--color-primary-950, #172554)',

          // Secondary 色阶 (50-950)
          'secondary-50': 'var(--color-secondary-50, #ECFEFF)',
          'secondary-100': 'var(--color-secondary-100, #CFFAFE)',
          'secondary-200': 'var(--color-secondary-200, #A5F3FC)',
          'secondary-300': 'var(--color-secondary-300, #67E8F9)',
          'secondary-400': 'var(--color-secondary-400, #22D3EE)',
          'secondary-500': 'var(--color-secondary-500, #06B6D4)',
          'secondary-600': 'var(--color-secondary-600, #0891B2)',
          'secondary-700': 'var(--color-secondary-700, #0E7490)',
          'secondary-800': 'var(--color-secondary-800, #155E75)',
          'secondary-900': 'var(--color-secondary-900, #164E63)',
          'secondary-950': 'var(--color-secondary-950, #083344)',

          // Gray 色阶 (50-950)
          'gray-50': 'var(--color-gray-50, #F8FAFC)',
          'gray-100': 'var(--color-gray-100, #F1F5F9)',
          'gray-200': 'var(--color-gray-200, #E2E8F0)',
          'gray-300': 'var(--color-gray-300, #CBD5E1)',
          'gray-400': 'var(--color-gray-400, #94A3B8)',
          'gray-500': 'var(--color-gray-500, #64748B)',
          'gray-600': 'var(--color-gray-600, #475569)',
          'gray-700': 'var(--color-gray-700, #334155)',
          'gray-800': 'var(--color-gray-800, #1E293B)',
          'gray-900': 'var(--color-gray-900, #0F172A)',
          'gray-950': 'var(--color-gray-950, #020617)',

          // Semantic colors
          'success': 'var(--color-success, #22C55E)',
          'success-bg': 'var(--color-success-bg, #DCFCE7)',
          'success-border': 'var(--color-success-border, #BBF7D0)',
          'success-text': 'var(--color-success-text, #14532D)',
          'warning': 'var(--color-warning, #F59E0B)',
          'warning-bg': 'var(--color-warning-bg, #FEF3C7)',
          'warning-border': 'var(--color-warning-border, #FDE68A)',
          'warning-text': 'var(--color-warning-text, #78350F)',
          'danger': 'var(--color-danger, #EF4444)',
          'danger-bg': 'var(--color-danger-bg, #FEE2E2)',
          'danger-border': 'var(--color-danger-border, #FECACA)',
          'danger-text': 'var(--color-danger-text, #7F1D1D)',
          'info': 'var(--color-info, #3B82F6)',
          'info-bg': 'var(--color-info-bg, #DBEAFE)',
          'info-border': 'var(--color-info-border, #BFDBFE)',
          'info-text': 'var(--color-info-text, #1E3A8A)',
        }
      },
      fontFamily: {
        'display': ['system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'brutal': '4px 4px 0px 0px rgba(0,0,0,1)',
        'brutal-sm': '2px 2px 0px 0px rgba(0,0,0,1)',
        'brutal-lg': '6px 6px 0px 0px rgba(0,0,0,1)',
      }
    },
  },
  plugins: [
    // Preline 需要
    require('@tailwindcss/forms'),
  ],
}
