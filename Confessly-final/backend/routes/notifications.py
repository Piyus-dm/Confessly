# notification list + unread count + mark-read
from datetime import datetime

from flask import Blueprint, request, jsonify
import mysql.connector

from db import get_db
from helpers import require_auth, serialize_dates

bp = Blueprint('notifications', __name__)


@bp.route('/api/notifications', methods=['GET'])
@require_auth
def get_notifications():
    try:
        conn = cursor = None
        try:
            conn = get_db()
            cursor = conn.cursor(dictionary=True)
            cursor.execute('''
                SELECT n.id, n.sender_profile_id, n.type, n.reference_id, n.is_read, n.created_at,
                       pr.anonymous_handle AS sender_handle, pr.avatar_url AS sender_avatar
                FROM notifications n
                JOIN profiles pr ON pr.id = n.sender_profile_id
                WHERE n.profile_id = %s
                ORDER BY n.created_at DESC LIMIT 50
            ''', (request.profile_id,))
            items = cursor.fetchall()

            # mix in global admin announcements
            cursor.execute('''
                SELECT id, title, message, created_at
                FROM announcements
                ORDER BY created_at DESC LIMIT 10
            ''')
            for a in cursor.fetchall():
                items.append({
                    'id': f"ann_{a['id']}",
                    'sender_profile_id': None,
                    'type': 'announcement',
                    'reference_id': None,
                    'is_read': 1,
                    'created_at': a['created_at'],
                    'sender_handle': 'Confessly',
                    'sender_avatar': None,
                    'title': a['title'],
                    'message': a['message'],
                })

            items.sort(
                key=lambda n: n['created_at'] or datetime.min,
                reverse=True,
            )
            return jsonify({'status': 'success', 'data': serialize_dates(items[:50])}), 200
        except mysql.connector.Error as err:
            print(f'[db-error] {request.path}: {err}')
            return jsonify({'status': 'error', 'message': 'A database error occurred'}), 500
        finally:
            if cursor: cursor.close()
            if conn: conn.close()
    except Exception as e:
        print(f'[error] {request.path}: {e}')
        return jsonify({'status': 'error', 'message': 'An internal error occurred'}), 500


@bp.route('/api/notifications/unread-count', methods=['GET'])
@require_auth
def get_unread_notification_count():
    try:
        conn = cursor = None
        try:
            conn = get_db()
            cursor = conn.cursor()
            cursor.execute('SELECT COUNT(*) FROM notifications WHERE profile_id = %s AND is_read = 0',
                           (request.profile_id,))
            return jsonify({'status': 'success', 'count': cursor.fetchone()[0]}), 200
        except mysql.connector.Error as err:
            print(f'[db-error] {request.path}: {err}')
            return jsonify({'status': 'error', 'message': 'A database error occurred'}), 500
        finally:
            if cursor: cursor.close()
            if conn: conn.close()
    except Exception as e:
        print(f'[error] {request.path}: {e}')
        return jsonify({'status': 'error', 'message': 'An internal error occurred'}), 500


@bp.route('/api/notifications/mark-read', methods=['POST'])
@require_auth
def mark_notifications_read():
    try:
        conn = cursor = None
        try:
            conn = get_db()
            cursor = conn.cursor()
            cursor.execute('UPDATE notifications SET is_read = 1 WHERE profile_id = %s AND is_read = 0',
                           (request.profile_id,))
            conn.commit()
            return jsonify({'status': 'success', 'message': 'Marked read'}), 200
        except mysql.connector.Error as err:
            print(f'[db-error] {request.path}: {err}')
            return jsonify({'status': 'error', 'message': 'A database error occurred'}), 500
        finally:
            if cursor: cursor.close()
            if conn: conn.close()
    except Exception as e:
        print(f'[error] {request.path}: {e}')
        return jsonify({'status': 'error', 'message': 'An internal error occurred'}), 500
