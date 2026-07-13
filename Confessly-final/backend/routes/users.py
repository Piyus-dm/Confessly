# blocking, follows, reports
from flask import Blueprint, request, jsonify
import mysql.connector

from db import get_db
from helpers import (
    require_auth, serialize_dates, insert_notification,
    is_mutual_follow, can_view_profile_content,
)

bp = Blueprint('users', __name__)


@bp.route('/api/users/search', methods=['GET'])
@require_auth
def search_users():
    try:
        q = request.args.get('q', '').strip()
        if not q:
            return jsonify({'status': 'success', 'data': []}), 200

        conn = cursor = None
        try:
            conn = get_db()
            cursor = conn.cursor(dictionary=True)
            cursor.execute('''
                SELECT pr.id AS profile_id, pr.anonymous_handle, pr.avatar_url, pr.bio, pr.is_private
                FROM profiles pr
                JOIN users u ON u.id = pr.user_id
                WHERE LOWER(pr.anonymous_handle) LIKE LOWER(%s)
                  AND u.is_shadowbanned = 0
                  AND pr.user_id NOT IN (SELECT blocked_id FROM blocked_users WHERE blocker_id = %s)
                  AND pr.user_id NOT IN (SELECT blocker_id FROM blocked_users WHERE blocked_id = %s)
                ORDER BY pr.anonymous_handle ASC
                LIMIT 10
            ''', (f'%{q}%', request.user_id, request.user_id))
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


@bp.route('/api/users/block', methods=['POST'])
@require_auth
def block_user():
    try:
        data = request.get_json()
        target_user_id = data.get('user_id')
        if not target_user_id:
            return jsonify({'status': 'error', 'message': 'user_id is required'}), 400
        if target_user_id == request.user_id:
            return jsonify({'status': 'error', 'message': 'Cannot block yourself'}), 400

        conn = cursor = None
        try:
            conn = get_db()
            cursor = conn.cursor()
            cursor.execute(
                'INSERT INTO blocked_users (blocker_id, blocked_id) VALUES (%s, %s)',
                (request.user_id, target_user_id)
            )
            conn.commit()
            return jsonify({'status': 'success', 'message': 'User blocked'}), 200
        except mysql.connector.IntegrityError:
            return jsonify({'status': 'error', 'message': 'User already blocked'}), 409
        except mysql.connector.Error as err:
            print(f'[db-error] {request.path}: {err}')
            return jsonify({'status': 'error', 'message': 'A database error occurred'}), 500
        finally:
            if cursor: cursor.close()
            if conn: conn.close()
    except Exception as e:
        print(f'[error] {request.path}: {e}')
        return jsonify({'status': 'error', 'message': 'An internal error occurred'}), 500


@bp.route('/api/users/unblock', methods=['POST'])
@require_auth
def unblock_user():
    try:
        data = request.get_json()
        target_user_id = data.get('user_id')
        if not target_user_id:
            return jsonify({'status': 'error', 'message': 'user_id is required'}), 400

        conn = cursor = None
        try:
            conn = get_db()
            cursor = conn.cursor()
            cursor.execute(
                'DELETE FROM blocked_users WHERE blocker_id = %s AND blocked_id = %s',
                (request.user_id, target_user_id)
            )
            conn.commit()
            if cursor.rowcount == 0:
                return jsonify({'status': 'error', 'message': 'User was not blocked'}), 404
            return jsonify({'status': 'success', 'message': 'User unblocked'}), 200
        except mysql.connector.Error as err:
            print(f'[db-error] {request.path}: {err}')
            return jsonify({'status': 'error', 'message': 'A database error occurred'}), 500
        finally:
            if cursor: cursor.close()
            if conn: conn.close()
    except Exception as e:
        print(f'[error] {request.path}: {e}')
        return jsonify({'status': 'error', 'message': 'An internal error occurred'}), 500


@bp.route('/api/users/blocked', methods=['GET'])
@require_auth
def get_blocked_users():
    try:
        conn = cursor = None
        try:
            conn = get_db()
            cursor = conn.cursor(dictionary=True)
            cursor.execute('''
                SELECT u.id AS user_id, p.id AS profile_id, p.anonymous_handle, p.avatar_url, bu.created_at AS blocked_at
                FROM blocked_users bu
                JOIN users u ON u.id = bu.blocked_id
                JOIN profiles p ON p.user_id = u.id
                WHERE bu.blocker_id = %s
                ORDER BY bu.created_at DESC
            ''', (request.user_id,))
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


@bp.route('/api/users/<int:target_profile_id>/follow', methods=['POST'])
@require_auth
def follow_user(target_profile_id):
    try:
        if request.profile_id == target_profile_id:
            return jsonify({'status': 'error', 'message': 'Cannot follow yourself'}), 400
        conn = cursor = None
        try:
            conn = get_db()
            cursor = conn.cursor(dictionary=True)
            cursor.execute('SELECT 1 FROM follows WHERE follower_id = %s AND following_id = %s',
                           (request.profile_id, target_profile_id))
            if cursor.fetchone():
                return jsonify({'status': 'error', 'message': 'Already following'}), 409

            cursor.execute('INSERT INTO follows (follower_id, following_id) VALUES (%s, %s)',
                           (request.profile_id, target_profile_id))
            cursor.execute('UPDATE profiles SET followers_count = followers_count + 1 WHERE id = %s',
                           (target_profile_id,))
            cursor.execute('UPDATE profiles SET following_count = following_count + 1 WHERE id = %s',
                           (request.profile_id,))
            insert_notification(cursor, target_profile_id, request.profile_id, 'follow')
            conn.commit()

            cursor.execute('SELECT followers_count FROM profiles WHERE id = %s', (target_profile_id,))
            return jsonify({'status': 'success', 'message': 'Followed',
                            'followers_count': cursor.fetchone()['followers_count']}), 200
        except mysql.connector.Error as err:
            conn.rollback()
            print(f'[db-error] {request.path}: {err}')
            return jsonify({'status': 'error', 'message': 'A database error occurred'}), 500
        finally:
            if cursor: cursor.close()
            if conn: conn.close()
    except Exception as e:
        print(f'[error] {request.path}: {e}')
        return jsonify({'status': 'error', 'message': 'An internal error occurred'}), 500


@bp.route('/api/users/<int:target_profile_id>/unfollow', methods=['POST'])
@require_auth
def unfollow_user(target_profile_id):
    try:
        if request.profile_id == target_profile_id:
            return jsonify({'status': 'error', 'message': 'Cannot unfollow yourself'}), 400
        conn = cursor = None
        try:
            conn = get_db()
            cursor = conn.cursor(dictionary=True)
            cursor.execute('SELECT 1 FROM follows WHERE follower_id = %s AND following_id = %s',
                           (request.profile_id, target_profile_id))
            if not cursor.fetchone():
                return jsonify({'status': 'error', 'message': 'Not following'}), 404

            cursor.execute('DELETE FROM follows WHERE follower_id = %s AND following_id = %s',
                           (request.profile_id, target_profile_id))
            cursor.execute('UPDATE profiles SET followers_count = GREATEST(0, followers_count - 1) WHERE id = %s',
                           (target_profile_id,))
            cursor.execute('UPDATE profiles SET following_count = GREATEST(0, following_count - 1) WHERE id = %s',
                           (request.profile_id,))
            conn.commit()

            cursor.execute('SELECT followers_count FROM profiles WHERE id = %s', (target_profile_id,))
            return jsonify({'status': 'success', 'message': 'Unfollowed',
                            'followers_count': cursor.fetchone()['followers_count'] if cursor.rowcount else 0}), 200
        except mysql.connector.Error as err:
            conn.rollback()
            print(f'[db-error] {request.path}: {err}')
            return jsonify({'status': 'error', 'message': 'A database error occurred'}), 500
        finally:
            if cursor: cursor.close()
            if conn: conn.close()
    except Exception as e:
        print(f'[error] {request.path}: {e}')
        return jsonify({'status': 'error', 'message': 'An internal error occurred'}), 500


@bp.route('/api/users/<int:target_profile_id>/follow-status', methods=['GET'])
@require_auth
def get_follow_status(target_profile_id):
    try:
        conn = cursor = None
        try:
            conn = get_db()
            cursor = conn.cursor(dictionary=True)
            cursor.execute('SELECT 1 FROM follows WHERE follower_id = %s AND following_id = %s',
                           (request.profile_id, target_profile_id))
            following = cursor.fetchone()
            # do they follow us back? drives the "Follow Back" button
            cursor.execute('SELECT 1 FROM follows WHERE follower_id = %s AND following_id = %s',
                           (target_profile_id, request.profile_id))
            follows_you = cursor.fetchone()
            cursor.execute('SELECT followers_count, following_count, is_private FROM profiles WHERE id = %s',
                           (target_profile_id,))
            target = cursor.fetchone()

            # counts are part of a private profile — don't hand them to outsiders
            can_view = can_view_profile_content(request.profile_id, target_profile_id)
            return jsonify({
                'status': 'success',
                'isFollowing': bool(following),
                'followsYou': bool(follows_you),
                'can_view_content': can_view,
                'followers_count': (target['followers_count'] if target else 0) if can_view else None,
                'following_count': (target['following_count'] if target else 0) if can_view else None,
                'is_private': bool(target['is_private']) if target else False,
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


@bp.route('/api/users/<int:target_profile_id>/mutual-status', methods=['GET'])
@require_auth
def get_mutual_status(target_profile_id):
    try:
        return jsonify({'status': 'success', 'isMutual': is_mutual_follow(request.profile_id, target_profile_id)}), 200
    except Exception as e:
        print(f'[error] {request.path}: {e}')
        return jsonify({'status': 'error', 'message': 'An internal error occurred'}), 500


def _follow_list(target_profile_id, direction):
    # direction: 'followers' (people following target) or 'following' (people target follows)
    if not can_view_profile_content(request.profile_id, target_profile_id):
        return jsonify({'status': 'error', 'message': 'This account is private'}), 403

    limit = min(request.args.get('limit', 50, type=int), 100)
    offset = max(request.args.get('offset', 0, type=int), 0)

    if direction == 'followers':
        join_col, match_col = 'f.follower_id', 'f.following_id'
    else:
        join_col, match_col = 'f.following_id', 'f.follower_id'

    conn = cursor = None
    try:
        conn = get_db()
        cursor = conn.cursor(dictionary=True)
        cursor.execute(f'''
            SELECT pr.id AS profile_id, pr.user_id, pr.anonymous_handle, pr.avatar_url, pr.bio,
                   pr.is_private, f.created_at AS followed_at,
                   EXISTS(SELECT 1 FROM follows me
                          WHERE me.follower_id = %s AND me.following_id = pr.id) AS is_following,
                   EXISTS(SELECT 1 FROM follows them
                          WHERE them.follower_id = pr.id AND them.following_id = %s) AS follows_you
            FROM follows f
            JOIN profiles pr ON pr.id = {join_col}
            JOIN users u ON u.id = pr.user_id
            WHERE {match_col} = %s
              AND pr.user_id NOT IN (SELECT blocked_id FROM blocked_users WHERE blocker_id = %s)
              AND pr.user_id NOT IN (SELECT blocker_id FROM blocked_users WHERE blocked_id = %s)
            ORDER BY f.created_at DESC
            LIMIT %s OFFSET %s
        ''', (request.profile_id, request.profile_id, target_profile_id,
              request.user_id, request.user_id, limit, offset))
        rows = cursor.fetchall()
        for r in rows:
            r['is_following'] = bool(r['is_following'])
            r['follows_you'] = bool(r['follows_you'])
            r['is_self'] = (r['profile_id'] == request.profile_id)
        return jsonify({'status': 'success', 'data': serialize_dates(rows)}), 200
    except mysql.connector.Error as err:
        print(f'[db-error] {request.path}: {err}')
        return jsonify({'status': 'error', 'message': 'A database error occurred'}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()


@bp.route('/api/users/<int:target_profile_id>/followers', methods=['GET'])
@require_auth
def get_followers(target_profile_id):
    try:
        return _follow_list(target_profile_id, 'followers')
    except Exception as e:
        print(f'[error] {request.path}: {e}')
        return jsonify({'status': 'error', 'message': 'An internal error occurred'}), 500


@bp.route('/api/users/<int:target_profile_id>/following', methods=['GET'])
@require_auth
def get_following(target_profile_id):
    try:
        return _follow_list(target_profile_id, 'following')
    except Exception as e:
        print(f'[error] {request.path}: {e}')
        return jsonify({'status': 'error', 'message': 'An internal error occurred'}), 500


@bp.route('/api/reports', methods=['POST'])
@require_auth
def create_report():
    # user-facing report against a post
    try:
        data = request.get_json()
        post_id = data.get('post_id')
        reason = data.get('reason')
        description = data.get('description', '')

        if not post_id or not reason:
            return jsonify({'status': 'error', 'message': 'post_id and reason are required'}), 400

        conn = cursor = None
        try:
            conn = get_db()
            cursor = conn.cursor()
            cursor.execute(
                'INSERT INTO reports (post_id, reporter_id, reason, description, status) VALUES (%s, %s, %s, %s, %s)',
                (post_id, request.user_id, reason, description, 'pending')
            )
            conn.commit()
            return jsonify({'status': 'success', 'message': 'Report submitted'}), 201
        except mysql.connector.Error as err:
            print(f'[db-error] {request.path}: {err}')
            return jsonify({'status': 'error', 'message': 'A database error occurred'}), 500
        finally:
            if cursor: cursor.close()
            if conn: conn.close()
    except Exception as e:
        print(f'[error] {request.path}: {e}')
        return jsonify({'status': 'error', 'message': 'An internal error occurred'}), 500
