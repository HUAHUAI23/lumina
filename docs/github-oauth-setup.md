# GitHub OAuth 配置指南

本文档介绍如何配置 GitHub OAuth 以启用 GitHub 登录功能。

## 前置条件

- GitHub 账号
- 已部署的应用或本地开发环境

## 步骤 1：创建 GitHub OAuth App

1. 访问 [GitHub Developer Settings](https://github.com/settings/developers)
2. 点击 **"New OAuth App"** 或 **"Register a new application"**

## 步骤 2：填写应用信息

填写以下信息：

| 字段 | 值 | 说明 |
|------|-----|------|
| **Application name** | Lumina AI Studio | 应用名称（自定义） |
| **Homepage URL** | `http://localhost:3000` | 开发环境 URL<br>生产环境: `https://your-domain.com` |
| **Application description** | (可选) | 应用描述 |
| **Authorization callback URL** | `http://localhost:3000/api/auth/github/callback` | **重要**：回调地址<br>生产环境: `https://your-domain.com/api/auth/github/callback` |

### 重要说明

- **Authorization callback URL** 必须与代码中的回调地址完全匹配
- 开发环境和生产环境需要分别配置不同的 OAuth App

## 步骤 3：获取凭证

1. 点击 **"Register application"**
2. 在应用详情页面，你会看到：
   - **Client ID** - 复制此值
   - **Client Secret** - 点击 **"Generate a new client secret"** 生成，然后复制

⚠️ **安全提示**：Client Secret 只显示一次，请妥善保存！

## 步骤 4：配置环境变量

将获取的凭证添加到项目的 `.env` 文件中：

```bash
# GitHub OAuth
GITHUB_CLIENT_ID=your_github_client_id_here
GITHUB_CLIENT_SECRET=your_github_client_secret_here
```

替换：
- `your_github_client_id_here` - 替换为你的 Client ID
- `your_github_client_secret_here` - 替换为你的 Client Secret

## 步骤 5：重启应用

```bash
# 停止当前运行的应用
# 重新启动
pnpm dev
```

## 测试 GitHub 登录

1. 访问登录页面：`http://localhost:3000/login`
2. 点击 **"Github"** 按钮
3. 授权应用访问你的 GitHub 账户
4. 成功登录后会自动创建账户并跳转到首页

## 常见问题

### Q: 回调地址配置错误

**错误信息**：`The redirect_uri MUST match the registered callback URL for this application.`

**解决方案**：
1. 检查 `.env` 文件中的回调地址是否正确
2. 确保 GitHub OAuth App 中配置的回调地址与代码中一致
3. 格式：`http://localhost:3000/api/auth/github/callback`（注意不要有多余的斜杠）

### Q: Client Secret 丢失

**解决方案**：
1. 返回 GitHub OAuth App 设置页面
2. 点击 **"Generate a new client secret"**
3. 更新 `.env` 文件中的 `GITHUB_CLIENT_SECRET`

### Q: 生产环境配置

**解决方案**：
1. 在 GitHub 创建一个新的 OAuth App（用于生产环境）
2. 设置 **Homepage URL** 为生产域名：`https://your-domain.com`
3. 设置 **Authorization callback URL** 为：`https://your-domain.com/api/auth/github/callback`
4. 在生产环境的环境变量中配置对应的 Client ID 和 Secret

### Q: 获取的用户信息

GitHub OAuth 会返回以下信息：
- `id` - GitHub 用户 ID
- `login` - GitHub 用户名
- `email` - 用户邮箱（如果公开）
- `avatar_url` - 用户头像
- `name` - 用户真实姓名（如果设置）

系统会自动：
1. 创建用户账户（如果不存在）
2. 设置用户名为 GitHub 用户名
3. 设置头像为 GitHub 头像
4. 保存 access token 用于后续 API 调用

## 权限范围

当前配置的权限范围：
- `read:user` - 读取用户基本信息
- `user:email` - 读取用户邮箱地址

如需更多权限，请修改 `/app/api/auth/github/route.ts` 中的 `scope` 参数。

## 参考资料

- [GitHub OAuth Documentation](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps)
- [GitHub Developer Settings](https://github.com/settings/developers)