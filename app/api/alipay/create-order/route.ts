/**
 * 创建支付宝充值订单
 * POST /api/alipay/create-order
 */

import { eq } from 'drizzle-orm'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { db } from '@/db'
import { accounts, chargeOrders, paymentConfigs } from '@/db/schema'
import { precreateOrder } from '@/lib/alipay'
import { errorResponse, HttpStatus, successResponse } from '@/lib/api-response'
import { getCurrentSession } from '@/lib/auth/dal'
import { yuanToFen } from '@/lib/const'
import { logger } from '@/lib/logger'
import { createRechargeOrderSchema } from '@/lib/validations/alipay'

export async function POST(request: NextRequest) {
  try {
    // 1. 验证用户登录
    const session = await getCurrentSession()
    if (!session) {
      return NextResponse.json(errorResponse('未登录'), { status: HttpStatus.UNAUTHORIZED })
    }

    // 2. 验证请求参数
    const body = await request.json()
    const { amount } = createRechargeOrderSchema.parse(body)

    // 3. 查询支付宝支付配置
    const [alipayConfig] = await db
      .select()
      .from(paymentConfigs)
      .where(eq(paymentConfigs.provider, 'alipay'))
      .limit(1)

    if (!alipayConfig || alipayConfig.status === 'disabled') {
      return NextResponse.json(errorResponse('支付宝支付暂不可用'), {
        status: HttpStatus.SERVICE_UNAVAILABLE,
      })
    }

    // 4. 验证充值金额范围
    if (amount < alipayConfig.minAmount || amount > alipayConfig.maxAmount) {
      return NextResponse.json(
        errorResponse(`充值金额必须在 ${alipayConfig.minAmount}-${alipayConfig.maxAmount} 元之间`),
        { status: HttpStatus.BAD_REQUEST }
      )
    }

    // 5. 获取用户账户
    const [account] = await db
      .select()
      .from(accounts)
      .where(eq(accounts.userId, session.userId))
      .limit(1)

    if (!account) {
      return NextResponse.json(errorResponse('账户不存在'), { status: HttpStatus.NOT_FOUND })
    }

    // 6. 生成商户订单号
    // 格式: ALI + 时间戳 + 用户ID + 随机数
    const outTradeNo = `ALI${Date.now()}${session.userId}${Math.random()
      .toString(36)
      .substring(2, 8)
      .toUpperCase()}`

    // 7. 计算订单过期时间 (10分钟)
    const orderTimeoutMinutes = alipayConfig.publicConfig?.orderTimeoutMinutes || 10
    const expireTime = new Date(Date.now() + orderTimeoutMinutes * 60 * 1000)

    // 8. 调用支付宝下单接口
    const { qrCode } = await precreateOrder({
      outTradeNo,
      subject: `账户充值-${amount}元`,
      totalAmount: yuanToFen(amount),
      body: `用户充值 ¥${amount}`,
    })

    // 9. 创建充值订单记录 (status=pending)
    const [chargeOrder] = await db
      .insert(chargeOrders)
      .values({
        accountId: account.id,
        amount: yuanToFen(amount),
        provider: 'alipay',
        outTradeNo,
        paymentCredential: {
          alipay: {
            qrCode,
          },
        },
        status: 'pending',
        expireTime,
        metadata: {
          description: `支付宝充值 ¥${amount}`,
          ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '',
        },
      })
      .returning()

    logger.info(
      {
        userId: session.userId,
        accountId: account.id,
        chargeOrderId: chargeOrder.id,
        outTradeNo,
        amount,
      },
      '创建支付宝充值订单成功'
    )

    // 10. 返回订单信息
    return NextResponse.json(
      successResponse({
        chargeOrderId: chargeOrder.id,
        outTradeNo,
        qrCode,
        amount,
        expireTime: orderTimeoutMinutes * 60, // 秒
        expireAt: expireTime.toISOString(),
      })
    )
  } catch (error) {
    logger.error(error, '创建支付宝充值订单失败')

    if (error instanceof z.ZodError) {
      return NextResponse.json(errorResponse('参数错误', error.issues), {
        status: HttpStatus.BAD_REQUEST,
      })
    }

    return NextResponse.json(errorResponse('创建订单失败，请稍后重试'), {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
    })
  }
}
