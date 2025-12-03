/**
 * 火山引擎 CV API 客户端
 */

import { createHash, createHmac } from 'crypto'

import { env } from '../env'

const CV_ENDPOINT = 'https://visual.volcengineapi.com'
const CV_SERVICE = 'cv'
const CV_VERSION = '2022-08-31'

export interface VolcengineResponse<T = unknown> {
  code: number
  message: string
  request_id?: string
  data?: T
}

export interface VolcengineError extends Error {
  code?: number
  statusCode?: number
  requestId?: string
}

export function isVolcengineConfigured(): boolean {
  return !!(env.VOLCENGINE_ACCESS_KEY && env.VOLCENGINE_SECRET_KEY)
}

export function getMissingEnvVars(): string[] {
  const missing: string[] = []
  if (!env.VOLCENGINE_ACCESS_KEY) missing.push('VOLCENGINE_ACCESS_KEY')
  if (!env.VOLCENGINE_SECRET_KEY) missing.push('VOLCENGINE_SECRET_KEY')
  return missing
}

function sha256Hash(data: string | Buffer): string {
  return createHash('sha256').update(data).digest('hex')
}

function hmacSha256(key: Buffer | string, message: string): Buffer {
  return createHmac('sha256', key).update(message, 'utf8').digest()
}

function urlEncode(str: string): string {
  return encodeURIComponent(str).replace(
    /[!'()*]/g,
    (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase()
  )
}

function getCurrentTime(): { xDate: string; shortDate: string } {
  const now = new Date()
  const xDate = now
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '')
  const shortDate = xDate.slice(0, 8)
  return { xDate, shortDate }
}

function createSignature(
  method: string,
  path: string,
  queryParams: Record<string, string>,
  headers: Record<string, string>,
  body: Buffer,
  xDate: string,
  shortDate: string,
  region: string,
  service: string,
  secretKey: string
): string {
  const sortedParams = Object.entries(queryParams).sort(([a], [b]) => a.localeCompare(b))
  const canonicalQuery = sortedParams.map(([k, v]) => `${urlEncode(k)}=${urlEncode(v)}`).join('&')

  const headersLower: Record<string, string> = {}
  for (const [k, v] of Object.entries(headers)) {
    headersLower[k.toLowerCase()] = String(v).trim()
  }

  const signedHeadersList: string[] = []
  const canonicalHeadersList: string[] = []
  for (const key of Object.keys(headersLower).sort()) {
    if (key === 'host' || key.startsWith('x-') || key === 'content-type') {
      signedHeadersList.push(key)
      canonicalHeadersList.push(`${key}:${headersLower[key]}`)
    }
  }
  const signedHeaders = signedHeadersList.join(';')
  const canonicalHeaders = canonicalHeadersList.join('\n') + '\n'

  const canonicalRequest = [
    method,
    path,
    canonicalQuery,
    canonicalHeaders,
    signedHeaders,
    sha256Hash(body),
  ].join('\n')

  const credentialScope = `${shortDate}/${region}/${service}/request`
  const stringToSign = ['HMAC-SHA256', xDate, credentialScope, sha256Hash(canonicalRequest)].join(
    '\n'
  )

  const kDate = hmacSha256(secretKey, shortDate)
  const kRegion = hmacSha256(kDate, region)
  const kService = hmacSha256(kRegion, service)
  const kSigning = hmacSha256(kService, 'request')

  return createHmac('sha256', kSigning).update(stringToSign, 'utf8').digest('hex')
}

export async function request<T = unknown>(
  action: string,
  body: Record<string, unknown>,
  options?: { region?: string }
): Promise<VolcengineResponse<T>> {
  if (!isVolcengineConfigured()) {
    const missing = getMissingEnvVars()
    throw Object.assign(new Error(`环境变量未配置: ${missing.join(', ')}`), {
      code: -1,
      statusCode: 0,
    } as VolcengineError)
  }

  const accessKey = env.VOLCENGINE_ACCESS_KEY!
  const secretKey = env.VOLCENGINE_SECRET_KEY!
  const region = options?.region ?? env.VOLCENGINE_REGION

  const method = 'POST'
  const path = '/'
  const bodyBuffer = Buffer.from(JSON.stringify(body), 'utf8')
  const { xDate, shortDate } = getCurrentTime()

  const queryParams = { Action: action, Version: CV_VERSION }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Host: 'visual.volcengineapi.com',
    'X-Content-Sha256': sha256Hash(bodyBuffer),
    'X-Date': xDate,
  }

  const signature = createSignature(
    method,
    path,
    queryParams,
    headers,
    bodyBuffer,
    xDate,
    shortDate,
    region,
    CV_SERVICE,
    secretKey
  )

  const signedHeadersList: string[] = []
  for (const key of Object.keys(headers).sort((a, b) =>
    a.toLowerCase().localeCompare(b.toLowerCase())
  )) {
    const keyLower = key.toLowerCase()
    if (keyLower === 'host' || keyLower.startsWith('x-') || keyLower === 'content-type') {
      signedHeadersList.push(keyLower)
    }
  }
  const signedHeaders = signedHeadersList.join(';')

  const credential = `${accessKey}/${shortDate}/${region}/${CV_SERVICE}/request`
  headers[
    'Authorization'
  ] = `HMAC-SHA256 Credential=${credential}, SignedHeaders=${signedHeaders}, Signature=${signature}`

  const queryString = Object.entries(queryParams)
    .map(([k, v]) => `${k}=${v}`)
    .join('&')
  const url = `${CV_ENDPOINT}${path}?${queryString}`

  const response = await fetch(url, {
    method,
    headers,
    body: bodyBuffer,
  })

  const result = (await response.json()) as VolcengineResponse<T>

  if (result.code !== 10000) {
    throw Object.assign(new Error(result.message || `API 错误: ${result.code}`), {
      code: result.code,
      statusCode: response.status,
      requestId: result.request_id,
    } as VolcengineError)
  }

  return result
}