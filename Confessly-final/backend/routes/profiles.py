# own profile + public profile views
from flask import Blueprint, request, jsonify
import mysql.connector

from db import get_db
from auth_utils import hash_password, check_password
from helpers import (
    require_auth, serialize_dates, allowed_file, can_view_profile_content,
    fetch_profile_by_profile_id, fetch_profile_by_user_id,
)
from security import looks_like_image
from cloudinary_client import upload_image

bp = Blueprint('profiles', __name__)


def _can_view_profile_content(target_profile_id):
    return can_view_profile_content(request.profile_id, target_profile_id)


@bp.route('/api/profiles/<int:profile_id>', methods=['GET'])
@require_auth
def get_public_profile(profile_id):
    try:
        profile = fetch_profile_by_profile_id(profile_id)
        if not profile:
            return jsonify({'status': 'error', 'message': 'Profile not found'}), 404

        is_own = (profile_id == request.profile_id)
        is_private = bool(profile.get('is_private', False))
        can_view = _can_view_profile_content(profile_id)

        # never leak someone else's email
        if not is_own:
            profile['email'] = None

        # a private account's social graph and activity counts stay hidden
        if not can_view:
            for field in ('followers_count', 'following_count', 'posts_count',
                          'comments_count', 'reactions_count'):
                profile[field] = None

        return jsonify({
            'status': 'success', 'profile': serialize_dates(profile),
            'is_own_profile': is_own, 'can_view_content': can_view, 'is_private': is_private,
        }), 200
    except Exception as e:
        print(f'[error] {request.path}: {e}')
        return jsonify({'status': 'error', 'message': 'An internal error occurred'}), 500


@bp.route('/api/user/profile', methods=['GET'])
@require_auth
def get_user_profile():
    try:
        profile = fetch_profile_by_user_id(request.user_id)
        if not profile:
            return jsonify({'status': 'error', 'message': 'User not found'}), 404
        return jsonify({'status': 'success', 'profile': serialize_dates(profile)}), 200
    except Exception as e:
        print(f'[error] {request.path}: {e}')
        return jsonify({'status': 'error', 'message': 'An internal error occurred'}), 500


@bp.route('/api/user/profile', methods=['PUT'])
@require_auth
def update_user_profile():
    try:
        data = request.form
        anonymous_handle = (data.get('username') or '').strip()
        bio = data.get('bio')
        file = request.files.get('avatar')

        if not anonymous_handle:
            return jsonify({'status': 'error', 'message': 'Username is required'}), 400
        if len(anonymous_handle) < 3 or len(anonymous_handle) > 30:
            return jsonify({'status': 'error', 'message': 'Username must be 3-30 characters'}), 400
        if bio is not None and len(bio) > 500:
            return jsonify({'status': 'error', 'message': 'Bio must be 500 characters or less'}), 400

        conn = cursor = None
        try:
            conn = get_db()
            cursor = conn.cursor()

            # don't let two profiles claim the same handle
            cursor.execute('SELECT id FROM profiles WHERE anonymous_handle = %s AND user_id != %s',
                           (anonymous_handle, request.user_id))
            if cursor.fetchone():
                return jsonify({'status': 'error', 'message': 'Username already taken'}), 409

            avatar_url = None
            if file and file.filename != '':
                if allowed_file(file.filename) and looks_like_image(file):
                    avatar_url, _ = upload_image(file, folder='confessly/avatars')
                else:
                    return jsonify({'status': 'error', 'message': 'Invalid image type'}), 400

            cursor.execute('SELECT anonymous_handle FROM profiles WHERE user_id = %s', (request.user_id,))
            old = cursor.fetchone()
            old_handle = old[0] if old else ''
            avatar_set = ', avatar_url = %s' if avatar_url else ''
            avatar_params = [avatar_url] if avatar_url else []

            # only bump username_updated_at when the handle actually changed
            if anonymous_handle != old_handle:
                cursor.execute(
                    'UPDATE profiles SET anonymous_handle = %s, bio = %s, username_updated_at = NOW()'
                    + avatar_set + ' WHERE user_id = %s',
                    (anonymous_handle, bio) + tuple(avatar_params) + (request.user_id,)
                )
            else:
                cursor.execute(
                    'UPDATE profiles SET anonymous_handle = %s, bio = %s'
                    + avatar_set + ' WHERE user_id = %s',
                    (anonymous_handle, bio) + tuple(avatar_params) + (request.user_id,)
                )
            conn.commit()
            return jsonify({'status': 'success', 'message': 'Profile updated'}), 200
        except mysql.connector.Error as err:
            print(f'[db-error] {request.path}: {err}')
            return jsonify({'status': 'error', 'message': 'A database error occurred'}), 500
        finally:
            if cursor: cursor.close()
            if conn: conn.close()
    except Exception as e:
        print(f'[error] {request.path}: {e}')
        return jsonify({'status': 'error', 'message': 'An internal error occurred'}), 500


@bp.route('/api/user/posts', methods=['GET'])
@require_auth
def get_user_posts():
    try:
        limit = request.args.get('limit', 10, type=int)
        offset = request.args.get('offset', 0, type=int)
        conn = cursor = None
        try:
            conn = get_db()
            cursor = conn.cursor(dictionary=True)
            cursor.execute('''
                SELECT p.id, p.title, p.content, p.created_at, p.image_url, cat.name as category_name,
                       (SELECT COUNT(*) FROM reactions r WHERE r.item_id = p.id AND r.item_type = 'post' AND r.reaction_type = 'like') as likes_count,
                       (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) as comments_count
                FROM posts p JOIN categories cat ON p.category_id = cat.id
                WHERE p.profile_id = %s ORDER BY p.created_at DESC LIMIT %s OFFSET %s
            ''', (request.profile_id, limit, offset))
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


@bp.route('/api/user/comments', methods=['GET'])
@require_auth
def get_user_comments():
    try:
        limit = request.args.get('limit', 10, type=int)
        offset = request.args.get('offset', 0, type=int)
        conn = cursor = None
        try:
            conn = get_db()
            cursor = conn.cursor(dictionary=True)
            cursor.execute('''
                SELECT c.id, c.content, c.created_at, p.id as post_id, p.title as post_title
                FROM comments c JOIN posts p ON c.post_id = p.id
                WHERE c.profile_id = %s ORDER BY c.created_at DESC LIMIT %s OFFSET %s
            ''', (request.profile_id, limit, offset))
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


@bp.route('/api/user/settings', methods=['PUT'])
@require_auth
def update_user_settings():
    try:
        data = request.get_json()
        conn = cursor = None
        try:
            conn = get_db()
            cursor = conn.cursor()
            if data.get('theme_preference') is not None:
                cursor.execute('UPDATE profiles SET theme_preference = %s WHERE user_id = %s',
                               (data['theme_preference'], request.user_id))
            if data.get('show_profile_stats') is not None:
                cursor.execute('UPDATE profiles SET show_profile_stats = %s WHERE user_id = %s',
                               (int(data['show_profile_stats']), request.user_id))
            if data.get('is_private') is not None:
                cursor.execute('UPDATE profiles SET is_private = %s WHERE user_id = %s',
                               (int(data['is_private']), request.user_id))
            conn.commit()
            return jsonify({'status': 'success', 'message': 'Settings updated'}), 200
        except mysql.connector.Error as err:
            print(f'[db-error] {request.path}: {err}')
            return jsonify({'status': 'error', 'message': 'A database error occurred'}), 500
        finally:
            if cursor: cursor.close()
            if conn: conn.close()
    except Exception as e:
        print(f'[error] {request.path}: {e}')
        return jsonify({'status': 'error', 'message': 'An internal error occurred'}), 500


@bp.route('/api/user/password', methods=['PUT'])
@require_auth
def change_password():
    try:
        data = request.get_json()
        old = data.get('old_password')
        new = data.get('new_password')
        if not old or not new:
            return jsonify({'status': 'error', 'message': 'Old and new password required'}), 400
        conn = cursor = None
        try:
            conn = get_db()
            cursor = conn.cursor(dictionary=True)
            cursor.execute('SELECT password_hash FROM users WHERE id = %s', (request.user_id,))
            user = cursor.fetchone()
            if not user or not check_password(old, user['password_hash']):
                return jsonify({'status': 'error', 'message': 'Current password is incorrect'}), 401
            cursor.execute('UPDATE users SET password_hash = %s WHERE id = %s',
                           (hash_password(new), request.user_id))
            conn.commit()
            return jsonify({'status': 'success', 'message': 'Password updated'}), 200
        except mysql.connector.Error as err:
            print(f'[db-error] {request.path}: {err}')
            return jsonify({'status': 'error', 'message': 'A database error occurred'}), 500
        finally:
            if cursor: cursor.close()
            if conn: conn.close()
    except Exception as e:
        print(f'[error] {request.path}: {e}')
        return jsonify({'status': 'error', 'message': 'An internal error occurred'}), 500


@bp.route('/api/user/account', methods=['DELETE'])
@require_auth
def delete_account():
    try:
        data = request.get_json()
        password = data.get('password')
        confirmation = data.get('confirmation')
        if not password or confirmation != 'DELETE':
            return jsonify({'status': 'error', 'message': 'Type DELETE to confirm'}), 400
        conn = cursor = None
        try:
            conn = get_db()
            cursor = conn.cursor(dictionary=True)
            cursor.execute('SELECT password_hash FROM users WHERE id = %s', (request.user_id,))
            user = cursor.fetchone()
            if not user or not check_password(password, user['password_hash']):
                return jsonify({'status': 'error', 'message': 'Password incorrect'}), 401
            cursor.execute('DELETE FROM users WHERE id = %s', (request.user_id,))
            conn.commit()
            response = jsonify({'status': 'success', 'message': 'Account deleted'})
            response.delete_cookie('token', path='/')
            return response, 200
        except mysql.connector.Error as err:
            print(f'[db-error] {request.path}: {err}')
            return jsonify({'status': 'error', 'message': 'A database error occurred'}), 500
        finally:
            if cursor: cursor.close()
            if conn: conn.close()
    except Exception as e:
        print(f'[error] {request.path}: {e}')
        return jsonify({'status': 'error', 'message': 'An internal error occurred'}), 500


@bp.route('/api/profiles/<int:profile_id>/posts', methods=['GET'])
@require_auth
def get_public_profile_posts(profile_id):
    try:
        if not _can_view_profile_content(profile_id):
            return jsonify({'status': 'error', 'message': 'This profile is private'}), 403
        limit = request.args.get('limit', 10, type=int)
        offset = request.args.get('offset', 0, type=int)
        conn = cursor = None
        try:
            conn = get_db()
            cursor = conn.cursor(dictionary=True)
            cursor.execute('''
                SELECT p.id, p.title, p.content, p.created_at, p.image_url, cat.name as category_name,
                       (SELECT COUNT(*) FROM reactions r WHERE r.item_id = p.id AND r.item_type = 'post' AND r.reaction_type = 'like') as likes_count,
                       (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) as comments_count
                FROM posts p JOIN categories cat ON p.category_id = cat.id
                WHERE p.profile_id = %s ORDER BY p.created_at DESC LIMIT %s OFFSET %s
            ''', (profile_id, limit, offset))
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


@bp.route('/api/profiles/<int:profile_id>/comments', methods=['GET'])
@require_auth
def get_public_profile_comments(profile_id):
    try:
        if not _can_view_profile_content(profile_id):
            return jsonify({'status': 'error', 'message': 'This profile is private'}), 403
        limit = request.args.get('limit', 10, type=int)
        offset = request.args.get('offset', 0, type=int)
        conn = cursor = None
        try:
            conn = get_db()
            cursor = conn.cursor(dictionary=True)
            cursor.execute('''
                SELECT c.id, c.content, c.created_at, p.id as post_id, p.title as post_title
                FROM comments c JOIN posts p ON c.post_id = p.id
                WHERE c.profile_id = %s ORDER BY c.created_at DESC LIMIT %s OFFSET %s
            ''', (profile_id, limit, offset))
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
