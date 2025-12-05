/**
 * 火山引擎视频改口型 API
 */

import { request } from './client'

const REQ_KEY_LITE = 'realman_change_lips'
const REQ_KEY_BASIC = 'realman_change_lips_basic_chimera'

export type LipsyncTaskStatus = 'in_queue' | 'generating' | 'done' | 'not_found' | 'expired'

export interface SubmitTaskData {
  task_id: string
}

export interface SubmitTaskResult {
  taskId: string
  requestId?: string
}

export interface GetResultData {
  status: LipsyncTaskStatus
  resp_data?: string
  aigc_meta_tagged?: boolean
  binary_data_base64?: unknown[]
  image_urls?: unknown
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

export interface LipsyncOptions {
  /** 是否使用 Basic 模式，默认 false (Lite) */
  useBasicMode?: boolean
  /** 是否启用人声分离，开启后会抑制音频背景杂音 */
  separateVocal?: boolean
  /** 是否开启场景切分与说话人识别（仅 Basic 模式） */
  openScenedet?: boolean
  /** 是否开启视频循环（仅 Lite 模式） */
  alignAudio?: boolean
  /** 是否开启倒放循环（仅 Lite 模式） */
  alignAudioReverse?: boolean
  /** 模板视频开始时间（仅 Lite 模式） */
  templStartSeconds?: number
}

/**
 * 提交视频改口型任务
 * @param videoUrl 视频素材 URL
 * @param audioUrl 纯人声音频 URL
 * @param options 可选配置
 * @returns 任务 ID 和 requestId
 */
export async function submitLipsyncTask(
  videoUrl: string,
  audioUrl: string,
  options: LipsyncOptions = {}
): Promise<SubmitTaskResult> {
  const {
    useBasicMode = false,
    separateVocal = false,
    openScenedet = false,
    alignAudio = true,
    alignAudioReverse = false,
    templStartSeconds = 0,
  } = options

  const reqKey = useBasicMode ? REQ_KEY_BASIC : REQ_KEY_LITE

  const body: Record<string, unknown> = {
    req_key: reqKey,
    url: videoUrl,
    pure_audio_url: audioUrl,
  }

  if (separateVocal) {
    body.separate_vocal = true
  }

  if (useBasicMode && openScenedet) {
    body.open_scenedet = true
  }

  if (!useBasicMode) {
    if (typeof alignAudio === 'boolean') {
      body.align_audio = alignAudio
    }
    if (alignAudioReverse) {
      body.align_audio_reverse = true
    }
    if (templStartSeconds > 0) {
      body.templ_start_seconds = templStartSeconds
    }
  }

  const response = await request<SubmitTaskData>('CVSubmitTask', body)

  if (!response.data?.task_id) {
    const error = new Error(
      `提交任务成功但未返回 task_id${response.request_id ? `，requestId: ${response.request_id}` : ''}`
    )
    // 将 requestId 附加到错误对象
    ;(error as Error & { requestId?: string }).requestId = response.request_id
    throw error
  }

  return {
    taskId: response.data.task_id,
    requestId: response.request_id,
  }
}

/**
 * 查询视频改口型任务结果
 * @param taskId 任务 ID
 * @param useBasicMode 是否使用 Basic 模式
 * @param aigcMeta AIGC 隐式标识元数据（可选）
 * @returns 查询结果
 */
export async function getLipsyncResult(
  taskId: string,
  useBasicMode = false,
  aigcMeta?: AigcMeta
): Promise<GetResultData> {
  const reqKey = useBasicMode ? REQ_KEY_BASIC : REQ_KEY_LITE

  const params: Record<string, unknown> = {
    req_key: reqKey,
    task_id: taskId,
  }

  // 如果提供了 AIGC 元数据，添加 req_json 参数
  if (aigcMeta && Object.keys(aigcMeta).length > 0) {
    params.req_json = JSON.stringify({ aigc_meta: aigcMeta })
  }

  const response = await request<GetResultData>('CVGetResult', params)

  if (!response.data) {
    throw new Error('查询结果成功但未返回数据')
  }

  return response.data
}

/**
 * 从 resp_data 中提取视频 URL
 * @param respData resp_data 字符串
 * @returns 视频 URL，如果未找到返回 undefined
 */
export function extractVideoUrl(respData?: string): string | undefined {
  if (!respData) return undefined

  try {
    const data = JSON.parse(respData)
    return data.url || undefined
  } catch {
    return undefined
  }
}

export function isTaskPending(status: LipsyncTaskStatus): boolean {
  return status === 'in_queue' || status === 'generating'
}

export function isTaskFailed(status: LipsyncTaskStatus): boolean {
  return status === 'not_found' || status === 'expired'
}
