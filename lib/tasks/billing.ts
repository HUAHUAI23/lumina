/**
 * 任务计费服务
 */

import { eq, InferSelectModel } from 'drizzle-orm'

import { db } from '@/db'
import { accounts, pricing, transactions } from '@/db/schema'
import { logger as baseLogger } from '@/lib/logger'

type Pricing = InferSelectModel<typeof pricing>

import { InsufficientBalanceError } from './errors'
import type { Task, TaskTypeType } from './types'
import { TASK_TYPE_TO_CATEGORY } from './types'
import { BillingType, TaskCategory } from './types'
const logger = baseLogger.child({ module: 'tasks/billing' })

/**
 * 获取任务类型的价格配置 (当前只实现 BillingType.PER_UNIT 计费方式)
 */
export async function getPricing(taskType: TaskTypeType): Promise<Pricing> {
  const pricingConfig = await db.query.pricing.findFirst({
    where: eq(pricing.taskType, taskType),
  })

  if (!pricingConfig) {
    throw new Error(`未找到任务类型 ${taskType} 的价格配置，请联系管理员`)
  }

  if (pricingConfig.billingType !== BillingType.PER_UNIT) {
    throw new Error(`任务类型 ${taskType} 的计费类型不是 per_unit，当前只支持按次计费`)
  }

  return pricingConfig
}

/**
 * 计算视频类任务的预估费用
 * @param taskType 任务类型
 * @param estimatedDuration 预估时长（秒），视频类任务用
 * @param estimatedCount 预估数量
 * @returns cost: 预估费用（分）, estimatedUsage: 预估用量（秒）, pricing: 价格配置
 */
export async function calculateVideoEstimatedCost(
  taskType: TaskTypeType,
  estimatedDuration?: number,
  estimatedCount?: number
): Promise<{ cost: number; estimatedUsage: number; pricing: Pricing }> {
  const category = TASK_TYPE_TO_CATEGORY[taskType]
  if (category !== TaskCategory.VIDEO) {
    throw new Error(`任务类型 ${taskType} 不是视频类任务`)
  }

  const pricingConfig = await getPricing(taskType)

  // 单个视频的用量（秒数）
  const singleUsage = Math.max(estimatedDuration || 0, Number(pricingConfig.minUnit))
  // 总用量 = 单个用量 * 数量
  const estimatedUsage = singleUsage * (estimatedCount || 1)

  const cost = Math.ceil(estimatedUsage * pricingConfig.unitPrice)

  return { cost, estimatedUsage, pricing: pricingConfig }
}

/**
 * 计算图片类任务的预估费用
 * @param taskType 任务类型
 * @param estimatedCount 预估数量
 * @returns cost: 预估费用（分）, estimatedUsage: 预估用量（张数）, pricing: 价格配置
 */
export async function calculateImageEstimatedCost(
  taskType: TaskTypeType,
  estimatedCount?: number
): Promise<{ cost: number; estimatedUsage: number; pricing: Pricing }> {
  const category = TASK_TYPE_TO_CATEGORY[taskType]
  if (category !== TaskCategory.IMAGE) {
    throw new Error(`任务类型 ${taskType} 不是图片类任务`)
  }

  const pricingConfig = await getPricing(taskType)

  // 图片按张计费
  const estimatedUsage = Math.max(estimatedCount || 1, Number(pricingConfig.minUnit))

  const cost = Math.ceil(estimatedUsage * pricingConfig.unitPrice)

  return { cost, estimatedUsage, pricing: pricingConfig }
}

/**
 * 计算音频类任务的预估费用
 * @param taskType 任务类型
 * @param estimatedDuration 预估时长（秒），音频类任务用
 * @param estimatedCount 预估数量
 * @returns cost: 预估费用（分）, estimatedUsage: 预估用量（秒）, pricing: 价格配置
 */
export async function calculateAudioEstimatedCost(
  taskType: TaskTypeType,
  estimatedDuration?: number,
  estimatedCount?: number
): Promise<{ cost: number; estimatedUsage: number; pricing: Pricing }> {
  const category = TASK_TYPE_TO_CATEGORY[taskType]
  if (category !== TaskCategory.AUDIO) {
    throw new Error(`任务类型 ${taskType} 不是音频类任务`)
  }

  const pricingConfig = await getPricing(taskType)

  // 单个音频的用量（秒数）
  const singleUsage = Math.max(estimatedDuration || 0, Number(pricingConfig.minUnit))
  // 总用量 = 单个用量 * 数量
  const estimatedUsage = singleUsage * (estimatedCount || 1)

  const cost = Math.ceil(estimatedUsage * pricingConfig.unitPrice)

  return { cost, estimatedUsage, pricing: pricingConfig }
}

/**
 * 预扣费用（创建任务时调用）
 */
export async function chargeForTask(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  accountId: number,
  taskId: number,
  amount: number
): Promise<void> {
  // 获取当前余额并加锁
  const [account] = await tx
    .select({ balance: accounts.balance })
    .from(accounts)
    .where(eq(accounts.id, accountId))
    .for('update')

  if (!account) {
    throw new Error('账户不存在')
  }

  if (account.balance < amount) {
    throw new InsufficientBalanceError(amount, account.balance)
  }

  const newBalance = account.balance - amount

  // 扣除余额
  await tx.update(accounts).set({ balance: newBalance }).where(eq(accounts.id, accountId))

  // 创建交易记录
  await tx.insert(transactions).values({
    accountId,
    category: 'task_charge',
    amount: -amount,
    balanceBefore: account.balance,
    balanceAfter: newBalance,
    taskId,
    paymentMethod: 'balance',
    metadata: { description: '任务预付费' },
  })
}

/**
 * 结算费用（任务完成时调用）
 * 多退少补原则：多收的退还，少收的平台承担
 */
export async function settleTask(task: Task, actualCost: number): Promise<void> {
  const difference = task.estimatedCost - actualCost

  if (difference <= 0) {
    // 刚好或少收了，平台承担，不补扣
    if (difference < 0) {
      logger.warn(`[Billing] 任务 ${task.id} 少收费 ${Math.abs(difference)} 分，平台承担`)
    }
    return
  }

  // 多收了，退款
  await db.transaction(async (tx) => {
    const [account] = await tx
      .select({ balance: accounts.balance })
      .from(accounts)
      .where(eq(accounts.id, task.accountId))
      .for('update')

    if (!account) {
      throw new Error('账户不存在')
    }

    const newBalance = account.balance + difference

    await tx.update(accounts).set({ balance: newBalance }).where(eq(accounts.id, task.accountId))

    await tx.insert(transactions).values({
      accountId: task.accountId,
      category: 'task_refund',
      amount: difference,
      balanceBefore: account.balance,
      balanceAfter: newBalance,
      taskId: task.id,
      paymentMethod: 'balance',
      metadata: { refundReason: '实际用量少于预估' },
    })
  })
}

/**
 * 全额退款（任务失败或取消时调用）
 */
export async function refundTask(task: Task): Promise<void> {
  if (task.estimatedCost <= 0) return

  await db.transaction(async (tx) => {
    const [account] = await tx
      .select({ balance: accounts.balance })
      .from(accounts)
      .where(eq(accounts.id, task.accountId))
      .for('update')

    if (!account) {
      throw new Error('账户不存在')
    }

    const newBalance = account.balance + task.estimatedCost

    await tx.update(accounts).set({ balance: newBalance }).where(eq(accounts.id, task.accountId))

    await tx.insert(transactions).values({
      accountId: task.accountId,
      category: 'task_refund',
      amount: task.estimatedCost,
      balanceBefore: account.balance,
      balanceAfter: newBalance,
      taskId: task.id,
      paymentMethod: 'balance',
      metadata: { refundReason: '任务执行失败' },
    })
  })
}
