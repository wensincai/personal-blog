// Preline UI 风格输入框组件
import React from 'react';

/**
 * 表单标签
 */
export function Label({ children, htmlFor, className = '', required = false }) {
  return (
    <label 
      htmlFor={htmlFor}
      className={`block text-sm font-medium text-preline-gray-700 mb-1.5 ${className}`}
    >
      {children}
      {required && <span className="text-preline-danger ml-0.5">*</span>}
    </label>
  );
}

/**
 * Preline 风格输入框
 */
export function Input({
  type = 'text',
  placeholder,
  value,
  onChange,
  onBlur,
  onFocus,
  disabled = false,
  readOnly = false,
  required = false,
  error,
  className = '',
  id,
  name,
  autoComplete,
  ...props
}) {
  const baseClasses = 'w-full px-4 py-2.5 rounded-lg border bg-preline-card text-preline-text placeholder:text-preline-gray-400 transition-all duration-200 focus:outline-none focus:ring-2';

  const stateClasses = error
    ? 'border-preline-danger-border focus:border-preline-danger focus:ring-preline-danger/20'
    : 'border-preline-gray-300 focus:border-preline-primary-500 focus:ring-preline-primary-500/20';
  
  const disabledClasses = disabled ? 'bg-preline-gray-100 cursor-not-allowed opacity-70' : '';
  
  return (
    <input
      type={type}
      id={id}
      name={name}
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      onFocus={onFocus}
      placeholder={placeholder}
      disabled={disabled}
      readOnly={readOnly}
      required={required}
      autoComplete={autoComplete}
      className={`${baseClasses} ${stateClasses} ${disabledClasses} ${className}`}
      {...props}
    />
  );
}

/**
 * Preline 风格文本域
 */
export function Textarea({
  placeholder,
  value,
  onChange,
  onBlur,
  disabled = false,
  readOnly = false,
  required = false,
  error,
  rows = 4,
  className = '',
  id,
  name,
  ...props
}) {
  const baseClasses = 'w-full px-4 py-2.5 rounded-lg border bg-preline-card text-preline-text placeholder:text-preline-gray-400 transition-all duration-200 focus:outline-none focus:ring-2 resize-y';

  const stateClasses = error
    ? 'border-preline-danger-border focus:border-preline-danger focus:ring-preline-danger/20'
    : 'border-preline-gray-300 focus:border-preline-primary-500 focus:ring-preline-primary-500/20';
  
  const disabledClasses = disabled ? 'bg-preline-gray-100 cursor-not-allowed opacity-70' : '';
  
  return (
    <textarea
      id={id}
      name={name}
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      placeholder={placeholder}
      disabled={disabled}
      readOnly={readOnly}
      required={required}
      rows={rows}
      className={`${baseClasses} ${stateClasses} ${disabledClasses} ${className}`}
      {...props}
    />
  );
}

/**
 * Preline 风格选择框
 */
export function Select({
  value,
  onChange,
  disabled = false,
  required = false,
  error,
  className = '',
  id,
  name,
  children,
  ...props
}) {
  const baseClasses = 'w-full px-4 py-2.5 rounded-lg border bg-preline-card text-preline-text transition-all duration-200 focus:outline-none focus:ring-2 appearance-none bg-[url("data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22%236B7280%22%3E%3Cpath%20fill-rule%3D%22evenodd%22%20d%3D%22M5.293%207.293a1%201%200%20011.414%200L10%2010.586l3.293-3.293a1%201%200%20111.414%201.414l-4%204a1%201%200%2001-1.414%200l-4-4a1%201%200%20010-1.414z%22%20clip-rule%3D%22evenodd%22%2F%3E%3C%2Fsvg%3E")] bg-[length:1.5em_1.5em] bg-[right_0.5rem_center] bg-no-repeat pr-10';

  const stateClasses = error
    ? 'border-preline-danger-border focus:border-preline-danger focus:ring-preline-danger/20'
    : 'border-preline-gray-300 focus:border-preline-primary-500 focus:ring-preline-primary-500/20';
  
  const disabledClasses = disabled ? 'bg-preline-gray-100 cursor-not-allowed opacity-70' : '';
  
  return (
    <select
      id={id}
      name={name}
      value={value}
      onChange={onChange}
      disabled={disabled}
      required={required}
      className={`${baseClasses} ${stateClasses} ${disabledClasses} ${className}`}
      {...props}
    >
      {children}
    </select>
  );
}

/**
 * 表单错误提示
 */
export function FormError({ children }) {
  if (!children) return null;
  return (
    <p className="mt-1.5 text-sm text-preline-danger">
      {children}
    </p>
  );
}

/**
 * 表单帮助文本
 */
export function FormHelp({ children }) {
  return (
    <p className="mt-1.5 text-sm text-preline-text-secondary">
      {children}
    </p>
  );
}

export default Input;
