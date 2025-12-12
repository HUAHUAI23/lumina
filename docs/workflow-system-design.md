# 工作流系统设计文档

## 目录

1. [系统概述](#1-系统概述)
2. [核心架构](#2-核心架构)
3. [DAG 执行引擎](#3-dag-执行引擎)
4. [Reconcile 模式](#4-reconcile-模式)
5. [节点类型与 Handler](#5-节点类型与-handler)
6. [并发控制与竞态处理](#6-并发控制与竞态处理)
7. [计费系统集成](#7-计费系统集成)
8. [数据模型](#8-数据模型)
9. [扩展指南](#9-扩展指南)

---

## 1. 系统概述

### 1.1 设计目标

工作流系统旨在支持复杂的 AI 任务编排，如"数字人"工作流（图片 + 视频动作 + 语音合成 + 口型同步）。核心设计目标：

- **DAG 执行**：支持有向无环图结构，节点可并行执行
- **异步任务支持**：兼容同步/异步任务（如视频生成需要数分钟）
- **容错与恢复**：系统崩溃后可自动恢复执行
- **可扩展性**：易于添加新的节点类型
- **并发安全**：多节点并行执行时状态不冲突

### 1.2 系统定位

```
┌─────────────────────────────────────────────────────────────────┐
│                        前端 UI 层                                │
│              (DigitalHumanForm, VideoStudio)                    │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API 层 (Next.js)                            │
│            /api/workflows/digital-human                          │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                     工作流系统 (本文档)                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │  Scheduler  │  │  Executor   │  │  Node Handlers          │  │
│  │  (调度器)    │  │  (执行器)   │  │  (节点处理器)            │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                      任务系统 (Task System)                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │  Scheduler  │  │  Executor   │  │  Providers/Handlers     │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                    外部 AI 服务 (火山引擎等)                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. 核心架构

### 2.1 目录结构

```
lib/workflows/
├── engine/                 # 执行引擎核心
│   ├── context.ts          # 执行上下文（变量、状态管理）
│   ├── executor.ts         # DAG 执行器（reconcile 逻辑）
│   ├── expression.ts       # 表达式解析（变量引用）
│   └── graph.ts            # 图结构工具（拓扑、依赖分析）
├── handlers/               # 节点处理器
│   ├── registry.ts         # Handler 注册表
│   └── impl/               # 具体实现
│       ├── index.ts
│       ├── start.ts        # 开始节点
│       ├── end.ts          # 结束节点
│       ├── condition.ts    # 条件分支
│       ├── delay.ts        # 延时节点
│       ├── variable-set.ts # 变量设置
│       └── task.ts         # 任务节点（video_motion, audio_tts 等）
├── scheduler.ts            # 工作流调度器
├── init.ts                 # 系统初始化
└── types.ts                # 类型定义
```

### 2.2 核心组件

```
┌──────────────────────────────────────────────────────────────────┐
│                     WorkflowScheduler                             │
│                     (lib/workflows/scheduler.ts)                  │
│  - 定时轮询 running 状态的工作流任务                               │
│  - 批量调度，控制并发                                              │
│  - 错误隔离，单个失败不影响其他                                     │
└──────────────────────────────────────────────────────────────────┘
                               │
                               │ reconcile()
                               ▼
┌──────────────────────────────────────────────────────────────────┐
│                     WorkflowExecutor                              │
│                     (lib/workflows/engine/executor.ts)            │
│  - 解析 DAG 结构，确定可执行节点                                    │
│  - 并行执行就绪节点                                                │
│  - 处理执行信号（CONTINUE/SUSPEND/FAIL）                          │
└──────────────────────────────────────────────────────────────────┘
                               │
                               │ execute()
                               ▼
┌──────────────────────────────────────────────────────────────────┐
│                     NodeHandler                                   │
│                     (lib/workflows/handlers/)                     │
│  - 每种节点类型一个 Handler                                        │
│  - 通过 ExecutionContext 访问状态和任务系统                        │
│  - 返回执行信号指示下一步动作                                       │
└──────────────────────────────────────────────────────────────────┘
                               │
                               │ createTask() / getTask()
                               ▼
┌──────────────────────────────────────────────────────────────────┐
│                     ExecutionContext                              │
│                     (lib/workflows/engine/context.ts)             │
│  - 封装工作流任务状态                                              │
│  - 提供变量读写、节点状态更新                                       │
│  - 原子操作，防止并发竞态                                          │
└──────────────────────────────────────────────────────────────────┘
```

---

## 3. DAG 执行引擎

### 3.1 图结构定义

工作流使用 DAG（有向无环图）定义执行流程：

```typescript
// 节点定义
interface GraphNode {
  id: string           // 唯一标识
  type: NodeType       // 节点类型
  name: string         // 显示名称
  config: object       // 节点配置
}

// 边定义
interface GraphEdge {
  source: string       // 源节点 ID
  target: string       // 目标节点 ID
  condition?: string   // 可选的条件表达式
}
```

### 3.2 数字人工作流示例

```
                    ┌─────────┐
                    │  start  │
                    └────┬────┘
                         │
            ┌────────────┼────────────┐
            │            │            │
            ▼            ▼            ▼
    ┌──────────────┐ ┌─────────┐ (输入变量)
    │ video_motion │ │audio_tts│
    │  (视频动作)   │ │ (语音)  │
    └──────┬───────┘ └────┬────┘
            │            │
            └────────────┼────────────┘
                         │
                         ▼
                 ┌──────────────┐
                 │ video_lipsync│
                 │  (口型同步)   │
                 └──────┬───────┘
                         │
                         ▼
                    ┌─────────┐
                    │   end   │
                    └─────────┘
```

对应的数据结构：

```typescript
const nodes = [
  { id: 'start', type: 'start', name: '开始' },
  { id: 'video_motion', type: 'video_motion', name: '视频动作' },
  { id: 'audio_tts', type: 'audio_tts', name: '语音合成' },
  { id: 'video_lipsync', type: 'video_lipsync', name: '口型同步' },
  { id: 'end', type: 'end', name: '结束' },
]

const edges = [
  { source: 'start', target: 'video_motion' },
  { source: 'start', target: 'audio_tts' },
  { source: 'video_motion', target: 'video_lipsync' },
  { source: 'audio_tts', target: 'video_lipsync' },
  { source: 'video_lipsync', target: 'end' },
]
```

### 3.3 节点就绪判定

节点可执行的条件：

```
节点可执行 = (状态为 PENDING 或无状态) AND (所有前驱节点已完成或跳过)
           OR (状态为 RUNNING)  // 需要检查异步任务状态
```

```typescript
// executor.ts - getExecutableNodes()
private async getExecutableNodes(workflowTask, graph): Promise<GraphNode[]> {
  const executable: GraphNode[] = []

  for (const node of allNodes) {
    const state = nodeStates[node.id]

    // 已完成或跳过 → 跳过
    if (state?.status === 'completed' || state?.status === 'skipped') continue

    // 已失败 → 跳过
    if (state?.status === 'failed') continue

    // RUNNING → 需要检查（可能是异步任务）
    if (state?.status === 'running') {
      executable.push(node)
      continue
    }

    // PENDING 或无状态 → 检查前置依赖
    const predecessors = graph.getPredecessors(node.id)
    const allDone = predecessors.every(pred =>
      nodeStates[pred.id]?.status === 'completed' ||
      nodeStates[pred.id]?.status === 'skipped'
    )

    if (allDone || predecessors.length === 0) {
      executable.push(node)
    }
  }

  return executable
}
```

---

## 4. Reconcile 模式

### 4.1 设计理念

采用 Kubernetes 风格的 **Reconcile 模式**：

- **期望状态**：工作流定义（DAG 结构）
- **当前状态**：nodeStates（各节点执行状态）
- **Reconcile**：持续将当前状态向期望状态收敛

### 4.2 执行流程

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Reconcile 循环                               │
└─────────────────────────────────────────────────────────────────────┘

     ┌──────────────────────────────────────────────────────────┐
     │                  WorkflowScheduler                        │
     │                  (每 10 秒触发一次)                        │
     └──────────────────────────────┬───────────────────────────┘
                                    │
                                    ▼
     ┌──────────────────────────────────────────────────────────┐
     │  1. 查询所有 status='running' 的工作流任务                 │
     └──────────────────────────────┬───────────────────────────┘
                                    │
                                    ▼
     ┌──────────────────────────────────────────────────────────┐
     │  2. 对每个任务调用 executor.reconcile()                   │
     └──────────────────────────────┬───────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     WorkflowExecutor.reconcile()                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  3. 获取可执行节点 (getExecutableNodes)                        │  │
│  └───────────────────────────────┬───────────────────────────────┘  │
│                                  │                                  │
│                                  ▼                                  │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  4. 并行执行所有就绪节点 (Promise.all)                         │  │
│  │                                                               │  │
│  │   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │  │
│  │   │   Node A    │  │   Node B    │  │   Node C    │          │  │
│  │   │  execute()  │  │  execute()  │  │  execute()  │          │  │
│  │   └──────┬──────┘  └──────┬──────┘  └──────┬──────┘          │  │
│  │          │                │                │                 │  │
│  │          ▼                ▼                ▼                 │  │
│  │      CONTINUE         SUSPEND           CONTINUE             │  │
│  │                                                               │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                  │                                  │
│                                  ▼                                  │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  5. 处理执行信号                                               │  │
│  │     - CONTINUE: 节点完成，检查后续节点                          │  │
│  │     - SUSPEND:  节点等待（异步任务），下次继续检查               │  │
│  │     - FAIL:     节点失败，标记工作流失败                        │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                  │                                  │
│                                  ▼                                  │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  6. 返回是否需要继续 reconcile                                 │  │
│  │     - true:  还有待执行或等待中的节点                          │  │
│  │     - false: 全部完成或已失败                                  │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 4.3 执行信号

```typescript
enum Signal {
  CONTINUE = 'continue',  // 节点执行完成，可以继续执行后续节点
  SUSPEND = 'suspend',    // 节点需要等待（异步任务未完成）
  FAIL = 'fail',          // 节点执行失败
}
```

**信号使用场景**：

| 场景 | 返回信号 | 说明 |
|------|----------|------|
| 同步节点执行完成 | CONTINUE | 立即检查后续节点 |
| 异步任务已提交 | SUSPEND | 等待下次 reconcile 检查 |
| 异步任务仍在处理 | SUSPEND | 继续等待 |
| 异步任务已完成 | CONTINUE | 可以执行后续节点 |
| 任何执行错误 | FAIL | 标记工作流失败 |

### 4.4 异步任务处理

```
                        首次执行
                           │
                           ▼
┌──────────────────────────────────────────────────────────────┐
│  TaskNodeHandler.execute()                                    │
│                                                              │
│  hasTaskId = false                                           │
│  → 创建任务 (taskService.create)                              │
│  → 保存 taskId 到 nodeState                                   │
│  → 返回 SUSPEND                                              │
└──────────────────────────────────────────────────────────────┘
                           │
                           │ (等待 10 秒，下次 reconcile)
                           ▼
┌──────────────────────────────────────────────────────────────┐
│  TaskNodeHandler.execute()                                    │
│                                                              │
│  hasTaskId = true                                            │
│  → 查询任务状态 (context.getTask)                             │
│  │                                                           │
│  ├─ status = 'pending' / 'processing'                        │
│  │  → 返回 SUSPEND (继续等待)                                 │
│  │                                                           │
│  ├─ status = 'completed'                                     │
│  │  → 保存输出到 nodeState.output                             │
│  │  → 返回 CONTINUE                                          │
│  │                                                           │
│  └─ status = 'failed'                                        │
│     → 返回 FAIL                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## 5. 节点类型与 Handler

### 5.1 Handler 接口

```typescript
interface NodeHandler {
  /** 节点类型 */
  type: NodeType

  /** 执行节点 */
  execute(context: ExecutionContext): Promise<NodeExecutionResult>
}

interface NodeExecutionResult {
  signal: Signal
  output?: NodeStateOutput
  error?: string
}
```

### 5.2 内置节点类型

| 类型 | 说明 | 信号行为 |
|------|------|----------|
| `start` | 开始节点 | 直接返回 CONTINUE |
| `end` | 结束节点 | 直接返回 CONTINUE |
| `variable_set` | 设置变量 | 设置后返回 CONTINUE |
| `condition` | 条件分支 | 评估条件后返回 CONTINUE |
| `delay` | 延时等待 | 计算等待时间，返回 SUSPEND/CONTINUE |
| `video_motion` | 视频动作任务 | 创建/检查任务，返回 SUSPEND/CONTINUE |
| `audio_tts` | 语音合成任务 | 创建/检查任务，返回 SUSPEND/CONTINUE |
| `video_lipsync` | 口型同步任务 | 创建/检查任务，返回 SUSPEND/CONTINUE |

### 5.3 任务节点 Handler

```typescript
// handlers/impl/task.ts
export class TaskNodeHandler implements NodeHandler {
  constructor(
    public readonly type: NodeType,
    private readonly taskType: TaskTypeType
  ) {}

  async execute(context: ExecutionContext): Promise<NodeExecutionResult> {
    const nodeState = context.getNodeState()
    const hasTaskId = !!nodeState?.taskId

    logger.info({
      workflowTaskId: context.workflowTask.id,
      nodeId: context.node.id,
      nodeType: this.type,
      hasTaskId,
    }, '执行任务节点')

    if (!hasTaskId) {
      // 首次执行：创建任务
      return this.createAndSubmitTask(context)
    } else {
      // 后续执行：检查任务状态
      return this.checkTaskStatus(context, nodeState!.taskId!)
    }
  }

  private async createAndSubmitTask(context: ExecutionContext) {
    // 1. 解析输入（从前驱节点或变量获取）
    const inputs = this.resolveInputs(context)

    // 2. 创建任务（会自动扣费）
    const task = await context.createTask({
      type: this.taskType,
      inputs,
      // ... 其他参数
    })

    // 3. 保存 taskId
    await context.updateNodeState({ taskId: task.id })

    // 4. 返回 SUSPEND 等待任务完成
    return { signal: Signal.SUSPEND }
  }

  private async checkTaskStatus(context: ExecutionContext, taskId: number) {
    const task = await context.getTask(taskId)

    switch (task.status) {
      case 'completed':
        // 获取任务输出资源
        const outputs = await this.getTaskOutputs(taskId)
        return {
          signal: Signal.CONTINUE,
          output: { type: this.taskType, urls: outputs },
        }

      case 'failed':
        return {
          signal: Signal.FAIL,
          error: task.errorMessage || '任务执行失败',
        }

      default:
        // pending / processing
        return { signal: Signal.SUSPEND }
    }
  }
}
```

---

## 6. 并发控制与竞态处理

### 6.1 问题分析

当 DAG 中多个节点可以并行执行时（如 `video_motion` 和 `audio_tts`），会产生并发问题：

```
        ┌─────────┐
        │  start  │
        └────┬────┘
             │
    ┌────────┴────────┐
    │                 │
    ▼                 ▼
┌─────────┐     ┌─────────┐
│ Node A  │     │ Node B  │    ← 并行执行
└────┬────┘     └────┬────┘
     │               │
     └───────┬───────┘
             ▼
```

**问题 1：nodeStates 竞态覆盖**

```
时间线：
T1: Node A 读取 nodeStates = {}
T2: Node B 读取 nodeStates = {}
T3: Node A 写入 nodeStates = { nodeA: { status: 'running' } }
T4: Node B 写入 nodeStates = { nodeB: { status: 'running' } }  ← 覆盖了 Node A 的状态！
```

**问题 2：计费锁冲突**

```
时间线：
T1: Node A 开始 createTask，执行 SELECT ... FOR UPDATE 锁定账户
T2: Node B 开始 createTask，执行 SELECT ... FOR UPDATE
T3: Node B 被阻塞，等待 Node A 释放锁
T4: 如果等待超时，Node B 的事务失败
```

### 6.2 解决方案

#### 6.2.1 原子更新 nodeStates

使用 PostgreSQL 的 `jsonb_set` 函数进行原子更新：

```typescript
// context.ts - updateNodeState()
async updateNodeState(state: Partial<NodeState>): Promise<void> {
  const nodeId = this.node.id
  const stateJson = JSON.stringify(state)

  // 使用 jsonb_set + COALESCE 进行原子更新
  // 每个节点只更新自己的状态，不影响其他节点
  await db
    .update(workflowTasks)
    .set({
      nodeStates: sql`jsonb_set(
        ${workflowTasks.nodeStates},
        ARRAY[${nodeId}]::text[],
        COALESCE(${workflowTasks.nodeStates} -> ${nodeId}, '{}'::jsonb) || ${stateJson}::jsonb
      )`,
    })
    .where(eq(workflowTasks.id, this.workflowTask.id))
}
```

**原理图解**：

```
原子更新前（有竞态）：
┌─────────────────────────────────────────────────────────────┐
│  Node A                      │  Node B                      │
├─────────────────────────────────────────────────────────────┤
│  1. READ nodeStates = {}     │                              │
│                              │  2. READ nodeStates = {}     │
│  3. WRITE { A: {...} }       │                              │
│                              │  4. WRITE { B: {...} }       │
│                              │     ↑ 覆盖了 A 的状态！       │
└─────────────────────────────────────────────────────────────┘

原子更新后（无竞态）：
┌─────────────────────────────────────────────────────────────┐
│  Node A                      │  Node B                      │
├─────────────────────────────────────────────────────────────┤
│  1. jsonb_set(..., 'A', ...) │                              │
│     数据库原子执行            │  2. jsonb_set(..., 'B', ...) │
│     nodeStates = { A: {...} }│     数据库原子执行            │
│                              │     nodeStates = { A, B }    │
└─────────────────────────────────────────────────────────────┘
```

#### 6.2.2 计费队列串行化

使用 `p-limit` 为每个账户创建串行队列：

```typescript
// billing.ts
import pLimit from 'p-limit'

// 每个账户一个队列，并发限制为 1
const accountBillingQueues = new Map<number, ReturnType<typeof pLimit>>()

function getAccountBillingQueue(accountId: number) {
  let queue = accountBillingQueues.get(accountId)
  if (!queue) {
    queue = pLimit(1)
    accountBillingQueues.set(accountId, queue)
  }
  return queue
}

export async function withBillingQueue<T>(
  accountId: number,
  operation: () => Promise<T>
): Promise<T> {
  const queue = getAccountBillingQueue(accountId)
  return queue(operation)  // 同一账户的操作串行执行
}

// service.ts - create()
async function create(params: CreateTaskParams) {
  // 使用计费队列确保同一账户的扣费操作串行执行
  return withBillingQueue(params.accountId, () =>
    db.transaction(async (tx) => {
      // ... 创建任务和扣费逻辑
    })
  )
}
```

**原理图解**：

```
计费队列串行化：
┌─────────────────────────────────────────────────────────────┐
│                    Account #1 Queue                         │
│                    (p-limit concurrency = 1)                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   Task A ──────────────────►  Task B ──────────────────►    │
│   [创建任务+扣费]              [创建任务+扣费]                │
│   时间: T1-T2                  时间: T2-T3                   │
│                                                             │
│   串行执行，无锁冲突                                          │
└─────────────────────────────────────────────────────────────┘

不同账户可并行：
┌─────────────────────────────────────────────────────────────┐
│  Account #1 Queue            │  Account #2 Queue            │
├─────────────────────────────────────────────────────────────┤
│  Task A ───────────►         │  Task C ───────────►         │
│  [创建任务+扣费]              │  [创建任务+扣费]              │
│                              │                              │
│  并行执行，不同账户不冲突                                     │
└─────────────────────────────────────────────────────────────┘
```

#### 6.2.3 查询重试机制

为应对偶发的数据库查询失败，添加重试逻辑：

```typescript
// executor.ts - executeNode()
private async executeNode(workflowTask, workflow, node) {
  // 刷新工作流任务数据，带重试机制
  let freshWorkflowTask: WorkflowTaskRecord | undefined

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      freshWorkflowTask = await db.query.workflowTasks.findFirst({
        where: eq(workflowTasks.id, workflowTask.id),
      })
      break
    } catch (error) {
      if (attempt === 2) {
        // 重试 3 次仍失败，返回 SUSPEND 等待下次 reconcile
        return {
          nodeId: node.id,
          signal: Signal.SUSPEND,
          error: '获取工作流任务失败，等待重试',
        }
      }
      // 短暂等待后重试
      await new Promise(resolve => setTimeout(resolve, 100 * (attempt + 1)))
    }
  }

  // ... 继续执行
}
```

### 6.3 并发安全总结

| 问题 | 解决方案 | 实现位置 |
|------|----------|----------|
| nodeStates 覆盖 | PostgreSQL `jsonb_set` 原子更新 | `context.ts` |
| runtimeVariables 覆盖 | PostgreSQL JSONB `\|\|` 原子合并 | `context.ts` |
| totalEstimatedCost 计算错误 | SQL 原子加法 `+ N` | `context.ts` |
| 计费锁冲突 | p-limit 账户级队列 | `billing.ts` |
| 查询偶发失败 | 重试 + SUSPEND 容错 | `executor.ts` |

---

## 7. 计费系统集成

### 7.1 计费流程

```
┌─────────────────────────────────────────────────────────────────────┐
│                          计费流程                                    │
└─────────────────────────────────────────────────────────────────────┘

    创建任务时                     任务完成时                  任务失败时
        │                            │                          │
        ▼                            ▼                          ▼
┌───────────────┐           ┌───────────────┐          ┌───────────────┐
│  预估费用      │           │  结算费用      │          │  全额退款      │
│  chargeForTask│           │  settleTask   │          │  refundTask   │
└───────┬───────┘           └───────┬───────┘          └───────┬───────┘
        │                            │                          │
        ▼                            ▼                          ▼
┌───────────────┐           ┌───────────────┐          ┌───────────────┐
│ 计算预估用量   │           │ 比较实际用量   │          │ 退还预扣金额   │
│ 检查余额      │           │               │          │               │
│ 扣除预估费用   │           │ 实际 < 预估:  │          │               │
│ 创建交易记录   │           │   退还差额    │          │               │
└───────────────┘           │               │          └───────────────┘
                            │ 实际 > 预估:  │
                            │   平台承担    │
                            └───────────────┘
```

### 7.2 工作流任务费用汇总

```typescript
// context.ts - createTask()
async createTask(params) {
  const task = await taskService.create({
    ...params,
    accountId: this.workflowTask.accountId,
  })

  // 原子更新工作流任务的总预估费用
  await db
    .update(workflowTasks)
    .set({
      totalEstimatedCost: sql`${workflowTasks.totalEstimatedCost} + ${task.estimatedCost}`,
    })
    .where(eq(workflowTasks.id, this.workflowTask.id))

  return task
}
```

---

## 8. 数据模型

### 8.1 核心表结构

```sql
-- 工作流定义
CREATE TABLE workflows (
  id SERIAL PRIMARY KEY,
  account_id INTEGER NOT NULL REFERENCES accounts(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  nodes JSONB NOT NULL DEFAULT '[]',      -- GraphNode[]
  edges JSONB NOT NULL DEFAULT '[]',      -- GraphEdge[]
  variables JSONB DEFAULT '{}',           -- 变量定义
  is_template BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 工作流任务（执行实例）
CREATE TABLE workflow_tasks (
  id SERIAL PRIMARY KEY,
  account_id INTEGER NOT NULL REFERENCES accounts(id),
  workflow_id INTEGER NOT NULL REFERENCES workflows(id),

  -- 执行配置
  exec_mode VARCHAR(50) DEFAULT 'all',    -- all | specified_starts | isolated_nodes
  start_node_ids TEXT[],                  -- 指定起始节点

  -- 执行状态
  status VARCHAR(50) DEFAULT 'pending',   -- pending | running | completed | failed
  node_states JSONB NOT NULL DEFAULT '{}', -- { [nodeId]: NodeState }
  runtime_variables JSONB DEFAULT '{}',   -- 运行时变量

  -- 费用统计
  total_estimated_cost INTEGER DEFAULT 0,
  total_actual_cost INTEGER DEFAULT 0,

  -- 错误信息
  error_node_id VARCHAR(255),
  error_message TEXT,

  -- 时间戳
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 工作流日志
CREATE TABLE workflow_logs (
  id SERIAL PRIMARY KEY,
  workflow_task_id INTEGER NOT NULL REFERENCES workflow_tasks(id),
  level VARCHAR(20) NOT NULL,             -- info | warn | error
  node_id VARCHAR(255),
  message TEXT NOT NULL,
  data JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 8.2 NodeState 结构

```typescript
interface NodeState {
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped'
  taskId?: number           // 关联的任务 ID（任务节点）
  output?: NodeStateOutput  // 节点输出
  error?: string            // 错误信息
  startedAt?: string        // 开始时间
  completedAt?: string      // 完成时间
}

interface NodeStateOutput {
  type: string              // 输出类型
  urls?: string[]           // 输出资源 URL
  data?: unknown            // 其他数据
}
```

---

## 9. 扩展指南

### 9.1 添加新节点类型

**步骤 1：定义节点类型**

```typescript
// types.ts
export enum NodeType {
  // ... 现有类型
  IMAGE_GENERATION = 'image_generation',  // 新增
}
```

**步骤 2：实现 Handler**

```typescript
// handlers/impl/image-generation.ts
import { NodeHandler, NodeExecutionResult, Signal } from '../../types'
import { ExecutionContext } from '../../engine/context'

export class ImageGenerationHandler implements NodeHandler {
  type = NodeType.IMAGE_GENERATION

  async execute(context: ExecutionContext): Promise<NodeExecutionResult> {
    const nodeState = context.getNodeState()

    if (!nodeState?.taskId) {
      // 创建图片生成任务
      const task = await context.createTask({
        type: 'image_txt2img',
        inputs: [/* ... */],
      })

      await context.updateNodeState({ taskId: task.id })
      return { signal: Signal.SUSPEND }
    }

    // 检查任务状态
    const task = await context.getTask(nodeState.taskId)

    if (task.status === 'completed') {
      return {
        signal: Signal.CONTINUE,
        output: { type: 'image', urls: [/* 输出 URL */] },
      }
    }

    if (task.status === 'failed') {
      return { signal: Signal.FAIL, error: task.errorMessage }
    }

    return { signal: Signal.SUSPEND }
  }
}
```

**步骤 3：注册 Handler**

```typescript
// handlers/impl/index.ts
import { ImageGenerationHandler } from './image-generation'

export function registerAllHandlers() {
  // ... 现有注册
  nodeHandlerRegistry.register(new ImageGenerationHandler())
}
```

### 9.2 添加新工作流模板

```typescript
// 在 API 或管理后台创建
const imageVideoWorkflow = {
  name: '图片转视频',
  nodes: [
    { id: 'start', type: 'start', name: '开始', config: {} },
    { id: 'img_gen', type: 'image_generation', name: '生成图片', config: { prompt: '$var.prompt' } },
    { id: 'vid_motion', type: 'video_motion', name: '添加动作', config: {} },
    { id: 'end', type: 'end', name: '结束', config: {} },
  ],
  edges: [
    { source: 'start', target: 'img_gen' },
    { source: 'img_gen', target: 'vid_motion' },
    { source: 'vid_motion', target: 'end' },
  ],
  variables: {
    prompt: { type: 'string', defaultValue: '' },
  },
}
```

### 9.3 变量引用语法

```typescript
// 引用运行时变量
'$var.inputImage'           // → runtimeVariables.inputImage

// 引用节点输出
'$node.video_motion.output' // → nodeStates.video_motion.output
'$node.audio_tts.output.urls[0]' // → nodeStates.audio_tts.output.urls[0]
```

---

## 附录

### A. 完整执行时序图

```
┌────────┐     ┌───────────┐     ┌──────────┐     ┌─────────┐     ┌────────────┐
│  API   │     │ Scheduler │     │ Executor │     │ Handler │     │ TaskSystem │
└───┬────┘     └─────┬─────┘     └────┬─────┘     └────┬────┘     └──────┬─────┘
    │                │                │                │                 │
    │ POST /workflow │                │                │                 │
    │───────────────►│                │                │                 │
    │                │                │                │                 │
    │  创建 workflow_task             │                │                 │
    │  status=running                 │                │                 │
    │◄───────────────│                │                │                 │
    │                │                │                │                 │
    │                │  [10秒后]       │                │                 │
    │                │  查询 running   │                │                 │
    │                │  工作流任务      │                │                 │
    │                │───────────────►│                │                 │
    │                │                │                │                 │
    │                │                │ reconcile()    │                 │
    │                │                │───────────────►│                 │
    │                │                │                │                 │
    │                │                │ getExecutable  │                 │
    │                │                │ Nodes()        │                 │
    │                │                │◄───────────────│                 │
    │                │                │                │                 │
    │                │                │ [start]        │                 │
    │                │                │───────────────►│ execute()       │
    │                │                │                │                 │
    │                │                │◄───────────────│ CONTINUE        │
    │                │                │                │                 │
    │                │                │ [video_motion, │                 │
    │                │                │  audio_tts]    │                 │
    │                │                │═══════════════►│ execute()       │
    │                │                │  (并行)        │                 │
    │                │                │                │ createTask()    │
    │                │                │                │────────────────►│
    │                │                │                │                 │
    │                │                │                │◄────────────────│
    │                │                │                │ task created    │
    │                │                │◄═══════════════│                 │
    │                │                │ SUSPEND        │                 │
    │                │                │                │                 │
    │                │◄───────────────│ return true    │                 │
    │                │                │ (继续 reconcile)                 │
    │                │                │                │                 │
    │                │  [10秒后]       │                │                 │
    │                │───────────────►│                │                 │
    │                │                │                │                 │
    │                │                │ [video_motion] │                 │
    │                │                │───────────────►│ execute()       │
    │                │                │                │                 │
    │                │                │                │ getTask()       │
    │                │                │                │────────────────►│
    │                │                │                │◄────────────────│
    │                │                │                │ completed       │
    │                │                │◄───────────────│ CONTINUE        │
    │                │                │                │                 │
    │                │                │ [video_lipsync]│                 │
    │                │                │───────────────►│ execute()       │
    │                │                │                │                 │
    │                │                │                │ createTask()    │
    │                │                │                │────────────────►│
    │                │                │                │◄────────────────│
    │                │                │◄───────────────│ SUSPEND         │
    │                │                │                │                 │
    │                │  ...           │                │                 │
    │                │                │                │                 │
    │                │  [最终]         │                │                 │
    │                │───────────────►│                │                 │
    │                │                │                │                 │
    │                │                │ isAllCompleted │                 │
    │                │                │ = true         │                 │
    │                │                │                │                 │
    │                │                │ markWorkflow   │                 │
    │                │                │ Completed()    │                 │
    │                │◄───────────────│ return false   │                 │
    │                │                │                │                 │
└────────────────────┴────────────────┴────────────────┴─────────────────┘
```

### B. 错误处理流程

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           错误处理策略                                   │
└─────────────────────────────────────────────────────────────────────────┘

┌────────────────────┐
│   节点执行出错      │
└─────────┬──────────┘
          │
          ▼
┌────────────────────┐     ┌────────────────────┐
│  可重试错误？       │──否─►│  返回 FAIL         │
│  (网络超时、        │      │  标记节点失败       │
│   临时故障)         │      │  标记工作流失败     │
└─────────┬──────────┘      └────────────────────┘
          │是
          ▼
┌────────────────────┐     ┌────────────────────┐
│  重试次数 < 3?     │──否─►│  返回 SUSPEND      │
└─────────┬──────────┘      │  等待下次 reconcile│
          │是               └────────────────────┘
          ▼
┌────────────────────┐
│  等待 100-300ms    │
│  重新尝试          │
└────────────────────┘
```

---

**文档版本**: 1.0
**最后更新**: 2025-12-11
**作者**: Claude Code