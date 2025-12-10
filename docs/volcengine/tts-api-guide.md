# TTS (文本转语音) API 使用指南

## 接口概述

TTS API 提供基于参考音频的文本转语音服务，可以生成与参考音频音色相似的语音文件。

**基础地址**: 通过环境变量 `TTS_API_BASE_URL` 配置（默认: `http://xxx.xxx.xxx.xxx:xxx`）

---

## 接口列表

### 1. 生成 TTS 音频 (POST /process-tts)

**作用**: 根据文本和参考音频生成 TTS 音频

**请求示例**:
```bash
curl -X POST http://xxxx.xx.xx.xx:xxx/process-tts \
  -H "Content-Type: application/json" \
  -d '{
    "text": "这是一段TTS测试文本",
    "reference_audio": "reference_audio/danghong.m4a"
  }' \
  -o tts_output.flac
```

**参数说明**:
- `text` (string, 必选): 待转换的文本内容
- `reference_audio` (string, 必选): 参考音频文件路径
  - **重要**: 必须包含 `reference_audio/` 前缀
  - 格式: `reference_audio/<filename>`
  - 示例: `reference_audio/danghong.m4a`

**返回格式**:
- 成功: 返回 FLAC 格式音频文件（二进制流）
- 失败: 返回 JSON 格式错误信息

**响应状态码**:
- `200 OK`: 成功生成音频
- `400 Bad Request`: 参数错误（如缺少参数、参考音频不存在）
- `500 Internal Server Error`: 服务器内部错误

---

### 2. 上传参考音频 (POST /upload-reference-audio)

**作用**: 上传新的参考音频文件到服务器

**请求示例**:
```bash
curl -X POST http://xx.xxx.xx.xxx:xx/upload-reference-audio \
  -F "audio=@/path/to/your/audio.m4a"
```

**参数说明**:
- `audio` (file, 必选): 音频文件（支持 M4A、WAV、MP3 等常见格式）

**注意事项**:
- 同名音频文件会被覆盖
- 上传成功后可直接使用 `reference_audio/<filename>` 引用

**返回示例**:
```json
{
  "success": true,
  "filename": "danghong.m4a",
  "message": "音频上传成功"
}
```

---

### 3. 查看参考音频列表 (GET /list-reference-audios)

**作用**: 获取服务器上所有可用的参考音频文件列表

**请求示例**:
```bash
curl -X GET "http://xxx.xxx.x.xx:xxxx/list-reference-audios"
```

**返回示例**:
```json
{
  "files": [
    "danghong.m4a",
    "voice1.wav",
    "voice2.mp3"
  ],
  "count": 3
}
```

---

### 4. 删除参考音频 (DELETE /delete-reference-audio)

**作用**: 从服务器删除指定的参考音频文件

**请求示例**:
```bash
curl -X DELETE http://xxx.xxx.xx.xxx:xxx/delete-reference-audio \
  -H "Content-Type: application/json" \
  -d '{"filename": "danghong.m4a"}'
```

**参数说明**:
- `filename` (string, 必选): 要删除的文件名（**不包含** `reference_audio/` 前缀）

**返回示例**:
```json
{
  "success": true,
  "message": "音频文件已删除"
}
```

---

## 输入格式要求

### 文本 (text)

**建议规范**:
- **编码**: UTF-8
- **长度**: 建议 < 500 字符
- **内容**: 支持中文、英文及标点符号
- **特殊字符**: 避免使用过多特殊符号

**注意事项**:
- 过长的文本可能导致生成时间增加
- 标点符号会影响语音的停顿和语调

---

### 参考音频 (reference_audio)

**支持格式**:
- **音频格式**: M4A, WAV, MP3, FLAC
- **采样率**: 建议 16kHz 或 44.1kHz
- **声道**: 单声道或立体声均可
- **时长**: 建议 5-60 秒
- **文件大小**: 建议 < 10MB

**音频质量要求**:
- 清晰的人声录音
- 尽量减少背景噪音
- 避免音乐或其他干扰声音

**路径格式**:
- ✅ 正确: `"reference_audio/danghong.m4a"`
- ❌ 错误: `"danghong.m4a"` (缺少前缀)
- ❌ 错误: `"/reference_audio/danghong.m4a"` (不要加斜杠前缀)

---

## 输出格式说明

### 生成音频

**格式**: FLAC (Free Lossless Audio Codec)
- 无损压缩格式
- 高音质
- 文件大小适中

**特性**:
- 采样率: 继承自参考音频
- 声道: 单声道
- 比特深度: 16-bit

**播放支持**:
- 支持大多数现代浏览器
- 支持转换为 MP3、WAV 等格式

---

## 常见错误处理

### 客户端错误 (4xx)

| 错误            | 原因                 | 解决方案                                  |
| --------------- | -------------------- | ----------------------------------------- |
| 400 Bad Request | 缺少必要参数         | 检查 `text` 和 `reference_audio` 是否提供 |
| 400 Bad Request | 参考音频不存在       | 确认音频文件已上传且路径正确              |
| 400 Bad Request | 参考音频路径格式错误 | 确保路径包含 `reference_audio/` 前缀      |

### 服务器错误 (5xx)

| 错误                      | 原因         | 解决方案              |
| ------------------------- | ------------ | --------------------- |
| 500 Internal Server Error | TTS 服务异常 | 稍后重试              |
| 503 Service Unavailable   | 服务不可用   | 检查 TTS 服务是否运行 |

---