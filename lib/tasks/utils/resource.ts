/**
 * 资源处理工具
 */

import { getOutputPath, uploadFromUrl } from '@/lib/tos'

import type { TaskOutputResource } from '../types'

import { generateOutputFilename } from './filename'

/**
 * 上传输出资源到 TOS
 */
export async function uploadOutputResource(params: {
  taskId: number
  accountId: number
  taskType: string
  output: TaskOutputResource
  index: number
}): Promise<TaskOutputResource> {
  const { taskId, accountId, taskType, output, index } = params

  // 1. 获取 Content-Type（用于推断扩展名）
  let contentType: string | null = null
  try {
    const response = await fetch(output.url, { method: 'HEAD' })
    contentType = response.headers.get('content-type')
  } catch {
    // 忽略错误，使用默认扩展名
  }

  // 2. 生成文件名
  const filename = generateOutputFilename({
    taskId,
    taskType,
    resourceType: output.type,
    index,
    originalUrl: output.url,
    mimeType: contentType || undefined,
  })

  // 3. 生成 TOS 路径
  const tosKey = getOutputPath(accountId.toString(), taskType, taskId.toString(), filename)

  // 4. 上传到 TOS
  const tosUrl = await uploadFromUrl(tosKey, output.url)

  // 5. 返回结果
  return {
    type: output.type,
    url: tosUrl,
    metadata: {
      ...output.metadata,
      originalUrl: output.url,
      filename,
      contentType: contentType || undefined,
    },
  }
}