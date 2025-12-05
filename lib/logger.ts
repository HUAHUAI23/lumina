// lib/logger.ts
import os from 'os'
import pino from 'pino'

const isProd = process.env.NODE_ENV === 'production'

/**
 * Pino Logger 配置
 *
 * 输出标准 JSON 格式日志，便于：
 * - 开发调试和问题追踪
 * - 生产环境日志聚合和分析
 * - 使用 jq 等工具查询过滤
 */
export const logger = pino({
  level: process.env.LOG_LEVEL || (isProd ? 'info' : 'debug'),

  // 自动脱敏敏感信息
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'password',
      'passwordHash',
      'token',
      'accessToken',
      'apiKey',
      '*.password',
      '*.token',
    ],
    remove: true,
  },

  // 序列化器：格式化特定类型的数据
  serializers: {
    err: pino.stdSerializers.err,
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
  },

  // 基础配置
  base: isProd ? { pid: process.pid, hostname: os.hostname() } : undefined,
})
