/**
 * 火山引擎类型定义
 */

/** 可重试错误码 */
export const RETRYABLE_ERROR_CODES = new Set([
  50429, // QPS超限
  50430, // 并发超限
  50500, // 内部错误
  50501, // 内部算法错误
  50516, // 输出视频审核未通过
  50517, // 输出音频审核未通过
  50519, // 输出版权图审核未通过
  50520, // 审核服务异常
  50521, // 版权词服务异常
  50522, // 版权图服务异常
])

/** 不可重试错误码 */
export const NON_RETRYABLE_ERROR_CODES = new Set([
  50411, // 输入图片审核未通过
  50412, // 输入文本审核未通过
  50413, // 输入含敏感词
  50518, // 输入版权图审核未通过
])

/** 判断错误码是否可重试 */
export function isRetryableError(code: number): boolean {
  if (NON_RETRYABLE_ERROR_CODES.has(code)) return false
  if (RETRYABLE_ERROR_CODES.has(code)) return true
  // 5xx 默认可重试
  return code >= 50000 && code < 60000
}