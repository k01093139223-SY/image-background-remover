# Image BG Remover - Google OAuth + D1 配置指南

## 前置要求

1. **Google Cloud 项目**
   - 启用 Google+ API 或 Identity Platform
   - 创建 OAuth 2.0 客户端 ID
   - 设置回调域名：`https://f896793d.image-background-remover-8hx.pages.dev/api/auth/google/callback`

2. **Cloudflare 账号**
   - 创建 D1 数据库

---

## 配置步骤

### 1. Google OAuth 设置

1. 访问 [Google Cloud Console](https://console.cloud.google.com/)
2. 创建项目 → API 和服务 → 凭据
3. 创建 OAuth 2.0 客户端 ID
4. 添加授权域名：
   - `https://f896793d.image-background-remover-8hx.pages.dev`
5. 获取 **Client ID** 和 **Client Secret**

### 2. Cloudflare D1 数据库

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 进入 **Workers & Pages** → **D1**
3. 创建数据库：`image-background-remover-db`
4. 执行 schema.sql：
   ```bash
   wrangler d1 execute image-background-remover-db --local --file=schema.sql
   ```
5. 获取 **Database ID**

### 3. 更新 wrangler.toml

编辑 `wrangler.toml`，将 `YOUR_D1_DATABASE_ID_HERE` 替换为实际 Database ID：

```toml
[[d1_databases]]
binding = "DB"
database_name = "image-background-remover-db"
database_id = "你的-实际-Database-ID"
```

### 4. 配置环境变量

在 Cloudflare Pages 项目设置中添加：

| 变量名 | 值 |
|--------|-----|
| `GOOGLE_CLIENT_ID` | 你的 Google Client ID |
| `GOOGLE_CLIENT_SECRET` | 你的 Google Client Secret |
| `REMOVE_BG_API_KEY` | A9ZxNQtqf6BBSSjMo7EuGibx (已有) |

### 5. 部署

```bash
npm run cloudflare:build
npx wrangler pages deploy .next
```

---

## 本地开发测试

```bash
# 复制环境变量
cp .dev.vars.example .dev.vars

# 编辑 .dev.vars 添加你的 OAuth 凭据
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret

# 运行
npm run dev
```

---

## 功能说明

- ✅ Google OAuth 登录
- ✅ 用户信息存储到 D1
- ✅ 会话 Cookie 包含 D1 用户 ID
- ✅ 每日使用次数限制（可选）

---

## 常见问题

**Q: 登录失败显示 config_error？**
A: 检查 Cloudflare Pages 环境变量是否正确配置 GOOGLE_CLIENT_ID 和 GOOGLE_CLIENT_SECRET

**Q: D1 操作失败？**
A: 确认 wrangler.toml 中的 database_id 正确，且已在 Cloudflare 创建同名数据库

**Q: 如何查看用户数据？**
A: `wrangler d1 execute image-background-remover-db --local --command="SELECT * FROM users"`