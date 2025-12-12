/**
 * 工作流表达式求值器
 *
 * 支持的变量引用格式：
 * - $var.varName：引用运行时变量
 * - $node.nodeId.output.key：引用节点输出
 * - $node.nodeId.output.resources[0].url：引用节点输出资源
 * - $literal.value：字面量值
 *
 * 支持的条件表达式：
 * - $var.count > 10
 * - $var.type == 'video'
 * - $var.enabled == true
 * - $node.step1.output.success && $var.continue
 */

import type { NodeState } from '../types'

/** 变量解析上下文 */
export interface ExpressionContext {
  /** 运行时变量 */
  variables: Record<string, unknown>
  /** 节点状态（包含输出） */
  nodeStates: Record<string, NodeState>
}

/**
 * 解析变量路径，获取值
 *
 * @param path 变量路径，如 "$var.inputImage" 或 "$node.step1.output.url"
 * @param context 解析上下文
 * @returns 解析后的值
 */
export function resolveVariablePath(path: string, context: ExpressionContext): unknown {
  const trimmedPath = path.trim()

  // $var.xxx - 运行时变量
  if (trimmedPath.startsWith('$var.')) {
    const varPath = trimmedPath.slice(5) // 去掉 "$var."
    return getNestedValue(context.variables, varPath)
  }

  // $node.nodeId.output.xxx - 节点输出
  if (trimmedPath.startsWith('$node.')) {
    const restPath = trimmedPath.slice(6) // 去掉 "$node."
    const dotIndex = restPath.indexOf('.')
    if (dotIndex === -1) {
      return undefined
    }

    const nodeId = restPath.slice(0, dotIndex)
    const outputPath = restPath.slice(dotIndex + 1) // 如 "output.url" 或 "output.resources[0].url"

    const nodeState = context.nodeStates[nodeId]
    if (!nodeState) {
      return undefined
    }

    // 从 nodeState 中解析路径
    return getNestedValue(nodeState, outputPath)
  }

  // $literal.xxx - 字面量
  if (trimmedPath.startsWith('$literal.')) {
    const literal = trimmedPath.slice(9) // 去掉 "$literal."
    // 尝试解析为 JSON
    try {
      return JSON.parse(literal)
    } catch {
      // 如果解析失败，返回原始字符串
      return literal
    }
  }

  // 不是变量引用，返回原始值
  return trimmedPath
}

/**
 * 从嵌套对象中获取值
 *
 * @param obj 对象
 * @param path 路径，如 "a.b.c" 或 "a.b[0].c"
 * @returns 值
 */
function getNestedValue(obj: unknown, path: string): unknown {
  if (obj === null || obj === undefined) {
    return undefined
  }

  const parts = parsePath(path)
  let current: unknown = obj

  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined
    }

    if (typeof part === 'number') {
      // 数组索引
      if (Array.isArray(current)) {
        current = current[part]
      } else {
        return undefined
      }
    } else {
      // 对象属性
      if (typeof current === 'object') {
        current = (current as Record<string, unknown>)[part]
      } else {
        return undefined
      }
    }
  }

  return current
}

/**
 * 解析路径字符串为部分数组
 *
 * @param path 路径，如 "a.b[0].c"
 * @returns 部分数组，如 ["a", "b", 0, "c"]
 */
function parsePath(path: string): Array<string | number> {
  const parts: Array<string | number> = []
  const regex = /([^.[\]]+)|\[(\d+)\]/g
  let match

  while ((match = regex.exec(path)) !== null) {
    if (match[1] !== undefined) {
      parts.push(match[1])
    } else if (match[2] !== undefined) {
      parts.push(parseInt(match[2], 10))
    }
  }

  return parts
}

/**
 * 评估条件表达式
 *
 * @param expression 条件表达式
 * @param context 解析上下文
 * @returns 布尔结果
 */
export function evaluateCondition(expression: string, context: ExpressionContext): boolean {
  const trimmedExpr = expression.trim()

  // 空表达式返回 true（无条件通过）
  if (!trimmedExpr) {
    return true
  }

  try {
    // 先处理逻辑运算符（&& 和 ||）
    // 简单实现：只支持单层逻辑运算

    // 检查 && 运算
    if (trimmedExpr.includes('&&')) {
      const parts = trimmedExpr.split('&&').map((p) => p.trim())
      return parts.every((part) => evaluateSimpleCondition(part, context))
    }

    // 检查 || 运算
    if (trimmedExpr.includes('||')) {
      const parts = trimmedExpr.split('||').map((p) => p.trim())
      return parts.some((part) => evaluateSimpleCondition(part, context))
    }

    // 单个条件
    return evaluateSimpleCondition(trimmedExpr, context)
  } catch (error) {
    // 表达式求值出错，返回 false
    console.error(`条件表达式求值失败: ${expression}`, error)
    return false
  }
}

/**
 * 评估简单条件（不含逻辑运算符）
 */
function evaluateSimpleCondition(expression: string, context: ExpressionContext): boolean {
  // 支持的比较运算符
  const operators = ['===', '!==', '==', '!=', '>=', '<=', '>', '<']

  for (const op of operators) {
    const opIndex = expression.indexOf(op)
    if (opIndex !== -1) {
      const left = expression.slice(0, opIndex).trim()
      const right = expression.slice(opIndex + op.length).trim()

      const leftValue = resolveValue(left, context)
      const rightValue = resolveValue(right, context)

      return compareValues(leftValue, rightValue, op)
    }
  }

  // 没有比较运算符，将表达式作为布尔值
  const value = resolveValue(expression, context)
  return Boolean(value)
}

/**
 * 解析值（变量或字面量）
 */
function resolveValue(value: string, context: ExpressionContext): unknown {
  const trimmed = value.trim()

  // 变量引用
  if (trimmed.startsWith('$')) {
    return resolveVariablePath(trimmed, context)
  }

  // 字符串字面量（单引号或双引号）
  if (
    (trimmed.startsWith("'") && trimmed.endsWith("'")) ||
    (trimmed.startsWith('"') && trimmed.endsWith('"'))
  ) {
    return trimmed.slice(1, -1)
  }

  // 布尔字面量
  if (trimmed === 'true') return true
  if (trimmed === 'false') return false

  // null
  if (trimmed === 'null') return null

  // 数字
  const num = Number(trimmed)
  if (!isNaN(num)) {
    return num
  }

  // 其他情况，返回原始字符串
  return trimmed
}

/**
 * 比较两个值
 */
function compareValues(left: unknown, right: unknown, operator: string): boolean {
  switch (operator) {
    case '===':
      return left === right
    case '!==':
      return left !== right
    case '==':
      // 宽松相等
      return left == right
    case '!=':
      return left != right
    case '>':
      return Number(left) > Number(right)
    case '>=':
      return Number(left) >= Number(right)
    case '<':
      return Number(left) < Number(right)
    case '<=':
      return Number(left) <= Number(right)
    default:
      return false
  }
}

/**
 * 替换字符串中的变量引用
 *
 * @param template 模板字符串，如 "Hello, {{$var.name}}!"
 * @param context 解析上下文
 * @returns 替换后的字符串
 */
export function interpolateString(template: string, context: ExpressionContext): string {
  return template.replace(/\{\{([^}]+)\}\}/g, (_, path) => {
    const value = resolveVariablePath(path.trim(), context)
    return String(value ?? '')
  })
}