// Preline UI 风格按钮组件
import React from 'react';

/**
 * Preline 风格按钮
 * @param {string} variant - 'primary' | 'secondary' | 'danger' | 'ghost'
 * @param {string} size - 'sm' | 'md' | 'lg'
 * @param {boolean} disabled - 是否禁用
 * @param {boolean} loading - 是否加载中
 * @param {React.ReactNode} children - 子元素
 * @param {function} onClick - 点击事件
 * @param {string} type - 按钮类型
 * @param {string} className - 额外类名
 */
export function Button({
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  children,
  onClick,
  type = 'button',
  className = '',
  ...props
}) {
  const baseClasses = 'inline-flex items-center justify-center gap-2 font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2';

  const variantClasses = {
    primary: 'text-white bg-preline-primary hover:bg-preline-primary-hover focus:ring-preline-primary disabled:opacity-50',
    secondary: 'bg-preline-card text-preline-gray-700 border border-preline-gray-300 hover:bg-preline-gray-50 focus:ring-preline-primary disabled:bg-preline-gray-100 disabled:text-preline-gray-400',
    danger: 'bg-preline-danger text-white hover:bg-preline-danger-hover focus:ring-preline-danger disabled:opacity-50',
    ghost: 'bg-transparent text-preline-gray-600 hover:bg-preline-gray-100 focus:ring-preline-primary disabled:text-preline-gray-400',
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs rounded-md',
    md: 'px-4 py-2.5 text-sm rounded-lg',
    lg: 'px-6 py-3 text-base rounded-lg',
  };

  const classes = [
    baseClasses,
    variantClasses[variant],
    sizeClasses[size],
    (disabled || loading) && 'cursor-not-allowed opacity-70',
    className,
  ].filter(Boolean).join(' ');

  return (
    <button
      type={type}
      className={classes}
      onClick={onClick}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </button>
  );
}

export default Button;
