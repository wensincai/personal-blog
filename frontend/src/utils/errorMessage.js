// 统一错误信息提取
// 优先级：服务端 detail > 网络异常提示 > error.message > 兜底文案
export function getErrorMessage(error, fallback = '未知错误') {
  if (error?.response?.data?.detail) return error.response.data.detail
  // axios 网络错误(ERR_NETWORK/超时) 或 fetch 网络错误(TypeError) 归为网络异常
  if (
    error?.code === 'ERR_NETWORK' ||
    error?.code === 'ECONNABORTED' ||
    error?.name === 'TypeError' ||
    /network error|failed to fetch|timeout|timed out/i.test(error?.message || '')
  ) {
    return '网络异常，请检查网络连接后重试'
  }
  return error?.message || fallback
}
