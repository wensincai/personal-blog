// Preline UI 风格卡片组件
import React from 'react';

/**
 * Preline 风格卡片容器
 */
export function Card({ children, className = '', ...props }) {
  return (
    <div 
      className={`bg-preline-card rounded-xl border border-preline-border shadow-sm ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * 卡片头部
 */
export function CardHeader({ children, className = '', action, ...props }) {
  return (
    <div 
      className={`px-6 py-4 border-b border-preline-border flex items-center justify-between ${className}`}
      {...props}
    >
      <div className="flex-1">{children}</div>
      {action && <div className="ml-4">{action}</div>}
    </div>
  );
}

/**
 * 卡片标题
 */
export function CardTitle({ children, className = '' }) {
  return (
    <h3 className={`text-lg font-semibold text-preline-text ${className}`}>
      {children}
    </h3>
  );
}

/**
 * 卡片描述
 */
export function CardDescription({ children, className = '' }) {
  return (
    <p className={`text-sm text-preline-text-secondary mt-1 ${className}`}>
      {children}
    </p>
  );
}

/**
 * 卡片内容
 */
export function CardBody({ children, className = '', ...props }) {
  return (
    <div className={`px-6 py-4 ${className}`} {...props}>
      {children}
    </div>
  );
}

/**
 * 卡片底部
 */
export function CardFooter({ children, className = '', ...props }) {
  return (
    <div 
      className={`px-6 py-4 border-t border-preline-border flex items-center justify-end gap-3 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

// 默认导出完整卡片组件
Card.Header = CardHeader;
Card.Title = CardTitle;
Card.Description = CardDescription;
Card.Body = CardBody;
Card.Footer = CardFooter;

export default Card;
