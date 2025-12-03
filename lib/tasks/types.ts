/**
 * 任务系统类型定义
 */

import type {
  billingTypeEnum,
  ImageMetadata,
  ResourceMetadata,
  resourceTypeEnum,
  taskCategoryEnum,
  TaskConfig,
  taskModeEnum,
  taskResources,
  TaskResult,
  tasks,
  taskStatusEnum,
  taskTypeEnum,
  VideoMetadata,
} from '@/db/schema'

// ==================== 从 schema 提取的枚举类型 ====================

export type TaskTypeType = (typeof taskTypeEnum.enumValues)[number]
export type TaskCategoryType = (typeof taskCategoryEnum.enumValues)[number]
export type TaskModeType = (typeof taskModeEnum.enumValues)[number]
export type TaskStatusType = (typeof taskStatusEnum.enumValues)[number]
export type ResourceTypeType = (typeof resourceTypeEnum.enumValues)[number]
export type BillingTypeType = (typeof billingTypeEnum.enumValues)[number]

// ==================== 枚举值常量 ====================

export const TaskType = {
  VIDEO_LIPSYNC: 'video_lipsync',
  VIDEO_MOTION: 'video_motion',
  VIDEO_GENERATION: 'video_generation',
  IMAGE_3D_MODEL: 'image_3d_model',
  IMAGE_IMG2IMG: 'image_img2img',
  IMAGE_TXT2IMG: 'image_txt2img',
} as const satisfies Record<string, TaskTypeType>

export const TaskCategory = {
  VIDEO: 'video',
  IMAGE: 'image',
} as const satisfies Record<string, TaskCategoryType>

export const TaskMode = {
  SYNC: 'sync',
  ASYNC: 'async',
} as const satisfies Record<string, TaskModeType>

export const TaskStatus = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  PARTIAL: 'partial',
  CANCELLED: 'cancelled',
} as const satisfies Record<string, TaskStatusType>

export const ResourceType = {
  IMAGE: 'image',
  VIDEO: 'video',
  AUDIO: 'audio',
  TEXT: 'text',
  MODEL_3D: 'model_3d',
} as const satisfies Record<string, ResourceTypeType>

export const BillingType = {
  PER_UNIT: 'per_unit',
  PER_TOKEN: 'per_token',
} as const satisfies Record<string, BillingTypeType>

// ==================== 任务配置映射 ====================

export const TASK_TYPE_TO_CATEGORY: Record<TaskTypeType, TaskCategoryType> = {
  video_lipsync: 'video',
  video_motion: 'video',
  video_generation: 'video',
  image_3d_model: 'image',
  image_img2img: 'image',
  image_txt2img: 'image',
}

export const TASK_TYPE_TO_MODE: Record<TaskTypeType, TaskModeType> = {
  video_lipsync: 'async',
  video_motion: 'async',
  video_generation: 'async',
  image_3d_model: 'async',
  image_img2img: 'sync',
  image_txt2img: 'sync',
}

// ==================== 表类型 ====================

export type Task = typeof tasks.$inferSelect
export type TaskResource = typeof taskResources.$inferSelect

// ==================== 重导出 schema 类型 ====================

export type { ImageMetadata, ResourceMetadata, TaskConfig, TaskResult, VideoMetadata }

// ==================== 业务类型 ====================

/** 任务输入资源 */
export interface TaskInputResource {
  type: ResourceTypeType
  url: string
  metadata?: ResourceMetadata
}

/** 任务输出资源 */
export interface TaskOutputResource {
  type: ResourceTypeType
  url: string
  metadata?: ResourceMetadata
}

/** 创建任务参数 */
export interface CreateTaskParams {
  accountId: number
  name?: string
  type: TaskTypeType
  config: TaskConfig
  inputs: TaskInputResource[]
  estimatedDuration?: number
  estimatedCount?: number
}

/** 查询任务列表参数 */
export interface ListTasksParams {
  status?: TaskStatusType
  type?: TaskTypeType
  limit?: number
  offset?: number
}

/** Provider 执行结果 */
export interface ProviderExecuteResult {
  success: boolean
  externalTaskId?: string
  outputs?: TaskOutputResource[]
  actualUsage?: number
  error?: string
  retryable?: boolean
  errorCode?: number
}

/** Provider 查询结果 */
export interface ProviderQueryResult {
  status: 'pending' | 'completed' | 'failed' // 代表第三方平台任务的状态，处理中 完成 失败
  outputs?: TaskOutputResource[]
  actualUsage?: number
  error?: string
  retryable?: boolean
  errorCode?: number
}

/** 任务及其资源 */
export interface TaskWithResources {
  task: Task
  inputs: TaskResource[]
  outputs: TaskResource[]
}

/** 任务更新参数 */
export interface TaskUpdateParams {
  externalTaskId?: string
  startedAt?: Date
  completedAt?: Date
  actualCost?: number
  actualUsage?: string
  result?: TaskResult[]
}
