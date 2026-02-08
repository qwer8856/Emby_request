#!/usr/bin/env python3
"""
=============================================================
  embyboss → Emby_request 一键数据库迁移脚本 v2.0
=============================================================

✅ 支持目标: MySQL 和 SQLite 双模式
✅ 无损迁移: 账号、密码、到期时间、等级、积分、签到 一步到位
✅ 迁移后: 用户直接用 Emby 用户名 + 密码 登录网站 + 播放

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🐳 Docker Compose 部署使用方法:

  迁移脚本通过 docker-compose.yml 映射到容器内，
  在宿主机编辑配置，然后在容器内执行即可。
  pymysql 容器里已经装好了，无需额外安装。
  目标数据库（Emby_request）的连接信息自动从 compose 环境变量读取。

  步骤:
    1. 把本文件放到 /root/Panel/ 目录下（和 compose 挂载路径一致）

    2. 编辑本文件，只需修改 SOURCE_DB（embyboss 的 MySQL 连接信息）

    3. 在容器内执行迁移:
       docker exec -it emby-request python3 migrate_from_embyboss.py

    4. 迁移完成后重启容器:
       docker restart emby-request

  ⚠️  SOURCE_DB 的 host 怎么填:
    - embyboss 和 emby-request 在同一台服务器上:
      → host 填宿主机内网 IP（如 '172.17.0.1'）
      → 不能填 127.0.0.1（容器里的 127.0.0.1 是容器自己）
    - embyboss 的 MySQL 在其他服务器:
      → 填那台服务器的 IP
    - embyboss 的 MySQL 也在 Docker 里:
      → docker inspect <embyboss的mysql容器名> | grep IPAddress

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️  两个系统字段含义差异（本脚本已正确处理）:
  ┌───────────┬────────────────────────┬────────────────────────────────┐
  │  字段      │  embyboss（源）         │  Emby_request（目标）            │
  ├───────────┼────────────────────────┼────────────────────────────────┤
  │  tg       │  Telegram ID（主键）     │  系统主键（非TG ID）             │
  │  name     │  Emby 用户名           │  网站登录用户名                   │
  │  emby_name│  不存在                │  Emby 用户名（独立字段）           │
  │  pwd      │  Emby 服务器密码        │  网站登录密码                    │
  │  pwd2     │  安全码（二次验证）      │  Emby 服务器密码                  │
  │  us       │  积分（≥30可续期）       │  使用状态（0/1）                  │
  │  iv       │  签到积分（签到获得）     │  邀请次数                        │
  │  coins    │  不存在                 │  签到积分（签到获得）               │
  └───────────┴────────────────────────┴────────────────────────────────┘

  关键映射逻辑:
    embyboss.name     → Emby_request.name（网站登录名）+ emby_name（Emby用户名）
    embyboss.pwd      → Emby_request.pwd（网站登录密码）+ pwd2（Emby密码）
    embyboss.lv       → Emby_request.lv（等级一致: a/b/c/d）
    embyboss.ex       → Emby_request.ex（到期时间）+ subscriptions 表
    embyboss.iv       → Emby_request.coins（签到积分）
    embyboss.tg       → Emby_request.telegram_id（Telegram绑定）
    embyboss.us       → 不迁移（embyboss 积分，Emby_request 无对应字段，us 固定为1）
"""

import random
import time
import sys
import os
import sqlite3
from datetime import datetime

# 尝试导入 pymysql，如果没有安装且不需要MySQL则跳过
try:
    import pymysql
    HAS_PYMYSQL = True
except ImportError:
    HAS_PYMYSQL = False

# ========================================================
#                    ===== 配置区 =====
#      只需要修改这里，其他代码不用动
# ========================================================

# embyboss 的数据库（源数据库，只读不写）
# ⚠️  源数据库只能是 MySQL（embyboss 只用 MySQL）
SOURCE_DB = {
    'host': '127.0.0.1',
    'port': 3306,
    'user': 'root',
    'password': '你的embyboss数据库密码',
    'database': '你的embyboss数据库名',
    'charset': 'utf8mb4',
}

# Emby_request 的目标数据库
# 模式: 'auto' / 'mysql' / 'sqlite'
# 'auto' → 自动检测: 环境变量有 DB_HOST 就用 MySQL，否则用 SQLite（推荐）
TARGET_MODE = 'auto'

# ---- MySQL 模式配置 ----
# 在容器内运行时，自动读取 docker-compose.yml 中的环境变量
# DB_HOST / DB_PORT / DB_USER / DB_PASSWORD / DB_NAME
# 无需手动填写，直接执行即可
TARGET_MYSQL = {
    'host': os.environ.get('DB_HOST', '127.0.0.1'),
    'port': int(os.environ.get('DB_PORT', '3306')),
    'user': os.environ.get('DB_USER', 'root'),
    'password': os.environ.get('DB_PASSWORD', ''),
    'database': os.environ.get('DB_NAME', ''),
    'charset': 'utf8mb4',
}

# ---- SQLite 模式配置（TARGET_MODE='sqlite' 时使用）----
# 容器内路径（docker-compose 已挂载 ./instance → /app/instance）
TARGET_SQLITE_PATH = '/app/instance/movie_requests.db'

# ========================================================
#               ===== 迁移选项 =====
# ========================================================

# Web 登录密码策略（迁移后用户用什么密码登录网页）
# 'same_as_emby' → 网站密码 = Emby 密码，用户无感知（推荐）
# 'safe_code'    → 网站密码 = embyboss 的安全码(pwd2)
# 'fixed'        → 统一设置为固定密码，用户登录后自行修改
PASSWORD_MODE = 'same_as_emby'
FIXED_PASSWORD = '123456'  # 仅 PASSWORD_MODE='fixed' 时生效

# 签到积分迁移策略
# embyboss.iv = 签到积分（签到获得） → Emby_request.coins（签到积分）
# embyboss.us = 积分（Emby_request 无对应字段，不迁移）
# True  → 迁移 iv → coins（推荐）
# False → 不迁移签到积分，coins = 0
MIGRATE_COINS = True

# 是否迁移已禁用的用户 (lv='c')
MIGRATE_BANNED = True

# 是否迁移无账号的用户 (lv='d')
MIGRATE_NO_ACCOUNT = False

# 是否同时迁移 emby2 表（非 Telegram 用户）
MIGRATE_EMBY2 = False

# ========================================================
#               以下代码不需要修改
# ========================================================

def generate_tg_id():
    """生成一个不会和 Telegram ID 冲突的系统主键"""
    # 使用负数范围，确保不会和真实 Telegram ID（正数）冲突
    return -(int(time.time() * 1000) + random.randint(10000, 99999))


# ========== 数据库连接层（统一接口）==========

class MySQLConnection:
    """MySQL 连接封装"""
    def __init__(self, config, name):
        if not HAS_PYMYSQL:
            print(f"  ❌ 需要安装 pymysql: pip install pymysql")
            sys.exit(1)
        try:
            self.conn = pymysql.connect(**config, cursorclass=pymysql.cursors.DictCursor)
            self.db_type = 'mysql'
            print(f"  ✅ {name}连接成功 (MySQL): {config['host']}:{config['port']}/{config['database']}")
        except Exception as e:
            print(f"  ❌ {name}连接失败: {e}")
            sys.exit(1)
    
    def query(self, sql, params=None):
        with self.conn.cursor() as cur:
            cur.execute(sql, params or ())
            return cur.fetchall()
    
    def execute(self, sql, params=None):
        with self.conn.cursor() as cur:
            cur.execute(sql, params or ())
    
    def commit(self):
        self.conn.commit()
    
    def close(self):
        self.conn.close()


class SQLiteConnection:
    """SQLite 连接封装（返回字典格式，兼容 MySQL 的 %s 占位符）"""
    def __init__(self, db_path, name):
        if not os.path.exists(db_path):
            print(f"  ❌ SQLite 数据库文件不存在: {os.path.abspath(db_path)}")
            print(f"     请确认路径正确，或先运行一次 Emby_request 以创建数据库")
            sys.exit(1)
        try:
            self.conn = sqlite3.connect(db_path)
            self.conn.row_factory = sqlite3.Row
            self.db_type = 'sqlite'
            size_mb = os.path.getsize(db_path) / 1024 / 1024
            print(f"  ✅ {name}连接成功 (SQLite): {os.path.abspath(db_path)} ({size_mb:.2f} MB)")
        except Exception as e:
            print(f"  ❌ {name}连接失败: {e}")
            sys.exit(1)
    
    def _convert_sql(self, sql):
        """将 MySQL 风格的 %s 占位符转换为 SQLite 的 ? 占位符"""
        return sql.replace('%s', '?')
    
    def query(self, sql, params=None):
        cur = self.conn.cursor()
        cur.execute(self._convert_sql(sql), params or ())
        rows = cur.fetchall()
        if rows:
            columns = [desc[0] for desc in cur.description]
            return [dict(zip(columns, row)) for row in rows]
        return []
    
    def execute(self, sql, params=None):
        cur = self.conn.cursor()
        cur.execute(self._convert_sql(sql), params or ())
    
    def commit(self):
        self.conn.commit()
    
    def close(self):
        self.conn.close()


def connect_source():
    """连接源数据库（embyboss，必须是 MySQL）"""
    return MySQLConnection(SOURCE_DB, "源(embyboss)")


def connect_target():
    """连接目标数据库（Emby_request，支持 MySQL 或 SQLite）"""
    mode = TARGET_MODE
    
    # auto 模式：检测环境变量判断用 MySQL 还是 SQLite
    if mode == 'auto':
        if os.environ.get('DB_HOST'):
            mode = 'mysql'
            print(f"  🔍 自动检测: 发现 DB_HOST={os.environ['DB_HOST']}，使用 MySQL 模式")
        else:
            mode = 'sqlite'
            print(f"  🔍 自动检测: 未发现 DB_HOST，使用 SQLite 模式")
    
    if mode == 'sqlite':
        return SQLiteConnection(TARGET_SQLITE_PATH, "目标(Emby_request)")
    else:
        return MySQLConnection(TARGET_MYSQL, "目标(Emby_request)")


# ========== 数据读取 ==========

def get_source_users(src):
    """从 embyboss 读取用户数据"""
    conditions = []
    if not MIGRATE_BANNED:
        conditions.append("lv != 'c'")
    if not MIGRATE_NO_ACCOUNT:
        conditions.append("lv != 'd'")
    
    where = f"WHERE {' AND '.join(conditions)}" if conditions else ""
    return src.query(f"SELECT tg, embyid, name, pwd, pwd2, lv, cr, ex, iv, ch FROM emby {where}")


def get_source_emby2_users(src):
    """从 embyboss 读取 emby2 表（可能不存在）"""
    try:
        return src.query("SELECT embyid, name, pwd, pwd2, lv, cr, ex FROM emby2")
    except Exception:
        return []


def get_existing_users(tgt):
    """获取目标数据库中已有的用户信息（用于冲突检测）"""
    try:
        rows = tgt.query("SELECT tg, name, emby_name, telegram_id, embyid FROM emby")
    except Exception:
        # 如果表还不存在（不太可能，但保险起见）
        return {'names': set(), 'emby_names': set(), 'telegram_ids': set(), 'tg_ids': set(), 'emby_ids': set()}
    
    names = set()
    emby_names = set()
    telegram_ids = set()
    tg_ids = set()
    emby_ids = set()
    
    for row in rows:
        if row.get('name'):
            names.add(row['name'].lower())
        if row.get('emby_name'):
            emby_names.add(row['emby_name'].lower())
        if row.get('telegram_id'):
            telegram_ids.add(row['telegram_id'])
        if row.get('embyid'):
            emby_ids.add(row['embyid'])
        tg_ids.add(row['tg'])
    
    return {
        'names': names,
        'emby_names': emby_names,
        'telegram_ids': telegram_ids,
        'tg_ids': tg_ids,
        'emby_ids': emby_ids,
    }


# ========== 字段映射核心逻辑 ==========

def map_user_fields(u):
    """将 embyboss 用户字段映射到 Emby_request 字段
    
    核心映射:
      embyboss.name  → name（网站登录名）+ emby_name（Emby用户名）
                       两者设为相同值，迁移后用户用 name 登录网站，emby_name 关联 Emby 服务
      embyboss.pwd   → pwd（网站登录密码）+ pwd2（Emby服务器密码）
                       迁移后用户密码不变，网站和Emby都能用
      embyboss.tg    → telegram_id（自动完成Telegram绑定）
      embyboss.lv    → lv（等级一致: a=白名单, b=普通, c=禁用, d=无账号）
      embyboss.ex    → ex（到期时间）
      embyboss.iv    → coins（签到积分）
      embyboss.us    → 不迁移（Emby_request 的 us 是使用状态，固定为1）
    """
    telegram_id = u['tg']
    name = u.get('name')
    embyid = u.get('embyid')
    emby_pwd = u.get('pwd', '') or ''
    safe_code = u.get('pwd2', '') or ''
    lv = u.get('lv', 'd')
    cr = u.get('cr')
    ex = u.get('ex')
    src_iv = u.get('iv', 0) or 0
    ch = u.get('ch')
    
    # 1. 网站登录密码
    if PASSWORD_MODE == 'same_as_emby':
        web_pwd = emby_pwd if emby_pwd else '123456'
    elif PASSWORD_MODE == 'safe_code':
        web_pwd = safe_code if safe_code else '123456'
    else:
        web_pwd = FIXED_PASSWORD
    
    # 2. Emby 服务器密码
    emby_server_pwd = emby_pwd
    
    # 3. 签到积分: embyboss.iv → coins
    coins = src_iv if MIGRATE_COINS else 0
    
    # embyboss.us 是积分，Emby_request 无对应字段（余额默认为0），不迁移
    
    return {
        'telegram_id': telegram_id,
        'embyid': embyid,
        'name': name,             # 网站登录用户名 = embyboss 的用户名
        'emby_name': name,        # ★ Emby用户名 = 相同名字（关键！）
        'pwd': web_pwd,           # 网站登录密码
        'pwd2': emby_server_pwd,  # Emby 服务器密码
        'lv': lv,
        'cr': cr,
        'ex': ex,
        'us': 1,                  # Emby_request 的使用状态，固定为1
        'iv': 0,                  # Emby_request 的邀请次数，固定为0
        'ch': ch,
        'coins': coins,           # 签到积分（来自 embyboss.iv）
        # 封禁信息
        'ban_reason': '从 embyboss 迁移（原系统已禁用）' if lv == 'c' else None,
    }


# ========== 数据写入 ==========

def insert_user(tgt, new_pk, fields):
    """插入一条用户记录到目标数据库"""
    tgt.execute("""
        INSERT INTO emby (tg, telegram_id, embyid, name, emby_name, pwd, pwd2, 
                         lv, cr, ex, us, iv, ch, coins, ban_reason)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    """, (
        new_pk,
        fields['telegram_id'],
        fields['embyid'],
        fields['name'],
        fields['emby_name'],
        fields['pwd'],
        fields['pwd2'],
        fields['lv'],
        fields['cr'],
        fields['ex'],
        fields['us'],
        fields['iv'],
        fields['ch'],
        fields['coins'],
        fields['ban_reason'],
    ))


def insert_subscription(tgt, new_pk, cr, ex, lv):
    """为有到期时间的用户创建订阅记录
    
    这样用户在面板上可以直接看到订阅信息。
    白名单用户(lv='a')也创建记录方便管理员查看。
    """
    if not ex:
        return False
    if lv not in ('a', 'b'):
        return False
    
    start_date = cr or ex
    if cr and ex:
        duration_days = (ex - cr).days
        duration_months = max(1, duration_days // 30)
    else:
        duration_months = 1
    
    now = datetime.now()
    status = 'active' if ex > now else 'expired'
    
    tgt.execute("""
        INSERT INTO subscriptions (user_tg, plan_type, plan_name, duration_months, 
                                   price, start_date, end_date, status, auto_renew, 
                                   source, created_at, updated_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    """, (
        new_pk,
        'migrated',
        '从 embyboss 迁移',
        duration_months,
        0,
        start_date,
        ex,
        status,
        False,
        'migration',
        now,
        now,
    ))
    return True


def insert_coin_transaction(tgt, new_pk, coins):
    """为有积分的用户创建初始积分交易记录，保证积分历史可追溯"""
    if not coins or coins <= 0:
        return False
    
    now = datetime.now()
    tgt.execute("""
        INSERT INTO coin_transactions (user_tg, amount, balance_after, trans_type, 
                                       description, created_at)
        VALUES (%s, %s, %s, %s, %s, %s)
    """, (
        new_pk,
        coins,
        coins,
        'migration',
        '从 embyboss 迁移的积分',
        now,
    ))
    return True


# ========== 主迁移流程 ==========

def migrate():
    print()
    print("=" * 64)
    print("   embyboss → Emby_request 数据库迁移工具 v2.0")
    print("=" * 64)
    print()
    
    # ========= 第1步: 连接数据库 =========
    print("📡 [第1步] 连接数据库...")
    src = connect_source()
    tgt = connect_target()
    print()
    
    # ========= 第2步: 读取源数据 =========
    print("📖 [第2步] 读取 embyboss 用户数据...")
    src_users = get_source_users(src)
    print(f"  📊 共读取到 {len(src_users)} 条用户记录")
    
    # 统计信息
    level_count = {}
    has_embyid_count = 0
    has_ex_count = 0
    total_coins_preview = 0
    for u in src_users:
        lv = u.get('lv', 'd')
        level_count[lv] = level_count.get(lv, 0) + 1
        if u.get('embyid'):
            has_embyid_count += 1
        if u.get('ex'):
            has_ex_count += 1
        if MIGRATE_COINS:
            total_coins_preview += (u.get('iv', 0) or 0)
    
    print(f"     白名单(a): {level_count.get('a', 0)} | 普通用户(b): {level_count.get('b', 0)} | "
          f"已禁用(c): {level_count.get('c', 0)} | 无账号(d): {level_count.get('d', 0)}")
    print(f"     有Emby账号: {has_embyid_count} | 有到期时间: {has_ex_count} | 预计迁移签到积分: {total_coins_preview}")
    print()
    
    if not src_users:
        print("  ⚠️  没有需要迁移的用户，退出。")
        return
    
    # ========= 第3步: 检查目标数据库 =========
    print("🔍 [第3步] 检查目标数据库已有用户...")
    existing = get_existing_users(tgt)
    print(f"  📊 目标数据库已有 {len(existing['tg_ids'])} 个用户")
    print()
    
    # ========= 第4步: 冲突检查 =========
    print("⚙️  [第4步] 预处理冲突检查...")
    to_migrate = []
    skipped = {
        'tg': [],
        'name': [],
        'embyid': [],
    }
    
    for u in src_users:
        tg_id = u['tg']
        name = u.get('name', '')
        embyid = u.get('embyid', '')
        
        # 检查 Telegram ID 是否已绑定
        if tg_id in existing['telegram_ids']:
            skipped['tg'].append(f"  ⏭️  TG ID {tg_id} ({name}) - Telegram 已绑定")
            continue
        
        # 检查 Emby ID 是否已存在
        if embyid and embyid in existing['emby_ids']:
            skipped['embyid'].append(f"  ⏭️  EmbyID {embyid} ({name}) - Emby账号已存在")
            continue
        
        # 检查用户名是否冲突
        if name:
            name_lower = name.lower()
            if name_lower in existing['names'] or name_lower in existing['emby_names']:
                skipped['name'].append(f"  ⏭️  用户名 '{name}' (TG: {tg_id}) - 用户名已存在")
                continue
        
        to_migrate.append(u)
    
    total_skipped = sum(len(v) for v in skipped.values())
    
    type_names = {'tg': 'Telegram ID 已绑定', 'name': '用户名冲突', 'embyid': 'Emby账号已存在'}
    for skip_type, items in skipped.items():
        if items:
            print(f"\n  ⚠️  {len(items)} 个用户因「{type_names[skip_type]}」而跳过:")
            for msg in items[:3]:
                print(msg)
            if len(items) > 3:
                print(f"  ... 还有 {len(items) - 3} 个")
    
    print(f"\n  ✅ 将要迁移: {len(to_migrate)} 个用户")
    print(f"  ⏭️  跳过: {total_skipped} 个用户")
    print()
    
    if not to_migrate:
        print("  没有需要迁移的用户，退出。")
        return
    
    # ========= 第5步: 确认 =========
    print("=" * 64)
    print(f"  即将向目标数据库写入 {len(to_migrate)} 条用户记录")
    print(f"  目标数据库类型: {tgt.db_type.upper()}")
    
    pwd_desc = {
        'same_as_emby': '网站密码 = Emby密码（用户用 Emby 用户名+密码 登录网站）',
        'safe_code': '网站密码 = embyboss安全码',
        'fixed': f'统一设为固定密码: {FIXED_PASSWORD}',
    }
    coins_desc = '迁移 iv（签到积分）→ coins' if MIGRATE_COINS else '不迁移签到积分，coins = 0'
    print(f"  密码策略: {pwd_desc.get(PASSWORD_MODE, PASSWORD_MODE)}")
    print(f"  签到积分: {coins_desc}")
    print()
    print("  📋 迁移内容:")
    print("    ✓ 用户名 → 同时写入 name（网站登录名）和 emby_name（Emby用户名）")
    print("    ✓ 密码 → pwd（网站登录密码）+ pwd2（Emby密码）双存储")
    print("    ✓ 等级 → 白名单/普通/禁用 完整保留")
    print("    ✓ 到期时间 → emby.ex 字段 + subscriptions 订阅记录表 双写入")
    if MIGRATE_COINS:
        print("    ✓ 签到积分(iv) → coins 字段 + coin_transactions 交易记录表")
    print("    ✓ 签到时间 → 保留最后签到时间")
    print("    ✓ Emby账号ID → embyid 直接关联")
    print("    ✓ Telegram 绑定 → telegram_id 自动完成")
    print("    ✓ 封禁用户 → 保留封禁原因记录")
    print()
    print("  ⚪ 以下字段默认生成（无需迁移）:")
    print("    · tg（网站ID/主键） → 自动生成负数主键（与注册用户正数隔离）")
    print("    · us（使用状态） → 默认为 1")
    print("    · iv（邀请次数） → 默认为 0")
    print("    · email → 默认为空（用户后续自行绑定）")
    print("    · session_token → 默认为空（首次登录时自动生成）")
    print("    · 邀请返利配置 → 默认为空（跟随全局配置）")
    print("    · 封禁备份字段 → 默认为空（迁移用户无需）")
    print("=" * 64)
    
    confirm = input("\n  确认执行迁移? (输入 yes 继续): ").strip().lower()
    if confirm != 'yes':
        print("  ❌ 已取消迁移。")
        return
    
    # ========= 第6步: 执行迁移 =========
    print(f"\n🚀 [第6步] 开始迁移...")
    
    success = 0
    failed = 0
    sub_count = 0
    coins_migrated = 0
    
    for u in to_migrate:
        try:
            # 生成新的系统主键（负数，避免和 TG ID 冲突）
            new_pk = generate_tg_id()
            while new_pk in existing['tg_ids']:
                new_pk = generate_tg_id()
            existing['tg_ids'].add(new_pk)
            
            # 字段映射
            fields = map_user_fields(u)
            
            # 加入已有集合（防止同一批次内重名）
            if fields['name']:
                existing['names'].add(fields['name'].lower())
                existing['emby_names'].add(fields['name'].lower())
            if fields['embyid']:
                existing['emby_ids'].add(fields['embyid'])
            if fields['telegram_id']:
                existing['telegram_ids'].add(fields['telegram_id'])
            
            # 写入用户记录
            insert_user(tgt, new_pk, fields)
            
            # 创建订阅记录
            if insert_subscription(tgt, new_pk, fields['cr'], fields['ex'], fields['lv']):
                sub_count += 1
            
            # 创建积分交易记录
            if insert_coin_transaction(tgt, new_pk, fields['coins']):
                coins_migrated += fields['coins']
            
            success += 1
            if success % 50 == 0:
                print(f"  📝 已迁移 {success} / {len(to_migrate)} ...")
                tgt.commit()
                
        except Exception as e:
            failed += 1
            print(f"  ❌ 迁移失败: {u.get('name', '?')} (TG: {u['tg']}) - {e}")
    
    tgt.commit()
    
    # 打印 emby 表迁移结果
    print()
    print("─" * 64)
    print(f"  🎉 emby 表迁移完成!")
    print(f"  ✅ 成功: {success} 个用户")
    print(f"  📋 创建订阅记录: {sub_count} 条")
    if coins_migrated:
        print(f"  🎯 迁移签到积分(iv→coins): {coins_migrated}")
    if failed:
        print(f"  ❌ 失败: {failed} 个用户")
    print(f"  ⏭️  跳过: {total_skipped} 个用户")
    print("─" * 64)
    
    # ========= 第7步: emby2 表（可选）=========
    emby2_success = 0
    emby2_failed = 0
    emby2_skipped = 0
    
    if MIGRATE_EMBY2:
        print(f"\n📖 [第7步] 迁移 emby2 表（非 Telegram 用户）...")
        try:
            emby2_users = get_source_emby2_users(src)
            print(f"  📊 emby2 表共 {len(emby2_users)} 条记录")
            
            # 重新获取目标数据库已有用户
            existing = get_existing_users(tgt)
            
            for u in emby2_users:
                try:
                    name = u.get('name', '')
                    embyid = u.get('embyid', '')
                    
                    # 冲突检查
                    if name and name.lower() in existing['names']:
                        emby2_skipped += 1
                        continue
                    if name and name.lower() in existing['emby_names']:
                        emby2_skipped += 1
                        continue
                    if embyid and embyid in existing['emby_ids']:
                        emby2_skipped += 1
                        continue
                    
                    new_pk = generate_tg_id()
                    while new_pk in existing['tg_ids']:
                        new_pk = generate_tg_id()
                    existing['tg_ids'].add(new_pk)
                    
                    e2_pwd = u.get('pwd', '') or ''
                    
                    if PASSWORD_MODE == 'same_as_emby':
                        web_pwd = e2_pwd if e2_pwd else '123456'
                    elif PASSWORD_MODE == 'safe_code':
                        e2_pwd2 = u.get('pwd2', '') or ''
                        web_pwd = e2_pwd2 if e2_pwd2 else '123456'
                    else:
                        web_pwd = FIXED_PASSWORD
                    
                    fields = {
                        'telegram_id': None,
                        'embyid': embyid,
                        'name': name,
                        'emby_name': name,
                        'pwd': web_pwd,
                        'pwd2': e2_pwd,
                        'lv': u.get('lv', 'b'),
                        'cr': u.get('cr'),
                        'ex': u.get('ex'),
                        'us': 1,
                        'iv': 0,
                        'ch': None,
                        'coins': 0,
                        'ban_reason': None,
                    }
                    
                    insert_user(tgt, new_pk, fields)
                    insert_subscription(tgt, new_pk, fields['cr'], fields['ex'], fields['lv'])
                    
                    if name:
                        existing['names'].add(name.lower())
                        existing['emby_names'].add(name.lower())
                    if embyid:
                        existing['emby_ids'].add(embyid)
                    
                    emby2_success += 1
                except Exception as e:
                    emby2_failed += 1
                    print(f"  ❌ emby2 迁移失败: {u.get('name', '?')} - {e}")
            
            tgt.commit()
            print(f"  ✅ emby2 成功: {emby2_success} | 失败: {emby2_failed} | 跳过: {emby2_skipped}")
        except Exception as e:
            print(f"  ⚠️  emby2 表迁移出错（可能源库不存在该表）: {e}")
    
    # ========= 最终汇总 =========
    total_success = success + emby2_success
    total_failed = failed + emby2_failed
    all_skipped = total_skipped + emby2_skipped
    
    print()
    print("=" * 64)
    print(f"  🎉 全部迁移完成!")
    print(f"  ✅ 总成功: {total_success} 个用户")
    if total_failed:
        print(f"  ❌ 总失败: {total_failed} 个用户")
    print(f"  ⏭️  总跳过: {all_skipped} 个用户")
    print("=" * 64)
    print()
    print("  📌 后续操作:")
    print("  1. 重启你的 Emby_request 服务")
    print()
    if PASSWORD_MODE == 'same_as_emby':
        print("  2. 🔑 用户登录方式:")
        print("     网站登录: 使用「Emby 用户名 + Emby 密码」")
        print("     Emby 播放: 密码不变，直接使用")
    elif PASSWORD_MODE == 'safe_code':
        print("  2. 🔑 用户登录方式:")
        print("     网站登录: 使用「Emby 用户名 + 安全码」")
        print("     Emby 播放: 密码不变，直接使用")
    else:
        print("  2. 🔑 用户登录方式:")
        print(f"     网站登录: 使用「Emby 用户名 + {FIXED_PASSWORD}」，然后修改密码")
        print("     Emby 播放: 密码不变，直接使用")
    print()
    print("  3. ✅ 以下数据已自动迁移:")
    print("     • 用户名 → 同时作为网站登录名和Emby用户名")
    print("     • Telegram 绑定 → 已自动完成，Bot 功能可直接使用")
    print("     • 订阅到期时间 → 已完整迁移（白名单用户永不过期）")
    print("     • 用户等级 → 白名单/普通/禁用 完整保留")
    if MIGRATE_COINS:
        print("     • 签到积分(iv) → coins 字段（含交易记录）")
    print("     • Emby 账号ID → 已关联，用户无需重新绑定")
    print()
    print("  4. ⚠️  注意事项:")
    print("     • 迁移的用户 name 和 emby_name 相同（都是 Emby 用户名）")
    print("     • 用户可以登录后在个人中心修改网站用户名（不影响 Emby 用户名）")
    print("     • 如需回滚，请使用数据库备份恢复")
    print()
    
    src.close()
    tgt.close()


if __name__ == '__main__':
    migrate()
