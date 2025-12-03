# 任务系统设计文档

## 一、系统概述

任务系统负责处理视频生成、图片生成等 AI 任务，支持同步和异步两种执行模式，采用预付费+多退少补的计费方式。

## 二、核心概念

### 2.1 任务类型

| 类型             | 说明     | 执行模式 | 计费单位 |
| ---------------- | -------- | -------- | -------- |
| video_motion     | 动作模仿 | 异步     | 秒       |
| video_lipsync    | 口播视频 | 异步     | 秒       |
| video_generation | 视频生成 | 异步     | 秒       |
| image_txt2img    | 文生图   | 同步     | 张       |
| image_img2img    | 图生图   | 同步     | 张       |
| image_3d_model   | 3D模型   | 异步     | 张       |

**注意**：所有视频类型统一按**秒**计费。

### 2.2 任务状态

```
pending     → 待处理（等待调度器领取，包括新任务和待重试任务）
processing  → 处理中（已提交到第三方/正在执行）
completed   → 已完成
failed      → 失败（重试次数用尽或不可重试错误）
cancelled   → 已取消
partial     → 部分成功（批量任务场景）
```

## 三、TOS 存储设计

### 3.1 路径规范

```
{bucket}/
├── input/{userId}/{taskType}/{taskId}/   # 任务输入资源
│   ├── source_image.jpg
│   └── source_video.mp4
├── output/{userId}/{taskType}/{taskId}/  # 任务输出资源
│   └── result.mp4
└── temp/{userId}/{uploadId}/             # 临时上传（任务创建前，类型未知）
    ├── image.jpg
    └── video.mp4
```

路径设计优势：
- 按用户 → 任务类型 → 任务ID 层级组织，便于按类型统计和管理
- temp 目录不含任务类型，因为上传时任务尚未创建

### 3.2 URL 格式

完整 URL 格式：
```
https://{bucket}.{endpoint}/{folder}/{userId}/{taskType}/{taskId}/{filename}
```

示例：
```
https://lumina-bucket.tos-cn-beijing.volces.com/input/1/video_motion/123/source_image.jpg
https://lumina-bucket.tos-cn-beijing.volces.com/output/1/video_motion/123/result.mp4
https://lumina-bucket.tos-cn-beijing.volces.com/temp/1/upload-1701234567890/video.mp4
```

### 3.3 task_resources 表存储

```typescript
{
  id: 1,
  taskId: 123,
  resourceType: 'video',      // image | video | audio
  isInput: true,              // true=输入, false=输出
  url: 'https://lumina-bucket.tos-cn-beijing.volces.com/input/1/video_motion/123/source_video.mp4',
  metadata: {
    width: 1920,
    height: 1080,
    duration: 65,             // 秒
    size: 10485760,           // 字节
    mimeType: 'video/mp4'
  }
}
```

## 四、调度器设计（方案A：双循环）

### 4.1 架构概览

采用**双循环**设计，分离待处理任务和异步状态查询：

```
┌─────────────────────────────────────────────────────────────┐
│                       调度器                                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌───────────────────────┐   ┌───────────────────────┐    │
│   │    主循环 (5秒)        │   │  异步查询循环 (30秒)   │    │
│   │                       │   │                       │    │
│   │  1. 领取待处理任务     │   │  查询 processing 状态  │    │
│   │  2. 执行同步任务       │   │  的异步任务            │    │
│   │  3. 提交异步任务       │   │                       │    │
│   │  4. 恢复超时任务       │   │                       │    │
│   └───────────────────────┘   └───────────────────────┘    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 主循环（TASK_SCHEDULER_INTERVAL）

每 5 秒执行一次：

#### Step 2: 执行任务

```
领取的任务
    │
    ├── 同步任务 ──→ 直接调用 API ──→ 等待结果 ──→ 完成/失败
    │
    └── 异步任务 ──→ 提交到第三方 ──→ 保存 external_task_id ──→ 保持 processing
```

#### Step 3: 恢复超时任务

-- 找到超时的处理中任务（可能是实例崩溃导致）
-- 重置为 pending，等待下一轮重新执行


### 4.3 异步查询循环（TASK_ASYNC_POLL_INTERVAL）

每 30 秒执行一次：

-- 查询处理中且有外部任务ID的异步任务

对每个任务调用第三方 API 查询状态：

```
查询第三方 API 状态
    │
    ├── done ──────→ 下载结果 → 保存到 TOS → 结算费用 → completed
    │
    ├── failed ────→ 触发重试或标记失败 → 失败则退款
    │
    └── in_queue/generating ──→ 跳过，等待下一轮
```

## 五、调度器设计（方案B：单循环+任务级控制）— 备选方案

> **说明**：此方案作为备选，提供更细粒度的控制，未来需要时可参考实现。

### 5.1 单循环设计

```
┌─────────────────────────────────────────────────────────────┐
│              单循环（每 TASK_SCHEDULER_INTERVAL 秒）          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. 领取待处理任务（pending）                                │
│     - 新任务: next_retry_at IS NULL                         │
│     - 重试任务: next_retry_at <= NOW()                      │
│                                                             │
│  2. 执行同步任务                                            │
│                                                             │
│  3. 提交异步任务（首次执行，无 external_task_id）            │
│                                                             │
│  4. 查询异步任务状态（有 external_task_id）                  │
│     条件: last_polled_at IS NULL                            │
│           OR last_polled_at + {ASYNC_POLL_INTERVAL} <= NOW()│
│     查询后更新: last_polled_at = NOW()                      │
│                                                             │
│  5. 恢复超时任务                                            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 5.3 方案B的优势

1. **任务级控制**：每个任务独立记录上次查询时间
2. **更灵活**：可以针对不同任务类型设置不同的查询间隔
3. **避免批量查询**：任务查询时间自然分散


## 六、重试机制

### 6.1 重试触发场景

- API 调用失败（网络错误、超时）
- 第三方返回可重试错误码
- 任务处理超时被恢复

### 6.2 可重试 vs 不可重试错误

| 错误类型       | 是否重试 | 示例                         |
| -------------- | -------- | ---------------------------- |
| 网络超时       | 是       | ETIMEDOUT, ECONNRESET        |
| 服务端错误     | 是       | 500, 502, 503, 504           |
| 限流错误       | 是       | 429, 50429, 50430            |
| 环境变量未配置 | **否**   | VOLCENGINE_ACCESS_KEY 未设置 |
| 认证失败       | **否**   | 401, 403                     |
| 参数错误       | **否**   | 400                          |
| 内容审核不通过 | **否**   | 50411, 50412, 50413          |

### 6.3 重试流程

**关键点**：重试不是独立操作，而是将任务重置为 pending 状态，由主循环自然重新执行。

```
任务执行失败
      │
      ▼
错误是否可重试？(retryable)
      │
  ┌───┴───┐
  否      是
  │       │
  ▼       ▼
直接失败  retry_count < TASK_MAX_RETRIES ?
并退款          │
            ┌───┴───┐
            是      否
            │       │
            ▼       ▼
        设置重试:   标记失败:
        - status = 'pending'    - status = 'failed'
        - retry_count += 1      - completed_at = NOW()
        - next_retry_at = 退避   执行全额退款
              │
              ▼
        主循环下一轮查询条件:
        WHERE status = 'pending'
          AND (next_retry_at IS NULL OR next_retry_at <= NOW())
              │
              ▼
        条件满足时，任务被重新领取执行
```

### 6.4 指数退避算法

```typescript
function calculateRetryDelay(retryCount: number): number {
  // 基础延迟 60 秒，指数增长，最大 10 分钟
  const baseDelay = 60 // 秒
  const maxDelay = 600 // 秒
  return Math.min(baseDelay * Math.pow(2, retryCount), maxDelay)
}

// 示例：
// retryCount=0 → 60秒后重试  (首次失败)
// retryCount=1 → 120秒后重试 (第二次失败)
// retryCount=2 → 240秒后重试 (第三次失败)
// retryCount=3 → 达到上限，标记为 failed
```

## 七、错误处理

### 7.1 环境变量未配置错误

当第三方平台的环境变量未配置时，任务应立即失败（不重试），并记录明确的错误原因。

#### 环境变量设计

```typescript
// lib/env.ts - 火山引擎配置设为可选，允许应用启动
server: {
  // TOS 对象存储（可选，未配置时相关功能不可用）
  VOLCENGINE_ACCESS_KEY: z.string().optional(),
  VOLCENGINE_SECRET_KEY: z.string().optional(),
  VOLCENGINE_REGION: z.string().default('cn-north-1'),
  VOLCENGINE_ENDPOINT: z.string().default('tos-cn-beijing.volces.com'),
  VOLCENGINE_BUCKET_NAME: z.string().optional(),
  // ...
}
```

#### Provider 执行前检查


#### 执行器处理不可重试错误


#### 日志记录格式

```typescript
// task_logs 表记录示例

// 环境变量未配置
{
  taskId: 123,
  level: 'error',
  message: '任务执行失败（不可重试）',
  data: {
    error: '环境变量未配置: VOLCENGINE_ACCESS_KEY, VOLCENGINE_SECRET_KEY',
    retryable: false,
    missingEnvVars: ['VOLCENGINE_ACCESS_KEY', 'VOLCENGINE_SECRET_KEY']
  },
  createdAt: '2024-01-01T00:00:00Z'
}

// 可重试错误
{
  taskId: 124,
  level: 'warn',
  message: '任务执行失败，将在 60 秒后重试',
  data: {
    error: '请求超时',
    retryable: true,
    retryCount: 1,
    nextRetryAt: '2024-01-01T00:01:00Z'
  },
  createdAt: '2024-01-01T00:00:00Z'
}
```

### 7.2 第三方 API 错误码处理

火山引擎动作模仿 API 错误码分类：

| 错误码 | 说明                 | 是否重试                 |
| ------ | -------------------- | ------------------------ |
| 10000  | 成功                 | -                        |
| 50411  | 输入图片审核未通过   | 否                       |
| 50412  | 输入文本审核未通过   | 否                       |
| 50413  | 输入含敏感词         | 否                       |
| 50429  | QPS超限              | 是                       |
| 50430  | 并发超限             | 是                       |
| 50500  | 内部错误             | 是                       |
| 50501  | 内部算法错误         | 是                       |
| 50516  | 输出视频审核未通过   | 是（可能换个结果就通过） |
| 50518  | 输入版权图审核未通过 | 否                       |

## 八、计费设计

### 8.1 计费单位

| 任务类型         | 计费单位 | 说明                 |
| ---------------- | -------- | -------------------- |
| 视频类 (video_*) | 秒       | 按生成视频的实际秒数 |
| 图片类 (image_*) | 张       | 按生成图片的数量     |

### 8.2 预付费流程（per_unit 按量计费）

```
创建任务
    │
    ▼
计算预估费用:
  视频任务: 视频时长(秒) × 每秒单价
  图片任务: 图片数量 × 每张单价
    │
    ▼
检查余额: accounts.balance >= 预估费用 ?
    │
  ┌─┴─┐
  否   是
  │    │
  ▼    ▼
返回   执行扣款:
余额   1. accounts.balance -= 预估费用
不足   2. 创建 transaction 记录:
          - category = 'task_charge'
          - amount = -预估费用 (负数表示支出)
          - balance_before = 原余额
          - balance_after = 新余额
          - task_id = 任务ID
       3. 创建任务记录:
          - estimated_cost = 预估费用
          - status = 'pending'
```

### 8.3 任务完成结算（多退少补）

```
任务完成 (status = 'completed')
    │
    ▼
计算实际费用:
  视频: 生成视频实际秒数 × 每秒单价
    │
    ▼
差额 = estimated_cost - actual_cost
    │
    ▼
差额情况判断
    │
  ┌─┴─────────────┐
  │               │
  ▼               ▼
差额 > 0        差额 <= 0
(多收了)        (刚好或少收了)
  │               │
  ▼               ▼
退款差额        不补扣，平台承担
```

#### 多收费退款

```typescript
// 差额 > 0: 多收了，退款
if (difference > 0) {
  await db.transaction(async (tx) => {
    // 1. 增加余额
    await tx.update(accounts)
      .set({ balance: sql`balance + ${difference}` })
      .where(eq(accounts.id, task.accountId))

    // 2. 创建退款交易记录
    await tx.insert(transactions).values({
      accountId: task.accountId,
      category: 'task_refund',
      amount: difference,  // 正数表示收入
      balanceBefore: currentBalance,
      balanceAfter: currentBalance + difference,
      taskId: task.id,
      metadata: { refundReason: '实际用量少于预估' }
    })

    // 3. 更新任务实际费用
    await tx.update(tasks).set({
      actualCost: actualCost,
      actualUsage: actualUsage,
    }).where(eq(tasks.id, task.id))
  })
}
```

#### 少收费处理（平台承担）

```typescript
// 差额 <= 0: 刚好或少收了，平台承担差额，不向用户补扣
if (difference <= 0) {
  // 仅更新任务实际费用，不做额外扣费
  await db.update(tasks).set({
    actualCost: actualCost,  // 记录实际费用（可能 > estimatedCost）
    actualUsage: actualUsage,
  }).where(eq(tasks.id, task.id))

  // 可选：记录平台损失日志，用于后续分析预估准确性
  if (difference < 0) {
    console.warn(`[Billing] 任务 ${task.id} 少收费 ${Math.abs(difference)} 分，平台承担`)
  }
}
```

**注意**：为确保平台不亏损，应做好预估费用计算，建议预估时适当上浮（如按输入视频时长预估，而生成视频通常不会更长）。

### 8.4 任务失败退款

```
任务失败 (status = 'failed')
    │
    ▼
全额退款:
1. accounts.balance += estimated_cost
2. 创建 transaction 记录:
   - category = 'task_refund'
   - amount = +estimated_cost
   - task_id = 任务ID
   - metadata.refund_reason = '任务执行失败'
```

## 九、动作模仿（VIDEO_MOTION）完整流程

### 9.1 前端上传

```
1. 用户选择图片和视频文件
2. 前端获取视频时长（用于显示预估费用）
3. 调用 POST /api/upload 上传文件
4. 文件保存到 TOS 临时目录:
   - temp/{userId}/{uploadId}/image.jpg
   - temp/{userId}/{uploadId}/video.mp4
5. 返回临时 URL 和元数据给前端
```

### 9.2 创建任务

请求：
```json
POST /api/tasks
{
  "type": "video_motion",
  "name": "我的动作模仿视频",
  "config": {},
  "inputs": [
    {
      "type": "image",
      "url": "https://...temp/.../image.jpg",
      "metadata": { "width": 1920, "height": 1080 }
    },
    {
      "type": "video",
      "url": "https://...temp/.../video.mp4",
      "metadata": { "duration": 65, "width": 1920, "height": 1080 }
    }
  ],
  "estimatedDuration": 65
}
```

服务端处理：
```
1. 验证用户登录状态，获取 accountId
2. 从 pricing 表获取 video_motion 单价（每秒价格）
3. 计算预估费用 = 65秒 × 每秒单价
4. 检查余额是否充足
5. 开启事务:
   a. 扣除用户余额
   b. 创建 transaction 记录
   c. 创建任务记录 (status = 'pending', estimated_cost = 预估费用)
   d. 将临时文件移动/复制到正式目录:
      - input/{userId}/video_motion/{taskId}/image.jpg
      - input/{userId}/video_motion/{taskId}/video.mp4
   e. 创建 task_resources 记录（输入资源）
6. 返回任务信息
```

### 9.3 调度器执行（主循环）

```
1. 主循环领取任务 (status: pending → processing)

2. 检查环境变量是否配置
   - 未配置: 立即失败，记录原因，全额退款
   - 已配置: 继续

3. 获取输入资源 URL

4. 调用火山引擎 API 提交任务:
   POST https://visual.volcengineapi.com?Action=CVSync2AsyncSubmitTask&Version=2022-08-31
   {
     "req_key": "jimeng_dream_actor_m1_gen_video_cv",
     "image_url": "https://...input/.../image.jpg",
     "video_url": "https://...input/.../video.mp4"
   }

5. 检查返回:
   - code = 10000: 成功，保存 task_id 到 tasks.external_task_id
   - code != 10000: 根据错误码判断是否重试

6. 记录日志到 task_logs 表
```

### 9.4 调度器轮询状态（异步查询循环）

```
1. 异步查询循环领取 processing 状态的异步任务

2. 调用火山引擎 API 查询状态:
   POST https://visual.volcengineapi.com?Action=CVSync2AsyncGetResult&Version=2022-08-31
   {
     "req_key": "jimeng_dream_actor_m1_gen_video_cv",
     "task_id": "{external_task_id}"
   }

3. 根据返回的 data.status 处理:

   - "in_queue" / "generating":
     跳过，等待下一轮查询

   - "done":
     a. 从 data.video_url 下载生成的视频
     b. 上传到 TOS: output/{userId}/video_motion/{taskId}/result.mp4
     c. 获取生成视频的时长
     d. 计算实际费用 = 实际秒数 × 单价
     e. 结算（多退少补）
     f. 更新任务状态为 completed
     g. 创建输出资源记录 (task_resources, isInput=false)

   - "not_found" / "expired":
     触发重试或标记失败，失败则全额退款

   - code != 10000 (错误):
     根据错误码判断是否可重试
     - 可重试错误: 触发重试
     - 不可重试错误: 标记失败，全额退款
```

## 十、环境变量配置

```typescript
// lib/env.ts 新增配置

// ==================== 火山引擎配置 ====================
// TOS 对象存储（可选，未配置时相关任务不可用）
VOLCENGINE_ACCESS_KEY: z.string().optional(),      // 访问密钥 ID
VOLCENGINE_SECRET_KEY: z.string().optional(),      // 访问密钥 Secret
VOLCENGINE_REGION: z.string().default('cn-north-1'),
VOLCENGINE_ENDPOINT: z.string().default('tos-cn-beijing.volces.com'),
VOLCENGINE_BUCKET_NAME: z.string().optional(),     // 存储桶名称

// ==================== 任务调度配置 ====================
TASK_SCHEDULER_ENABLED: z.coerce.boolean().default(true),  // 调度器开关
TASK_SCHEDULER_INTERVAL: z.coerce.number().default(5),     // 主循环间隔（秒）
TASK_ASYNC_POLL_INTERVAL: z.coerce.number().default(30),   // 异步查询间隔（秒）
TASK_TIMEOUT_MINUTES: z.coerce.number().default(30),       // 任务超时时间（分钟）
TASK_MAX_RETRIES: z.coerce.number().default(3),            // 最大重试次数
TASK_BATCH_SIZE: z.coerce.number().default(10),            // 每次拉取数量
```

## 十一、数据库表关系

```
users (1) ──── (1) accounts (1) ──── (N) tasks
                      │                   │
                      │                   ├── (N) task_resources
                      │                   └── (N) task_logs
                      │
                      └──── (N) transactions
                                  │
                                  └── task_id (关联任务的扣费/退款)

pricing (独立表，存储各任务类型的价格配置)
```

## 十二、API 接口设计

### 12.1 文件上传

```
POST /api/upload
Content-Type: multipart/form-data

file: <binary>
type: "image" | "video"

Response 200:
{
  "success": true,
  "data": {
    "url": "https://bucket.endpoint/temp/1/upload-xxx/filename.mp4",
    "uploadId": "upload-1701234567890",
    "metadata": {
      "width": 1920,
      "height": 1080,
      "duration": 65,
      "size": 10485760,
      "mimeType": "video/mp4"
    }
  }
}
```

### 12.2 创建任务

```
POST /api/tasks
Content-Type: application/json

{
  "type": "video_motion",
  "name": "任务名称",
  "config": {},
  "inputs": [
    { "type": "image", "url": "...", "metadata": {} },
    { "type": "video", "url": "...", "metadata": { "duration": 65 } }
  ],
  "estimatedDuration": 65
}

Response 200:
{
  "success": true,
  "data": {
    "id": 123,
    "type": "video_motion",
    "status": "pending",
    "estimatedCost": 650,
    "createdAt": "2024-01-01T00:00:00Z"
  }
}

Response 400 (余额不足):
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_BALANCE",
    "message": "余额不足，需要 650 分，当前余额 500 分"
  }
}
```

### 12.3 查询任务详情

```
GET /api/tasks/{id}

Response 200:
{
  "success": true,
  "data": {
    "id": 123,
    "type": "video_motion",
    "name": "任务名称",
    "status": "completed",
    "estimatedCost": 650,
    "actualCost": 320,
    "inputs": [
      {
        "type": "image",
        "url": "https://...input/.../image.jpg",
        "metadata": { "width": 1920, "height": 1080 }
      },
      {
        "type": "video",
        "url": "https://...input/.../video.mp4",
        "metadata": { "duration": 65 }
      }
    ],
    "outputs": [
      {
        "type": "video",
        "url": "https://...output/.../result.mp4",
        "metadata": { "duration": 32, "width": 1920, "height": 1080 }
      }
    ],
    "createdAt": "2024-01-01T00:00:00Z",
    "startedAt": "2024-01-01T00:00:05Z",
    "completedAt": "2024-01-01T00:02:30Z"
  }
}
```

### 12.4 查询任务列表

```
GET /api/tasks?status=completed&type=video_motion&limit=20&offset=0

Response 200:
{
  "success": true,
  "data": {
    "tasks": [...],
    "pagination": {
      "total": 100,
      "limit": 20,
      "offset": 0
    }
  }
}
```

## 十三、实现文件清单

```
lib/
├── env.ts                    # 更新：添加火山引擎和任务调度配置
├── tos.ts                    # 新建：TOS 文件上传/下载/移动服务
├── volcengine/
│   ├── client.ts             # 新建：火山引擎 API 签名和请求
│   └── motion.ts             # 新建：动作模仿 API 封装
└── tasks/
    ├── billing.ts            # 新建：计费逻辑（预扣、结算、退款）
    ├── scheduler.ts          # 重写：双循环 + 并发控制的调度器
    ├── executor.ts           # 重写：任务执行器
    ├── service.ts            # 重写：任务服务（创建、查询）
    ├── types.ts              # 更新：类型定义
    ├── providers/
    │   ├── base.ts           # 更新：添加 retryable 返回字段
    │   ├── registry.ts       # 保留：Provider 注册表
    │   └── video-motion.ts   # 新建：动作模仿 Provider
    └── index.ts              # 更新：导出

app/api/
├── upload/
│   └── route.ts              # 新建：文件上传接口
└── tasks/
    ├── route.ts              # 新建：POST 创建, GET 列表
    └── [id]/
        └── route.ts          # 新建：GET 详情

app/(main)/
├── video-studio/
│   └── page.tsx              # 更新：接入真实 API
└── dashboard/
    └── page.tsx              # 更新：显示真实任务数据

instrumentation.ts            # 更新：注册 Provider，启动调度器
.env.example                  # 更新：添加新的环境变量说明
```

## 十四、执行计划

### Phase 1: 基础设施
1. 更新 `lib/env.ts` - 添加环境变量配置
2. 更新 `.env.example` - 添加配置说明
3. 创建 `lib/tos.ts` - TOS 文件操作服务
4. 创建 `lib/volcengine/client.ts` - 火山引擎 API 客户端（签名）
5. 创建 `lib/volcengine/motion.ts` - 动作模仿 API 封装

### Phase 2: 任务核心
6. 创建 `lib/tasks/billing.ts` - 计费逻辑
7. 重写 `lib/tasks/scheduler.ts` - 双循环 + 并发安全的调度器
8. 重写 `lib/tasks/executor.ts` - 任务执行器
9. 重写 `lib/tasks/service.ts` - 任务服务

### Phase 3: 动作模仿实现
10. 更新 `lib/tasks/providers/base.ts` - 添加 retryable 支持
11. 创建 `lib/tasks/providers/video-motion.ts` - Provider 实现
12. 更新 `instrumentation.ts` - 注册和启动

### Phase 4: API 接口
13. 创建 `app/api/upload/route.ts` - 文件上传
14. 创建 `app/api/tasks/route.ts` - 任务创建和列表
15. 创建 `app/api/tasks/[id]/route.ts` - 任务详情

### Phase 5: 前端集成
16. 更新 `app/(main)/video-studio/page.tsx` - 动作模仿 UI 和逻辑
17. 更新 `app/(main)/dashboard/page.tsx` - 任务列表展示
