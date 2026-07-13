"""helpers.py — shared decorators, serializers and query helpers"""
from datetime import datetime
from functools import wraps

from flask import request, jsonify

from config import ALLOWED_EXTENSIONS
from auth_utils import decode_jwt
from db import get_db


def serialize_dates(obj):
    # recursively turn datetimes into iso strings
    if isinstance(obj, dict):
        return {k: serialize_dates(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [serialize_dates(item) for item in obj]
    if isinstance(obj, datetime):
        return obj.isoformat()
    return obj


def require_auth(f):
    # pulls user_id + profile_id out of the jwt cookie, lets OPTIONS through for cors
    @wraps(f)
    def decorated(*args, **kwargs):
        if request.method == 'OPTIONS':
            return jsonify({'status': 'ok'}), 200
        token = request.cookies.get('token')
        if not token:
            return jsonify({'status': 'error', 'message': 'Authentication required'}), 401
        payload = decode_jwt(token)
        if payload is None:
            return jsonify({'status': 'error', 'message': 'Invalid or expired token'}), 401
        request.user_id = payload['user_id']

        conn = cursor = None
        try:
            conn = get_db()
            cursor = conn.cursor(dictionary=True)
            cursor.execute('SELECT id FROM profiles WHERE user_id = %s', (request.user_id,))
            profile = cursor.fetchone()
            if profile is None:
                return jsonify({'status': 'error', 'message': 'Profile not found'}), 404
            request.profile_id = profile['id']
        except Exception as e:
            print(f'[auth-error] {request.path}: {e}')
            return jsonify({'status': 'error', 'message': 'Authentication error'}), 500
        finally:
            if cursor: cursor.close()
            if conn: conn.close()
        return f(*args, **kwargs)
    return decorated


def require_admin(f):
    # only lets role='admin' through, stack under require_auth
    @wraps(f)
    def decorated(*args, **kwargs):
        if request.method == 'OPTIONS':
            return jsonify({'status': 'ok'}), 200
        conn = cursor = None
        try:
            conn = get_db()
            cursor = conn.cursor(dictionary=True)
            cursor.execute('SELECT role FROM users WHERE id = %s', (request.user_id,))
            user = cursor.fetchone()
            if not user or user['role'] != 'admin':
                return jsonify({'status': 'error', 'message': 'Unauthorized access. Admins only.'}), 403
        except Exception as e:
            print(f'[auth-error] {request.path}: {e}')
            return jsonify({'status': 'error', 'message': 'Authorization error'}), 500
        finally:
            if cursor: cursor.close()
            if conn: conn.close()
        return f(*args, **kwargs)
    return decorated


# quick static word filter, the real list lives in blacklist_words
BLACKLISTED_WORDS = ['f**k', 'b*tch', 'nuke_word', 'sh*t', 'd*mn', 'a**hole']


def moderate_content(text):
    # mask static bad words with asterisks
    if not text:
        return text
    lower = text.lower()
    for word in BLACKLISTED_WORDS:
        idx = lower.find(word)
        if idx != -1:
            text = text[:idx] + '*' * len(word) + text[idx + len(word):]
            lower = text.lower()
    return text


def check_for_blacklist(cursor, text):
    # returns the first db-blacklisted word found, or None
    if not text:
        return None
    cursor.execute('SELECT word FROM blacklist_words')
    for row in cursor.fetchall():
        word_lower = row['word'].lower()
        if word_lower in text.lower():
            return row['word']
    return None


def log_audit(cursor, action, target_id=None, details=None):
    # caller commits
    cursor.execute(
        'INSERT INTO audit_logs (admin_id, action, target_id, details) VALUES (%s, %s, %s, %s)',
        (request.user_id, action, target_id, details)
    )


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def insert_notification(cursor, profile_id, sender_profile_id, type_, reference_id=None):
    cursor.execute(
        'INSERT INTO notifications (profile_id, sender_profile_id, type, reference_id) VALUES (%s, %s, %s, %s)',
        (profile_id, sender_profile_id, type_, reference_id)
    )


# shared profile select
PROFILE_SELECT = '''
    SELECT
        u.id as user_id, u.email, u.created_at, u.role,
        p.id as profile_id, p.anonymous_handle, p.bio, p.avatar_url,
        p.followers_count, p.following_count, p.show_profile_stats,
        p.theme_preference, p.is_private, p.username_updated_at,
        (SELECT COUNT(*) FROM posts WHERE profile_id = p.id) as posts_count,
        (SELECT COUNT(*) FROM comments WHERE profile_id = p.id) as comments_count,
        (SELECT COUNT(*) FROM reactions WHERE profile_id = p.id) as reactions_count
    FROM users u
    JOIN profiles p ON p.user_id = u.id
    WHERE p.id = %s
'''

# shared post select + visibility filters
POST_SELECT_COMMON = '''
    SELECT p.id, p.title, p.content, p.created_at, p.image_url,
           pr.anonymous_handle, pr.avatar_url, cat.name as category_name,
           pr.id as profile_id, pr.user_id,
           (SELECT COUNT(*) FROM reactions r WHERE r.item_id = p.id AND r.item_type = 'post' AND r.reaction_type = 'like') as likes_count,
           (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) as comments_count,
           (SELECT COUNT(*) FROM reactions r WHERE r.item_id = p.id AND r.item_type = 'post' AND r.reaction_type = 'like' AND r.profile_id = %s) as liked_by_user
    FROM posts p
    JOIN profiles pr ON p.profile_id = pr.id
    JOIN categories cat ON p.category_id = cat.id
'''

SHADOWBAN_FILTER = ' (u.is_shadowbanned = 0 OR pr.id = %s) '
BLOCKED_FILTER = ' pr.user_id NOT IN (SELECT blocked_id FROM blocked_users WHERE blocker_id = %s) '


def fetch_profile_by_profile_id(profile_id):
    conn = cursor = None
    try:
        conn = get_db()
        cursor = conn.cursor(dictionary=True)
        cursor.execute(PROFILE_SELECT, (profile_id,))
        return cursor.fetchone()
    except:
        return None
    finally:
        if cursor: cursor.close()
        if conn: conn.close()


def fetch_profile_by_user_id(user_id):
    conn = cursor = None
    try:
        conn = get_db()
        cursor = conn.cursor(dictionary=True)
        cursor.execute('SELECT id FROM profiles WHERE user_id = %s', (user_id,))
        p = cursor.fetchone()
        if not p:
            return None
        cursor.execute(PROFILE_SELECT, (p['id'],))
        return cursor.fetchone()
    except:
        return None
    finally:
        if cursor: cursor.close()
        if conn: conn.close()


def can_view_profile_content(viewer_profile_id, target_profile_id):
    # single source of truth for private-profile access:
    # your own profile, any public profile, or a private one you mutually follow
    if viewer_profile_id == target_profile_id:
        return True
    profile = fetch_profile_by_profile_id(target_profile_id)
    if not profile:
        return False
    if not profile.get('is_private'):
        return True
    return is_mutual_follow(viewer_profile_id, target_profile_id)


def is_mutual_follow(profile_a_id, profile_b_id):
    conn = cursor = None
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute('SELECT 1 FROM follows WHERE follower_id = %s AND following_id = %s',
                       (profile_a_id, profile_b_id))
        a = cursor.fetchone()
        cursor.execute('SELECT 1 FROM follows WHERE follower_id = %s AND following_id = %s',
                       (profile_b_id, profile_a_id))
        b = cursor.fetchone()
        return bool(a and b)
    except:
        return False
    finally:
        if cursor: cursor.close()
        if conn: conn.close()
