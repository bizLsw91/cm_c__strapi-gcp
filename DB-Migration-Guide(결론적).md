# MySQL → PostgreSQL (Supabase) 마이그레이션 가이드

> **환경 기준**
> - Source: MySQL 8.x (AWS RDS)
> - Target: PostgreSQL (Supabase)
> - OS: Ubuntu 22.04
> - Python: 3.12

---

## 목차

1. [사전 준비](#1-사전-준비)
2. [왜 pgloader를 사용하지 않는가](#2-왜-pgloader를-사용하지-않는가)
3. [패키지 설치](#3-패키지-설치)
4. [마이그레이션 스크립트](#4-마이그레이션-스크립트)
5. [스크립트 실행](#5-스크립트-실행)
6. [검증 스크립트](#6-검증-스크립트)
7. [Strapi 설정 변경](#7-strapi-설정-변경)
8. [타입 변환 참조표](#8-타입-변환-참조표)
9. [트러블슈팅](#9-트러블슈팅)

---

## 1. 사전 준비

Supabase 대시보드 **SQL Editor**에서 목적지 스키마를 미리 생성합니다.

```sql
CREATE SCHEMA IF NOT EXISTS "YOUR_SCHEMA";
GRANT ALL ON SCHEMA "YOUR_SCHEMA" TO postgres;
GRANT ALL ON SCHEMA "YOUR_SCHEMA" TO anon;
GRANT ALL ON SCHEMA "YOUR_SCHEMA" TO authenticated;
GRANT ALL ON SCHEMA "YOUR_SCHEMA" TO service_role;
```

---

## 2. 왜 pgloader를 사용하지 않는가

처음에는 MySQL → PostgreSQL 마이그레이션 표준 도구인 `pgloader`를 시도했으나
두 가지 문제로 인해 사용이 불가능했습니다.

**문제 1. MySQL `SET` 타입 미지원**

`pgloader 3.6.7`은 MySQL 타입 코드 `76` (`SET` 타입)을 인식하지 못합니다.
`EXCLUDING TABLE NAMES MATCHING`으로 해당 테이블을 제외해도
pgloader는 메타데이터 수집 단계에서 전체 테이블을 먼저 스캔하기 때문에
제외 옵션이 적용되기 전에 이미 오류가 발생합니다.

```
ERROR mysql: 76 fell through ECASE expression.
Wanted one of (2 3 4 5 6 8 9 10 ...)
```

**문제 2. Supabase `session_replication_role` 제한**

Supabase는 `SET session_replication_role = 'DEFAULT'` 구문을 허용하지 않으며
`origin`, `replica`, `local` 값만 사용 가능합니다.

```
ERROR: invalid value for parameter "session_replication_role": "DEFAULT"
HINT: Available values: origin, replica, local.
```

이러한 이유로 **Python 스크립트를 이용한 직접 마이그레이션 방식**을 채택했습니다.

---

## 3. 패키지 설치

```bash
sudo apt-get update
sudo apt-get install -y python3-pip python3-dev libpq-dev
python3 -m pip install mysql-connector-python psycopg2-binary

# 설치 확인
python3 -c "import mysql.connector; print('mysql OK')"
python3 -c "import psycopg2; print('psycopg2 OK')"
```

---

## 4. 마이그레이션 스크립트

```bash
nano migrate.py
```

아래 스크립트에서 접속 정보와 `TARGET_SCHEMA` 값을 환경에 맞게 수정 후 nano 편집기에 붙여넣기 합니다.

```bash
cat > migrate.py << 'EOF'
import mysql.connector
import psycopg2
from psycopg2.extras import execute_batch

# ── 접속 정보 ──────────────────────────────────────────────
MYSQL_CONFIG = {
    "host":               "YOUR_MYSQL_HOST",
    "port":               3306,
    "user":               "YOUR_MYSQL_USER",
    "password":           "YOUR_MYSQL_PASSWORD",
    "database":           "YOUR_MYSQL_DATABASE",
    "connection_timeout": 30,
}

PG_CONFIG = {
    "host":            "YOUR_PG_HOST",
    "port":            5432,
    "user":            "YOUR_PG_USER",
    "password":        "YOUR_PG_PASSWORD",
    "dbname":          "postgres",
    "sslmode":         "require",
    "options":         "-c search_path=YOUR_SCHEMA",
    "connect_timeout": 30,
}

TARGET_SCHEMA = "YOUR_SCHEMA"

# ── 출력 버퍼 즉시 플러시 ──────────────────────────────────
def log(msg):
    print(msg, flush=True)

# ── 값 변환 ───────────────────────────────────────────────
# tinyint(1) → Python bool 변환
# bytearray/bytes → UTF-8 문자열 변환
# MySQL SET 타입 → 콤마 구분 문자열 변환
def convert_value(val, col_type: str):
    if val is None:
        return None
    t = col_type.lower()
    if "tinyint(1)" in t:
        return bool(int(val))
    if isinstance(val, bytearray):
        return bytes(val).decode("utf-8", errors="replace")
    if isinstance(val, bytes):
        return val.decode("utf-8", errors="replace")
    if isinstance(val, set):
        return ",".join(val)
    return val

# ── MySQL 타입 → PostgreSQL 타입 변환 ─────────────────────
def mysql_type_to_pg(col_type: str) -> str:
    t = col_type.lower()
    if "tinyint(1)" in t:                   return "BOOLEAN"
    if "tinyint" in t:                      return "SMALLINT"
    if "bigint" in t:                       return "BIGINT"
    if "int" in t:                          return "INTEGER"
    if "double" in t or "float" in t:       return "DOUBLE PRECISION"
    if "decimal" in t or "numeric" in t:    return "NUMERIC"
    if "datetime" in t or "timestamp" in t: return "TIMESTAMPTZ"
    if "longtext" in t or "mediumtext" in t or "text" in t: return "TEXT"
    if "varchar" in t or "char" in t:       return "TEXT"
    if "json" in t:                         return "JSONB"
    if "set(" in t or "enum(" in t:         return "TEXT"
    return "TEXT"

def main():
    log("MySQL 연결 중...")
    my_conn = mysql.connector.connect(**MYSQL_CONFIG)
    my_cur  = my_conn.cursor(dictionary=True)
    log("MySQL 연결 완료 ✓")

    log("PostgreSQL 연결 중...")
    pg_conn = psycopg2.connect(**PG_CONFIG)
    pg_conn.autocommit = False
    pg_cur  = pg_conn.cursor()
    log("PostgreSQL 연결 완료 ✓\n")

    # 스키마 생성
    pg_cur.execute(f'CREATE SCHEMA IF NOT EXISTS "{TARGET_SCHEMA}"')
    pg_conn.commit()

    # 테이블 목록 조회 - 이후 재사용을 위해 리스트로 저장
    my_cur.execute("SHOW TABLES")
    tables = [list(row.values())[0] for row in my_cur.fetchall()]
    log(f"총 {len(tables)}개 테이블 마이그레이션 시작\n")

    for i, table in enumerate(tables, 1):
        log(f"[{i}/{len(tables)}] {table} 처리 중...")

        # 컬럼 정보 조회
        my_cur.execute(
            "SELECT COLUMN_NAME, COLUMN_TYPE FROM information_schema.COLUMNS "
            "WHERE TABLE_SCHEMA=%s AND TABLE_NAME=%s ORDER BY ORDINAL_POSITION",
            (MYSQL_CONFIG["database"], table)
        )
        cols      = my_cur.fetchall()
        col_names = [c["COLUMN_NAME"] for c in cols]
        col_types = {c["COLUMN_NAME"]: c["COLUMN_TYPE"] for c in cols}

        # PostgreSQL 테이블 생성 (기존 테이블 덮어쓰기)
        col_defs = ", ".join(
            f'"{n}" {mysql_type_to_pg(col_types[n])}'
            for n in col_names
        )
        pg_cur.execute(f'DROP TABLE IF EXISTS "{TARGET_SCHEMA}"."{table}" CASCADE')
        pg_cur.execute(f'CREATE TABLE "{TARGET_SCHEMA}"."{table}" ({col_defs})')
        pg_conn.commit()

        # 데이터 조회 및 삽입
        my_cur.execute(f"SELECT * FROM \`{table}\`")
        rows = my_cur.fetchall()

        if not rows:
            log(f"  → 데이터 없음, 스킵\n")
            continue

        placeholders = ", ".join(["%s"] * len(col_names))
        col_str      = ", ".join([f'"{n}"' for n in col_names])
        insert_sql   = (
            f'INSERT INTO "{TARGET_SCHEMA}"."{table}" ({col_str}) '
            f'VALUES ({placeholders})'
        )

        data = [
            tuple(convert_value(row[n], col_types[n]) for n in col_names)
            for row in rows
        ]

        # page_size=500 으로 배치 삽입
        execute_batch(pg_cur, insert_sql, data, page_size=500)
        pg_conn.commit()
        log(f"  → {len(data)}건 완료\n")

    # 시퀀스 재설정 (AUTO_INCREMENT → SERIAL 시퀀스 동기화)
    # 미리 저장한 tables 리스트 재사용 (SHOW TABLES 재호출 금지)
    log("시퀀스 재설정 중...")
    for table in tables:
        try:
            pg_cur.execute(f"""
                SELECT setval(
                    pg_get_serial_sequence('"{TARGET_SCHEMA}"."{table}"', 'id'),
                    COALESCE((SELECT MAX(id) FROM "{TARGET_SCHEMA}"."{table}"), 1)
                )
            """)
            pg_conn.commit()
        except Exception as e:
            pg_conn.rollback()
            log(f"  시퀀스 스킵 ({table}): {e}")

    my_cur.close(); my_conn.close()
    pg_cur.close(); pg_conn.close()
    log("\n✅ 마이그레이션 완료!")

if __name__ == "__main__":
    main()
EOF
```

---

## 5. 스크립트 실행

`-u` 옵션으로 Python 출력 버퍼링을 비활성화하여 진행 상황을 실시간으로 확인합니다.

```bash
python3 -u migrate.py 2>&1 | tee migration.log
```

정상 실행 시 아래와 같이 출력됩니다.

```
MySQL 연결 중...
MySQL 연결 완료 ✓
PostgreSQL 연결 중...
PostgreSQL 연결 완료 ✓

총 68개 테이블 마이그레이션 시작

[1/68] abouts 처리 중...
  → 데이터 없음, 스킵

[2/68] admin_permissions 처리 중...
  → 196건 완료

...

시퀀스 재설정 중...

✅ 마이그레이션 완료!
```

---

## 6. 검증 스크립트

터미널에 붙여넣기 하면 `verify.py` 파일이 자동 생성됩니다.

```bash
cat > verify.py << 'EOF'
import mysql.connector
import psycopg2

MYSQL_CONFIG = {
    "host":               "YOUR_MYSQL_HOST",
    "port":               3306,
    "user":               "YOUR_MYSQL_USER",
    "password":           "YOUR_MYSQL_PASSWORD",
    "database":           "YOUR_MYSQL_DATABASE",
    "connection_timeout": 30,
}

PG_CONFIG = {
    "host":            "YOUR_PG_HOST",
    "port":            5432,
    "user":            "YOUR_PG_USER",
    "password":        "YOUR_PG_PASSWORD",
    "dbname":          "postgres",
    "sslmode":         "require",
    "options":         "-c search_path=YOUR_SCHEMA",
    "connect_timeout": 30,
}

TARGET_SCHEMA = "YOUR_SCHEMA"

my_conn = mysql.connector.connect(**MYSQL_CONFIG)
my_cur  = my_conn.cursor(dictionary=True)
pg_conn = psycopg2.connect(**PG_CONFIG)
pg_cur  = pg_conn.cursor()

my_cur.execute("SHOW TABLES")
tables = [list(row.values())[0] for row in my_cur.fetchall()]

print(f"{'테이블명':<50} {'MySQL':>8} {'PostgreSQL':>12} {'일치':>6}")
print("-" * 80)

total_ok   = 0
total_fail = 0

for table in tables:
    my_cur.execute(f"SELECT COUNT(*) as cnt FROM \`{table}\`")
    mysql_cnt = my_cur.fetchone()["cnt"]

    pg_cur.execute(f'SELECT COUNT(*) FROM "{TARGET_SCHEMA}"."{table}"')
    pg_cnt = pg_cur.fetchone()[0]

    ok = "✅" if mysql_cnt == pg_cnt else "❌"
    if mysql_cnt == pg_cnt:
        total_ok += 1
    else:
        total_fail += 1

    print(f"{table:<50} {mysql_cnt:>8} {pg_cnt:>12} {ok:>6}")

print("-" * 80)
print(f"결과: 총 {len(tables)}개 | ✅ 일치 {total_ok}개 | ❌ 불일치 {total_fail}개")

my_cur.close(); my_conn.close()
pg_cur.close(); pg_conn.close()
EOF
```

```bash
python3 -u verify.py
```

정상 실행 시 아래와 같이 출력됩니다.

```
테이블명                                            MySQL   PostgreSQL   일치
--------------------------------------------------------------------------------
abouts                                                  0            0     ✅
admin_permissions                                     196          196     ✅
admin_roles                                             4            4     ✅
...
--------------------------------------------------------------------------------
결과: 총 68개 | ✅ 일치 68개 | ❌ 불일치 0개
```

---

## 7. Strapi 설정 변경

마이그레이션 완료 후 Strapi의 DB 연결 설정을 PostgreSQL로 변경합니다.

```js
// config/database.js
module.exports = ({ env }) => ({
  connection: {
    client: 'postgres',
    connection: {
      host:     env('DATABASE_HOST',     'YOUR_PG_HOST'),
      port:     env.int('DATABASE_PORT', 5432),
      database: env('DATABASE_NAME',     'postgres'),
      user:     env('DATABASE_USERNAME', 'YOUR_PG_USER'),
      password: env('DATABASE_PASSWORD', 'YOUR_PG_PASSWORD'),
      ssl:      { rejectUnauthorized: false },
      schema:   env('DATABASE_SCHEMA',   'YOUR_SCHEMA'),
    },
    pool: { min: 2, max: 10 },
  },
});
```

`.env` 파일을 사용하는 경우 아래와 같이 설정합니다.

```env
DATABASE_HOST=YOUR_PG_HOST
DATABASE_PORT=5432
DATABASE_NAME=postgres
DATABASE_USERNAME=YOUR_PG_USER
DATABASE_PASSWORD=YOUR_PG_PASSWORD
DATABASE_SCHEMA=YOUR_SCHEMA
```

---

## 8. 타입 변환 참조표

| MySQL 타입            | PostgreSQL 타입    | 비고                               |
|-----------------------|--------------------|-----------------------------------|
| `tinyint(1)`          | `BOOLEAN`          | `0`/`1` → `False`/`True` 변환 필요 |
| `tinyint`             | `SMALLINT`         |                                   |
| `int`, `int unsigned` | `INTEGER`          |                                   |
| `bigint`              | `BIGINT`           |                                   |
| `double`, `float`     | `DOUBLE PRECISION` |                                   |
| `decimal`             | `NUMERIC`          |                                   |
| `datetime`            | `TIMESTAMPTZ`      |                                   |
| `timestamp`           | `TIMESTAMPTZ`      |                                   |
| `varchar`, `char`     | `TEXT`             |                                   |
| `longtext`, `text`    | `TEXT`             |                                   |
| `json`                | `JSONB`            |                                   |
| `set(...)`            | `TEXT`             | 콤마 구분 문자열로 변환             |
| `enum(...)`           | `TEXT`             |                                   |

---

## 9. 트러블슈팅

### pgloader `76 fell through ECASE expression`

```
ERROR mysql: 76 fell through ECASE expression.
Wanted one of (2 3 4 5 6 8 9 10 ...)
```

MySQL `SET` 타입을 pgloader 3.6.7이 인식하지 못하는 문제입니다.
`EXCLUDING TABLE NAMES MATCHING`으로도 해결되지 않으며
Python 스크립트 방식으로 전환해야 합니다.

---

### `session_replication_role = 'DEFAULT'`

```
ERROR: invalid value for parameter "session_replication_role": "DEFAULT"
HINT: Available values: origin, replica, local.
```

Supabase는 해당 값을 지원하지 않습니다.
`origin`을 사용하거나 해당 구문 자체를 제거해야 합니다.

---

### `column "xxx" is of type boolean but expression is of type integer`

```
psycopg2.errors.DatatypeMismatch: column "is_active" is of type boolean
but expression is of type integer
```

`tinyint(1)` 값을 PostgreSQL `BOOLEAN` 컬럼에 정수 그대로 삽입할 때 발생합니다.
`convert_value` 함수에서 `bool(int(val))`로 명시적 변환이 필요합니다.

```python
# 수정 전
return val

# 수정 후
if "tinyint(1)" in t:
    return bool(int(val))
```

---

### 출력이 나오지 않고 멈춰 보이는 현상

Python 출력 버퍼링으로 인해 실제로는 실행 중이지만
터미널에 표시가 안 되는 경우입니다.
아래 두 가지 방법으로 해결합니다.

```python
# 방법 1. print 에 flush=True 추가
print(msg, flush=True)
```

```bash
# 방법 2. 실행 시 -u 옵션 추가
python3 -u migrate.py
```

---

### `SHOW TABLES` 재호출 시 커서 응답 대기

`my_cur.fetchall()`로 커서를 소진한 후 동일 커서로 `SHOW TABLES`를 재호출하면
응답 대기 상태에 빠질 수 있습니다.
테이블 목록은 최초 1회만 조회하고 리스트로 저장하여 재사용해야 합니다.

```python
# ❌ 잘못된 방법 - SHOW TABLES 를 두 번 호출
my_cur.execute("SHOW TABLES")
tables = [...]

# ... 마이그레이션 로직 ...

my_cur.execute("SHOW TABLES")  # ← 응답 대기 발생
for row in my_cur.fetchall():
    ...

# ✅ 올바른 방법 - 리스트로 저장 후 재사용
my_cur.execute("SHOW TABLES")
tables = [list(row.values())[0] for row in my_cur.fetchall()]

# ... 마이그레이션 로직 ...

for table in tables:  # ← 저장된 리스트 재사용
    ...
```