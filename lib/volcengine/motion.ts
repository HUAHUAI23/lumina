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

export async function getMotionResult(taskId: string): Promise<GetResultData> {
  const response = await request<GetResultData>('CVSync2AsyncGetResult', {
    req_key: REQ_KEY,
    task_id: taskId,
  })

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