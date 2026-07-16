# run this after pulling updates: python init_db.py
# creates any missing tables/columns and seeds default categories
import mysql.connector
from config import MYSQL_CONFIG

SQL_STATEMENTS = [
    """
    CREATE TABLE IF NOT EXISTS social_accounts (
        id          INT AUTO_INCREMENT PRIMARY KEY,
        user_id     INT          NOT NULL,
        provider    VARCHAR(50)  NOT NULL,
        provider_id VARCHAR(255) NOT NULL,
        created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_provider (provider, provider_id),
        CONSTRAINT sa_fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    """,
    """
    CREATE TABLE IF NOT EXISTS password_resets (
        id         INT AUTO_INCREMENT PRIMARY KEY,
        email      VARCHAR(255) NOT NULL,
        otp_code   VARCHAR(6)   NOT NULL,
        used       TINYINT(1)   NOT NULL DEFAULT 0,
        expires_at DATETIME     NOT NULL,
        created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_email_otp (email, otp_code)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    """,
    """
    CREATE TABLE IF NOT EXISTS reports (
        id          INT AUTO_INCREMENT PRIMARY KEY,
        post_id     INT          DEFAULT NULL,
        comment_id  INT          DEFAULT NULL,
        reporter_id INT          NOT NULL,
        reason      TEXT         NOT NULL,
        status      VARCHAR(20)  NOT NULL DEFAULT 'pending',
        created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT reports_fk_reporter FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT reports_fk_post     FOREIGN KEY (post_id)     REFERENCES posts(id)   ON DELETE CASCADE,
        CONSTRAINT reports_fk_comment  FOREIGN KEY (comment_id)  REFERENCES comments(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    """,
    """
    CREATE TABLE IF NOT EXISTS audit_logs (
        id          INT AUTO_INCREMENT PRIMARY KEY,
        admin_id    INT          NOT NULL,
        action      VARCHAR(50)  NOT NULL,
        target_id   INT          DEFAULT NULL,
        details     TEXT         DEFAULT NULL,
        created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT audit_fk_admin FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    """,
    """
    CREATE TABLE IF NOT EXISTS blacklist_words (
        id         INT AUTO_INCREMENT PRIMARY KEY,
        word       VARCHAR(255) NOT NULL UNIQUE,
        created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    """,
    """
    CREATE TABLE IF NOT EXISTS announcements (
        id         INT AUTO_INCREMENT PRIMARY KEY,
        title      VARCHAR(255) NOT NULL,
        message    TEXT         NOT NULL,
        is_active  TINYINT(1)   NOT NULL DEFAULT 1,
        created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    """,
]

# columns added by later features: (table, column, ddl)
COLUMNS = [
    ('users',    'role',                "role VARCHAR(20) NOT NULL DEFAULT 'user'"),
    ('users',    'is_banned',           'is_banned TINYINT(1) NOT NULL DEFAULT 0'),
    ('users',    'banned_until',        'banned_until DATETIME DEFAULT NULL'),
    ('users',    'is_shadowbanned',     'is_shadowbanned TINYINT(1) NOT NULL DEFAULT 0'),
    ('profiles', 'is_private',          'is_private TINYINT(1) DEFAULT 0'),
    ('profiles', 'username_updated_at', 'username_updated_at DATETIME DEFAULT NULL'),
    ('reports',  'description',         'description TEXT DEFAULT NULL'),
    ('announcements', 'is_active',      'is_active TINYINT(1) NOT NULL DEFAULT 1'),
    ('profiles', 'theme_preference',    "theme_preference VARCHAR(10) NOT NULL DEFAULT 'dark'"),
]

DEFAULT_CATEGORIES = [
    (1, 'Rant'), (2, 'Confession'), (3, 'NSFW'), (4, 'Sarcasm'),
    (5, 'Advice'), (6, 'Story'), (7, 'Question'), (8, 'Nostalgia'),
]


def ensure_column(cursor, table, column, ddl):
    # only add it if it's not already there
    cursor.execute(
        """
        SELECT COUNT(*) FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = %s AND COLUMN_NAME = %s
        """,
        (table, column),
    )
    if cursor.fetchone()[0] == 0:
        cursor.execute(f'ALTER TABLE {table} ADD COLUMN {ddl}')
        print(f'[init_db] added column {table}.{column}')


def seed_categories(cursor):
    cursor.execute('SELECT COUNT(*) FROM categories')
    if cursor.fetchone()[0] == 0:
        cursor.executemany('INSERT INTO categories (id, name) VALUES (%s, %s)', DEFAULT_CATEGORIES)
        print(f'[init_db] seeded {len(DEFAULT_CATEGORIES)} categories')


def migrate():
    conn = None
    cursor = None
    try:
        conn = mysql.connector.connect(**MYSQL_CONFIG)
        cursor = conn.cursor()
        for sql in SQL_STATEMENTS:
            cursor.execute(sql)
        for table, column, ddl in COLUMNS:
            ensure_column(cursor, table, column, ddl)
        try:
            seed_categories(cursor)
        except mysql.connector.Error as err:
            print(f'[init_db] category seed skipped: {err}')
        conn.commit()
        print("[init_db] done")
    except mysql.connector.Error as err:
        print(f"[init_db] db error: {err}")
    except Exception as e:
        print(f"[init_db] error: {e}")
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


if __name__ == '__main__':
    migrate()
