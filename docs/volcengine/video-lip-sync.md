# Volcengine 单人口播视频改口型接口

最近更新时间：2025-12-01

本文整理火山引擎“单人口播视频 + 音频改口型”接口（视频改口型）调用方式以及常见参数、返回值与错误码。适用于 `CVSubmitTask`（提交任务）与 `CVGetResult`（查询任务）两类请求。

---

## 1. 接口概览

| 项目 | 内容 |
| --- | --- |
| 服务域名 | `https://visual.volcengineapi.com/` |
| HTTP 方法 | `POST` |
| Content-Type | `application/json` |
| Service | `cv` |
| Region | `cn-north-1` |
| API 版本 | `2022-08-31` |
| 提交 Action | `CVSubmitTask` |
| 查询 Action | `CVGetResult` |

所有请求均需使用 Volcengine V4 签名。仓库中 `tmp/audio+video2video/volc_request.py` 提供了完整的签名与请求示例，可直接复用或改写。

---

## 2. 公共签名与 Header

必备 Header：

- `Host`: `visual.volcengineapi.com`
- `Content-Type`: `application/json`
- `X-Date`: UTC ISO8601（`%Y%m%dT%H%M%SZ`）
- `X-Content-Sha256`: 请求体 SHA256
- `Authorization`: `HMAC-SHA256 Credential=<ak>/<date>/<region>/cv/request, SignedHeaders=..., Signature=...`
- `X-Security-Token`: 临时凭证必带

签名流程（简述）：

1. 固定 `service=cv`、`region=cn-north-1`，签名算法 `HMAC-SHA256`。
2. Canonical Request 由 `HTTPMethod + "/" + Query(Action,Version)+CanonicalHeaders+SignedHeaders+HashedPayload` 组成。
3. 字符串签名：`HMAC-SHA256`(`k_signing`, `StringToSign`)。
4. `Authorization` 头携带 Credential、SignedHeaders、Signature。

详见示例实现 `request_raw()`。

---

## 3. 提交任务 (`CVSubmitTask`)

### 3.1 Query 参数

| 参数 | 必填 | 说明 |
| --- | --- | --- |
| `Action` | 是 | 固定 `CVSubmitTask` |
| `Version` | 是 | 固定 `2022-08-31` |

### 3.2 Body 参数（JSON）

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `req_key` | string | 是 | 服务标识：<br>`realman_change_lips` (Lite)<br>`realman_change_lips_basic_chimera` (Basic) |
| `url` | string | 是 | 原始视频 URL，建议无中文字符 |
| `pure_audio_url` | string | 是 | 人声音频 URL，同上 |
| `separate_vocal` | bool | 否 | 是否启用人声分离，默认 `false` |
| `open_scenedet` | bool | 否 | Basic 模式：是否开启场景切分与说话人识别，默认 `false` |
| `align_audio` | bool | 否 | Lite 模式：是否开启视频循环，默认 `true` |
| `align_audio_reverse` | bool | 否 | Lite 模式：配合 `align_audio` 以正/倒放交替，默认 `false` |
| `templ_start_seconds` | float | 否 | Lite 模式：模板视频起始秒，默认 `0` |

### 3.3 响应示例

```json
{
  "code": 10000,
  "message": "Success",
  "data": {
    "task_id": "7392616336519610409"
  },
  "request_id": "20240720103939AF0029465CF6A74E51EC",
  "time_elapsed": "104.85ms"
}
```

- `code != 10000` 时，`data` 为 `null`，需读取 `message` 和 `request_id` 诊断。
- `task_id` 供查询接口使用。

---

## 4. 查询任务 (`CVGetResult`)

### 4.1 Query 参数

| 参数 | 必填 | 说明 |
| --- | --- | --- |
| `Action` | 是 | 固定 `CVGetResult` |
| `Version` | 是 | 固定 `2022-08-31` |

### 4.2 Body 参数

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `req_key` | string | 是 | 与提交接口保持一致 |
| `task_id` | string | 是 | 提交接口返回的 ID |
| `req_json` | string(JSON) | 否 | JSON 字符串，目前主要用于传入 `aigc_meta` 配置 |

`req_json` 示例：

```json
{
  "aigc_meta": {
    "content_producer": "001191440300192203821610000",
    "producer_id": "producer_id_test123",
    "content_propagator": "001191440300192203821610000",
    "propagate_id": "propagate_id_test123"
  }
}
```

### 4.3 响应结构

```json
{
  "code": 10000,
  "message": "Success",
  "data": {
    "status": "done",
    "aigc_meta_tagged": true,
    "resp_data": "{...}",
    "url": "https://xxxx", // 结果视频 URL（有效期 1h）
    "binary_data_base64": [],
    "image_urls": null
  },
  "request_id": "2025061718460554C9B78D23B0BAB45B2A",
  "time_elapsed": "508.31ms"
}
```

`data.status` 可选值：

- `in_queue`: 已提交等待
- `generating`: 正在处理
- `done`: 成功或失败，需结合 `code`/`message`
- `not_found`: 任务不存在或过期（>12h）
- `expired`: 任务过期，需重新提交

`resp_data` 是字符串化 JSON，包含进度、VID、视频元信息等。

---

## 5. 通用返回字段与错误码

若 `ResponseMetadata` 存在且非空，可直接参考该字段。否则需关注以下顶层字段：`code`、`message`、`data`、`request_id`、`time_elapsed`。

常见服务级 `code`：

| HTTP | code | 标识 | 说明 | 建议 |
| --- | --- | --- | --- | --- |
| 200 | 10000 | `ECSuccess` | 请求成功 | - |
| 400 | 50200 | `ECReqInvalidArgs` | 参数错误 | 检查入参与 MIME |
| 400 | 50201 | `ECReqMissingArgs` | 缺少参数 | 补齐必填项 |
| 400 | 50204 | `ECParseArgs` | 参数类型/缺失 | 校验 JSON 格式 |
| 400 | 50209 | `ECVideoEmpty` | 缺少视频 | 确认 `url` |
| 400 | 50210 | `ECVideoDecodeError` | 视频解码失败 | 检查视频文件 |
| 400 | 50211 | `ECVideoSizeLimited` | 视频尺寸超限 | 减小尺寸/码率 |
| 400 | 50213 | `ECReqBodySizeLimited` | Body 超限 | 控制 payload |
| 401 | 50400 | `ECAuth` | 权限校验失败 | 检查 AK/SK、服务开通 |
| 404 | 50429 | `ECReqLimit` | QPS 超限 | 限流或购买增项 |
| 500 | 50500 | `ECInternal` | 服务器内部错误 | 提工单 |

报错时务必记录 `request_id` 以便排查。

---

## 6. 典型调用流程

1. **准备凭证**：确保 AK/SK (以及必要的临时 token) 已开通“视觉智能开放平台”对应服务。
2. **构造请求体**：按业务选择 Lite/Basic 模式，设置视频/音频 URL 以及可选参数。
3. **签名**：使用 `volc_request.py` 中的 `_hmac_sha256`、`_norm_query` 等逻辑生成 `Authorization` 头；保持 `Action`、`Version` 与请求体一致。
4. **提交任务**：POST `CVSubmitTask`，获取 `task_id`。
5. **轮询查询**：间隔 2~5s 调用 `CVGetResult`，直至 `status` 为 `done`。若 `code != 10000`，根据错误码处理。
6. **下载结果**：`data.url` 提供 1 小时有效的视频链接，可直接下载或转储到自有存储。
7. **异常处理**：
   - 请求失败：检查签名、区域等公共参数。
   - 视频/音频不合规：根据错误码或 `resp_data` 具体原因调整输入。
   - 任务过期：重新提交并使用新的 `task_id`。

---

## 7. 参考示例

```python
from tmp.audio+video2video.volc_request import request_raw

payload = {
    "req_key": "realman_change_lips",
    "url": "https://example.com/video.mp4",
    "pure_audio_url": "https://example.com/audio.mp3"
}

response = request_raw(
    method="POST",
    action="CVSubmitTask",
    body_json=json.dumps(payload),
    ak=os.environ["VOLC_AK"],
    sk=os.environ["VOLC_SK"],
)
print(response.json())
```

- 提交与查询仅需替换 `action` 为 `CVGetResult` 并调整 `payload`。
- `request_raw` 会自动设置 `Action`、`Version` 的 Query；调用者只需传递 JSON 字符串与凭证。

---

## 8. 版本记录

- `2025-12-01`: 初稿，整理提交/查询参数、返回值、错误码与示例。
