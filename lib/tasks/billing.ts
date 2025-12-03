/**
 * 任务计费服务
 */

import { eq } from 'drizzle-orm'

import { db } from '@/db'
import { accounts, pricing, transactions } from '@/db/schema'

import { InsufficientBalanceError } from './errors'
import type { Task, TaskTypeType } from './types'
import { TASK_TYPE_TO_CATEGORY } from './types'

/**
 * 获取任务类型的价格配置
 */
export async function getPricing(taskType: TaskTypeType) {
  const pricingConfig = await db.query.pricing.findFirst({
    where: eq(pricing.taskType, taskType),
  })

  if (pricingConfig && pricingConfig.billingType !== 'per_unit') {
    throw new Error(`任务类型 ${taskType} 的计费类型不是 per_unit，当前只支持按次计费`)
  }

  return pricingConfig
}

/**
 * 计算预估费用
 * @param taskType 任务类型
 * @param estimatedDuration 预估时长（秒），视频类任务用
 * @param estimatedCount 预估数量，图片类任务用
 */
export async function calculateEstimatedCost(
  taskType: TaskTypeType,
  estimatedDuration?: number,
  estimatedCount?: number
): Promise<{ cost: number; pricingId: number }> {
  const pricingConfig = await getPricing(taskType)

  if (!pricingConfig) {
    throw new Error(`未找到任务类型 ${taskType} 的价格配置`)
  }

  const category = TASK_TYPE_TO_CATEGORY[taskType]
  let usage: number

  if (category === 'video') {
    // 视频按秒计费
    usage = Math.max(estimatedDuration || 0, Number(pricingConfig.minUnit))
  } else {
    // 图片按张计费
    usage = Math.max(estimatedCount || 1, Number(pricingConfig.minUnit))
  }

  const cost = Math.ceil(usage * pricingConfig.unitPrice)

  return { cost, pricingId: pricingConfig.id }
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
      console.warn(`[Billing] 任务 ${task.id} 少收费 ${Math.abs(difference)} 分，平台承担`)
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