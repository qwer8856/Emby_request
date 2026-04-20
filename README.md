# Emby Request

一个面向 Emby 站点的影视求片管理系统，提供求片申请、审核处理、入库通知、用户订阅与积分等能力。

## 项目地址

- GitHub：`https://github.com/qwer8856/Emby_request`
- Docker 镜像（主）：`gongjuren8856/emby-request`
- Docker 镜像（兼容）：`gongjuren8856/emby_request`

## 功能概览

- 用户端：TMDB 搜索、求片申请、进度查看、积分签到、兑换码兑换
- 管理端：求片审核、状态流转、手动上片、公告发布、工单处理
- 通知能力：支持 Telegram 通知与 Emby Webhook 入库回调
- 部署方式：支持 Docker / Docker Compose
- 数据库：MySQL

## 快速部署（Docker + MySQL + 代理）

### 1. 准备 MySQL

你可以使用 1Panel、宝塔或独立 MySQL 服务。确保容器可访问到该 MySQL。

示例建库与授权（MySQL 8+）：

```sql
CREATE DATABASE emby_request CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'emby_request'@'%' IDENTIFIED BY 'your_strong_password';
GRANT ALL PRIVILEGES ON emby_request.* TO 'emby_request'@'%';
FLUSH PRIVILEGES;
```

### 2. 配置 `docker-compose.yml`

下面是包含 MySQL 与代理配置的完整示例（可直接改值使用）：

```yaml
services:
  emby-request:
    image: gongjuren8856/emby-request:latest
    # 兼容镜像名（可二选一）：
    # image: gongjuren8856/emby_request:latest
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
      - DB_HOST=127.0.0.1
      - DB_PORT=3306
      - DB_USER=emby_request
      - DB_PASSWORD=your_strong_password
      - DB_NAME=emby_request

      # 代理配置（二选一）
      # 方案A：SOCKS5（推荐）
      - SOCKS5_PROXY=socks5://127.0.0.1:1080
      # 如代理有认证：
      # - SOCKS5_PROXY=socks5://username:password@proxy.example.com:1080

      # 方案B：HTTP/HTTPS
      # - HTTP_PROXY=http://127.0.0.1:7890
      # - HTTPS_PROXY=http://127.0.0.1:7890
      # 如代理有认证：
      # - HTTP_PROXY=http://username:password@proxy.example.com:7890
      # - HTTPS_PROXY=http://username:password@proxy.example.com:7890

      # 可选：不走代理的地址
      - NO_PROXY=localhost,127.0.0.1,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16
    network_mode: host
```

`SECRET_KEY` 生成命令：

```bash
python3 -c "import secrets; print(secrets.token_hex(32))"
```

### 3. 启动服务

```bash
docker compose up -d
docker logs -f emby-request
```

首次启动会自动创建所需数据表。

## 首次登录

- 管理入口：`http://你的服务器IP:5000/embypanel`
- 默认账号：`admin`
- 默认密码：`admin123`

首次登录后请立即修改管理员账号、密码和后台路径。

## 代理配置速查

### 1. 推荐使用 SOCKS5

```yaml
environment:
  - SOCKS5_PROXY=socks5://127.0.0.1:1080
```

### 2. 使用 HTTP/HTTPS

```yaml
environment:
  - HTTP_PROXY=http://127.0.0.1:7890
  - HTTPS_PROXY=http://127.0.0.1:7890
```

### 3. 代理是否生效

查看容器日志：

```bash
docker logs -f emby-request
```

如果 TMDB / Telegram 连接正常，通常说明代理已生效。

## Emby Webhook 配置

入库自动检测与通知说明见：

- [EMBY_WEBHOOK.md](EMBY_WEBHOOK.md)

常用 Webhook 地址：

- `http://你的服务器IP:5000/api/webhook/emby`

## 常见问题

### 1. 页面能打开但求片搜索失败

- 检查 TMDB API Key 是否已在后台配置
- 检查服务器网络或代理配置是否可访问 `api.themoviedb.org`

### 2. Telegram 通知发不出去

- 检查 Bot Token / Chat ID 是否正确
- 检查代理配置是否生效
- 通过容器日志排查请求报错信息

### 3. 数据如何备份

- 应用配置与日志：备份挂载目录（如 `/root/EmbyPanel/instance`、`/root/EmbyPanel/logs`）
- MySQL 数据：使用 `mysqldump` 定期导出

## 相关文件

- 主程序：`app.py`
- Webhook 文档：`EMBY_WEBHOOK.md`
- 容器编排示例：`docker-compose.yml`
- 环境变量示例：`.env.example`
