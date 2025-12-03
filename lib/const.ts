/**
 * 货币转换工具
 */

/**
 * 元转分（人民币）
 * @param yuan 金额（元）
 * @returns 金额（分）
 */
export function yuanToFen(yuan: number): number {
  return Math.round(yuan * 100)
}

/**
 * 分转元（人民币）
 * @param fen 金额（分）
 * @returns 金额（元）
 */
export function fenToYuan(fen: number): number {
  return fen / 100
}
