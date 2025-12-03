// db/schema.ts
import { sql } from 'drizzle-orm'
import {
  bigint,
  bigserial,
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
  varchar,
} from 'drizzle-orm/pg-core'

// ==================== 枚举定义 ====================

export const authProviderEnum = pgEnum('auth_provider', [
  'password',
  'google',
  'github',
  'email',
  'sms',
])
export const verificationChannelEnum = pgEnum('verification_channel', [
  'email',
  'sms',
  'voice',
  'whatsapp',
])

// 任务大类
export const taskCategoryEnum = pgEnum('task_category', ['video', 'image'])

// 任务子类型
export const taskTypeEnum = pgEnum('task_type', [
  // 视频类
  'video_lipsync', // 口播
  'video_motion', // 动作模仿
  'video_generation', // 普通视频生成
  // 图片类
  'image_3d_model', // 3D模型生成
  'image_img2img', // 图生图
  'image_txt2img', // 文生图
])

// 任务执行模式
export const taskModeEnum = pgEnum('task_mode', ['sync', 'async'])

// 任务状态
export const taskStatusEnum = pgEnum('task_status', [
  'pending', // 待处理
  'processing', // 处理中
  'completed', // 已完成
  'failed', // 失败
  'partial', // 部分成功（多项任务时部分失败）
  'cancelled', // 已取消
])

// 任务项状态
export const taskItemStatusEnum = pgEnum('task_item_status', [
  'pending',
  'processing',
  'completed',
  'failed',
])

// 计费类型
export const billingTypeEnum = pgEnum('billing_type', [
  'per_unit', // 按次/按量（图片按张，视频按分钟）
  'per_token', // 按token
])

// 资源类型
export const resourceTypeEnum = pgEnum('resource_type', [
  'image',
  'video',
  'audio',
  'text',
  'model_3d',
])

// ==================== 交易系统枚举 ====================

/**
 * 交易分类
 * - task_charge: 任务预付费扣费
 * - task_refund: 任务退款（多退少补）
 * - image_analysis_charge: 图片分析费用扣费（VLM等）
 * - recharge: 用户充值
 */
export const transactionCategoryEnum = pgEnum('transaction_category', [
  'task_charge',
  'task_refund',
  'image_analysis_charge',
  'recharge',
])

/**
 * 支付方式
 * - balance: 余额支付（内部扣费使用）
 * - wechat: 微信支付
 * - stripe: Stripe支付
 * - alipay: 支付宝
 * - manual: 人工充值
 */
export const paymentMethodEnum = pgEnum('payment_method', [
  'balance',
  'wechat',
  'stripe',
  'alipay',
  'manual',
])

/**
 * 支付配置提供商
 */
export const paymentProviderEnum = pgEnum('payment_provider', ['wechat', 'alipay', 'stripe'])

/**
 * 支付配置状态
 */
export const paymentConfigStatusEnum = pgEnum('payment_config_status', ['enabled', 'disabled'])

/**
 * 充值订单状态
 * - pending: 待支付
 * - processing: 处理中（收到回调，正在更新余额）
 * - success: 支付成功
 * - failed: 支付失败
 * - closed: 订单关闭（超时/取消）
 */
export const chargeOrderStatusEnum = pgEnum('charge_order_status', [
  'pending',
  'processing',
  'success',
  'failed',
  'closed',
])

// ==================== 用户相关表 ====================

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  username: varchar('username', { length: 64 }).notNull().unique(),
  email: varchar('email', { length: 255 }).unique(),
  avatar: text('avatar').default(''),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdateFn(() => new Date()),
})

export const userIdentities = pgTable(
  'user_identities',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    provider: authProviderEnum('provider').notNull(),
    providerUserId: varchar('provider_user_id', { length: 128 }).notNull(),
    metadata: jsonb('metadata')
      .$type<{
        // 密码认证
        password?: {
          passwordHash: string
          needReset?: boolean
        }
        // OAuth认证（GitHub、Google等）
        oauth?: {
          accessToken?: string
          refreshToken?: string
          email?: string // OAuth提供商返回的邮箱
          avatarUrl?: string
          profile?: Record<string, unknown>
        }
      }>()
      .default(sql`'{}'::jsonb`)
      .notNull(),
    isPrimary: boolean('is_primary').default(false).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdateFn(() => new Date()),
  },
  (table) => [
    unique('uniq_provider_uid').on(table.provider, table.providerUserId),
    index('idx_user_provider').on(table.userId, table.provider),
  ]
)

// ==================== 通用验证码表（支持多渠道：邮箱、短信、语音、WhatsApp）====================

export const verificationCodes = pgTable(
  'verification_codes',
  {
    id: serial('id').primaryKey(),
    // 接收方标识（邮箱或手机号）
    recipient: varchar('recipient', { length: 255 }).notNull(),
    // 投递渠道
    channel: verificationChannelEnum('channel').notNull(),
    // 哈希后的验证码（安全存储）
    codeHash: varchar('code_hash', { length: 255 }).notNull(),
    // 用途（login, register, reset_password, etc.）
    purpose: varchar('purpose', { length: 50 }).notNull(),
    // 过期时间（建议 ≤5分钟）
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    // 是否已使用（单次使用）
    used: boolean('used').default(false).notNull(),
    // 验证尝试次数
    attempts: integer('attempts').default(0).notNull(),
    // 最大尝试次数
    maxAttempts: integer('max_attempts').default(5).notNull(),
    // 关联的用户ID（可选，用于已登录用户的验证）
    userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_recipient_channel').on(table.recipient, table.channel),
    index('idx_expires_at').on(table.expiresAt),
  ]
)

// ==================== 账户表 ====================

export const accounts = pgTable('accounts', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: 'cascade' }),
  balance: bigint('balance', { mode: 'number' }).notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdateFn(() => new Date()),
})

// ==================== 价格表 ====================

export const pricing = pgTable(
  'pricing',
  {
    id: serial('id').primaryKey(),
    taskType: taskTypeEnum('task_type').notNull(),
    billingType: billingTypeEnum('billing_type').notNull(),
    // 单价（分）：按次时为每单位价格，按token时为每1000 token价格
    unitPrice: integer('unit_price').notNull(),
    // 单位描述：piece(张), minute(分钟), second(秒), token(1000)
    unit: varchar('unit', { length: 32 }).notNull(),
    // 最小计费单位（如视频最少1分钟）
    minUnit: numeric('min_unit', { precision: 10, scale: 2 }).default('1').notNull(),
    // 是否启用
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdateFn(() => new Date()),
  },
  (table) => [
    unique('uniq_task_type_pricing').on(table.taskType),
    index('idx_pricing_active').on(table.isActive),
  ]
)

// ==================== 任务表 ====================

export const tasks = pgTable(
  'tasks',
  {
    id: serial('id').primaryKey(),
    accountId: integer('account_id')
      .notNull()
      .references(() => accounts.id),

    // 任务基本信息
    name: varchar('name', { length: 255 }).notNull().default(''),
    category: taskCategoryEnum('category').notNull(),
    type: taskTypeEnum('type').notNull(),
    mode: taskModeEnum('mode').notNull(),
    status: taskStatusEnum('status').notNull().default('pending'),

    // 优先级（用于调度）
    priority: integer('priority').notNull().default(0),

    // 任务配置（不同类型有不同配置，用JSONB灵活存储）
    config: jsonb('config').$type<TaskConfig>().notNull(),

    // 第三方平台任务ID（异步任务用）
    externalTaskId: varchar('external_task_id', { length: 255 }),

    // 任务结果
    result: jsonb('result').$type<TaskResult[]>(),

    // 计费相关
    pricingId: integer('pricing_id').references(() => pricing.id),
    billingType: billingTypeEnum('billing_type').notNull(),
    // 预估费用（预付费的金额，单位：分）
    estimatedCost: integer('estimated_cost').notNull().default(0),
    // 实际费用（任务完成后结算，单位：分）
    actualCost: integer('actual_cost'),
    // 实际使用量（根据billingType: 张数/分钟数/token数）
    actualUsage: numeric('actual_usage', { precision: 10, scale: 2 }),

    // 重试相关
    retryCount: integer('retry_count').notNull().default(0),
    nextRetryAt: timestamp('next_retry_at', { withTimezone: true }),

    // 时间戳
    startedAt: timestamp('started_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdateFn(() => new Date()),
  },
  (table) => [
    index('idx_task_account').on(table.accountId),
    index('idx_task_status').on(table.status),
    index('idx_task_type').on(table.type),
    // 用于轮询待处理任务
    index('idx_task_pending').on(table.status, table.priority, table.createdAt),
  ]
)

// ==================== 任务资源表（输入输出资源）====================

export const taskResources = pgTable(
  'task_resources',
  {
    id: serial('id').primaryKey(),
    taskId: integer('task_id')
      .notNull()
      .references(() => tasks.id, { onDelete: 'cascade' }),

    // 资源类型
    resourceType: resourceTypeEnum('resource_type').notNull(),

    // 是输入还是输出
    isInput: boolean('is_input').notNull(),

    // 资源URL
    url: text('url').notNull(),

    // 资源元数据（宽高、时长等）
    metadata: jsonb('metadata')
      .$type<ResourceMetadata>()
      .default(sql`'{}'::jsonb`),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('idx_resource_task').on(table.taskId)]
)

// ==================== 任务日志表 ====================

export const taskLogs = pgTable(
  'task_logs',
  {
    id: serial('id').primaryKey(),
    taskId: integer('task_id')
      .notNull()
      .references(() => tasks.id, { onDelete: 'cascade' }),

    // 日志级别
    level: varchar('level', { length: 16 }).notNull().default('info'),

    // 日志消息
    message: text('message').notNull(),

    // 详细数据
    data: jsonb('data').$type<Record<string, unknown>>(),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('idx_log_task').on(table.taskId), index('idx_log_created').on(table.createdAt)]
)

// ==================== 支付配置表 ====================

/**
 * 支付配置表
 * - 存储非敏感配置信息（显示名称、金额范围、排序等）
 * - 敏感信息（私钥、密钥）存储在环境变量中
 * - 支持前端动态展示可用支付方式
 */
export const paymentConfigs = pgTable('payment_configs', {
  id: serial('id').primaryKey(),
  provider: paymentProviderEnum('provider').notNull().unique(),
  displayName: varchar('display_name', { length: 64 }).notNull(), // 如 "支付宝"
  description: text('description'), // 描述信息
  icon: text('icon'), // 图标 URL 或 emoji
  status: paymentConfigStatusEnum('status').notNull().default('enabled'),
  sortOrder: integer('sort_order').notNull().default(0), // 显示顺序

  // 充值配置
  presetAmounts: jsonb('preset_amounts')
    .$type<number[]>()
    .default(sql`'[10, 50, 100, 500]'::jsonb`)
    .notNull(),
  minAmount: integer('min_amount').notNull().default(1), // 最小充值金额(元)
  maxAmount: integer('max_amount').notNull().default(100000), // 最大充值金额(元)

  // 非敏感公开配置
  publicConfig: jsonb('public_config')
    .$type<{
      orderTimeoutMinutes?: number // 订单超时时间（分钟）
      wechat?: { appid?: string; mchid?: string }
      alipay?: { appId?: string }
      stripe?: { publicKey?: string }
      [key: string]: any
    }>()
    .default(sql`'{}'::jsonb`)
    .notNull(),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdateFn(() => new Date()),
})

// ==================== 充值订单表 ====================

/**
 * 充值订单表（通用设计，支持多种支付方式）
 *
 * 工作流程：
 * 1. 用户发起充值 → 创建订单（status=pending）
 * 2. 调用支付接口 → 获取支付凭证（qrCode/支付链接）
 * 3. 用户完成支付 → 支付平台回调
 * 4. 收到回调 → 在事务中：
 *    - 更新订单状态为 success
 *    - 创建 transaction 记录
 *    - 更新 account 余额
 *    - 关联 transactionId
 */
export const chargeOrders = pgTable(
  'charge_orders',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(), // 使用 bigserial 支持大数据量
    accountId: integer('account_id')
      .notNull()
      .references(() => accounts.id),

    // 金额和支付方式
    amount: bigint('amount', { mode: 'number' }).notNull(), // 充值金额（分）
    provider: paymentMethodEnum('provider').notNull(),

    // 订单标识（幂等性关键字段）
    outTradeNo: text('out_trade_no').notNull().unique(), // 商户订单号（内部生成）
    externalTransactionId: text('external_transaction_id'), // 第三方支付平台交易号（支付宝trade_no/微信transaction_id/Stripe charge_id）

    // 支付凭证（不同支付方式不同）
    paymentCredential: jsonb('payment_credential')
      .$type<{
        wechat?: { codeUrl?: string; prepayId?: string }
        alipay?: { qrCode?: string; pageUrl?: string }
        stripe?: { clientSecret?: string; paymentIntentId?: string }
        manual?: { operatorId?: number; note?: string }
        [key: string]: any
      }>()
      .default(sql`'{}'::jsonb`),

    // 状态
    status: chargeOrderStatusEnum('status').notNull().default('pending'),

    // 时间管理
    expireTime: timestamp('expire_time', { withTimezone: true }),
    paidAt: timestamp('paid_at', { withTimezone: true }),

    // 关联
    transactionId: bigint('transaction_id', { mode: 'number' }), // 不设置外键（避免循环引用）
    operatorId: integer('operator_id').references(() => users.id),

    // 元数据（存储回调原始数据、失败原因等）
    metadata: jsonb('metadata')
      .$type<{
        description?: string
        ip?: string
        wechatCallback?: Record<string, any>
        alipayCallback?: Record<string, any>
        stripeCallback?: Record<string, any>
        manualCharge?: { reason?: string; approver?: string }
        failureReason?: string
        errorCode?: string
        [key: string]: any
      }>()
      .default(sql`'{}'::jsonb`)
      .notNull(),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdateFn(() => new Date()),
  },
  (table) => [
    index('charge_order_account_idx').on(table.accountId),
    index('charge_order_status_idx').on(table.status),
    index('charge_order_provider_idx').on(table.provider),
    index('charge_order_out_trade_no_idx').on(table.outTradeNo), // 幂等性查询优化
    index('charge_order_external_id_idx').on(table.externalTransactionId),
    index('charge_order_created_at_idx').on(table.createdAt), // 时间范围查询优化
  ]
)

// ==================== 交易表 ====================

/**
 * 交易表（统一记录所有交易）
 *
 * 设计原则：
 * - 不可变性：交易记录只增不改（immutable ledger）
 * - 余额快照：记录前后余额，便于审计和对账
 * - 分类清晰：通过 category 区分交易类型
 *
 * 与 tasks 表的集成：
 * - task_charge: 创建任务时，扣除 tasks.estimatedCost，taskId 有值
 * - task_refund: 任务完成后，退还差额 (estimatedCost - actualCost)，taskId 有值
 */
export const transactions = pgTable(
  'transactions',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(), // 使用 bigserial 支持大数据量
    accountId: integer('account_id')
      .notNull()
      .references(() => accounts.id),

    // 交易分类和金额
    category: transactionCategoryEnum('category').notNull(),
    amount: bigint('amount', { mode: 'number' }).notNull(), // 正数=收入，负数=支出

    // 余额快照（复式记账思想）
    balanceBefore: bigint('balance_before', { mode: 'number' }).notNull(),
    balanceAfter: bigint('balance_after', { mode: 'number' }).notNull(),

    // 关联信息（根据 category 不同而不同）
    taskId: integer('task_id').references(() => tasks.id), // 可为 NULL（仅 task_charge/task_refund 时有值）
    chargeOrderId: bigint('charge_order_id', { mode: 'number' }), // 可为 NULL（仅 recharge 时有值），不设置外键避免循环引用

    // 支付信息
    paymentMethod: paymentMethodEnum('payment_method').default('balance').notNull(),
    externalOrderId: text('external_order_id'), // 第三方支付平台交易号（支付宝trade_no/微信transaction_id/Stripe charge_id），用于对账和查询

    // 元数据（不同交易类型存储不同信息）
    metadata: jsonb('metadata')
      .$type<{
        description?: string
        // Task 相关
        expectedCount?: number // 预期数量
        actualCount?: number // 实际数量
        refundReason?: string // 退款原因
        // Image Analysis 相关（VLM等）
        analysisType?: string
        imageUrl?: string
        // Recharge 相关
        paymentDetails?: {
          platform?: string
          platformOrderId?: string
          paymentTime?: string
          [key: string]: any
        }
        [key: string]: any
      }>()
      .default(sql`'{}'::jsonb`)
      .notNull(),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('transaction_account_idx').on(table.accountId),
    index('transaction_task_idx').on(table.taskId),
    index('transaction_category_idx').on(table.category),
    index('transaction_external_order_idx').on(table.externalOrderId), // 对账查询优化
    index('transaction_created_at_idx').on(table.createdAt),
  ]
)

// ==================== 类型定义 ====================

// -------------------- 任务配置类型 --------------------

/** 视频动作模仿配置（已实现） */
export interface VideoMotionConfig {
  taskType: 'video_motion'
}

/** 视频口播配置（未实现） */
export interface VideoLipsyncConfig {
  taskType: 'video_lipsync'
  [key: string]: unknown
}

/** 视频生成配置（未实现） */
export interface VideoGenerationConfig {
  taskType: 'video_generation'
  [key: string]: unknown
}

/** 图片 3D 模型生成配置（未实现） */
export interface Image3DModelConfig {
  taskType: 'image_3d_model'
  [key: string]: unknown
}

/** 图生图配置（未实现） */
export interface ImageImg2ImgConfig {
  taskType: 'image_img2img'
  [key: string]: unknown
}

/** 文生图配置（未实现） */
export interface ImageTxt2ImgConfig {
  taskType: 'image_txt2img'
  [key: string]: unknown
}

/** 任务配置联合类型 */
export type TaskConfig =
  | VideoMotionConfig
  | VideoLipsyncConfig
  | VideoGenerationConfig
  | Image3DModelConfig
  | ImageImg2ImgConfig
  | ImageTxt2ImgConfig

// -------------------- 任务结果类型 --------------------

/** 视频动作模仿结果（已实现） */
export interface VideoMotionResult {
  url: string
  duration?: number
}

/** 任务结果联合类型（当前只实现了动作模仿） */
export type TaskResult = VideoMotionResult

// -------------------- 资源元数据类型 --------------------
// export interface AudioMetadata {
//   duration?: number
//   size?: number
//   mimeType?: string
//   sampleRate?: number
// }

// /** 3D 模型元数据 */
// export interface Model3DMetadata {
//   format?: string
//   size?: number
//   vertices?: number
// }

/** 图片元数据（动作模仿输入） */
export interface ImageMetadata {
  width?: number
  height?: number
  size?: number
  mimeType?: string
}

/** 视频元数据（动作模仿输入和输出） */
export interface VideoMetadata {
  duration?: number
  width?: number
  height?: number
  size?: number
  mimeType?: string
  fps?: number
}

/** 资源元数据联合类型（当前只实现了图片和视频） */
export type ResourceMetadata = ImageMetadata | VideoMetadata
