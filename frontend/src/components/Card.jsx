// 新粗野主义卡片组件
export function Card({ 
  children, 
  className = '',
  padding = 'normal',
  shadow = 'normal'
}) {
  const paddings = {
    none: '',
    small: 'p-3',
    normal: 'p-4',
    large: 'p-6'
  }
  
  const shadows = {
    none: '',
    small: 'shadow-brutal-sm',
    normal: 'shadow-brutal',
    large: 'shadow-brutal-lg'
  }
  
  return (
    <div className={`bg-white border-2 border-black ${shadows[shadow]} ${paddings[padding]} ${className}`}>
      {children}
    </div>
  )
}

// 卡片头部
export function CardHeader({ children, className = '' }) {
  return (
    <div className={`border-b-2 border-black pb-3 mb-4 ${className}`}>
      {children}
    </div>
  )
}

// 卡片标题
export function CardTitle({ children, className = '' }) {
  return (
    <h3 className={`text-lg font-bold ${className}`}>
      {children}
    </h3>
  )
}

// 卡片内容
export function CardContent({ children, className = '' }) {
  return (
    <div className={className}>
      {children}
    </div>
  )
}
