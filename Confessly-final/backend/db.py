from mysql.connector import pooling

from config import MYSQL_CONFIG

connection_pool = None


def init_db_pool():
    global connection_pool
    if connection_pool is not None:
        return
    connection_pool = pooling.MySQLConnectionPool(
        pool_name='confessly_pool',
        pool_size=10,
        pool_reset_session=True,
        **MYSQL_CONFIG,
    )


def get_db():
    if connection_pool is None:
        init_db_pool()
    return connection_pool.get_connection()


def ensure_categories():
    # seed categories if the table is empty
    conn = cursor = None
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute('SELECT COUNT(*) FROM categories')
        count = cursor.fetchone()[0]
        if count == 0:
            categories = [
                (1, 'Rant'), (2, 'Confession'), (3, 'NSFW'),
                (4, 'Sarcasm'), (5, 'Advice'), (6, 'Story'),
                (7, 'Question'), (8, 'Nostalgia'),
            ]
            cursor.executemany(
                'INSERT INTO categories (id, name) VALUES (%s, %s)', categories
            )
            conn.commit()
            print(f'[boot] seeded {len(categories)} categories')
        else:
            print(f'[boot] categories table already has {count} rows, skipping')
    except Exception as e:
        print(f'[boot] category check skipped: {e}')
    finally:
        if cursor: cursor.close()
        if conn: conn.close()


def ensure_post_metric_columns():
    # guarantees view_count/engagement_count exist even if init_db.py was never run
    conn = cursor = None
    try:
        conn = get_db()
        cursor = conn.cursor()
        for column, ddl in (
            ('view_count', 'view_count INT NOT NULL DEFAULT 0'),
            ('engagement_count', 'engagement_count INT NOT NULL DEFAULT 0'),
        ):
            cursor.execute(
                '''
                SELECT COUNT(*) FROM information_schema.COLUMNS
                WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'posts' AND COLUMN_NAME = %s
                ''',
                (column,),
            )
            if cursor.fetchone()[0] == 0:
                cursor.execute(f'ALTER TABLE posts ADD COLUMN {ddl}')
                print(f'[boot] added posts.{column}')
        conn.commit()
    except Exception as e:
        print(f'[boot] post metric column check skipped: {e}')
    finally:
        if cursor: cursor.close()
        if conn: conn.close()
