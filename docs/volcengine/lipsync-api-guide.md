# 火山引擎视频改口型 API 使用指南

## 接口简介

视频改口型（Lip Sync）是指输入一段**单人口播视频 + 音频**，在保留说话人形象特点的前提下，将视频中的人物口型根据指定的音频输入进行修改。

## 接口工作流程

### 1. 提交任务 (CVSubmitTask)

**作用**: 提交视频和音频到火山引擎，生成视频改口型任务

**参数**:
```json
{
  "req_key": "realman_change_lips",  // Lite 模式
  // "req_key": "realman_change_lips_basic_chimera",  // Basic 模式
  "url": "https://your-video-url",
  "pure_audio_url": "https://your-audio-url",

  // 以下为可选参数
  "separate_vocal": false,         // 是否开启人声分离
  "open_scenedet": false,          // 是否开启场景切分（仅 Basic 模式）
  "align_audio": true,             // 是否开启视频循环（仅 Lite 模式）
  "align_audio_reverse": false,    // 是否开启倒放循环（仅 Lite 模式）
  "templ_start_seconds": 0         // 模板视频开始时间（仅 Lite 模式）
}
```

**返回**:
```json
{
  "code": 10000,
  "data": {
    "task_id": "7392616336519610409"
  },
  "request_id": "20240720103939AF0029465CF6A74E51EC",
  "message": "Success"
}
```

**注意**: 此接口**不支持** AIGC 元数据，只在查询接口支持

---

### 2. 查询结果 (CVGetResult)

**作用**: 查询任务状态和获取生成的视频

**参数**:
```json
{
  "req_key": "realman_change_lips",
  "task_id": "7392616336519610409",
  "req_json": "{\"aigc_meta\": {...}}"  // 可选，用于添加隐式水印
}
```

**返回**:
```json
{
  "code": 10000,
  "data": {
    "status": "done",
    "resp_data": "{\"url\": \"https://result-video-url\", \"progress\": 100, ...}",
    "aigc_meta_tagged": true  // 水印是否打标成功
  },
  "request_id": "2025061718460554C9B78D23B0BAB45B2A"
}
```

**状态说明**:
- `in_queue`: 任务已提交，排队中
- `generating`: 任务处理中
- `done`: 处理完成（成功或失败，根据 code 判断）
- `not_found`: 任务未找到（可能已过期）
- `expired`: 任务已过期（超过12小时），需重新提交

**从 resp_data 提取视频 URL**:
```typescript
const data = JSON.parse(result.resp_data)
const videoUrl = data.url  // 视频链接（有效期 1 小时）
```

---

## 模式选择

### Lite 模式 (realman_change_lips)

**特点**:
- ✅ 处理速度快
- ✅ 成本较低
- ✅ 支持视频循环（音频长于视频时）
- ✅ 适合简单场景

**适用场景**: 单人口播、固定镜头、音频时长适中

### Basic 模式 (realman_change_lips_basic_chimera)

**特点**:
- ✅ 质量更高
- ✅ 支持场景切分
- ✅ 支持说话人识别
- ❌ 处理时间稍长
- ❌ 成本稍高

**适用场景**: 多场景视频、复杂镜头、高质量要求

---

## 可选参数详解

### separate_vocal（人声分离）

**类型**: `boolean`
**默认值**: `false`
**适用模式**: Lite / Basic 均可

**作用**: 开启后会抑制音频背景杂音，只保留纯人声

**使用建议**:
- ✅ 音频包含背景音乐/噪音时开启
- ❌ 音频已是纯人声时无需开启

---

### open_scenedet（场景切分）

**类型**: `boolean`
**默认值**: `false`
**适用模式**: ⚠️ **仅 Basic 模式**

**作用**: 识别视频中人物是否在说话
- 如果视频中人物没有说话，对应片段将不驱动口型
- 适用于背景音中有其他人说话的场景

**使用建议**:
- ✅ 视频包含多个说话人时开启
- ✅ 视频有静音片段时开启

---

### align_audio（视频循环）

**类型**: `boolean`
**默认值**: `true`
**适用模式**: ⚠️ **仅 Lite 模式**

**作用**: 当音频时长 > 视频时长时，视频正向循环播放

**循环流程**: 视频播放 → 结束 → 从头循环 → ...

**使用建议**:
- ✅ 音频较长时建议开启
- ❌ 音频短于视频时无影响

---

### align_audio_reverse（倒放循环）

**类型**: `boolean`
**默认值**: `false`
**适用模式**: ⚠️ **仅 Lite 模式**
**前置条件**: ⚠️ 必须同时开启 `align_audio`

**作用**: 视频循环时加入倒放，解决循环衔接处跳变问题

**循环流程**: 正放 → 倒放 → 正放 → 倒放 → ...

**使用建议**:
- ✅ 需要平滑循环时开启
- ✅ 视频动作连续性强时开启

---

### templ_start_seconds（开始时间）

**类型**: `float`
**默认值**: `0`
**适用模式**: ⚠️ **仅 Lite 模式**

**作用**: 设置模板视频的开始时间（秒）

**使用场景**:
- 跳过视频前几秒的无效内容
- 从特定时间点开始驱动

---

## AIGC 隐式标识元数据

### 使用时机

**重要**: `aigc_meta` **仅在查询接口使用**，不在提交接口使用

**生效流程**:
1. 提交任务 → 火山引擎开始生成视频
2. 查询结果时提供 `req_json` 参数 → 火山引擎在返回视频中嵌入隐式水印
3. 检查 `aigc_meta_tagged` 字段确认水印是否成功

### 字段说明

```typescript
interface AigcMeta {
  content_producer?: string      // 可选: 内容生成服务ID（<= 256字符）
  producer_id: string            // 必选: 内容生成服务商给此视频的唯一ID（<= 256字符）
  content_propagator: string     // 必选: 内容传播服务商ID（<= 256字符）
  propagate_id?: string          // 可选: 传播服务商给此视频的唯一ID（<= 256字符）
}
```

### 使用示例

```json
{
  "req_key": "realman_change_lips",
  "task_id": "7392616336519610409",
  "req_json": "{\"aigc_meta\": {\"content_producer\": \"001191440300192203821610000\", \"producer_id\": \"producer_id_test123\", \"content_propagator\": \"001191440300192203821610000\", \"propagate_id\": \"propagate_id_test123\"}}"
}
```

### 法规依据

依据《人工智能生成合成内容标识办法》和《网络安全技术人工智能生成合成内容标识方法》

### 水印验证

可通过 https://www.gcmark.com/web/index.html#/mark/check/video 验证隐式水印

---

## 输入格式要求

### 视频格式 (url)

**建议格式**:
- **格式**: MP4, AVI, MOV
- **编码**: H.264, H.265
- **分辨率**: 建议 512x512 至 1920x1080
- **时长**: 建议 < 60秒
- **文件大小**: 建议 < 100MB
- **帧率**: 建议 24-30 FPS
- **要求**: 必须公网可访问，**必须包含单人口播**

**特点说明**:
- 必须是单人口播视频（一个人在说话）
- 人物面部需清晰可见
- 支持各种画幅比例

**错误码参考**:
- `50209`: 请求参数中没有获取到视频
- `50210`: 视频解码错误
- `50211`: 视频尺寸超过限制
- `50214`: 输入视频时长过大

---

### 音频格式 (pure_audio_url)

**建议格式**:
- **格式**: MP3, WAV, AAC
- **采样率**: 16kHz ~ 48kHz
- **比特率**: 建议 128kbps 以上
- **时长**: 建议与视频时长匹配（或通过循环参数调整）
- **文件大小**: 建议 < 50MB
- **要求**: 必须公网可访问，建议纯人声

**特点说明**:
- 建议使用纯人声音频（或开启 `separate_vocal`）
- 音频中的语音将驱动视频中人物的口型
- 支持中文、英文等多种语言

**URL 编码注意**:
- 建议 URL 中不要包含中文
- 如有中文需进行 Unicode 编码

---

## 常见错误码

### 不可重试错误（客户端问题）

| 错误码 | 说明 | 解决方案 |
|--------|------|----------|
| 50200 | 参数错误 | 检查请求参数格式 |
| 50201 | 缺少参数 | 补充必要参数（url、pure_audio_url） |
| 50209 | 请求参数中没有获取到视频 | 检查视频 URL 是否可访问 |
| 50210 | 视频解码错误 | 更换视频格式或修复视频 |
| 50211 | 视频尺寸超过限制 | 压缩视频尺寸 |
| 50214 | 输入视频时长过大 | 缩短视频时长 |
| **50215** | **输入的视频、音频、参数等不满足要求** | **检查输入格式、时长等是否符合要求** |
| 50411 | 输入内容审核未通过 | 更换视频/音频内容 |
| 50412 | 输入文本审核未通过 | 修改文本内容 |
| **50413** | **输入含敏感词** | **移除敏感内容** |
| 50518 | 输入版权内容审核未通过 | 更换内容 |
| 60102 | 未检测到人脸 | 确保视频中包含清晰人脸 |

### 可重试错误（服务端问题）

| 错误码 | 说明 | 解决方案 |
|--------|------|----------|
| 50429 | QPS超限 | 稍后重试 |
| 50430 | 并发超限 | 稍后重试 |
| 50500 | 内部错误 | 自动重试 |
| 50516 | 输出视频审核未通过 | 自动重试（可能生成不同内容） |
| 50520 | 审核服务异常 | 自动重试 |

---

## 系统实现说明

### 在 Lumina 中的使用

1. **任务配置** (db/schema.ts):
```typescript
const taskConfig: VideoLipsyncConfig = {
  taskType: 'video_lipsync',
  useBasicMode: false,           // 使用 Lite 模式
  separateVocal: true,           // 开启人声分离
  alignAudio: true,              // 开启视频循环
  alignAudioReverse: false,      // 不开启倒放循环
  templStartSeconds: 0,          // 从头开始
  aigcMeta: {                    // 可选：AIGC 元数据
    contentProducer: 'Lumina Platform',
    producerId: 'user-12345',
    contentPropagator: 'Lumina Web',
    propagateId: 'task-67890'
  }
}
```

2. **任务提交** (lib/tasks/providers/impl/video-lipsync.ts):
   - 调用 `submitLipsyncTask(videoUrl, audioUrl, options)`
   - 获取 `task_id` 和 `request_id`
   - 保存到 `tasks.externalTaskId`

3. **任务查询** (lib/tasks/providers/impl/video-lipsync.ts):
   - 从任务配置中提取 `aigcMeta`
   - 转换字段名为 snake_case
   - 调用 `getLipsyncResult(taskId, useBasicMode, aigcMeta)`
   - 从 `resp_data` 中提取视频 URL
   - 火山引擎在返回视频中嵌入隐式水印

### 输入资源要求

```typescript
// 任务需要两个输入资源
inputs: [
  {
    type: ResourceType.VIDEO,
    url: 'https://video-url',  // 单人口播视频
    isInput: true
  },
  {
    type: ResourceType.AUDIO,
    url: 'https://audio-url',  // 纯人声音频
    isInput: true
  }
]
```

### 重要提示

- AIGC 元数据是**可选**的，不影响视频生成本身
- 只有在需要符合 AIGC 法规时才需要提供
- 如果提供了元数据，必须包含 `producer_id` 和 `content_propagator`（必选字段）
- 水印嵌入在查询结果时进行，不在任务提交时进行
- Lite 模式和 Basic 模式的参数互不兼容，需根据选择的模式传入对应参数

---

## 最佳实践

### 1. 音视频时长匹配

**场景**: 音频时长 > 视频时长

**Lite 模式解决方案**:
```json
{
  "align_audio": true,           // 开启视频循环
  "align_audio_reverse": true    // 开启倒放循环（平滑衔接）
}
```

**Basic 模式解决方案**:
- 使用视频编辑工具预先处理
- 或分段处理

---

### 2. 音频背景杂音处理

**场景**: 音频包含背景音乐或噪音

**解决方案**:
```json
{
  "separate_vocal": true  // 开启人声分离
}
```

**效果**: 自动抑制背景杂音，只保留人声

---

### 3. 多场景视频处理

**场景**: 视频包含多个场景或说话人

**解决方案**:
```json
{
  "req_key": "realman_change_lips_basic_chimera",  // 使用 Basic 模式
  "open_scenedet": true                             // 开启场景切分
}
```

**效果**: 自动识别说话片段，只在人物说话时驱动口型

---

### 4. 错误处理

**建议**:
1. 始终检查 `code` 字段（10000 为成功）
2. 记录 `request_id` 用于问题排查
3. 根据错误码分类处理（可重试 vs 不可重试）
4. 对于 `expired` 状态，重新提交任务
5. 查询结果时检查 `aigc_meta_tagged` 确认水印状态

---

## 参考链接

- [火山引擎视觉智能 API 文档](https://www.volcengine.com/docs/6791/1156403)
- [AIGC 内容标识规范](https://www.gcmark.com)
- [《人工智能生成合成内容标识办法》](https://www.gov.cn/zhengce/zhengceku/202501/content_6996875.htm)