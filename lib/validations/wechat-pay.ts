/**
 * 微信支付相关请求验证模式
 */

import { z } from 'zod'

/**
 * 创建充值订单请求验证
 */
export const createRechargeOrderSchema = z.object({
  amount: z.number().positive('充值金额必须大于0').int('充值金额必须为整数'),
})

/**
 * 关闭订单请求验证
 */
export const closeOrderSchema = z.object({
  outTradeNo: z.string().min(1, '商户订单号不能为空'),
})
