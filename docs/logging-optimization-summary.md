# 日志系统优化总结

## 优化日期
2025-12-04

## 优化目标
1. 移除所有测试代码和调试日志（console.log）
2. 统一使用结构化日志（pino logger）
3. 优化日志级别和内容，确保关键信息完整
4. 确保数据库日志（taskLogs）在关键节点都有记录

---

## ✅ 完成的优化

### 1. 清理测试日志

#### lib/volcengine/motion.ts
**清理内容**：
- ✅ 移除 `submitMotionTask` 中的 2 个 console.log（请求参数、响应）
- ✅ 移除 `getMotionResult` 中的 2 个 console.log（查询参数、响应）

**原因**：
- 这是底层 API 封装，日志应该在上层 Provider 处理
- 避免日志重复（Provider 已有完整日志）
- console.log 不适合生产环境

**影响**：
- ❌ 无负面影响
- ✅ 减少日志噪音
- ✅ 上层 Provider 仍有完整的调用日志

---

#### lib/volcengine/client.ts
**清理内容**：
- ✅ 移除 1 个 console.error（API 错误）
- ✅ 替换为结构化日志 `logger.error()`

**改进**：
```typescript
// 之前
console.error('[火山引擎] API错误:', {
  action,
  code: result.code,
  message: result.message,
  request_id: result.request_id,
  httpStatus: response.status,
  body: body, // ⚠️ 可能包含敏感信息
})

// 优化后
logger.error(
  {
    action,
    code: result.code,
    message: result.message,
    requestId: result.request_id, // ✅ 使用 camelCase
    httpStatus: response.status,
    // ✅ 移除 body（避免记录敏感信息）
  },
  '❌ [火山引擎] API 调用失败'
)
```

**优势**：
- ✅ 结构化日志便于查询和分析
- ✅ 移除敏感信息（body）
- ✅ 统一日志格式

---

### 2. 优化调度器日志

#### lib/tasks/scheduler.ts

**优化 1: 主循环异常日志**
```typescript
// 之前
catch (error) {
  logger.error({ error }, '主循环异常') // ❌ 信息不足
}

// 优化后
catch (error) {
  const err = error as Error
  logger.error(
    {
      error: err.message,
      stack: err.stack,      // ✅ 添加堆栈信息
      name: err.name,        // ✅ 错误类型
      code: (err as any).code, // ✅ 数据库错误码
    },
    '❌ [主循环] 主循环执行异常'
  )
}
```

**优化 2: 异步查询循环异常日志**
```typescript
// 单个任务查询异常
catch (error) {
  const err = error as Error
  logger.error(
    {
      taskId: task.id,
      error: err.message,
      stack: err.stack  // ✅ 添加堆栈
    },
    '❌ [异步查询循环] 单个任务查询异常'
  )
}

// 循环执行异常
catch (error) {
  const err = error as Error
  logger.error(
    {
      error: err.message,
      stack: err.stack,
      name: err.name,
      code: (err as any).code,
    },
    '❌ [异步查询循环] 循环执行异常'
  )
}
```

**优势**：
- ✅ 完整的错误信息（message + stack + code）
- ✅ 便于排查问题（特别是数据库错误）
- ✅ 区分单个任务异常 vs 循环异常

---

### 3. 数据库日志检查

#### lib/tasks/utils/task-logger.ts

**已有的日志函数**：
- ✅ `logTaskCreated` - 任务创建
- ✅ `logTaskCompleted` - 任务完成
- ✅ `logTaskFailed` - 任务失败
- ✅ `logTaskFinalFailure` - 任务最终失败
- ✅ `logTaskWillRetry` - 任务将重试
- ✅ `logTaskCancelled` - 任务取消

**使用位置检查**：
- ✅ `service.ts` - 任务创建和取消
- ✅ `handlers/base-default.ts` - 任务完成和失败
- ✅ `scheduler.ts` - 任务重试和超时失败

**数据库日志覆盖率**：
- ✅ 任务生命周期的所有关键节点都有日志
- ✅ 包含必要的上下文信息（错误码、重试次数、费用等）
- ✅ 支持事务上下文（dbOrTx 参数）

---

## 📊 日志级别使用规范

### info 级别
**使用场景**：
- ✅ 正常的业务流程（任务创建、完成）
- ✅ 调度器状态变化（启动、停止）
- ✅ 批量操作统计（领取了N个任务）

**示例**：
```typescript
logger.info({ count: pendingTasks.length }, '🔄 [主循环] 领取到待处理任务')
logger.info({ count: recovered }, '♻️ [主循环] 已恢复超时任务')
```

### warn 级别
**使用场景**：
- ⚠️ 潜在问题但不影响系统运行（重复任务检测）
- ⚠️ 需要人工关注的情况（任务超时、将重试）
- ⚠️ 状态冲突（任务状态已变更）

**示例**：
```typescript
logger.warn({ taskId: task.id }, '⏱️ [超时恢复] 检测到超时任务')
logger.warn({ taskId: task.id }, '⚠️ [异步查询循环] 检测到重复任务，跳过')
```

### error 级别
**使用场景**：
- ❌ 系统错误（主循环异常、数据库错误）
- ❌ 业务失败（任务最终失败、API 调用失败）
- ❌ 不可恢复的错误（不可重试）

**示例**：
```typescript
logger.error({ taskId: task.id, error }, '❌ [主循环] 主循环执行异常')
logger.error({ action, code }, '❌ [火山引擎] API 调用失败')
```

---

## 🎯 日志最佳实践

### 1. 日志格式
```typescript
logger.[level](
  {
    // 结构化数据（用于查询和过滤）
    taskId: 123,
    error: 'Error message',
    code: 50215
  },
  '🔥 [模块名] 人类可读的消息' // 简短描述
)
```

### 2. 必须包含的字段
- **taskId**: 所有任务相关的日志必须包含
- **error**: 错误日志必须包含 message 和 stack
- **code**: API 错误必须包含错误码
- **requestId**: 第三方 API 调用必须包含

### 3. 避免记录的内容
- ❌ 敏感信息（密钥、token、密码）
- ❌ 完整的请求 body（可能包含图片 URL、视频 URL）
- ❌ 用户个人信息（邮箱、手机号）

### 4. Emoji 使用规范
- 🚀 开始/启动
- ✅ 成功/完成
- ❌ 错误/失败
- ⚠️ 警告/需关注
- 🔄 处理中/重试
- ⏱️ 超时
- ♻️ 恢复
- 🔍 查询
- 📤 提交
- 📥 接收
- 🎉 任务完成成功

---

## 📈 优化效果

### 代码质量
- ✅ 移除所有 console.log/console.error
- ✅ 统一使用 pino 结构化日志
- ✅ 日志信息完整，便于排查问题

### 生产环境
- ✅ 日志可以被日志收集系统解析（JSON 格式）
- ✅ 支持按字段过滤和查询（taskId, error, code）
- ✅ 避免记录敏感信息

### 可维护性
- ✅ 日志格式统一，易于理解
- ✅ 关键节点都有日志记录
- ✅ 错误信息完整（message + stack + code）

---

## 🔍 如何查询日志

### 查询特定任务的日志
```bash
# 结构化日志
grep '"taskId":123' logs/app.log

# 数据库日志
SELECT * FROM task_logs WHERE task_id = 123 ORDER BY created_at;
```

### 查询错误日志
```bash
# 主循环错误
grep '主循环执行异常' logs/app.log

# API 错误
grep 'API 调用失败' logs/app.log | grep '"code":50215'
```

### 查询特定时间段的日志
```sql
-- 数据库日志
SELECT * FROM task_logs
WHERE created_at >= '2025-12-04 00:00:00'
  AND level = 'error'
ORDER BY created_at DESC;
```

---

## ✨ 总结

本次优化完成了以下工作：

1. ✅ **清理测试代码**：移除 5 个 console.log/console.error
2. ✅ **统一日志格式**：所有日志使用 pino 结构化日志
3. ✅ **优化错误日志**：添加完整的错误信息（stack + code）
4. ✅ **确保日志完整**：任务生命周期所有关键节点都有日志

**日志系统现在已经达到生产环境标准** 🎉

- 结构化、可查询、可分析
- 信息完整、便于排查问题
- 避免敏感信息泄露
- 符合最佳实践