// db/logger.ts
import type { Logger } from 'drizzle-orm'

import { logger as baseLogger } from '../lib/logger'

const pinoLogger = baseLogger.child({ module: 'db' })

/**
 * Drizzle Logger 适配器（2025 最佳实践）
 * - 提供结构化的 SQL 查询日志
 * - 支持查询性能追踪
 * - 使用 Pino 的子 logger 进行模块化日志管理
 */
export class DrizzleLogger implements Logger {
  private queryCounter = 0

  logQuery(query: string, params: unknown[]): void {
    const queryId = ++this.queryCounter
    const start = performance.now()

    // 格式化 SQL 查询以提高可读性
    const formattedQuery = this.formatSQL(query)

    pinoLogger.debug(
      {
        queryId,
        sql: formattedQuery,
        params: this.sanitizeParams(params),
        duration: null, // 查询开始时 duration 为 null
      },
      'SQL Query'
    )

    // 在实际应用中，可以通过中间件或钩子来测量实际执行时间
    // 这里只是演示如何记录查询
    const duration = performance.now() - start

    // 如果查询时间过长，记录警告
    if (duration > 1000) {
      pinoLogger.warn(
        {
          queryId,
          sql: formattedQuery,
          params: this.sanitizeParams(params),
          duration: `${duration.toFixed(2)}ms`,
        },
        'Slow Query Detected'
      )
    }
  }

  /**
   * 格式化 SQL 查询（简化版）
   * 在开发环境中添加换行和缩进以提高可读性
   */
  private formatSQL(sql: string): string {
    if (process.env.NODE_ENV === 'production') {
      return sql
    }

    // 基础格式化：在关键字后添加换行
    return sql
      .replace(/\bSELECT\b/gi, '\nSELECT')
      .replace(/\bFROM\b/gi, '\nFROM')
      .replace(/\bWHERE\b/gi, '\nWHERE')
      .replace(/\bINNER JOIN\b/gi, '\n  INNER JOIN')
      .replace(/\bLEFT JOIN\b/gi, '\n  LEFT JOIN')
      .replace(/\bRIGHT JOIN\b/gi, '\n  RIGHT JOIN')
      .replace(/\bORDER BY\b/gi, '\nORDER BY')
      .replace(/\bGROUP BY\b/gi, '\nGROUP BY')
      .replace(/\bLIMIT\b/gi, '\nLIMIT')
      .trim()
  }

  /**
   * 清理参数以避免记录敏感信息
   */
  private sanitizeParams(params: unknown[]): unknown[] {
    return params.map((param) => {
      if (typeof param === 'string' && param.length > 100) {
        return `${param.substring(0, 100)}... (truncated)`
      }
      return param
    })
  }
}

export const drizzleLogger = new DrizzleLogger()
