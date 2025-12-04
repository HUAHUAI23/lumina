/**
 * 关闭微信支付订单
 * POST /api/wechat-pay/close-order
 *
 * 用途：
 * 1. 用户主动取消订单
 * 2. 定时任务关闭超时订单
 *
 * 注意：
 * - 只能关闭 pending 状态的订单
 * - 关闭后订单状态变为 closed
 * - 微信支付平台也会同步关闭
 */

import { eq } from 'drizzle-orm'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { db } from '@/db'
import { accounts, chargeOrders } from '@/db/schema'
import { errorResponse, HttpStatus, successResponse } from '@/lib/api-response'
import { getCurrentSession } from '@/lib/auth/dal'
import { logger } from '@/lib/logger'
import { closeOrderSchema } from '@/lib/validations/wechat-pay'
import { closeOrder as closeWechatOrder } from '@/lib/wechat-pay'

export async function POST(request: NextRequest) {
  try {
    // 1. 验证用户登录
    const session = await getCurrentSession()
    if (!session) {
      return NextResponse.json(errorResponse('未登录'), { status: HttpStatus.UNAUTHORIZED })
    }

    // 2. 验证请求参数
    const body = await request.json()
    const { outTradeNo } = closeOrderSchema.parse(body)

    // 3. 查询本地订单
    const [localOrder] = await db
      .select()
      .from(chargeOrders)
      .where(eq(chargeOrders.outTradeNo, outTradeNo))
      .limit(1)

    if (!localOrder) {
      return NextResponse.json(errorResponse('订单不存在'), { status: HttpStatus.NOT_FOUND })
    }

    // 4. 验证订单所属权（安全检查）
    const [account] = await db
      .select()
      .from(accounts)
      .where(eq(accounts.id, localOrder.accountId))
      .limit(1)

    if (!account || account.userId !== session.userId) {
      logger.warn(
        {
          userId: session.userId,
          accountId: localOrder.accountId,
          outTradeNo,
        },
        '用户尝试关闭他人订单'
      )
      return NextResponse.json(errorResponse('无权限关闭此订单'), { status: HttpStatus.FORBIDDEN })
    }

    // 5. 检查订单状态
    if (localOrder.status === 'closed') {
      return NextResponse.json(
        successResponse(
          {
            chargeOrderId: localOrder.id,
            outTradeNo,
            status: 'closed' as const,
          },
          '订单已关闭'
        )
      )
    }

    if (localOrder.status === 'success') {
      return NextResponse.json(errorResponse('订单已支付成功，无法关闭'), {
        status: HttpStatus.BAD_REQUEST,
      })
    }

    if (localOrder.status === 'failed') {
      return NextResponse.json(errorResponse('订单已失败，无需关闭'), {
        status: HttpStatus.BAD_REQUEST,
      })
    }

    // 6. 调用微信支付 API 关闭订单
    try {
      await closeWechatOrder(outTradeNo)
      logger.info({ outTradeNo }, '微信订单关闭成功')
    } catch (error: any) {
      logger.error(
        {
          outTradeNo,
          error: error.message,
        },
        '微信订单关闭失败'
      )

      // 如果微信返回订单不存在或已关闭，我们仍然更新本地状态
      // 其他错误则抛出
      const errorMessage = error.message || ''
      if (
        !errorMessage.includes('ORDER_CLOSED') &&
        !errorMessage.includes('ORDERNOTEXIST') &&
        !errorMessage.includes('ORDER_PAID')
      ) {
        throw error
      }

      logger.info(
        {
          outTradeNo,
          errorMessage,
        },
        '微信订单已关闭或已支付，继续更新本地状态'
      )
    }

    // 7. 更新本地订单状态
    const [updatedOrder] = await db
      .update(chargeOrders)
      .set({
        status: 'closed',
        metadata: {
          ...(localOrder.metadata as any),
          closedAt: new Date().toISOString(),
          closedBy: session.userId,
        },
      })
      .where(eq(chargeOrders.id, localOrder.id))
      .returning()

    logger.info(
      {
        userId: session.userId,
        chargeOrderId: localOrder.id,
        outTradeNo,
      },
      '订单关闭成功'
    )

    // 8. 返回成功响应
    return NextResponse.json(
      successResponse(
        {
          chargeOrderId: updatedOrder.id,
          outTradeNo: updatedOrder.outTradeNo,
          status: updatedOrder.status,
        },
        '订单已关闭'
      )
    )
  } catch (error) {
    logger.error(error, '关闭订单失败')

    if (error instanceof z.ZodError) {
      return NextResponse.json(errorResponse('参数错误', error.issues), {
        status: HttpStatus.BAD_REQUEST,
      })
    }

    return NextResponse.json(errorResponse('关闭订单失败，请稍后重试'), {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
    })
  }
}
