// db/relations.ts
import { relations } from 'drizzle-orm'

import {
  accounts,
  chargeOrders,
  tasks,
  transactions,
  userIdentities,
  users,
  workflowLogs,
  workflows,
  workflowTasks,
} from './schema'

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
 * - 一个账户可以有多个充值订单：一对多
 * - 一个账户可以有多个交易记录：一对多
 * - 一个账户可以有多个任务：一对多
 */
export const accountsRelations = relations(accounts, ({ one, many }) => ({
  // 一对一：每个账户属于一个用户
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
  // 一对多：一个账户可以有多个充值订单
  chargeOrders: many(chargeOrders),
  // 一对多：一个账户可以有多个交易记录
  transactions: many(transactions),
  // 一对多：一个账户可以有多个任务
  tasks: many(tasks),
}))

/**
 * 任务关系定义
 * - 每个任务属于一个账户：多对一
 * - 一个任务可以有多个交易记录：一对多
 */
export const tasksRelations = relations(tasks, ({ one, many }) => ({
  // 多对一：每个任务属于一个账户
  account: one(accounts, {
    fields: [tasks.accountId],
    references: [accounts.id],
  }),
  // 一对多：一个任务可以有多个交易记录（预付费扣费、退费）
  transactions: many(transactions),
}))

/**
 * 充值订单关系定义
 * - 每个充值订单属于一个账户：多对一
 * - 每个充值订单可能有一个操作员（手工充值时）：多对一
 */
export const chargeOrdersRelations = relations(chargeOrders, ({ one }) => ({
  // 多对一：每个充值订单属于一个账户
  account: one(accounts, {
    fields: [chargeOrders.accountId],
    references: [accounts.id],
  }),
  // 多对一：每个充值订单可能有一个操作员
  operator: one(users, {
    fields: [chargeOrders.operatorId],
    references: [users.id],
  }),
}))

/**
 * 交易关系定义
 * - 每笔交易属于一个账户：多对一
 * - 每笔交易可能关联一个任务：多对一（可选）
 */
export const transactionsRelations = relations(transactions, ({ one }) => ({
  // 多对一：每笔交易属于一个账户
  account: one(accounts, {
    fields: [transactions.accountId],
    references: [accounts.id],
  }),
  // 多对一：每笔交易可能关联一个任务
  task: one(tasks, {
    fields: [transactions.taskId],
    references: [tasks.id],
  }),
}))

// ==================== 工作流关系 ====================

/**
 * 工作流关系定义
 * - 每个工作流属于一个账户：多对一
 * - 一个工作流可以有多个工作流任务：一对多
 */
export const workflowsRelations = relations(workflows, ({ one, many }) => ({
  // 多对一：每个工作流属于一个账户
  account: one(accounts, {
    fields: [workflows.accountId],
    references: [accounts.id],
  }),
  // 一对多：一个工作流可以有多个工作流任务
  workflowTasks: many(workflowTasks),
}))

/**
 * 工作流任务关系定义
 * - 每个工作流任务属于一个账户：多对一
 * - 每个工作流任务关联一个工作流定义：多对一
 * - 一个工作流任务可以有多个日志：一对多
 */
export const workflowTasksRelations = relations(workflowTasks, ({ one, many }) => ({
  // 多对一：每个工作流任务属于一个账户
  account: one(accounts, {
    fields: [workflowTasks.accountId],
    references: [accounts.id],
  }),
  // 多对一：每个工作流任务关联一个工作流定义
  workflow: one(workflows, {
    fields: [workflowTasks.workflowId],
    references: [workflows.id],
  }),
  // 一对多：一个工作流任务可以有多个日志
  logs: many(workflowLogs),
}))

/**
 * 工作流日志关系定义
 * - 每条日志属于一个工作流任务：多对一
 */
export const workflowLogsRelations = relations(workflowLogs, ({ one }) => ({
  // 多对一：每条日志属于一个工作流任务
  workflowTask: one(workflowTasks, {
    fields: [workflowLogs.workflowTaskId],
    references: [workflowTasks.id],
  }),
}))
