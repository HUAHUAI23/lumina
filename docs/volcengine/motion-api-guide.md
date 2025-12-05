# 火山引擎动作模仿 API 使用指南

## 接口工作流程

### 1. 提交任务 (CVSync2AsyncSubmitTask)

**作用**: 提交图片和视频到火山引擎，生成动作模仿任务

**参数**:
```json
{
  "req_key": "jimeng_dream_actor_m1_gen_video_cv",
  "image_url": "https://your-image-url",
  "video_url": "https://your-video-url"
}
```

**返回**: `task_id` - 用于后续查询结果

**注意**: 此接口**不支持** AIGC 元数据，只在查询接口支持

---

### 2. 查询结果 (CVSync2AsyncGetResult)

**作用**: 查询任务状态和获取生成的视频

**参数**:
```json
{
  "req_key": "jimeng_dream_actor_m1_gen_video_cv",
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
    "video_url": "https://result-video-url",
    "aigc_meta_tagged": true  // 水印是否打标成功
  }
}
```

**状态说明**:
- `in_queue`: 任务已提交，排队中
- `generating`: 任务处理中
- `done`: 处理完成（成功或失败，根据 code 判断）
- `not_found`: 任务未找到（可能已过期）
- `expired`: 任务已过期（超过12小时），需重新提交

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
  "req_key": "jimeng_dream_actor_m1_gen_video_cv",
  "task_id": "7491596536074305586",
  "req_json": "{\"aigc_meta\": {\"content_producer\": \"001191440300192203821610000\", \"producer_id\": \"producer_id_test123\", \"content_propagator\": \"001191440300192203821610000\", \"propagate_id\": \"propagate_id_test123\"}}"
}
```

### 法规依据

依据《人工智能生成合成内容标识办法》和《网络安全技术人工智能生成合成内容标识方法》

### 水印验证

可通过 https://www.gcmark.com/web/index.html#/mark/check/video 验证隐式水印

---

## 输入格式要求

### 图片格式 (image_url)

**建议格式**:
- **格式**: JPEG, PNG, WebP
- **分辨率**: 建议 512x512 至 2048x2048 之间
- **文件大小**: 建议 < 10MB
- **要求**: 必须公网可访问

**错误码参考**:
- `50205`: 图像尺寸超过限制
- `50206`: 请求参数中没有获取到图像
- `50207`: 图像解码错误
- `50411`: 输入图片审核未通过
- `50518`: 输入版权图审核未通过

**特点说明**:
- 图片中需包含清晰的人物主体
- 支持多种风格角色（写实、二次元等）
- 主体和背景特征会与输入图片保持一致

---

### 视频格式 (video_url)

**建议格式**:
- **格式**: MP4, AVI, MOV
- **编码**: H.264, H.265
- **分辨率**: 建议 512x512 至 2048x2048 之间，支持各种画幅比例
- **时长**: 建议 < 30秒
- **文件大小**: 建议 < 50MB
- **帧率**: 建议 24-30 FPS
- **要求**: 必须公网可访问

**错误码参考**:
- `50209`: 请求参数中没有获取到视频
- `50210`: 视频解码错误
- `50211`: 视频尺寸超过限制
- `50214`: 输入视频时长过大

**特点说明**:
- 视频作为模版，驱动图片中的人物按照视频的动作/表情/口型运动
- 突破竖屏画幅限制，支持各种画幅比例
- 具备一定的运镜还原能力

---

## 常见错误码

### 不可重试错误（客户端问题）

| 错误码 | 说明 | 解决方案 |
|--------|------|----------|
| 50200 | 参数错误 | 检查请求参数格式 |
| 50201 | 缺少参数 | 补充必要参数 |
| 50205 | 图像尺寸超过限制 | 压缩图片尺寸 |
| 50207 | 图像解码错误 | 更换图片格式或修复图片 |
| 50210 | 视频解码错误 | 更换视频格式或修复视频 |
| 50211 | 视频尺寸超过限制 | 压缩视频尺寸 |
| 50214 | 输入视频时长过大 | 缩短视频时长 |
| **50215** | **输入的图片、视频、参数等不满足要求** | **检查输入格式、尺寸、时长等是否符合要求** |
| 50411 | 输入图片审核未通过 | 更换图片内容 |
| 50412 | 输入文本审核未通过 | 修改文本内容 |
| 50413 | 输入含敏感词 | 移除敏感内容 |
| 50518 | 输入版权图审核未通过 | 更换图片 |
| 60102 | 未检测到人脸 | 确保图片中包含清晰人脸 |

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
const taskConfig: VideoMotionConfig = {
  taskType: 'video_motion',
  aigcMeta?: {
    contentProducer: 'Lumina Platform',
    producerId: 'user-12345',
    contentPropagator: 'Lumina Web',
    propagateId: 'task-67890'
  }
}
```

2. **任务提交** (lib/tasks/providers/impl/video-motion.ts):
   - 调用 `submitMotionTask(imageUrl, videoUrl)`
   - 获取 `task_id` 并保存到 `tasks.externalTaskId`

3. **任务查询** (lib/tasks/providers/impl/video-motion.ts):
   - 从任务配置中提取 `aigcMeta`
   - 转换字段名为 snake_case
   - 调用 `getMotionResult(taskId, aigcMeta)`
   - 火山引擎在返回视频中嵌入隐式水印

### 重要提示

- AIGC 元数据是**可选**的，不影响视频生成本身
- 只有在需要符合 AIGC 法规时才需要提供
- 如果提供了元数据，必须包含 `producer_id` 和 `content_propagator`（必选字段）
- 水印嵌入在查询结果时进行，不在任务提交时进行