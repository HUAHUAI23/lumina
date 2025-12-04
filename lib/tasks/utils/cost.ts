/**
 * 费用计算工具
 */

import { eq } from 'drizzle-orm'

import { db } from '@/db'
import { pricing } from '@/db/schema'

import type { Task } from '../types'
import { BillingType } from '../types'

/**
 * 根据实际用量计算费用
 */
export async function calculateActualCostFromUsage(
  task: Task,
  actualUsage?: number
): Promise<number> {
  if (actualUsage === undefined || !task.pricingId) {
    return task.estimatedCost
  }

  const pricingConfig = await db.query.pricing.findFirst({
    where: eq(pricing.id, task.pricingId),
  })

  if (!pricingConfig) {
    throw new Error(`未找到定价配置 ${task.pricingId}`)
  }

  if (pricingConfig.billingType !== BillingType.PER_UNIT) {
    throw new Error(`定价配置 ${task.pricingId} 的计费类型不是 per_unit`)
  }

  return Math.ceil(actualUsage * pricingConfig.unitPrice)
}
