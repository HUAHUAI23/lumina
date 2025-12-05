import { eq } from 'drizzle-orm'

import { db } from '../db'
import { pricing } from '../db/schema'
import { BillingType, TaskType } from '../lib/tasks/types'

/**
 * Initialize price configuration
 * Sets per_unit pricing for video_motion and video_lipsync tasks
 * pnpm tsx --env-file=.env scripts/init-prices.ts
 */
async function initPrices() {
  console.log('Initializing price configuration...')

  try {
    // Price configuration
    const unitPrice = 200 // 单价 200 分
    const unit = 'second' // 单位：秒
    const minUnit = '1' // 最小计费单位：1秒

    // Video motion pricing
    const videoMotionExists = await db.query.pricing.findFirst({
      where: eq(pricing.taskType, TaskType.VIDEO_MOTION),
    })

    if (!videoMotionExists) {
      await db.insert(pricing).values({
        taskType: TaskType.VIDEO_MOTION,
        billingType: BillingType.PER_UNIT,
        unitPrice,
        unit,
        minUnit,
      })
      console.log(
        `✓ Created video_motion pricing: ${unitPrice} cents per ${unit}, min ${minUnit} ${unit}`
      )
    } else {
      console.log(
        `✓ video_motion pricing already exists: ${videoMotionExists.unitPrice} cents per ${videoMotionExists.unit}`
      )
    }

    // Video lipsync pricing
    const videoLipsyncExists = await db.query.pricing.findFirst({
      where: eq(pricing.taskType, TaskType.VIDEO_LIPSYNC),
    })

    if (!videoLipsyncExists) {
      await db.insert(pricing).values({
        taskType: TaskType.VIDEO_LIPSYNC,
        billingType: BillingType.PER_UNIT,
        unitPrice,
        unit,
        minUnit,
      })
      console.log(
        `✓ Created video_lipsync pricing: ${unitPrice} cents per ${unit}, min ${minUnit} ${unit}`
      )
    } else {
      console.log(
        `✓ video_lipsync pricing already exists: ${videoLipsyncExists.unitPrice} cents per ${videoLipsyncExists.unit}`
      )
    }

    console.log('\n✓ Price initialization completed successfully')
    process.exit(0)
  } catch (error) {
    console.error('Error initializing prices:', error)
    process.exit(1)
  }
}

initPrices()
