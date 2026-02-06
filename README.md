# Emby Request - 影视求片管理系统

<p align="center">
  <img src="https://img.shields.io/badge/Python-3.9+-blue.svg" alt="Python">
  <img src="https://img.shields.io/badge/Flask-3.0-green.svg" alt="Flask">
  <img src="https://img.shields.io/badge/Docker-支持-2496ED.svg" alt="Docker">
  <img src="https://img.shields.io/badge/MySQL-支持-4479A1.svg" alt="MySQL">
  <img src="https://img.shields.io/badge/SQLite-支持-003B57.svg" alt="SQLite">
</p>

一个功能强大的 Emby 影视求片管理系统，支持用户求片、订阅管理、PT 资源搜索下载、Telegram 通知等功能。

## ✨ 功能特性

### 用户功能
- 🔍 **TMDB 影视搜索** - 支持电影、电视剧搜索，自动获取海报和信息
- 📝 **求片申请** - 用户提交求片请求，支持多种类型
- 📊 **求片进度追踪** - 实时查看求片状态（待审核、下载中、已完成等）
- 🔔 **Telegram 通知** - 绑定 Telegram 接收求片状态推送
- 💳 **订阅套餐** - 支持多种套餐，灵活的求片配额
- 👥 **邀请返利** - 邀请好友获得奖励
- 🎫 **兑换码** - 支持兑换码兑换订阅
- ✅ **每日签到** - 每日签到获得积分，积分可兑换订阅套餐
- 🪙 **积分系统** - 完整的积分获取、消耗、记录跟踪

### 管理功能
- ✅ **求片审核** - 管理员审核用户请求，支持批准、拒绝、手动处理
- 📥 **PT 资源搜索** - 集成 MoviePilot，管理员手动搜索并选择种子下载（可选）
- 📺 **入库检测** - 通过 Emby Webhook 自动检测资源入库
- 🎬 **手动上片支持** - 无需配置 MP，管理员手动上片后自动检测
- 👥 **用户管理** - 用户列表、订阅管理、Emby 账号管理
- 💰 **订单管理** - 支付订单查看和管理
- 📊 **数据统计** - 求片统计、用户统计、收入统计
- 🔐 **动态后台入口** - 安全的管理后台路径
- 📢 **公告系统** - 发布系统公告
- 🎫 **工单系统** - 用户反馈处理

### 系统特性
- 🌐 **Webhook 模式** - Telegram Bot 使用 Webhook，更稳定高效
- 🔒 **代理支持** - 支持 HTTP/HTTPS/SOCKS5 代理（适合国内服务器）
- 📱 **响应式设计** - 完美适配移动端和桌面端（PWA 支持）
- 🎨 **自定义主题** - 支持自定义 CSS/JS
- 💾 **双数据库支持** - 支持 MySQL 和 SQLite
- 🔑 **授权系统** - 软件授权保护

---

## 🚀 快速部署

### Docker 部署（推荐）

#### 方式一：使用 MySQL（推荐）

推荐使用 1Panel 等面板搭建 MySQL，然后直接填入数据库连接信息：

```yaml
services:
  emby-request:
    image: gongjuren8856/emby-request:latest
    container_name: emby-request
    restart: unless-stopped
    ports:
      - "5000:5000"
    volumes:
      - /root/EmbyPanel/instance:/app/instance    # 配置文件
      - /root/EmbyPanel/logs:/app/logs            # 日志文件
      - /etc/machine-id:/etc/machine-id:ro        # 授权验证
    environment:
      - TZ=Asia/Shanghai
      - LICENSE_KEY=你的授权码
      - SECRET_KEY=随机字符串用于加密session
      # MySQL 数据库配置（使用已有的 MySQL 服务）
      - DB_HOST=127.0.0.1          # 数据库地址（如使用1Panel，通常是宿主机IP或127.0.0.1）
      - DB_PORT=3306               # 数据库端口
      - DB_USER=emby_request       # 数据库用户名
      - DB_PASSWORD=your_password  # 数据库密码
      - DB_NAME=emby_request       # 数据库名称
    network_mode: host  # 如需访问宿主机的MySQL，使用host网络模式
```

#### 方式二：使用 SQLite（次选，适合小型站点）

```yaml
services:
  emby-request:
    image: gongjuren8856/emby-request:latest
    container_name: emby-request
    restart: unless-stopped
    ports:
      - "5000:5000"
    volumes:
      - /root/EmbyPanel/instance:/app/instance    # 数据库和配置文件
      - /root/EmbyPanel/logs:/app/logs            # 日志文件
      - /etc/machine-id:/etc/machine-id:ro        # 授权验证
    environment:
      - TZ=Asia/Shanghai
      - LICENSE_KEY=你的授权码
      # 生成命令: python3 -c "import secrets; print(secrets.token_hex(32))"
      - SECRET_KEY=随机字符串用于加密session
```

> 💡 SQLite 数据库文件保存在 `/root/EmbyPanel/instance/emby_request.db`

#### 启动服务

```bash
docker compose up -d
```

---

## 🌐 代理配置（国内服务器必需）

### 为什么需要代理？

如果你的服务器位于**中国大陆**，由于网络限制，无法直接访问以下服务：
- **Telegram Bot API** (`api.telegram.org`) - 用于 Telegram 通知功能
- **TMDB API** (`api.themoviedb.org`) - 用于影视信息搜索
- **TMDB 图片** (`image.tmdb.org`) - 用于加载电影海报

因此，**必须配置代理**才能正常使用这些功能。

### 代理配置方法

#### 方式一：SOCKS5 代理（推荐）

SOCKS5 代理具有更好的兼容性和性能，推荐使用。

**无认证的 SOCKS5 代理：**
```yaml
environment:
  - SOCKS5_PROXY=socks5://代理服务器地址:端口
  # 例如：socks5://127.0.0.1:1080
```

**需要认证的 SOCKS5 代理：**
```yaml
environment:
  - SOCKS5_PROXY=socks5://用户名:密码@代理服务器地址:端口
  # 例如：socks5://admin:password123@proxy.example.com:1080
```

#### 方式二：HTTP/HTTPS 代理

**无认证的 HTTP 代理：**
```yaml
environment:
  - HTTP_PROXY=http://代理服务器地址:端口
  - HTTPS_PROXY=http://代理服务器地址:端口
  # 例如：
  # - HTTP_PROXY=http://127.0.0.1:7890
  # - HTTPS_PROXY=http://127.0.0.1:7890
```

**需要认证的 HTTP 代理：**
```yaml
environment:
  - HTTP_PROXY=http://用户名:密码@代理服务器地址:端口
  - HTTPS_PROXY=http://用户名:密码@代理服务器地址:端口
  # 例如：
  # - HTTP_PROXY=http://admin:password123@proxy.example.com:7890
  # - HTTPS_PROXY=http://admin:password123@proxy.example.com:7890
```

**不走代理的地址（可选）：**
```yaml
environment:
  - NO_PROXY=localhost,127.0.0.1,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16
```

### 完整配置示例

**使用 SOCKS5 代理 + MySQL 的完整配置：**
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
      # 数据库配置
      - DB_HOST=127.0.0.1
      - DB_PORT=3306
      - DB_USER=emby_request
      - DB_PASSWORD=数据库密码
      - DB_NAME=emby_request
      # 代理配置（选择其中一种）
      - SOCKS5_PROXY=socks5://127.0.0.1:1080
      # 或使用 HTTP 代理
      # - HTTP_PROXY=http://127.0.0.1:7890
      # - HTTPS_PROXY=http://127.0.0.1:7890
    network_mode: host
```

### 如何获取代理？

#### 1. 自建代理（推荐）
- 使用境外服务器搭建 V2Ray、Xray、Shadowsocks 等代理服务
- 优点：稳定可控、速度快
- 缺点：需要额外服务器成本

#### 2. 商业代理服务
- 购买 VPN 或代理服务商提供的代理
- 优点：即买即用，无需搭建
- 缺点：需要付费，稳定性取决于服务商

#### 3. 使用本地代理工具
如果你的电脑上已经在运行代理工具（如 Clash、V2rayN 等）：
```yaml
# 将代理地址指向宿主机
- SOCKS5_PROXY=socks5://宿主机IP:代理端口
# 例如 Clash 默认端口是 7890
- HTTP_PROXY=http://192.168.1.100:7890
- HTTPS_PROXY=http://192.168.1.100:7890
```

### 代理测试

配置完成后，查看容器日志确认代理是否生效：
```bash
docker logs emby-request
```

如果看到类似以下日志说明代理配置成功：
```
✅ 代理配置已启用: socks5://127.0.0.1:1080
✅ TMDB API 连接正常
✅ Telegram Bot API 连接正常
```

### 常见问题

**Q: 配置了代理但还是无法访问？**
A: 检查以下几点：
1. 代理服务器是否正常运行
2. 代理地址和端口是否正确
3. 如果有认证，用户名密码是否正确
4. 代理服务器本身是否能访问 Telegram 和 TMDB

**Q: 可以同时配置 SOCKS5 和 HTTP 代理吗？**
A: 可以，系统会优先使用 SOCKS5 代理，如果失败则尝试 HTTP 代理。

**Q: 国外服务器需要配置代理吗？**
A: 不需要。只有中国大陆服务器因网络限制才需要配置代理。

**Q: 代理会影响访问 Emby 服务器吗？**
A: 不会。代理只用于访问 Telegram 和 TMDB API，不影响访问本地或局域网的 Emby 服务器。

---

## 🔧 首次配置

### 1. 访问管理后台

默认管理后台入口：`http://服务器IP:5000/embypanel`

| 配置项 | 默认值 |
|--------|--------|
| 用户名 | `admin` |
| 密码 | `admin123` |

> ⚠️ **首次登录后会强制修改管理员账号密码和后台入口路径！**

### 2. 配置系统

在管理后台 → 系统配置中设置：

| 配置项 | 说明 | 必填 |
|--------|------|------|
| Emby 服务器 | 服务器地址和 API Key | ✅ |
| TMDB API | 用于影视搜索（[获取 API Key](https://www.themoviedb.org/settings/api)） | ✅ |
| Telegram Bot | Bot Token 和通知群组 | 可选 |
| MoviePilot | PT 资源搜索集成 | 可选 |
| 支付配置 | 易支付网关 | 可选 |

### 3. 设置 Telegram Webhook

配置 Telegram Bot Token 后，有两种方式设置 Webhook：

**方式一（推荐）：** 在管理后台 → 系统配置 → Telegram 设置，点击「测试连接」按钮会自动设置 Webhook。

**方式二：** 登录管理后台后，在浏览器地址栏访问：

```
https://你的域名/api/webhook/telegram/setup?url=https://你的域名
```

> ⚠️ Webhook 需要 HTTPS 支持，建议使用 Nginx 反向代理并配置 SSL 证书。

### 4. 配置 Emby Webhook（入库自动检测）

如果管理员手动上片（无论是否使用 MoviePilot），都可以通过 Emby Webhook 自动检测入库并通知用户。

**配置方法：** 详见 [EMBY_WEBHOOK.md](EMBY_WEBHOOK.md)

**核心要点：**
- ✅ 启用 `Item Added` 事件检测入库
- ❌ 禁用客户端播放相关事件
- 🔗 Webhook URL: `http://你的服务器IP:5000/api/webhook/emby`

---

## 📊 数据库对比

| 特性 | MySQL（推荐） | SQLite |
|------|--------------|--------|
| 性能 | 适合中大型站点 | 适合小型站点 |
| 并发支持 | 优秀 | 有限 |
| 备份 | 需要 mysqldump | 直接复制文件 |
| 部署难度 | ⭐⭐ 中等 | ⭐ 简单 |
| 推荐场景 | 生产环境 | 测试/小规模 |

### SQLite 迁移到 MySQL

如果初期使用 SQLite，后期需要迁移到 MySQL：

1. 导出 SQLite 数据
2. 配置 MySQL 环境变量
3. 重启服务（会自动创建表结构）
4. 导入数据

---

## 📱 用户绑定 Telegram

1. 用户登录网站后，点击「绑定 Telegram」按钮
2. 系统生成 6 位绑定码（5 分钟有效）
3. 用户在 Telegram 向 Bot 发送 `/bind 绑定码`
4. 绑定成功后网站自动检测并更新状态

### Bot 命令

| 命令 | 说明 |
|------|------|
| `/start` | 开始使用 |
| `/bind 绑定码` | 绑定网站账号 |
| `/status` | 查看订阅状态 |
| `/unbind` | 解绑账号 |

---

## 📁 目录结构

```
emby-request/
├── app.py              # 主应用
├── license.py          # 授权模块
├── requirements.txt    # Python 依赖
├── docker-compose.yml  # Docker 配置
├── Dockerfile          # Docker 构建文件
├── static/             # 静态资源
│   ├── css/           # 样式文件
│   └── js/            # JavaScript 文件
├── templates/          # HTML 模板
│   ├── dashboard.html  # 用户面板
│   ├── admin.html     # 管理后台
│   └── ...
├── instance/           # 运行时数据
│   ├── emby_request.db # SQLite 数据库（如使用）
│   ├── plans_config.json
│   └── system_config.json
└── logs/               # 日志文件
```

---

## 🔑 授权说明

本软件需要授权才能运行。

### 获取授权

1. 部署 Docker 容器后查看日志获取机器码：
   ```bash
   docker logs emby-request
   ```

2. 联系管理员提供机器码获取授权码

3. 在 `docker-compose.yml` 中配置 `LICENSE_KEY`

---

## ❓ 常见问题

### Q: 没有配置 MoviePilot 可以使用吗？
A: **可以！** 系统完全支持手动上片模式：
- 用户正常求片
- 管理员批准后手动上传到 Emby
- 配置 Emby Webhook 自动检测入库
- 系统自动通知用户完成

详见 [EMBY_WEBHOOK.md](EMBY_WEBHOOK.md)

### Q: PT 搜索是自动下载吗？
A: **不是。** PT 搜索是管理员手动操作：
- 管理员点击"PT搜索"按钮
- 系统展示搜索结果（种子列表）
- 管理员手动选择合适的种子
- 点击下载按钮添加到下载客户端
- 下载完成后 Emby 自动检测入库

### Q: 无法访问 Telegram/TMDB？
A: 国内服务器需要配置代理，参考上方「代理配置」章节。

### Q: 如何备份数据？
A: 
- SQLite：备份 `/root/EmbyPanel/instance` 目录
- MySQL：使用 `mysqldump` 导出数据库

### Q: 如何更新版本？
```bash
cd /root/EmbyPanel
docker compose pull
docker compose up -d
```

### Q: 忘记管理后台入口？
A: 查看 `/root/EmbyPanel/instance/system_config.json` 文件中的 `secret_path` 字段。

---

## � 求片通知文案模板

本节提供多种求片通知文案模板，可在管理后台的**系统设置 → 🔔 求片通知设置**中配置使用。

### 可用变量说明

| 变量 | 说明 | 示例 |
|------|------|------|
| `{user}` | 求片用户名（带点击链接） | @username |
| `{admin}` | @ 管理员提醒 | @admin1 @admin2 |
| `{title}` | 影片名称 | 海军罪案调查处 |
| `{year}` | 上映年份 | 2003 |
| `{category}` | 影片类型 | 🎬 欧美剧 |
| `{tmdb_id}` | TMDB ID | 4614 |
| `{tmdb_url}` | TMDB 详情链接 | https://www.themoviedb.org/... |
| `{time}` | 求片时间 | 2026-02-03 09:24:23 |
| `{scope}` | 求片范围（仅剧集） | 全部23季 |
| `{overview}` | 影片简介 | NCIS（海军犯罪调查机构）是一部关于... |

### 模板示例

#### 1. 简洁风格
适合快速通知，信息精简：
```html
🎬 {user} 求片了：{title}
📅 年份：{year}
📁 类型：{category}
{admin}
```

#### 2. 标准风格（推荐⭐）
信息完整，格式清晰：
```html
🔔 {user} 发来了新的求片请求 {admin}
━━━━━━━━━━━━━━━━━━
🎞 <b>影片名称：</b>{title}
📅 <b>上映年份：</b>{year}
📁 <b>影片类型：</b>{category}
🆔 <b>TMDB ID：</b><code>{tmdb_id}</code>
📝 <b>简介：</b>{overview}
━━━━━━━━━━━━━━━━━━
🔗 {tmdb_url}
⏰ <b>求片时间：</b>{time}
```

#### 3. 可爱风格
轻松活泼的群组氛围：
```html
💌 新求片来啦~ {admin}

👤 <b>求片用户：</b>{user}
🎬 <b>片名：</b>{title} ({year})
📂 <b>分类：</b>{category}

{overview}

🔗 {tmdb_url}
📅 {time}
```

#### 4. 极简风格
追求简洁，快速浏览：
```html
📬 {user} 求片：<b>{title}</b> ({year})
{category} | {tmdb_id}
{tmdb_url}
```

#### 5. 专业风格
正式场合，强调效率：
```html
<b>📢 求片通知 - {category}</b>

<b>用户：</b>{user}
<b>影片：</b>{title}
<b>年份：</b>{year}
<b>TMDB：</b><code>{tmdb_id}</code>

<i>{overview}</i>

🔗 <a href="{tmdb_url}">查看详情</a>
⏰ {time}

{admin} 请尽快处理
```

### HTML 标签使用说明

Telegram 支持以下 HTML 标签：
- `<b>粗体文字</b>` - 加粗显示
- `<i>斜体文字</i>` - 斜体显示
- `<code>代码文字</code>` - 等宽字体
- `<a href="链接">显示文字</a>` - 超链接
- `<u>下划线文字</u>` - 下划线
- `<s>删除线文字</s>` - 删除线

### 使用技巧

1. **变量可选** - 不需要的变量可以直接删除，不会影响其他内容
2. **保留关键信息** - 建议至少保留 `{title}` 和 `{tmdb_url}` 以便查看详情
3. **测试效果** - 修改后建议先在测试群组发送测试消息
4. **个性化** - 可以根据自己的喜好自由组合变量和文字
5. **简介控制** - 如果开启"显示影片简介"，`{overview}` 变量才有内容
6. **管理员提醒** - 如果关闭"@ 提醒管理员"，`{admin}` 变量会显示空白

### 注意事项

- 消息长度建议控制在 4096 字符以内（Telegram 限制）
- 海报图片最大 10MB
- 使用自定义文案时，海报和简介的开关仍然生效
- 推送至个人时，用户必须已与 Bot 交互过（发送过 /start）

---

## 🎁 签到系统

### 功能概述

签到系统允许用户每日签到获得积分（可自定义货币名称），积分可用于兑换订阅套餐。

#### 主要功能

1. **每日签到**：用户每天可签到一次，获得随机积分奖励
2. **连续签到**：记录连续签到天数，断签后重新计算
3. **积分管理**：记录所有积分变动，包括签到、兑换等操作
4. **套餐兑换**：用户可使用积分兑换订阅套餐，自动延长订阅时间
5. **管理员配置**：完全可配置的签到奖励和兑换套餐

### 首次使用

签到系统会在应用首次启动时**自动创建**所需的数据库表，无需手动执行迁移脚本。

启动应用后，系统会自动：
- 在 `emby` 表添加 `coins` 字段（用户积分）
- 创建 `checkin_records` 表（签到记录）
- 创建 `coin_transactions` 表（积分交易记录）
- 创建 `exchange_records` 表（套餐兑换记录）
- 创建必要的索引以优化查询性能

**注意**：如果数据库表已存在，迁移脚本会自动跳过，不会重复创建或报错。

### 管理员配置

1. 登录管理后台
2. 进入「系统设置」页面
3. 找到「签到系统配置」卡片
4. 配置以下选项：

#### 基本配置

- **启用签到功能**：开关，开启后用户仪表盘会显示签到卡片
- **货币名称**：自定义积分的显示名称（例如：积分、金币、豆子等）
- **最少获得**：签到最少获得的积分数（1-100）
- **最多获得**：签到最多获得的积分数（1-100）

#### 兑换套餐配置

点击「添加套餐」按钮，配置可兑换的订阅套餐：

- **套餐ID**：唯一标识符（如：plan1, plan_7days）
- **套餐名称**：显示给用户的名称（如：7天套餐）
- **天数**：兑换后延长的订阅天数
- **积分**：兑换所需的积分数

示例配置：
```
ID: plan1, 名称: 7天套餐, 天数: 7, 积分: 50
ID: plan2, 名称: 15天套餐, 天数: 15, 积分: 100
ID: plan3, 名称: 30天套餐, 天数: 30, 积分: 180
```

### 用户使用

#### 签到

1. 登录用户仪表盘
2. 在首页找到「每日签到」卡片
3. 点击「立即签到」按钮
4. 签到成功后会显示获得的积分数

**注意**：
- 每天只能签到一次
- 签到获得的积分在配置的范围内随机
- 连续签到会累计天数

#### 兑换套餐

1. 在签到卡片下方找到「兑换套餐」区域
2. 查看可兑换的套餐列表
3. 确认有足够的积分
4. 点击「立即兑换」按钮
5. 确认兑换后，订阅时间会自动延长

#### 查看记录

- **签到日历**：显示最近7天的签到情况
- **兑换记录**：显示最近的兑换记录
- **积分交易记录**：可通过 API 查看完整的积分变动历史

### 常见问题

#### Q: 如何修改已有用户的积分？
A: 目前只能通过数据库直接修改 emby 表的 coins 字段，后续可以添加管理员界面功能。

#### Q: 用户可以重复签到吗？
A: 不可以，数据库有唯一约束（user_id + checkin_date），每天只能签到一次。

#### Q: 签到功能关闭后，用户的积分会清零吗？
A: 不会，积分数据会保留，只是签到卡片不显示。

#### Q: 如何删除兑换记录？
A: 兑换记录仅用于展示，不影响订阅状态。如需删除，请直接操作数据库 exchange_records 表。

#### Q: 兑换后订阅时间如何计算？
A: 如果用户订阅未过期，则在当前到期时间基础上增加；如果已过期，则从当前日期开始计算。

---

## � 相关项目

- [Emby](https://emby.media/) - 媒体服务器
- [MoviePilot](https://github.com/jxxghp/MoviePilot) - 自动化媒体管理
- [TMDB](https://www.themoviedb.org/) - 电影数据库

## 📄 许可证

本项目为商业软件，未经授权禁止使用。

---

## 📝 更新日志

### v2.1.0 (2026-02-07) — 安全加固 & 代码优化

#### 🔒 安全加固
- **安全响应头** — `after_request` 添加 4 个安全头：
  - `X-Content-Type-Options: nosniff` — 防止 MIME 类型嗅探
  - `X-Frame-Options: SAMEORIGIN` — 防止点击劫持
  - `X-XSS-Protection: 1; mode=block` — 浏览器内置 XSS 防护
  - `Referrer-Policy: strict-origin-when-cross-origin` — 控制 Referrer 泄露
- **Session Cookie 安全**：
  - `SESSION_COOKIE_HTTPONLY = True` — 禁止 JS 读取 Cookie，防止 XSS 窃取
  - `SESSION_COOKIE_SAMESITE = Lax` — 防止 CSRF 跨站请求伪造
  - `PERMANENT_SESSION_LIFETIME = 7天` — Session 自动过期
- **FLASK_DEBUG 默认关闭** — 默认值从 `True` 改为 `False`，生产环境不再暴露堆栈和源码（如需调试，设置环境变量 `FLASK_DEBUG=True`）
- **清理后端调试输出** — 移除启动时 print 的 MoviePilot 配置信息，避免日志泄露

#### 🧹 代码清理
- **清理 console.log** — 清除 6 个 JS 文件中约 50+ 条调试日志，防止浏览器控制台暴露内部逻辑
  - `admin.js`、`dashboard.js`、`checkin.js`、`admin-checkin.js`、`login.js`、`sw.js`
  - 保留所有 `console.error` / `console.warn`（错误处理日志）

#### 📦 缓存优化
- **Gzip Vary 头** — 压缩响应后添加 `Vary: Accept-Encoding`，确保 CDN/代理正确缓存
- **Service Worker 版本更新** — `emby-request-v1` → `v2`，浏览器自动清理旧缓存
- **静态文件版本号统一** — 修复同一文件在不同模板版本号不一致的问题：
  - `common.css` → v23（全站统一）
  - `common.js` → v22（全站统一）
  - 更新所有修改过的 JS/CSS 文件版本号

---

<p align="center">
  Made with ❤️ by <a href="https://github.com/qwer8856">qwer8856</a>
</p>
