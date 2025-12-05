/**
 * 火山引擎动作模仿 API
 */

import { request } from './client'

const REQ_KEY = 'jimeng_dream_actor_m1_gen_video_cv'

export type MotionTaskStatus = 'in_queue' | 'generating' | 'done' | 'not_found' | 'expired'

export interface SubmitTaskData {
  task_id: string
}

export interface GetResultData {
  status: MotionTaskStatus
  video_url?: string
}

/**
 * AIGC 隐式标识元数据
 * 依据《人工智能生成合成内容标识办法》&《网络安全技术人工智能生成合成内容标识方法》
 */
export interface AigcMeta {
  /** 内容生成服务ID（长度 <= 256字符，可选） */
  content_producer?: string
  /** 内容生成服务商给此视频数据的唯一ID（长度 <= 256字符，必选） */
  producer_id: string
  /** 内容传播服务商ID（长度 <= 256字符，必选） */
  content_propagator: string
  /** 传播服务商给此视频数据的唯一ID（长度 <= 256字符，可选） */
  propagate_id?: string
}

export async function submitMotionTask(imageUrl: string, videoUrl: string): Promise<string> {
  const response = await request<SubmitTaskData>('CVSync2AsyncSubmitTask', {
    req_key: REQ_KEY,
    image_url: imageUrl,
    video_url: videoUrl,
  })

  if (!response.data?.task_id) {
    throw new Error('提交任务成功但未返回 task_id')
  }

  return response.data.task_id
}

export async function getMotionResult(
  taskId: string,
  aigcMeta?: AigcMeta
): Promise<GetResultData> {
  const params: Record<string, unknown> = {
    req_key: REQ_KEY,
    task_id: taskId,
  }

  // 如果提供了 AIGC 元数据，添加 req_json 参数
  if (aigcMeta && Object.keys(aigcMeta).length > 0) {
    params.req_json = JSON.stringify({ aigc_meta: aigcMeta })
  }

  const response = await request<GetResultData>('CVSync2AsyncGetResult', params)

  if (!response.data) {
    throw new Error('查询结果成功但未返回数据')
  }

  return response.data
}

export function isTaskPending(status: MotionTaskStatus): boolean {
  return status === 'in_queue' || status === 'generating'
}

export function isTaskFailed(status: MotionTaskStatus): boolean {
  return status === 'not_found' || status === 'expired'
}
