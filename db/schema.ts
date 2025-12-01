// db/schema.ts
import { sql } from 'drizzle-orm'
import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
  varchar,
} from 'drizzle-orm/pg-core'

// ==================== 枚举定义 ====================
export const authProviderEnum = pgEnum('auth_provider', ['password', 'google', 'github', 'email', 'sms'])
export const verificationChannelEnum = pgEnum('verification_channel', ['email', 'sms', 'voice', 'whatsapp'])

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
