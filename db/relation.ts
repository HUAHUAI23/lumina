// db/relations.ts
import { relations } from 'drizzle-orm'

import { accounts, userIdentities, users } from './schema'

/**
 * 用户关系定义
 * - 一个用户可以有多个身份认证方式（userIdentities）：一对多
 * - 一个用户有一个账户（account）：一对一
 */
export const usersRelations = relations(users, ({ many, one }) => ({
  // 一对多：一个用户可以有多个身份认证方式
  identities: many(userIdentities),
  // 一对一：一个用户有一个账户
  account: one(accounts, {
    fields: [users.id],
    references: [accounts.userId],
  }),
}))

/**
 * 用户身份关系定义
 * - 每个身份认证方式属于一个用户：多对一
 */
export const userIdentitiesRelations = relations(userIdentities, ({ one }) => ({
  // 多对一：每个身份认证方式属于一个用户
  user: one(users, {
    fields: [userIdentities.userId],
    references: [users.id],
  }),
}))

/**
 * 账户关系定义
 * - 每个账户属于一个用户：一对一
 */
export const accountsRelations = relations(accounts, ({ one }) => ({
  // 一对一：每个账户属于一个用户
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}))
