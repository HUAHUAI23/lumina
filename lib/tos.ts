/**
 * TOS 对象存储服务
 * 路径规范见 docs/task-system-design.md 第三节
 */

import { TosClient, TosClientError, TosServerError } from '@volcengine/tos-sdk'

import { env } from './env'

let tosClient: TosClient | null = null

/** 获取 TOS 客户端实例 */
export function getTosClient(): TosClient {
  if (tosClient) return tosClient

  if (!env.VOLCENGINE_ACCESS_KEY || !env.VOLCENGINE_SECRET_KEY || !env.VOLCENGINE_BUCKET_NAME) {
    throw new Error('环境变量未配置: VOLCENGINE_ACCESS_KEY, VOLCENGINE_SECRET_KEY, VOLCENGINE_BUCKET_NAME')
  }

  tosClient = new TosClient({
    accessKeyId: env.VOLCENGINE_ACCESS_KEY,
    accessKeySecret: env.VOLCENGINE_SECRET_KEY,
    region: env.VOLCENGINE_REGION,
    endpoint: env.VOLCENGINE_ENDPOINT,
  })

  return tosClient
}

/** 检查 TOS 是否已配置 */
export function isTosConfigured(): boolean {
  return !!(env.VOLCENGINE_ACCESS_KEY && env.VOLCENGINE_SECRET_KEY && env.VOLCENGINE_BUCKET_NAME)
}

/** 生成完整的 TOS URL */
export function getTosUrl(key: string): string {
  return `https://${env.VOLCENGINE_BUCKET_NAME}.${env.VOLCENGINE_ENDPOINT}/${key}`
}

// ==================== 路径生成 ====================

/** 输入资源路径: input/{userId}/{taskType}/{taskId}/{filename} */
export function getInputPath(userId: string, taskType: string, taskId: string, filename: string): string {
  return `input/${userId}/${taskType}/${taskId}/${filename}`
}

/** 输出资源路径: output/{userId}/{taskType}/{taskId}/{filename} */
export function getOutputPath(userId: string, taskType: string, taskId: string, filename: string): string {
  return `output/${userId}/${taskType}/${taskId}/${filename}`
}

/** 临时上传路径: temp/{userId}/{uploadId}/{filename} */
export function getTempPath(userId: string, uploadId: string, filename: string): string {
  return `temp/${userId}/${uploadId}/${filename}`
}

// ==================== 文件操作 ====================

export interface UploadOptions {
  contentType?: string
  metadata?: Record<string, string>
}

/** TOS 错误处理 */
export function handleTosError(error: unknown): never {
  if (error instanceof TosClientError) {
    throw new Error(`TOS 客户端错误: ${error.message}`)
  } else if (error instanceof TosServerError) {
    throw new Error(`TOS 服务端错误: [${error.code}] ${error.message}`)
  }
  throw error
}

/** 上传文件到 TOS */
export async function uploadFile(
  key: string,
  body: Buffer,
  options?: UploadOptions
): Promise<string> {
  const client = getTosClient()
  const bucket = env.VOLCENGINE_BUCKET_NAME!

  try {
    await client.putObject({
      bucket,
      key,
      body,
      contentType: options?.contentType,
      meta: options?.metadata,
    })

    return getTosUrl(key)
  } catch (error) {
    handleTosError(error)
  }
}

/** 从 URL 下载文件并上传到 TOS */
export async function uploadFromUrl(key: string, sourceUrl: string): Promise<string> {
  const response = await fetch(sourceUrl)
  if (!response.ok) {
    throw new Error(`下载文件失败: ${response.status} ${response.statusText}`)
  }

  const buffer = Buffer.from(await response.arrayBuffer())
  const contentType = response.headers.get('content-type') || undefined

  return uploadFile(key, buffer, { contentType })
}

/** 下载 TOS 文件 */
export async function downloadFile(key: string): Promise<Buffer> {
  const client = getTosClient()
  const bucket = env.VOLCENGINE_BUCKET_NAME!

  try {
    const { data } = await client.getObjectV2({ bucket, key })

    // 获取返回的 stream 中的所有内容
    const chunks: Buffer[] = []
    for await (const chunk of data.content) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
    }

    return Buffer.concat(chunks)
  } catch (error) {
    handleTosError(error)
  }
}

/** 复制文件（用于将临时文件移动到正式目录） */
export async function copyFile(sourceKey: string, destKey: string): Promise<string> {
  const client = getTosClient()
  const bucket = env.VOLCENGINE_BUCKET_NAME!

  try {
    await client.copyObject({
      bucket,
      key: destKey,
      srcBucket: bucket,
      srcKey: sourceKey,
    })

    return getTosUrl(destKey)
  } catch (error) {
    handleTosError(error)
  }
}

/** 删除文件 */
export async function deleteFile(key: string): Promise<void> {
  const client = getTosClient()
  const bucket = env.VOLCENGINE_BUCKET_NAME!

  try {
    await client.deleteObject({ bucket, key })
  } catch (error) {
    handleTosError(error)
  }
}

/** 批量删除文件 */
export async function deleteFiles(keys: string[]): Promise<void> {
  if (keys.length === 0) return

  const client = getTosClient()
  const bucket = env.VOLCENGINE_BUCKET_NAME!

  try {
    await client.deleteMultiObjects({
      bucket,
      objects: keys.map((key) => ({ key })),
    })
  } catch (error) {
    handleTosError(error)
  }
}

/** 检查文件是否存在 */
export async function fileExists(key: string): Promise<boolean> {
  const client = getTosClient()
  const bucket = env.VOLCENGINE_BUCKET_NAME!

  try {
    await client.headObject({ bucket, key })
    return true
  } catch {
    return false
  }
}

/** 生成预签名上传 URL（用于前端直传） */
export async function getPresignedUploadUrl(key: string, expiresIn = 3600): Promise<string> {
  const client = getTosClient()
  const bucket = env.VOLCENGINE_BUCKET_NAME!

  const result = client.getPreSignedUrl({
    bucket,
    key,
    method: 'PUT',
    expires: expiresIn,
  })

  return result
}

/** 生成预签名下载 URL */
export async function getPresignedDownloadUrl(key: string, expiresIn = 3600): Promise<string> {
  const client = getTosClient()
  const bucket = env.VOLCENGINE_BUCKET_NAME!

  const result = client.getPreSignedUrl({
    bucket,
    key,
    method: 'GET',
    expires: expiresIn,
  })

  return result
}