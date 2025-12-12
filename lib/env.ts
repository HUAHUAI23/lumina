// src/env.ts
import { createEnv } from '@t3-oss/env-nextjs'
import { z } from 'zod'

export const env = createEnv({
  /*
   * Serverside Environment variables, not available on the client.
   * Will throw if you access these variables on the client.
   */
  server: {
    DATABASE_URL: z.url(),
    AUTH_SECRET: z.string().min(1),
    GITHUB_CLIENT_ID: z.string().optional(),
    GITHUB_CLIENT_SECRET: z.string().optional(),
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    // Cookie 安全配置
    COOKIE_SECURE: z
      .string()
      .optional()
      .default('true')
      .transform((val) => {
        // Properly parse string boolean values
        if (val === 'false' || val === '0' || val === '') return false
        if (val === 'true' || val === '1') return true
        return Boolean(val)
      }), // 是否使用 HTTPS-only cookies（开发环境可设为 false）
    // 日志配置
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
    DB_QUERY_LOGGING: z
      .string()
      .optional()
      .default('false')
      .transform((val) => {
        if (val === 'false' || val === '0' || val === '') return false
        if (val === 'true' || val === '1') return true
        return Boolean(val)
      }), // 数据库查询日志独立开关
    // Login method toggles
    ENABLE_PASSWORD_AUTH: z
      .string()
      .optional()
      .default('true')
      .transform((val) => {
        if (val === 'false' || val === '0' || val === '') return false
        if (val === 'true' || val === '1') return true
        return Boolean(val)
      }),
    ENABLE_GITHUB_AUTH: z
      .string()
      .optional()
      .default('true')
      .transform((val) => {
        if (val === 'false' || val === '0' || val === '') return false
        if (val === 'true' || val === '1') return true
        return Boolean(val)
      }),
    ENABLE_GOOGLE_AUTH: z
      .string()
      .optional()
      .default('false')
      .transform((val) => {
        if (val === 'false' || val === '0' || val === '') return false
        if (val === 'true' || val === '1') return true
        return Boolean(val)
      }),
    // 支付宝配置（可选）
    ALIPAY_APPID: z.string().optional(),
    ALIPAY_PRIVATE_KEY: z.string().optional(),
    ALIPAY_PUBLIC_KEY: z.string().optional(),
    ALIPAY_NOTIFY_URL: z.url().optional(),
    // 微信支付配置（可选）
    WECHAT_PAY_APPID: z.string().optional(),
    WECHAT_PAY_MCHID: z.string().optional(),
    WECHAT_PAY_API_V3_KEY: z.string().optional(),
    WECHAT_PAY_SERIAL_NO: z.string().optional(),
    WECHAT_PAY_PRIVATE_KEY: z.string().optional(),
    WECHAT_PAY_PLATFORM_CERT: z.string().optional(),
    WECHAT_PAY_PLATFORM_CERT_SERIAL_NO: z.string().optional(),
    WECHAT_PAY_NOTIFY_URL: z.string().url().optional(),

    // TOS 对象存储配置（可选，未配置时相关任务立即失败）
    TOS_ACCESS_KEY: z.string().optional(),
    TOS_SECRET_KEY: z.string().optional(),
    TOS_REGION: z.string().default('cn-north-1'),
    TOS_ENDPOINT: z.string().default('tos-cn-beijing.volces.com'),
    TOS_BUCKET_NAME: z.string().optional(),

    // 火山引擎 CV 生成服务配置（可选，未配置时相关任务立即失败）
    VOLCENGINE_ACCESS_KEY: z.string().optional(),
    VOLCENGINE_SECRET_KEY: z.string().optional(),
    VOLCENGINE_REGION: z.string().default('cn-north-1'),

    TASK_SCHEDULER_ENABLED: z
      .string()
      .optional()
      .default('true')
      .transform((val) => {
        if (val === 'false' || val === '0' || val === '') return false
        if (val === 'true' || val === '1') return true
        return Boolean(val)
      }), // 调度器开关
    TASK_SCHEDULER_INTERVAL: z.coerce.number().default(5), // 主循环间隔（秒）
    TASK_ASYNC_POLL_INTERVAL: z.coerce.number().default(60), // 异步查询间隔（秒）
    TASK_TIMEOUT_MINUTES: z.coerce.number().default(30), // 同步任务超时恢复时间（分钟）
    TASK_ASYNC_TIMEOUT_MINUTES: z.coerce.number().default(120), // 异步任务超时恢复时间（分钟）
    TASK_MAX_RETRIES: z.coerce.number().default(3), // 任务最大重试次数
    TASK_BATCH_SIZE: z.coerce.number().default(50), // 每次拉取任务数（性能优化：从 10 增加到 50）
    TASK_CONCURRENCY: z.coerce.number().default(10), // 任务并发执行数（防止 API 限流和资源耗尽）

    // TTS API 配置（可选，未配置时相关任务立即失败）
    TTS_API_BASE_URL: z.url().optional(),
  },
  /*
   * Environment variables available on the client (and server).
   *
   * 💡 You'll get type errors if these are not prefixed with NEXT_PUBLIC_.
   */
  client: {},
  /*
   * Specify what values should be validated by your schemas above.
   *
   * If you're using Next.js < 13.4.4, you'll need to specify the runtimeEnv manually
   * For Next.js >= 13.4.4, you can use the experimental__runtimeEnv option and
   * only specify client-side variables.
   */
  // runtimeEnv: {
  //   DATABASE_URL: process.env.DATABASE_URL,
  //   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  // },
  experimental__runtimeEnv: process.env,
  /*
   * Skip validation during build time (e.g., in CI/CD)
   * Set SKIP_ENV_VALIDATION=1 to skip validation
   * Runtime validation will still occur if env vars are accessed
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
})
