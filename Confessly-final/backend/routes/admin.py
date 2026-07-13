"""admin routes — all behind require_auth + require_admin"""
from datetime import date, datetime, timezone, timedelta

from flask import Blueprint, request, jsonify
import mysql.connector

from db import get_db
from helpers import require_auth, require_admin, serialize_dates, log_audit

bp = Blueprint('admin', __name__)


@bp.route('/api/admin/reports', methods=['GET'])
@require_auth
@require_admin
def admin_get_reports():
    # pending reports with post/comment/reporter context
    try:
        conn = cursor = None
        try:
            conn = get_db()
            cursor = conn.cursor(dictionary=True)
            cursor.execute('''
                SELECT
                    r.id AS report_id,
                    r.reason,
                    r.description AS report_description,
                    r.status,
                    r.created_at AS report_created_at,
                    reporter.id AS reporter_user_id,
                    reporter_pr.anonymous_handle AS reporter_handle,
                    p.id AS post_id,
                    p.title AS post_title,
                    p.content AS post_content,
                    p.image_url AS post_image_url,
                    pr.user_id AS post_author_user_id,
                    pr.anonymous_handle AS post_author_handle,
                    c.id AS comment_id,
                    c.content AS comment_content,
                    c_pr.anonymous_handle AS comment_author_handle
                FROM reports r
                JOIN users reporter ON reporter.id = r.reporter_id
                JOIN profiles reporter_pr ON reporter_pr.user_id = reporter.id
                LEFT JOIN posts p ON p.id = r.post_id
                LEFT JOIN profiles pr ON pr.id = p.profile_id
                LEFT JOIN comments c ON c.id = r.comment_id
                LEFT JOIN profiles c_pr ON c_pr.id = c.profile_id
                WHERE r.status = 'pending'
                ORDER BY r.created_at DESC
            ''')
            return jsonify({'status': 'success', 'data': serialize_dates(cursor.fetchall())}), 200
        except mysql.connector.Error as err:
            print(f'[db-error] {request.path}: {err}')
            return jsonify({'status': 'error', 'message': 'A database error occurred'}), 500
        finally:
            if cursor: cursor.close()
            if conn: conn.close()
    except Exception as e:
        print(f'[error] {request.path}: {e}')
        return jsonify({'status': 'error', 'message': 'An internal error occurred'}), 500


@bp.route('/api/admin/actions/ban', methods=['POST'])
@require_auth
@require_admin
def admin_ban_user():
    try:
        data = request.get_json()
        target_user_id = data.get('user_id')
        duration_days = data.get('duration_days', 7)

        if not target_user_id:
            return jsonify({'status': 'error', 'message': 'user_id is required'}), 400

        conn = cursor = None
        try:
            conn = get_db()
            cursor = conn.cursor(dictionary=True)

            banned_until = None
            if duration_days and duration_days > 0:
                banned_until = datetime.now(timezone.utc) + timedelta(days=int(duration_days))

            cursor.execute(
                'UPDATE users SET is_banned = 1, banned_until = %s WHERE id = %s',
                (banned_until, target_user_id)
            )

            details = f"Banned {'indefinitely' if banned_until is None else f'for {duration_days} days (until {banned_until.isoformat()})'}"
            log_audit(cursor, 'account_ban', target_user_id, details)
            conn.commit()

            return jsonify({'status': 'success', 'message': f'User {target_user_id} banned.', 'banned_until': banned_until.isoformat() if banned_until else None}), 200
        except mysql.connector.Error as err:
            print(f'[db-error] {request.path}: {err}')
            return jsonify({'status': 'error', 'message': 'A database error occurred'}), 500
        finally:
            if cursor: cursor.close()
            if conn: conn.close()
    except Exception as e:
        print(f'[error] {request.path}: {e}')
        return jsonify({'status': 'error', 'message': 'An internal error occurred'}), 500


@bp.route('/api/admin/actions/shadowban', methods=['POST'])
@require_auth
@require_admin
def admin_shadowban():
    try:
        data = request.get_json()
        target_user_id = data.get('user_id')
        status = bool(data.get('status', True))

        if not target_user_id:
            return jsonify({'status': 'error', 'message': 'user_id is required'}), 400

        conn = cursor = None
        try:
            conn = get_db()
            cursor = conn.cursor()
            cursor.execute('UPDATE users SET is_shadowbanned = %s WHERE id = %s', (int(status), target_user_id))

            action_label = 'enabled' if status else 'disabled'
            log_audit(cursor, 'shadowban_toggle', target_user_id, f'Shadowban {action_label} for user {target_user_id}')
            conn.commit()

            return jsonify({'status': 'success', 'message': f'Shadowban {action_label} for user {target_user_id}.'}), 200
        except mysql.connector.Error as err:
            print(f'[db-error] {request.path}: {err}')
            return jsonify({'status': 'error', 'message': 'A database error occurred'}), 500
        finally:
            if cursor: cursor.close()
            if conn: conn.close()
    except Exception as e:
        print(f'[error] {request.path}: {e}')
        return jsonify({'status': 'error', 'message': 'An internal error occurred'}), 500


@bp.route('/api/admin/actions/delete_post', methods=['POST'])
@require_auth
@require_admin
def admin_delete_post():
    try:
        data = request.get_json()
        post_id = data.get('post_id')

        if not post_id:
            return jsonify({'status': 'error', 'message': 'post_id is required'}), 400

        conn = cursor = None
        try:
            conn = get_db()
            cursor = conn.cursor()

            # resolve related reports, then delete (cascades to comments/reactions)
            cursor.execute("UPDATE reports SET status = 'resolved' WHERE post_id = %s", (post_id,))
            cursor.execute('DELETE FROM posts WHERE id = %s', (post_id,))

            log_audit(cursor, 'delete_post', post_id, f'Post {post_id} deleted by admin')
            conn.commit()

            return jsonify({'status': 'success', 'message': f'Post {post_id} deleted.'}), 200
        except mysql.connector.Error as err:
            print(f'[db-error] {request.path}: {err}')
            return jsonify({'status': 'error', 'message': 'A database error occurred'}), 500
        finally:
            if cursor: cursor.close()
            if conn: conn.close()
    except Exception as e:
        print(f'[error] {request.path}: {e}')
        return jsonify({'status': 'error', 'message': 'An internal error occurred'}), 500


@bp.route('/api/admin/stats', methods=['GET'])
@require_auth
@require_admin
def admin_get_stats():
    try:
        conn = cursor = None
        try:
            conn = get_db()
            cursor = conn.cursor(dictionary=True)

            cursor.execute('SELECT COUNT(*) AS total_users FROM users')
            total_users = cursor.fetchone()['total_users']

            cursor.execute('SELECT COUNT(*) AS total_posts FROM posts')
            total_posts = cursor.fetchone()['total_posts']

            cursor.execute("SELECT COUNT(*) AS total_pending_reports FROM reports WHERE status = 'pending'")
            total_pending_reports = cursor.fetchone()['total_pending_reports']

            cursor.execute('SELECT COUNT(*) AS banned_users FROM users WHERE is_banned = 1')
            banned_users = cursor.fetchone()['banned_users']

            return jsonify({
                'status': 'success',
                'data': {
                    'total_users': total_users,
                    'total_posts': total_posts,
                    'total_pending_reports': total_pending_reports,
                    'banned_users': banned_users,
                }
            }), 200
        except mysql.connector.Error as err:
            print(f'[db-error] {request.path}: {err}')
            return jsonify({'status': 'error', 'message': 'A database error occurred'}), 500
        finally:
            if cursor: cursor.close()
            if conn: conn.close()
    except Exception as e:
        print(f'[error] {request.path}: {e}')
        return jsonify({'status': 'error', 'message': 'An internal error occurred'}), 500


@bp.route('/api/admin/logs', methods=['GET'])
@require_auth
@require_admin
def admin_get_logs():
    try:
        conn = cursor = None
        try:
            conn = get_db()
            cursor = conn.cursor(dictionary=True)
            cursor.execute('''
                SELECT created_at, action, target_id, details
                FROM audit_logs
                ORDER BY created_at DESC
                LIMIT 50
            ''')
            rows = cursor.fetchall()
            return jsonify({'status': 'success', 'data': serialize_dates(rows)}), 200
        except mysql.connector.Error as err:
            print(f'[db-error] {request.path}: {err}')
            return jsonify({'status': 'error', 'message': 'A database error occurred'}), 500
        finally:
            if cursor: cursor.close()
            if conn: conn.close()
    except Exception as e:
        print(f'[error] {request.path}: {e}')
        return jsonify({'status': 'error', 'message': 'An internal error occurred'}), 500


@bp.route('/api/admin/reports/<int:report_id>', methods=['DELETE'])
@require_auth
@require_admin
def admin_dismiss_report(report_id):
    try:
        conn = cursor = None
        try:
            conn = get_db()
            cursor = conn.cursor()
            cursor.execute("UPDATE reports SET status = 'dismissed' WHERE id = %s", (report_id,))
            conn.commit()
            return jsonify({'status': 'success', 'message': 'Report dismissed'}), 200
        except mysql.connector.Error as err:
            print(f'[db-error] {request.path}: {err}')
            return jsonify({'status': 'error', 'message': 'A database error occurred'}), 500
        finally:
            if cursor: cursor.close()
            if conn: conn.close()
    except Exception as e:
        print(f'[error] {request.path}: {e}')
        return jsonify({'status': 'error', 'message': 'An internal error occurred'}), 500


@bp.route('/api/admin/actions/suspend_user', methods=['POST'])
@require_auth
@require_admin
def admin_suspend_user():
    # suspend for a chosen duration, defaults to 7 days
    try:
        data = request.get_json()
        target_user_id = data.get('user_id')
        if not target_user_id:
            return jsonify({'status': 'error', 'message': 'user_id is required'}), 400

        duration_unit = str(data.get('duration_unit', 'days')).lower()
        if duration_unit not in ('minutes', 'hours', 'days'):
            return jsonify({'status': 'error', 'message': 'duration_unit must be minutes, hours, or days'}), 400
        try:
            duration_value = int(data.get('duration_value', 7))
        except (TypeError, ValueError):
            return jsonify({'status': 'error', 'message': 'duration_value must be a number'}), 400
        if duration_value <= 0:
            return jsonify({'status': 'error', 'message': 'duration_value must be greater than 0'}), 400

        conn = cursor = None
        try:
            conn = get_db()
            cursor = conn.cursor()
            banned_until = datetime.now(timezone.utc) + timedelta(**{duration_unit: duration_value})
            cursor.execute('UPDATE users SET is_banned = 1, banned_until = %s WHERE id = %s',
                           (banned_until, target_user_id))
            duration_label = f'{duration_value} {duration_unit if duration_value != 1 else duration_unit[:-1]}'
            log_audit(cursor, 'suspend_user', target_user_id,
                      f'Suspended for {duration_label} until {banned_until.isoformat()}')
            conn.commit()
            return jsonify({'status': 'success', 'message': f'User {target_user_id} suspended for {duration_label}'}), 200
        except mysql.connector.Error as err:
            print(f'[db-error] {request.path}: {err}')
            return jsonify({'status': 'error', 'message': 'A database error occurred'}), 500
        finally:
            if cursor: cursor.close()
            if conn: conn.close()
    except Exception as e:
        print(f'[error] {request.path}: {e}')
        return jsonify({'status': 'error', 'message': 'An internal error occurred'}), 500


@bp.route('/api/admin/actions/unsuspend_user', methods=['POST'])
@require_auth
@require_admin
def admin_unsuspend_user():
    # lift a suspension early
    try:
        data = request.get_json()
        target_user_id = data.get('user_id')
        if not target_user_id:
            return jsonify({'status': 'error', 'message': 'user_id is required'}), 400
        conn = cursor = None
        try:
            conn = get_db()
            cursor = conn.cursor()
            cursor.execute('UPDATE users SET is_banned = 0, banned_until = NULL WHERE id = %s',
                           (target_user_id,))
            if cursor.rowcount == 0:
                return jsonify({'status': 'error', 'message': 'User not found or not suspended'}), 404
            log_audit(cursor, 'unsuspend_user', target_user_id, 'Suspension lifted by admin')
            conn.commit()
            return jsonify({'status': 'success', 'message': f'User {target_user_id} unsuspended'}), 200
        except mysql.connector.Error as err:
            print(f'[db-error] {request.path}: {err}')
            return jsonify({'status': 'error', 'message': 'A database error occurred'}), 500
        finally:
            if cursor: cursor.close()
            if conn: conn.close()
    except Exception as e:
        print(f'[error] {request.path}: {e}')
        return jsonify({'status': 'error', 'message': 'An internal error occurred'}), 500


@bp.route('/api/admin/suspended_users', methods=['GET'])
@require_auth
@require_admin
def admin_suspended_users():
    try:
        conn = cursor = None
        try:
            conn = get_db()
            cursor = conn.cursor(dictionary=True)
            cursor.execute('''
                SELECT u.id, u.email, u.banned_until, u.created_at,
                       pr.anonymous_handle, pr.avatar_url
                FROM users u
                LEFT JOIN profiles pr ON pr.user_id = u.id
                WHERE u.is_banned = 1
                ORDER BY u.banned_until IS NULL DESC, u.banned_until DESC
            ''')
            return jsonify({'status': 'success', 'data': serialize_dates(cursor.fetchall())}), 200
        except mysql.connector.Error as err:
            print(f'[db-error] {request.path}: {err}')
            return jsonify({'status': 'error', 'message': 'A database error occurred'}), 500
        finally:
            if cursor: cursor.close()
            if conn: conn.close()
    except Exception as e:
        print(f'[error] {request.path}: {e}')
        return jsonify({'status': 'error', 'message': 'An internal error occurred'}), 500


@bp.route('/api/admin/blacklist', methods=['GET', 'POST'])
@require_auth
@require_admin
def admin_blacklist():
    try:
        conn = cursor = None
        try:
            conn = get_db()
            cursor = conn.cursor(dictionary=True)

            if request.method == 'GET':
                cursor.execute('SELECT id, word FROM blacklist_words ORDER BY word ASC')
                return jsonify({'status': 'success', 'data': cursor.fetchall()}), 200

            elif request.method == 'POST':
                data = request.get_json()
                word = data.get('word', '').strip().lower()
                if not word or len(word) < 2:
                    return jsonify({'status': 'error', 'message': 'Word must be at least 2 characters'}), 400
                cursor.execute('SELECT id FROM blacklist_words WHERE word = %s', (word,))
                if cursor.fetchone():
                    return jsonify({'status': 'error', 'message': 'Word already exists'}), 409
                cursor.execute('INSERT INTO blacklist_words (word) VALUES (%s)', (word,))
                conn.commit()
                return jsonify({'status': 'success', 'message': 'Word added'}), 201
        except mysql.connector.Error as err:
            print(f'[db-error] {request.path}: {err}')
            return jsonify({'status': 'error', 'message': 'A database error occurred'}), 500
        finally:
            if cursor: cursor.close()
            if conn: conn.close()
    except Exception as e:
        print(f'[error] {request.path}: {e}')
        return jsonify({'status': 'error', 'message': 'An internal error occurred'}), 500


@bp.route('/api/admin/blacklist/<int:word_id>', methods=['DELETE'])
@require_auth
@require_admin
def admin_blacklist_delete(word_id):
    try:
        conn = cursor = None
        try:
            conn = get_db()
            cursor = conn.cursor()
            cursor.execute('DELETE FROM blacklist_words WHERE id = %s', (word_id,))
            conn.commit()
            if cursor.rowcount == 0:
                return jsonify({'status': 'error', 'message': 'Word not found'}), 404
            return jsonify({'status': 'success', 'message': 'Word removed'}), 200
        except mysql.connector.Error as err:
            print(f'[db-error] {request.path}: {err}')
            return jsonify({'status': 'error', 'message': 'A database error occurred'}), 500
        finally:
            if cursor: cursor.close()
            if conn: conn.close()
    except Exception as e:
        print(f'[error] {request.path}: {e}')
        return jsonify({'status': 'error', 'message': 'An internal error occurred'}), 500


@bp.route('/api/admin/announce', methods=['POST'])
@require_auth
@require_admin
def admin_announce():
    # newest announcement becomes the active one
    try:
        data = request.get_json()
        title = data.get('title', '').strip()
        message = data.get('message', '').strip()
        if not title or not message:
            return jsonify({'status': 'error', 'message': 'Title and message are required'}), 400
        conn = cursor = None
        try:
            conn = get_db()
            cursor = conn.cursor()
            cursor.execute(
                'UPDATE announcements SET is_active = 0 WHERE is_active = 1'
            )
            cursor.execute(
                'INSERT INTO announcements (title, message, is_active) VALUES (%s, %s, 1)',
                (title, message)
            )
            conn.commit()
            log_audit(cursor, 'broadcast', details=f'Announcement: {title}')
            conn.commit()
            return jsonify({'status': 'success', 'message': 'Announcement sent'}), 201
        except mysql.connector.Error as err:
            print(f'[db-error] {request.path}: {err}')
            return jsonify({'status': 'error', 'message': 'A database error occurred'}), 500
        finally:
            if cursor: cursor.close()
            if conn: conn.close()
    except Exception as e:
        print(f'[error] {request.path}: {e}')
        return jsonify({'status': 'error', 'message': 'An internal error occurred'}), 500


@bp.route('/api/admin/chart_stats', methods=['GET'])
@require_auth
@require_admin
def admin_chart_stats():
    # posts + signups per day, last 7 days, zero-filled
    try:
        conn = cursor = None
        try:
            conn = get_db()
            cursor = conn.cursor(dictionary=True)

            cursor.execute('''
                SELECT
                    DATE(created_at) AS day,
                    COUNT(*) AS count
                FROM posts
                WHERE created_at >= CURDATE() - INTERVAL 6 DAY
                GROUP BY DATE(created_at)
                ORDER BY day ASC
            ''')
            posts_rows = cursor.fetchall()

            cursor.execute('''
                SELECT
                    DATE(created_at) AS day,
                    COUNT(*) AS count
                FROM users
                WHERE created_at >= CURDATE() - INTERVAL 6 DAY
                GROUP BY DATE(created_at)
                ORDER BY day ASC
            ''')
            users_rows = cursor.fetchall()

            chart_data = []
            for i in range(6, -1, -1):
                d = date.today() - timedelta(days=i)
                day_str = d.isoformat()
                posts_count = 0
                users_count = 0
                for r in posts_rows:
                    if r['day'] and str(r['day']) == day_str:
                        posts_count = r['count']
                        break
                for r in users_rows:
                    if r['day'] and str(r['day']) == day_str:
                        users_count = r['count']
                        break
                chart_data.append({
                    'day': d.strftime('%a'),
                    'posts': posts_count,
                    'users': users_count,
                })

            return jsonify({'status': 'success', 'data': chart_data}), 200
        except mysql.connector.Error as err:
            print(f'[db-error] {request.path}: {err}')
            return jsonify({'status': 'error', 'message': 'A database error occurred'}), 500
        finally:
            if cursor: cursor.close()
            if conn: conn.close()
    except Exception as e:
        print(f'[error] {request.path}: {e}')
        return jsonify({'status': 'error', 'message': 'An internal error occurred'}), 500
