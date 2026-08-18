// 新粗野主义输入框组件
export function Input({
  id,
  type = 'text',
  placeholder = '',
  value,
  onChange,
  className = '',
  disabled = false,
  required = false,
  name = ''
}) {
  return (
    <input
      id={id}
      type={type}
      name={name}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      disabled={disabled}
      required={required}
      className={`
        w-full px-3 py-2 
        border-2 border-black 
        bg-white 
        focus:outline-none focus:ring-2 focus:ring-brutal-yellow
        placeholder:text-black/40
        disabled:bg-gray-100 disabled:cursor-not-allowed
        ${className}
      `}
    />
  )
}

// 文本域
export function TextArea({
  id,
  placeholder = '',
  value,
  onChange,
  rows = 4,
  className = '',
  disabled = false,
  required = false,
  name = ''
}) {
  return (
    <textarea
      id={id}
      name={name}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      rows={rows}
      disabled={disabled}
      required={required}
      className={`
        w-full px-3 py-2 
        border-2 border-black 
        bg-white 
        focus:outline-none focus:ring-2 focus:ring-brutal-yellow
        placeholder:text-black/40
        disabled:bg-gray-100 disabled:cursor-not-allowed
        resize-vertical
        ${className}
      `}
    />
  )
}

// 标签
export function Label({ children, htmlFor = '', className = '', required = false }) {
  return (
    <label 
      htmlFor={htmlFor}
      className={`block text-sm font-bold mb-1 ${className}`}
    >
      {children}
      {required && <span className="text-brutal-pink ml-1">*</span>}
    </label>
  )
}

// 表单组
export function FormGroup({ children, className = '' }) {
  return (
    <div className={`mb-4 ${className}`}>
      {children}
    </div>
  )
}
