import os
from datetime import datetime, timezone

from flask import Flask, jsonify
from flask_cors import CORS
from apscheduler.schedulers.background import BackgroundScheduler

from config import MAX_CONTENT_LENGTH, FLASK_SECRET_KEY, FRONTEND_URL
from db import init_db_pool, get_db, ensure_categories, ensure_post_metric_columns
from scoring import calculate_trending_score
from routes import auth, oauth, posts, users, profiles, notifications, admin

app = Flask(__name__)
app.secret_key = FLASK_SECRET_KEY

ALLOWED_ORIGINS = [FRONTEND_URL]
if FRONTEND_URL.startswith('http://localhost') or FRONTEND_URL.startswith('http://127.0.0.1'):
    ALLOWED_ORIGINS += ['http://localhost:5173', 'http://127.0.0.1:5173']
CORS(app, supports_credentials=True, resources={r"/api/*": {"origins": ALLOWED_ORIGINS, "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"], "allow_headers": ["Content-Type", "Authorization"]}})


@app.after_request
def set_security_headers(response):
    response.headers.setdefault('X-Content-Type-Options', 'nosniff')
    response.headers.setdefault('X-Frame-Options', 'DENY')
    response.headers.setdefault('Referrer-Policy', 'strict-origin-when-cross-origin')
    return response

app.config['MAX_CONTENT_LENGTH'] = MAX_CONTENT_LENGTH

# boot
init_db_pool()
ensure_categories()
ensure_post_metric_columns()

# routes live in routes/ as blueprints
app.register_blueprint(auth.bp)
app.register_blueprint(oauth.bp)
app.register_blueprint(posts.bp)
app.register_blueprint(users.bp)
app.register_blueprint(profiles.bp)
app.register_blueprint(notifications.bp)
app.register_blueprint(admin.bp)


@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy'}), 200


def recalculate_trending_scores():
    # runs hourly, recalcs scores for posts from the last 14 days
    print(f'[cron] recalculating trending scores at {datetime.now(timezone.utc).isoformat()}')
    conn = cursor = None
    try:
        conn = get_db()
        cursor = conn.cursor(dictionary=True)
        cursor.execute('''
            SELECT p.id, p.created_at,
                   (SELECT COUNT(*) FROM reactions r WHERE r.item_id = p.id AND r.item_type = 'post' AND r.reaction_type = 'like') as likes_count,
                   (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) as comments_count
            FROM posts p
            WHERE p.created_at >= NOW() - INTERVAL 14 DAY
        ''')
        posts_rows = cursor.fetchall()
        updated = 0
        for post in posts_rows:
            score = calculate_trending_score(
                likes_count=post['likes_count'],
                comments_count=post['comments_count'],
                created_at_str=str(post['created_at']) if post['created_at'] else None,
            )
            cursor.execute('UPDATE posts SET trending_score = %s WHERE id = %s', (score, post['id']))
            updated += 1
        conn.commit()
        print(f'[cron] updated {updated} posts')
    except Exception as e:
        print(f'[cron] error: {e}')
    finally:
        if cursor: cursor.close()
        if conn: conn.close()


# module-level so it also runs under gunicorn, not just `python app.py`
# (only works right with one worker, otherwise it'd run once per worker)
if os.getenv('DISABLE_SCHEDULER', '0') != '1':
    scheduler = BackgroundScheduler()
    scheduler.add_job(
        func=recalculate_trending_scores,
        trigger='cron',
        hour='*',
        minute='0',
        id='trending_score_hourly',
        replace_existing=True,
    )
    scheduler.start()

if __name__ == '__main__':
    # never ship the werkzeug debugger — enable locally with FLASK_DEBUG=1
    debug_mode = os.getenv('FLASK_DEBUG', '0') == '1'
    app.run(debug=debug_mode, use_reloader=False, port=5000)
