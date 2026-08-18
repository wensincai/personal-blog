// 新粗野主义按钮组件
export function Button({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  className = '', 
  onClick,
  type = 'button',
  disabled = false
}) {
  const baseClasses = 'inline-flex items-center justify-center font-bold transition-all duration-150 border-2 border-black'
  
  const variants = {
    primary: 'bg-brutal-pink text-black shadow-brutal hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px]',
    secondary: 'bg-brutal-cyan text-black shadow-brutal hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px]',
    success: 'bg-brutal-green text-black shadow-brutal hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px]',
    warning: 'bg-brutal-yellow text-black shadow-brutal hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px]',
    danger: 'bg-red-500 text-white shadow-brutal hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px]',
    outline: 'bg-white text-black shadow-brutal-sm hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px]'
  }
  
  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  }
  
  const disabledClasses = disabled ? 'opacity-50 cursor-not-allowed' : ''
  
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${disabledClasses} ${className}`}
    >
      {children}
    </button>
  )
}
