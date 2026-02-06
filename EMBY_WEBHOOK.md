# Emby Webhook 配置说明

## 概述

本系统支持通过 Emby Webhook 实现以下功能：

1. **入库自动检测** - 影片入库后自动更新求片状态并通知用户
2. **设备管理 & 播放历史** - 自动记录用户设备和播放记录
3. **客户端黑名单** - 检测并阻止不受欢迎的客户端播放

---

## 📋 Webhook 端点一览

| Webhook 端点 | 用途 | 必要性 | 触发事件 |
|-------------|------|--------|---------|
| `/api/webhook/emby` | 媒体入库检测 | ⭐ 必需 | `Item Added` |
| `/api/webhook/emby/playback` | 设备记录 + 黑名单检测 | 📊 推荐 | `Playback Start` |
| `/api/webhook/emby/test` | 测试 Webhook 连通性 | 🔧 调试 | 手动访问 |

**重要提示：** 
- ✅ **入库检测** - 必须配置，用于自动完成求片
- 📊 **播放检测** - 强烈推荐，用于设备管理和播放历史统计
- 🚫 **黑名单功能** - 可选，与播放检测共用同一端点

---

## 🔧 Emby Webhook 插件安装

### 1. 安装 Webhook 插件

1. 登录 Emby 管理后台
2. 进入 **插件** → **插件目录**
3. 搜索并安装 **Webhook** 插件
4. 重启 Emby 服务器

### 2. 配置 Webhook

进入 **设置** → **服务器** → **Webhooks**

---

## 🎬 Webhook 1: 媒体入库检测（必需）

### 添加新 Webhook

**基本信息：**
- **名称：** `Emby Request - 入库检测`
- **Webhook URL：** `http://你的服务器IP:5000/api/webhook/emby`
- **请求方法：** `POST`

### 事件选择（仅勾选以下项）

| 事件类型 | 是否启用 | 说明 |
|---------|---------|------|
| **Item Added** | ✅ 启用 | 新项目添加到媒体库时触发 |
| **Media Library Scan Completed** | ✅ 启用（可选） | 媒体库扫描完成后触发 |
| Item Removed | ❌ 禁用 | 不需要 |
| User Authentication | ❌ 禁用 | 不需要 |
| Playback Start | ❌ 禁用 | 客户端播放，不需要 |
| Playback Stop | ❌ 禁用 | 客户端播放，不需要 |
| User Created | ❌ 禁用 | 不需要 |

### 完整配置示例

```json
{
  "Name": "Emby Request - 入库检测",
  "Url": "http://192.168.1.100:5000/api/webhook/emby",
  "Method": "POST",
  "Events": [
    "Item Added"
  ],
  "ItemTypes": [
    "Movie",
    "Series",
    "Episode"
  ],
  "SendAllProperties": true
}
```

## 📺 Webhook 2: 播放检测（强烈推荐）

此 Webhook 用于：
- 📊 **设备管理** - 自动记录用户使用的所有设备信息
- 📈 **播放历史** - 记录用户的播放活动
- 🚫 **黑名单检测** - 可选功能，检测并阻止不受欢迎的客户端

### 为什么推荐配置？

| 功能 | 不配置此 Webhook | 配置此 Webhook |
|------|-----------------|----------------|
| 设备管理 | ❌ 需手动同步 | ✅ 自动记录 |
| 播放历史 | ❌ 需手动同步 | ✅ 实时记录 |
| 黑名单功能 | ❌ 不可用 | ✅ 可用 |
| 管理后台数据 | ⚠️ 数据延迟 | ✅ 实时更新 |

### 添加播放检测 Webhook

**基本信息：**
- **名称：** `Emby Request - 播放检测`
- **Webhook URL：** `http://你的服务器IP:5000/api/webhook/emby/playback`
- **请求方法：** `POST`

### 事件选择

| 事件类型 | 是否启用 | 说明 |
|---------|---------|------|
| **Playback Start** | ✅ 必须 | 播放开始时触发，记录设备和播放信息 |
| **Playback Stop** | ✅ 推荐 | 播放停止时更新播放进度和时长 |
| Playback Progress | ⚠️ 可选 | 播放进度更新（会产生较多请求，适合需要精确进度追踪的场景） |
| 其他事件 | ❌ 禁用 | 不需要 |

### 完整配置示例

```json
{
  "Name": "Emby Request - 播放检测",
  "Url": "http://192.168.1.100:5000/api/webhook/emby/playback",
  "Method": "POST",
  "Events": [
    "Playback Start",
    "Playback Stop"
  ],
  "SendAllProperties": true
}
```

### 数据记录说明

配置此 Webhook 后，系统会自动记录：

**设备信息 (UserDevice)：**
- 设备 ID、设备名称
- 客户端类型、客户端版本
- 最后使用 IP、最后活跃时间

**播放记录 (PlaybackRecord)：**
- 播放的媒体名称、类型
- 播放设备、播放进度
- 播放时间

---

## 🚨 客户端黑名单检测（可选功能）

黑名单功能与播放检测共用同一 Webhook 端点 `/api/webhook/emby/playback`。

### 黑名单工作原理

系统提供了**独立的黑名单检测 Webhook**，用于防止不受欢迎的客户端播放（如 Infuse 越狱版、盗版客户端等）。

> ⚠️ **注意：** 黑名单功能与设备管理/播放历史共用同一 Webhook 端点 `/api/webhook/emby/playback`。
> 如果您只需要设备管理功能而不需要黑名单，只需不在管理后台添加黑名单规则即可。

**重要说明：**
- ✅ 播放检测 Webhook 同时支持设备记录和黑名单检测
- ✅ 入库检测使用的是：`/api/webhook/emby`（不包含客户端事件）
- 🔒 两个 Webhook 互不干扰，可以同时配置

### 配置黑名单检测

黑名单功能已集成在播放检测 Webhook 中，只需：

1. **配置播放检测 Webhook**（见上一节）
2. **在管理后台添加黑名单规则**

#### 在管理后台配置黑名单规则

进入管理后台 → **播放监控** → **设备黑名单**，添加黑名单规则。

**规则配置示例：**
```yaml
规则名称: 禁止 Infuse 越狱版
客户端匹配: *Infuse*Cracked*
设备名称匹配: *
处理方式: 停止播放并禁用账号
```

### 触发条件

系统会在以下情况触发黑名单检测：

1. **用户开始播放** - 触发 `Playback Start` 事件
2. **提取设备信息** - 获取客户端名称、设备名称、设备ID
3. **匹配黑名单规则** - 使用通配符模式匹配
4. **执行处理动作** - 停止播放或停止+封禁账号

### 黑名单规则配置

在管理后台可以配置黑名单规则，支持以下匹配模式：

**规则示例：**

| 规则名称 | 客户端匹配 | 设备名称匹配 | 处理方式 |
|---------|-----------|------------|---------|
| 禁止 Infuse 越狱版 | `*Infuse*Cracked*` | `*` | 停止+封禁 |
| 禁止盗版客户端 | `*Pirate*` | `*` | 停止+封禁 |
| 禁止特定设备 | `*` | `*Hacked*` | 停止+封禁 |
| 仅警告未知客户端 | `Unknown*` | `*` | 仅停止播放 |

**通配符说明：**
- `*` - 匹配任意字符（多个）
- `?` - 匹配单个字符
- 不区分大小写

### 处理方式

**1. 仅停止播放（stop_only）**
- ✅ 立即停止当前播放会话
- ✅ 设备标记为已阻止
- ✅ 发送管理员通知
- ❌ 不禁用用户账号
- 💡 适用于：警告性规则、误触可能性高的规则

**2. 停止+封禁账号（stop_and_ban）**
- ✅ 立即停止当前播放会话
- ✅ 设备标记为已阻止
- ✅ 禁用 Emby 账号
- ✅ 暂停用户所有订阅
- ✅ 踢出所有在线会话
- ✅ 发送管理员通知
- 💡 适用于：严重违规的客户端

### 通知消息示例

**停止+封禁：**
```
🚨 黑名单客户端警告

👤 用户：张三
📱 设备：iPhone 13
💻 客户端：Infuse-Cracked-7.0
🌐 IP：192.168.1.100
🚫 匹配规则：禁止 Infuse 越狱版
⚡ 处理方式：停止播放并禁用账号

✅ 已执行：播放已停止、账号已禁用、订阅已暂停
```

**仅停止播放：**
```
⚠️ 黑名单客户端检测

👤 用户：李四
📱 设备：Android TV
💻 客户端：Unknown Client
🌐 IP：192.168.1.101
🚫 匹配规则：未知客户端警告
⚡ 处理方式：仅停止播放
```

### 配置建议

**推荐配置方案：**

1. **配置两个 Webhook（推荐）：**
   - Webhook 1: 入库检测（`/api/webhook/emby`）→ 启用 `Item Added`
   - Webhook 2: 播放检测（`/api/webhook/emby/playback`）→ 启用 `Playback Start`

2. **最小配置（仅入库检测）：**
   - 只配置 Webhook 1（入库检测）
   - 设备管理和播放历史需要在管理后台手动点击"同步历史"

3. **黑名单规则设置：**
   - 先使用"仅停止播放"测试规则是否准确
   - 确认无误后再改为"停止+封禁"
   - 定期查看被阻止的设备列表

---

## 📋 完整配置示例

### Webhook 1: 入库检测（必需）
```json
{
  "Name": "Emby Request - 入库检测",
  "Url": "http://192.168.1.100:5000/api/webhook/emby",
  "Method": "POST",
  "Events": ["Item Added"],
  "ItemTypes": ["Movie", "Series", "Episode"],
  "SendAllProperties": true
}
```

### Webhook 2: 播放检测（推荐）
```json
{
  "Name": "Emby Request - 播放检测",
  "Url": "http://192.168.1.100:5000/api/webhook/emby/playback",
  "Method": "POST",
  "Events": ["Playback Start"],
  "SendAllProperties": true
}
```

---

## 🔒 安全建议

### 1. 使用 Token 认证（推荐）

在 Webhook URL 中添加认证 Token：

```
http://你的服务器IP:5000/api/webhook/emby?token=你的密钥
```

**设置方法：**

在 `docker-compose.yml` 中添加环境变量：

```yaml
environment:
  - WEBHOOK_TOKEN=随机生成的密钥字符串
```

生成随机密钥：
```bash
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

### 2. 使用 HTTPS

如果部署在公网，建议配置 HTTPS：

```
https://你的域名/api/webhook/emby?token=你的密钥
```

### 3. IP 白名单（可选）

如果 Emby 和求片系统在同一内网，可以限制只接受内网 IP 的 Webhook 请求。

---

## 📋 Webhook 数据格式

### Item Added 事件

Emby 发送的数据示例：

```json
{
  "Event": "item.added",
  "Item": {
    "Name": "星际穿越",
    "Type": "Movie",
    "Year": 2014,
    "ProviderIds": {
      "Tmdb": "157336",
      "Imdb": "tt0816692"
    }
  },
  "Server": {
    "Name": "My Emby Server"
  }
}
```

系统会自动：
1. 解析 TMDB ID
2. 匹配待处理的求片记录
3. 更新状态为"已完成"
4. 发送 Telegram 通知给用户

---

## 🧪 测试 Webhook

### 方法一：通过 Emby 测试

1. 在 Webhook 配置页面点击 **测试** 按钮
2. 查看系统日志确认是否收到请求

### 方法二：手动触发

添加一部新影片到 Emby 媒体库，触发 `Item Added` 事件。

### 方法三：使用 curl 测试

```bash
curl -X POST http://你的服务器IP:5000/api/webhook/emby \
  -H "Content-Type: application/json" \
  -d '{
    "Event": "item.added",
    "Item": {
      "Name": "测试电影",
      "Type": "Movie",
      "Year": 2024,
      "ProviderIds": {
        "Tmdb": "12345"
      }
    }
  }'
```

---

## 📊 监控和日志

### 查看 Webhook 日志

```bash
docker logs emby-request | grep webhook
```

### 成功日志示例

```
[INFO] Webhook received: item.added
[INFO] Processing item: 星际穿越 (2014)
[INFO] TMDB ID: 157336
[INFO] Found matching request: ID=123
[INFO] Updated request status: approved -> completed
[INFO] Sent notification to user: @username
```

### 错误日志示例

```
[WARNING] Webhook received but no matching request found
[ERROR] Invalid webhook data format
[ERROR] TMDB ID not found in item
```

---

## ❓ 常见问题

### Q: Webhook 不工作怎么办？

**检查清单：**
1. ✅ Emby Webhook 插件已安装并启用
2. ✅ Webhook URL 正确（可以访问）
3. ✅ 事件类型已勾选对应事件
4. ✅ 系统日志中有收到 Webhook 请求
5. ✅ 影片的 TMDB ID 正确匹配

### Q: 为什么有些影片入库后没有自动完成？

**可能原因：**
- 影片的 TMDB ID 与求片记录不匹配
- 求片状态不是 `approved` 或 `processing`
- Emby 元数据中缺少 TMDB ID

**解决方法：**
1. 确保 Emby 正确识别了影片的 TMDB ID
2. 在管理后台手动标记为"已入库"

### Q: 管理后台的设备管理和播放历史为空？

**原因：** 未配置播放检测 Webhook。

**解决方法：**
1. **推荐**：配置 `/api/webhook/emby/playback` Webhook（实时记录）
2. **临时**：点击管理后台 → 播放监控 → "同步历史" 按钮（手动同步）

### Q: 可以配置多个 Emby 服务器吗？

**可以。** 每个 Emby 服务器配置一个 Webhook 指向同一个系统即可。

### Q: 播放检测 Webhook 是必须的吗？

**不是必须的，但强烈推荐：**
- ✅ 配置后自动记录设备和播放历史
- ✅ 配置后可以使用黑名单功能
- ❌ 不配置则需要手动同步数据

### Q: 黑名单检测会影响正常用户吗？

**不会。** 只有匹配黑名单规则的客户端才会被处理，正常客户端不受任何影响。

---

## 🔄 工作流程

### 方式一：使用 MoviePilot PT 搜索

```
用户求片
  ↓
管理员批准（status: approved）
  ↓
管理员点击"PT搜索"按钮
  ↓
手动选择种子并添加下载
  ↓
下载完成后 Emby 扫描媒体库 → 触发 Item Added 事件
  ↓
发送 Webhook 到求片系统
  ↓
系统匹配 TMDB ID
  ↓
更新求片状态 → completed
  ↓
发送 Telegram 通知给用户 ✅
```

### 方式二：完全手动上片

```
用户求片
  ↓
管理员批准（status: approved）
  ↓
管理员手动上传影片到 Emby
  ↓
Emby 扫描媒体库 → 触发 Item Added 事件
  ↓
发送 Webhook 到求片系统
  ↓
系统匹配 TMDB ID
  ↓
更新求片状态 → completed
  ↓
发送 Telegram 通知给用户 ✅
```

---

## 📝 配置模板

### Docker Compose 完整配置

```yaml
services:
  emby-request:
    image: gongjuren8856/emby-request:latest
    container_name: emby-request
    restart: unless-stopped
    ports:
      - "5000:5000"
    volumes:
      - /root/EmbyPanel/instance:/app/instance
      - /root/EmbyPanel/logs:/app/logs
      - /etc/machine-id:/etc/machine-id:ro
    environment:
      - TZ=Asia/Shanghai
      - LICENSE_KEY=你的授权码
      - SECRET_KEY=随机字符串
      
      # Emby 配置
      - EMBY_URL=http://你的Emby地址:8096
      - EMBY_API_KEY=你的EmbyAPIKey
      
      # Webhook Token（可选，推荐配置）
      - WEBHOOK_TOKEN=随机生成的密钥
      
      # 数据库配置
      - DB_HOST=127.0.0.1
      - DB_PORT=3306
      - DB_USER=emby_request
      - DB_PASSWORD=数据库密码
      - DB_NAME=emby_request
      
      # 代理配置（国内服务器必需）
      - SOCKS5_PROXY=socks5://127.0.0.1:1080
    network_mode: host
```

---

## 🎯 总结

### 必需配置

| Webhook | URL | 事件 | 功能 |
|---------|-----|------|------|
| 入库检测 | `/api/webhook/emby` | `Item Added` | 自动完成求片 |

### 推荐配置

| Webhook | URL | 事件 | 功能 |
|---------|-----|------|------|
| 播放检测 | `/api/webhook/emby/playback` | `Playback Start` | 设备管理、播放历史、黑名单 |

### 快速配置清单

1. ✅ 配置入库检测 Webhook（必需）
2. ✅ 配置播放检测 Webhook（推荐）
3. 🔒 配置 Webhook Token（推荐）
4. 📊 测试 Webhook 连通性

---

**相关文档：**
- [README.md](README.md) - 系统完整部署文档
- [Emby API 文档](https://github.com/MediaBrowser/Emby/wiki/API-Documentation)

**技术支持：**
- GitHub Issues: https://github.com/qwer8856/Emby_request/issues
