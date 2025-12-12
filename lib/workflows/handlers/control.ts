/**
 * 控制节点 Handler 实现
 */

import type { ExecutionContext } from '../engine/context'
import type { DelayNode, EndNode, HandlerResult, StartNode, VariableSetNode } from '../types'
import { NodeType, Signal } from '../types'

import { BaseNodeHandler } from './base'

/**
 * 起始节点 Handler
 */
export class StartNodeHandler extends BaseNodeHandler {
  readonly nodeType = NodeType.START

  async execute(context: ExecutionContext): Promise<HandlerResult> {
    const node = context.node as StartNode
    const config = node.config

    // 初始化输入变量
    if (config.inputVariables && config.inputVariables.length > 0) {
      const variables = context.workflowTask.runtimeVariables ?? {}

      for (const varDef of config.inputVariables) {
        // 检查必要变量
        if (varDef.required && variables[varDef.name] === undefined) {
          // 如果有默认值，使用默认值
          if (varDef.defaultValue !== undefined) {
            await context.setVariable(varDef.name, varDef.defaultValue)
          } else {
            return {
              signal: Signal.FAIL,
              error: `缺少必要输入变量: ${varDef.name}`,
            }
          }
        }

        // 设置默认值（如果变量未提供）
        if (variables[varDef.name] === undefined && varDef.defaultValue !== undefined) {
          await context.setVariable(varDef.name, varDef.defaultValue)
        }
      }
    }

    return {
      signal: Signal.CONTINUE,
      output: {
        variables: { initialized: true },
      },
    }
  }
}

/**
 * 终止节点 Handler
 */
export class EndNodeHandler extends BaseNodeHandler {
  readonly nodeType = NodeType.END

  async execute(context: ExecutionContext): Promise<HandlerResult> {
    const node = context.node as EndNode
    const config = node.config

    // 收集输出变量
    const outputVariables: Record<string, unknown> = {}

    if (config.outputVariables && config.outputVariables.length > 0) {
      for (const varDef of config.outputVariables) {
        const value = context.resolveVariable(varDef.source)
        outputVariables[varDef.name] = value
      }
    }

    return {
      signal: Signal.CONTINUE,
      output: {
        variables: outputVariables,
      },
    }
  }
}

/**
 * 变量设置节点 Handler
 */
export class VariableSetNodeHandler extends BaseNodeHandler {
  readonly nodeType = NodeType.VARIABLE_SET

  async execute(context: ExecutionContext): Promise<HandlerResult> {
    const node = context.node as VariableSetNode
    const config = node.config

    const setVariables: Record<string, unknown> = {}

    for (const varDef of config.variables) {
      const value = context.resolveVariable(varDef.value)
      setVariables[varDef.name] = value
    }

    // 批量设置变量
    await context.setVariables(setVariables)

    return {
      signal: Signal.CONTINUE,
      output: {
        variables: setVariables,
      },
    }
  }
}

/**
 * 条件分支节点 Handler
 *
 * 注意：条件判断逻辑在边上定义（WorkflowEdge.condition），
 * 此 Handler 只是一个占位符，直接返回 CONTINUE。
 * 实际的条件判断在 Executor 的边遍历逻辑中处理。
 */
export class ConditionNodeHandler extends BaseNodeHandler {
  readonly nodeType = NodeType.CONDITION

  async execute(_context: ExecutionContext): Promise<HandlerResult> {
    // 条件节点本身不做任何处理，条件判断在边遍历时进行
    return {
      signal: Signal.CONTINUE,
      output: {
        variables: { evaluated: true },
      },
    }
  }
}

/**
 * 延时节点 Handler
 */
export class DelayNodeHandler extends BaseNodeHandler {
  readonly nodeType = NodeType.DELAY

  async execute(context: ExecutionContext): Promise<HandlerResult> {
    const node = context.node as DelayNode
    const config = node.config
    const nodeState = context.getNodeState()

    // 检查是否已经等待足够时间
    if (nodeState?.startedAt) {
      const startTime = new Date(nodeState.startedAt).getTime()
      const elapsed = Date.now() - startTime
      const requiredDelay = config.delaySeconds * 1000

      if (elapsed >= requiredDelay) {
        return {
          signal: Signal.CONTINUE,
          output: {
            variables: {
              delayedSeconds: config.delaySeconds,
              actualDelayMs: elapsed,
            },
          },
        }
      }

      // 尚未等待足够时间，继续暂停
      return { signal: Signal.SUSPEND }
    }

    // 首次执行，设置开始时间并暂停
    await context.updateNodeState({
      startedAt: new Date().toISOString(),
    })

    return { signal: Signal.SUSPEND }
  }
}
