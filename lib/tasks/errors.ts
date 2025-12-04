/**
 * 任务系统错误类
 */

export class TaskError extends Error {
  constructor(
    message: string,
    public readonly retryable: boolean = false,
    public readonly code?: number
  ) {
    super(message)
    this.name = 'TaskError'
  }
}

export class InsufficientBalanceError extends TaskError {
  constructor(public readonly required: number, public readonly available: number) {
    super(`余额不足，需要 ${required} 积分，当前余额 ${available} 积分`, false)
    this.name = 'InsufficientBalanceError'
  }
}

export class TaskNotFoundError extends TaskError {
  constructor(taskId: number) {
    super(`任务不存在: ${taskId}`, false)
    this.name = 'TaskNotFoundError'
  }
}

export class ProviderNotFoundError extends TaskError {
  constructor(taskType: string) {
    super(`未找到任务类型 ${taskType} 的 Provider`, false)
    this.name = 'ProviderNotFoundError'
  }
}

export class ConfigurationError extends TaskError {
  constructor(message: string) {
    super(message, false)
    this.name = 'ConfigurationError'
  }
}
