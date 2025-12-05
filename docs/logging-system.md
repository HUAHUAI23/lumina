# 日志系统文档 (Logging System Documentation)

## 概述

本项目使用 **Pino** 作为日志框架，结合 **pino-pretty** 提供开发环境的友好格式化输出，并为 Drizzle ORM 提供专门的数据库查询日志。

## 技术栈

| 技术        | 版本   | 用途                         |
| ----------- | ------ | ---------------------------- |
| Pino        | Latest | 高性能、结构化 JSON 日志框架 |
| pino-pretty | 13.1.3 | 开发环境日志美化工具         |
| Drizzle ORM | 0.44.7 | ORM，自定义 logger 集成      |

---

## 环境变量配置

### `LOG_LEVEL`
控制应用全局日志级别。

**可选值**: `fatal`, `error`, `warn`, `info`, `debug`, `trace`

**默认值**: 
- 生产环境: `info`
- 开发环境: `debug`

**示例**:
```bash
# .env
LOG_LEVEL=debug
```

### `DB_QUERY_LOGGING`
**独立控制数据库查询日志的开关**，与 `NODE_ENV` 解耦。

**用途**: 在开发环境中，你可能需要查看应用日志但不想被大量 SQL 查询日志淹没时，可以禁用此选项。

**可选值**: `true`, `false`

**默认值**: `false`

**示例**:
```bash
# .env
DB_QUERY_LOGGING=true  # 启用 SQL 查询日志
```

---

## 功能特性

### 1. **开发环境友好格式化**

开发环境下自动使用 `pino-pretty` 进行格式化，提供：
- ✅ **彩色输出** - 根据日志级别显示不同颜色
- ✅ **时间戳** - 系统标准格式
- ✅ **模块标识** - 清晰显示日志来源模块
- ✅ **单行/多行** - 可配置的输出格式

**效果预览**:
```
[2025-12-04 11:30:15] DEBUG (db): SQL Query
    queryId: 1
    sql: 
      SELECT * 
      FROM users 
      WHERE id = $1
    params: [123]
```

### 2. **生产环境结构化日志**

生产环境输出标准 JSON 格式，便于日志聚合工具（如 ELK、Datadog）处理：

```json
{
  "level": 30,
  "time": 1733315415000,
  "pid": 12345,
  "hostname": "server-1",
  "module": "db",
  "queryId": 1,
  "sql": "SELECT * FROM users WHERE id = $1",
  "params": [123],
  "msg": "SQL Query"
}
```

### 3. **自动敏感信息脱敏**

自动移除或脱敏以下敏感字段：
- `password`, `passwordHash`
- `token`, `accessToken`, `apiKey`
- `req.headers.authorization`, `req.headers.cookie`
- 所有嵌套对象中的 `*.password`, `*.token`

**配置**: 使用 `remove: true` 完全移除敏感字段，而不是替换为 `[Redacted]`

### 4. **SQL 查询格式化**

Drizzle ORM 的 SQL 查询在开发环境下会自动格式化，提高可读性：

**原始 SQL**:
```sql
SELECT users.id, users.username FROM users WHERE users.id = $1 AND users.email = $2 ORDER BY users.created_at LIMIT 10
```

**格式化后**:
```sql
SELECT users.id, users.username 
FROM users 
WHERE users.id = $1 AND users.email = $2 
ORDER BY users.created_at 
LIMIT 10
```

### 5. **查询性能追踪**

- ✅ 每个查询分配唯一 `queryId` 便于追踪
- ✅ 自动记录查询耗时
- ✅ 慢查询警告（>1000ms）自动升级为 `warn` 级别

**示例输出**:
```
[WARN] Slow Query Detected
  queryId: 42
  sql: SELECT * FROM large_table WHERE ...
  duration: 1250.45ms
```

### 6. **参数清理**

- 自动截断过长的字符串参数（>100字符）
- 避免日志文件过大
- 保护敏感数据

---

## 使用指南

### 基础日志

```typescript
import { logger } from '@/lib/logger'

// 不同级别的日志
logger.debug('调试信息')
logger.info('一般信息')
logger.warn('警告信息')
logger.error('错误信息')

// 带上下文的日志
logger.info({ userId: 123, action: 'login' }, '用户登录成功')

// 记录错误
try {
  throw new Error('Something went wrong')
} catch (error) {
  logger.error({ err: error }, '操作失败')
}
```

### 模块化日志

为不同模块创建子 logger：

```typescript
import { logger } from '@/lib/logger'

const taskLogger = logger.child({ module: 'task' })
const authLogger = logger.child({ module: 'auth' })

taskLogger.info('任务开始执行')
authLogger.info('用户认证成功')
```

### 数据库查询日志

数据库查询日志由 Drizzle ORM 自动处理，无需手动调用：

```typescript
// 当 DB_QUERY_LOGGING=true 时，以下查询会自动记录
const user = await db.query.users.findFirst({
  where: eq(users.id, userId)
})

// 输出:
// [DEBUG] (db) SQL Query
//   queryId: 1
//   sql: SELECT * FROM users WHERE id = $1
//   params: [123]
```

---

## 开发环境最佳实践

### 场景 1: 一般开发调试
```bash
# .env
NODE_ENV=development
LOG_LEVEL=debug
DB_QUERY_LOGGING=false  # 不需要看 SQL
```

### 场景 2: 调试数据库问题
```bash
# .env
NODE_ENV=development
LOG_LEVEL=debug
DB_QUERY_LOGGING=true   # 启用 SQL 日志
```

### 场景 3: 调试任务系统
```bash
# .env
NODE_ENV=development
LOG_LEVEL=trace         # 最详细的日志
DB_QUERY_LOGGING=true   # 查看任务相关的所有 SQL
```

---

## 生产环境配置

```bash
# .env
NODE_ENV=production
LOG_LEVEL=info          # 只记录 info 及以上级别
DB_QUERY_LOGGING=false  # 生产环境关闭 SQL 日志
```

**注意事项**:
1. 生产环境自动输出 JSON 格式（不使用 pino-pretty）
2. 包含 `pid` 和 `hostname` 以便于多实例追踪
3. 建议将日志输出到 `stdout`，由日志聚合工具收集

---

## 日志查看工具

### 开发环境
日志已通过 `pino-pretty` 格式化，直接在终端查看即可。

### 生产环境
推荐使用以下工具查看 JSON 日志：

1. **pino-pretty CLI** (本地查看)
   ```bash
   # 实时查看
   node app.js | pnpm exec pino-pretty
   
   # 查看日志文件
   cat app.log | pnpm exec pino-pretty
   ```

2. **jq** (JSON 查询)
   ```bash
   cat app.log | jq 'select(.level >= 40)'  # 只看 warn 和 error
   cat app.log | jq 'select(.module == "db")'  # 只看数据库日志
   ```

3. **日志聚合服务**
   - ELK Stack (Elasticsearch, Logstash, Kibana)
   - Datadog
   - Grafana Loki
   - AWS CloudWatch

---

## 常见问题

### Q: 如何临时启用 SQL 日志而不重启服务？
A: 目前需要修改 `.env` 文件并重启服务。未来可以考虑通过 API 动态调整日志级别。

### Q: 日志文件在哪里？
A: 默认输出到 `stdout`。如需保存到文件，可以使用重定向：
```bash
node app.js > app.log 2>&1
```

或使用 PM2 等进程管理器自动管理日志文件。

### Q: 如何减少日志输出量？
A: 调整 `LOG_LEVEL` 到更高级别（如 `info` 或 `warn`），并关闭 `DB_QUERY_LOGGING`。

### Q: 慢查询阈值可以调整吗？
A: 可以。修改 `db/logger.ts` 中的 `if (duration > 1000)` 值（单位：毫秒）。

---

## 架构设计

```
lib/logger.ts (基础 Pino Logger)
    ↓
    ├─→ 应用日志 (各模块 child logger)
    └─→ db/logger.ts (DrizzleLogger 适配器)
            ↓
        Drizzle ORM 查询日志
```

**关键设计点**:
1. **单一日志实例**: 所有日志通过 `lib/logger.ts` 的单一实例管理
2. **模块化**: 使用 `child()` 创建模块特定的子 logger
3. **环境感知**: 根据 `NODE_ENV` 自动切换格式化策略
4. **解耦控制**: DB 日志通过独立环境变量控制

---

## 版本历史

| 版本 | 日期       | 变更内容                                          |
| ---- | ---------- | ------------------------------------------------- |
| 2.0  | 2025-12-04 | 升级到 2025 最佳实践，添加 pino-pretty 和独立控制 |
| 1.0  | 2025-12    | 初始版本 - 基础 Pino logger                       |

---

**维护者**: Lumina AI Development Team  
**最后更新**: 2025-12-04
