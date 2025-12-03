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
    INITIAL_CREDITS: z.coerce.number().default(0),
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    // Login method toggles
    ENABLE_PASSWORD_AUTH: z.coerce.boolean().default(true),
    ENABLE_GITHUB_AUTH: z.coerce.boolean().default(true),
    ENABLE_GOOGLE_AUTH: z.coerce.boolean().default(false),
    // 支付宝配置（可选）
    ALIPAY_APPID: z.string().optional(),
    ALIPAY_PRIVATE_KEY: z.string().optional(),
    ALIPAY_PUBLIC_KEY: z.string().optional(),
    ALIPAY_NOTIFY_URL: z.string().url().optional(),
    // 微信支付配置（可选）
    WECHAT_PAY_APPID: z.string().optional(),
    WECHAT_PAY_MCHID: z.string().optional(),
    WECHAT_PAY_API_V3_KEY: z.string().optional(),
    WECHAT_PAY_SERIAL_NO: z.string().optional(),
    WECHAT_PAY_PRIVATE_KEY: z.string().optional(),
    WECHAT_PAY_PLATFORM_CERT: z.string().optional(),
    WECHAT_PAY_PLATFORM_CERT_SERIAL_NO: z.string().optional(),
    WECHAT_PAY_NOTIFY_URL: z.string().url().optional(),

    // 火山引擎配置（可选，未配置时相关任务立即失败）
    VOLCENGINE_ACCESS_KEY: z.string().optional(),
    VOLCENGINE_SECRET_KEY: z.string().optional(),
    VOLCENGINE_REGION: z.string().default('cn-north-1'),
    VOLCENGINE_ENDPOINT: z.string().default('tos-cn-beijing.volces.com'),
    VOLCENGINE_BUCKET_NAME: z.string().optional(),

    // 任务调度配置（双循环设计，详见 docs/task-system-design.md）
    TASK_SCHEDULER_ENABLED: z.coerce.boolean().default(true),   // 调度器开关
    TASK_SCHEDULER_INTERVAL: z.coerce.number().default(5),      // 主循环间隔（秒）
    TASK_ASYNC_POLL_INTERVAL: z.coerce.number().default(30),    // 异步查询间隔（秒）
    TASK_TIMEOUT_MINUTES: z.coerce.number().default(30),        // 任务超时时间（分钟）
    TASK_MAX_RETRIES: z.coerce.number().default(3),             // 最大重试次数
    TASK_BATCH_SIZE: z.coerce.number().default(10),             // 每次拉取任务数
  },
  /*
   * Environment variables available on the client (and server).
   *
   * 💡 You'll get type errors if these are not prefixed with NEXT_PUBLIC_.
   */
  client: {
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().optional(),
  },
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
  experimental__runtimeEnv: {
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  },
  /*
   * Skip validation during build time (e.g., in CI/CD)
   * Set SKIP_ENV_VALIDATION=1 to skip validation
   * Runtime validation will still occur if env vars are accessed
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
})
