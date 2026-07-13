# confessions, comments, trending, feed
import os
import uuid

from flask import Blueprint, request, jsonify
import mysql.connector

from config import UPLOAD_FOLDER, BACKEND_URL
from db import get_db
from helpers import (
    require_auth, serialize_dates, allowed_file, moderate_content,
    check_for_blacklist, insert_notification,
    POST_SELECT_COMMON, SHADOWBAN_FILTER, BLOCKED_FILTER,
)
from security import looks_like_image

bp = Blueprint('posts', __name__)


@bp.route('/api/confessions', methods=['POST'])
@require_auth
def create_confession():
    try:
        title = request.form.get('title')
        content = request.form.get('content')
        category_id = request.form.get('category_id', '')

        if not title or not content:
            return jsonify({'status': 'error', 'message': 'Title and content are required!'}), 400
        if len(title) > 255:
            return jsonify({'status': 'error', 'message': 'Title must be 255 characters or less'}), 400
        if len(content) > 10000:
            return jsonify({'status': 'error', 'message': 'Content must be 10,000 characters or less'}), 400
        if not category_id:
            return jsonify({'status': 'error', 'message': 'Category is required!'}), 400

        try:
            category_id = int(category_id)
        except (ValueError, TypeError):
            return jsonify({'status': 'error', 'message': 'Invalid category selected.'}), 400

        image_url = None
        file = request.files.get('image')
        if file and file.filename != '':
            if allowed_file(file.filename) and looks_like_image(file):
                ext = file.filename.rsplit('.', 1)[1].lower()
                secure_name = f"{uuid.uuid4().hex}.{ext}"
                file_path = os.path.join(UPLOAD_FOLDER, secure_name)
                file.save(file_path)
                image_url = f"{BACKEND_URL}/static/uploads/{secure_name}"
            else:
                return jsonify({'status': 'error', 'message': 'Invalid file type. Only JPG, PNG, WEBP allowed.'}), 400

        # mask static bad words before saving
        title = moderate_content(title)
        content = moderate_content(content)

        conn = cursor = None
        try:
            conn = get_db()
            cursor = conn.cursor(dictionary=True)
            bad_word = check_for_blacklist(cursor, title) or check_for_blacklist(cursor, content)
            if bad_word:
                return jsonify({'status': 'error', 'message': 'Your confession contains inappropriate language.'}), 400
        except Exception:
            pass
        finally:
            if cursor: cursor.close()
            if conn: conn.close()

        conn = cursor = None
        try:
            conn = get_db()
            cursor = conn.cursor()
            cursor.execute('SELECT id FROM categories WHERE id = %s', (category_id,))
            if not cursor.fetchone():
                return jsonify({'status': 'error', 'message': f'Category {category_id} does not exist.'}), 400

            cursor.execute('''
                INSERT INTO posts (profile_id, category_id, title, content, image_url)
                VALUES (%s, %s, %s, %s, %s)
            ''', (request.profile_id, category_id, title, content, image_url))
            new_post_id = cursor.lastrowid

            # ping followers
            cursor.execute('SELECT follower_id FROM follows WHERE following_id = %s',
                           (request.profile_id,))
            for follower in cursor.fetchall():
                insert_notification(cursor, follower[0], request.profile_id, 'new_post', new_post_id)

            conn.commit()
            return jsonify({'status': 'success', 'message': 'Confession saved!', 'post_id': new_post_id}), 201
        except mysql.connector.Error as err:
            print(f'[db-error] {request.path}: {err}')
            return jsonify({'status': 'error', 'message': 'A database error occurred'}), 500
        finally:
            if cursor: cursor.close()
            if conn: conn.close()
    except Exception as e:
        print(f'[error] {request.path}: {e}')
        return jsonify({'status': 'error', 'message': 'An internal error occurred'}), 500


@bp.route('/api/confessions', methods=['GET'])
@require_auth
def get_confessions():
    try:
        search_query = request.args.get('q', '').strip()
        conn = cursor = None
        try:
            conn = get_db()
            cursor = conn.cursor(dictionary=True)
            query = POST_SELECT_COMMON + ' JOIN users u ON u.id = pr.user_id WHERE ' + SHADOWBAN_FILTER + ' AND ' + BLOCKED_FILTER
            params = [request.profile_id, request.profile_id, request.user_id]
            if search_query:
                query += " AND (p.title LIKE %s OR p.content LIKE %s)"
                like_term = f"%{search_query}%"
                params.extend([like_term, like_term])
            query += " ORDER BY p.created_at DESC"
            cursor.execute(query, params)
            posts = cursor.fetchall()
            return jsonify({'status': 'success', 'data': serialize_dates(posts)}), 200
        except mysql.connector.Error as err:
            print(f'[db-error] {request.path}: {err}')
            return jsonify({'status': 'error', 'message': 'A database error occurred'}), 500
        finally:
            if cursor: cursor.close()
            if conn: conn.close()
    except Exception as e:
        print(f'[error] {request.path}: {e}')
        return jsonify({'status': 'error', 'message': 'An internal error occurred'}), 500


@bp.route('/api/confessions/<int:post_id>', methods=['GET'])
@require_auth
def get_single_confession(post_id):
    try:
        conn = cursor = None
        try:
            conn = get_db()
            cursor = conn.cursor(dictionary=True)
            cursor.execute(POST_SELECT_COMMON + ' WHERE p.id = %s', (request.profile_id, post_id))
            post = cursor.fetchone()
            if not post:
                return jsonify({'status': 'error', 'message': 'Post not found'}), 404
            return jsonify({'status': 'success', 'post': serialize_dates(post)}), 200
        except mysql.connector.Error as err:
            print(f'[db-error] {request.path}: {err}')
            return jsonify({'status': 'error', 'message': 'A database error occurred'}), 500
        finally:
            if cursor: cursor.close()
            if conn: conn.close()
    except Exception as e:
        print(f'[error] {request.path}: {e}')
        return jsonify({'status': 'error', 'message': 'An internal error occurred'}), 500


@bp.route('/api/confessions/<int:post_id>', methods=['DELETE'])
@require_auth
def delete_own_confession(post_id):
    # only the author or an admin can delete a post
    try:
        conn = cursor = None
        try:
            conn = get_db()
            cursor = conn.cursor(dictionary=True)

            cursor.execute('SELECT profile_id, image_url FROM posts WHERE id = %s', (post_id,))
            post = cursor.fetchone()
            if not post:
                return jsonify({'status': 'error', 'message': 'Post not found'}), 404

            if post['profile_id'] != request.profile_id:
                cursor.execute('SELECT role FROM users WHERE id = %s', (request.user_id,))
                requester = cursor.fetchone()
                if not requester or requester['role'] != 'admin':
                    return jsonify({'status': 'error', 'message': 'You can only delete your own posts'}), 403

            # resolve any open reports, then delete (cascades to comments/reactions)
            cursor.execute("UPDATE reports SET status = 'resolved' WHERE post_id = %s", (post_id,))
            cursor.execute('DELETE FROM posts WHERE id = %s', (post_id,))
            conn.commit()

            # best-effort cleanup of the uploaded image, basename only so paths can't escape
            if post['image_url']:
                try:
                    filename = os.path.basename(post['image_url'])
                    file_path = os.path.join(UPLOAD_FOLDER, filename)
                    if os.path.isfile(file_path):
                        os.remove(file_path)
                except OSError:
                    pass

            return jsonify({'status': 'success', 'message': 'Post deleted'}), 200
        except mysql.connector.Error as err:
            print(f'[db-error] {request.path}: {err}')
            return jsonify({'status': 'error', 'message': 'A database error occurred'}), 500
        finally:
            if cursor: cursor.close()
            if conn: conn.close()
    except Exception as e:
        print(f'[error] {request.path}: {e}')
        return jsonify({'status': 'error', 'message': 'An internal error occurred'}), 500


@bp.route('/api/confessions/<int:post_id>/react', methods=['POST'])
@require_auth
def react_to_confession(post_id):
    try:
        conn = cursor = None
        try:
            conn = get_db()
            cursor = conn.cursor(dictionary=True)
            cursor.execute(
                'SELECT id FROM reactions WHERE profile_id = %s AND item_id = %s AND item_type = %s AND reaction_type = %s',
                (request.profile_id, post_id, 'post', 'like')
            )
            existing = cursor.fetchone()

            if existing:
                cursor.execute('DELETE FROM reactions WHERE id = %s', (existing['id'],))
            else:
                cursor.execute(
                    'INSERT INTO reactions (profile_id, item_id, item_type, reaction_type) VALUES (%s, %s, %s, %s)',
                    (request.profile_id, post_id, 'post', 'like')
                )
                # notify the post owner, unless it's their own like
                cursor.execute('SELECT profile_id FROM posts WHERE id = %s', (post_id,))
                post_owner = cursor.fetchone()
                if post_owner and post_owner['profile_id'] != request.profile_id:
                    insert_notification(cursor, post_owner['profile_id'], request.profile_id, 'like', post_id)

            conn.commit()

            cursor.execute(
                'SELECT COUNT(*) as count FROM reactions WHERE item_id = %s AND item_type = %s AND reaction_type = %s',
                (post_id, 'post', 'like')
            )
            return jsonify({'status': 'success', 'likes_count': cursor.fetchone()['count']}), 200
        except mysql.connector.Error as err:
            print(f'[db-error] {request.path}: {err}')
            return jsonify({'status': 'error', 'message': 'A database error occurred'}), 500
        finally:
            if cursor: cursor.close()
            if conn: conn.close()
    except Exception as e:
        print(f'[error] {request.path}: {e}')
        return jsonify({'status': 'error', 'message': 'An internal error occurred'}), 500


@bp.route('/api/confessions/<int:post_id>/comments', methods=['GET', 'POST'])
@require_auth
def handle_comments(post_id):
    try:
        conn = cursor = None
        try:
            conn = get_db()
            cursor = conn.cursor(dictionary=True)

            if request.method == 'GET':
                cursor.execute('SELECT profile_id FROM posts WHERE id = %s', (post_id,))
                post_owner = cursor.fetchone()
                post_owner_profile_id = post_owner['profile_id'] if post_owner else None

                cursor.execute('''
                    SELECT c.id, c.content, c.created_at, c.parent_id, c.profile_id,
                           pr.anonymous_handle as anonymous_username, pr.avatar_url,
                           (SELECT COUNT(*) FROM reactions r WHERE r.item_id = c.id AND r.item_type = 'comment' AND r.reaction_type = 'like') as likes,
                           (SELECT COUNT(*) FROM reactions r WHERE r.item_id = c.id AND r.item_type = 'comment' AND r.reaction_type = 'dislike') as dislikes,
                           (SELECT reaction_type FROM reactions r WHERE r.item_id = c.id AND r.item_type = 'comment' AND r.profile_id = %s LIMIT 1) as user_reaction
                    FROM comments c
                    JOIN profiles pr ON c.profile_id = pr.id
                    WHERE c.post_id = %s
                    ORDER BY c.created_at ASC
                ''', (request.profile_id, post_id))
                rows = cursor.fetchall()
                for row in rows:
                    row['net_score'] = row['likes'] - row['dislikes']
                    row['is_post_author'] = (row['profile_id'] == post_owner_profile_id)
                return jsonify({'status': 'success', 'data': serialize_dates(rows)}), 200

            elif request.method == 'POST':
                data = request.json
                content = data.get('content')
                parent_id = data.get('parent_id', None)
                if not content or str(content).strip() == '':
                    return jsonify({'status': 'error', 'message': 'Comment cannot be empty'}), 400

                cursor.execute(
                    'INSERT INTO comments (post_id, profile_id, content, parent_id) VALUES (%s, %s, %s, %s)',
                    (post_id, request.profile_id, content, parent_id)
                )
                new_id = cursor.lastrowid

                # notify the right person: replied-to commenter or post owner
                if parent_id:
                    cursor.execute('SELECT profile_id FROM comments WHERE id = %s', (parent_id,))
                    original_commenter = cursor.fetchone()
                    if original_commenter and original_commenter['profile_id'] != request.profile_id:
                        insert_notification(cursor, original_commenter['profile_id'], request.profile_id, 'reply', parent_id)
                else:
                    cursor.execute('SELECT profile_id FROM posts WHERE id = %s', (post_id,))
                    post_owner = cursor.fetchone()
                    if post_owner and post_owner['profile_id'] != request.profile_id:
                        insert_notification(cursor, post_owner['profile_id'], request.profile_id, 'comment', post_id)

                conn.commit()
                cursor.execute('''
                    SELECT c.id, c.content, c.created_at, c.parent_id, c.profile_id,
                           pr.anonymous_handle as anonymous_username, pr.avatar_url
                    FROM comments c
                    JOIN profiles pr ON c.profile_id = pr.id
                    WHERE c.id = %s
                ''', (new_id,))
                return jsonify({'status': 'success', 'message': 'Comment added!', 'comment': serialize_dates(cursor.fetchone())}), 201
        except mysql.connector.Error as err:
            print(f'[db-error] {request.path}: {err}')
            return jsonify({'status': 'error', 'message': 'A database error occurred'}), 500
        finally:
            if cursor: cursor.close()
            if conn: conn.close()
    except Exception as e:
        print(f'[error] {request.path}: {e}')
        return jsonify({'status': 'error', 'message': 'An internal error occurred'}), 500


@bp.route('/api/comments/<int:comment_id>/react', methods=['POST'])
@require_auth
def react_to_comment(comment_id):
    try:
        data = request.json
        reaction_type = data.get('reaction_type', 'like')
        conn = cursor = None
        try:
            conn = get_db()
            cursor = conn.cursor(dictionary=True)
            cursor.execute(
                'SELECT id, reaction_type FROM reactions WHERE profile_id = %s AND item_id = %s AND item_type = %s',
                (request.profile_id, comment_id, 'comment')
            )
            existing = cursor.fetchone()

            if existing:
                cursor.execute('DELETE FROM reactions WHERE id = %s', (existing['id'],))
            else:
                cursor.execute(
                    "INSERT INTO reactions (profile_id, item_id, item_type, reaction_type) VALUES (%s, %s, 'comment', %s)",
                    (request.profile_id, comment_id, reaction_type)
                )
            conn.commit()

            cursor.execute("SELECT COUNT(*) as c FROM reactions WHERE item_id = %s AND item_type = 'comment' AND reaction_type = 'like'", (comment_id,))
            likes = cursor.fetchone()['c']
            cursor.execute("SELECT COUNT(*) as c FROM reactions WHERE item_id = %s AND item_type = 'comment' AND reaction_type = 'dislike'", (comment_id,))
            dislikes = cursor.fetchone()['c']
            cursor.execute("SELECT reaction_type FROM reactions WHERE profile_id = %s AND item_id = %s AND item_type = 'comment'", (request.profile_id, comment_id))
            user_react = cursor.fetchone()
            return jsonify({
                'status': 'success', 'likes': likes, 'dislikes': dislikes,
                'net_score': likes - dislikes,
                'user_reaction': user_react['reaction_type'] if user_react else None,
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


@bp.route('/api/trending', methods=['GET'])
@require_auth
def get_trending():
    try:
        conn = cursor = None
        try:
            conn = get_db()
            cursor = conn.cursor(dictionary=True)
            cursor.execute('''
                SELECT p.id, p.title, p.content, p.created_at, p.image_url,
                       pr.anonymous_handle, pr.avatar_url, cat.name as category_name,
                       pr.id as profile_id,
                       (SELECT COUNT(*) FROM reactions r WHERE r.item_id = p.id AND r.item_type = 'post' AND r.reaction_type = 'like') as likes_count,
                       (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) as comments_count,
                       (SELECT COUNT(*) FROM reactions r WHERE r.item_id = p.id AND r.item_type = 'post' AND r.reaction_type = 'like' AND r.profile_id = %s) as liked_by_user,
                       COALESCE(p.trending_score, 0.0) AS trending_score
                FROM posts p
                JOIN profiles pr ON p.profile_id = pr.id
                JOIN categories cat ON p.category_id = cat.id
                JOIN users u ON u.id = pr.user_id
                WHERE ''' + BLOCKED_FILTER + '''
                ORDER BY p.trending_score DESC
                LIMIT 50
            ''', (request.profile_id, request.user_id))
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


@bp.route('/api/feed', methods=['GET'])
@require_auth
def get_hybrid_feed():
    # ~70% followed posts topped up with global posts, cursor-paginated
    try:
        profile_id = request.profile_id
        limit = request.args.get('limit', 10, type=int)
        cursor_ts = request.args.get('cursor', None)

        conn = cursor = None
        try:
            conn = get_db()
            cursor = conn.cursor(dictionary=True)

            time_clause = ''
            time_param = None
            if cursor_ts:
                time_clause = 'AND p.created_at < %s'
                time_param = cursor_ts

            followed_limit = max(1, int(limit * 0.7))

            POST_SELECT = '''
                SELECT p.id, p.title, p.content, p.created_at, p.image_url,
                       pr.anonymous_handle, pr.avatar_url, cat.name as category_name,
                       pr.id as profile_id, pr.user_id,
                       (SELECT COUNT(*) FROM reactions r WHERE r.item_id = p.id AND r.item_type = 'post' AND r.reaction_type = 'like') as likes_count,
                       (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) as comments_count,
                       (SELECT COUNT(*) FROM reactions r WHERE r.item_id = p.id AND r.item_type = 'post' AND r.reaction_type = 'like' AND r.profile_id = %s) as liked_by_user,
                       COALESCE(p.trending_score, 0.0) AS trending_score
                FROM posts p
                JOIN profiles pr ON p.profile_id = pr.id
                JOIN categories cat ON p.category_id = cat.id
                JOIN users u ON u.id = pr.user_id
            '''

            user_id = request.user_id

            # followed posts first
            # params: liked_by_user, follower_id, shadowban, blocked, [cursor], limit
            followed_params = [profile_id, profile_id, profile_id, user_id]
            if time_param:
                followed_params.append(time_param)
            followed_params.append(followed_limit)

            cursor.execute(f'''
                {POST_SELECT}
                WHERE p.profile_id IN (
                    SELECT following_id FROM follows WHERE follower_id = %s
                )
                AND (u.is_shadowbanned = 0 OR p.profile_id = %s)
                AND {BLOCKED_FILTER}
                {time_clause}
                ORDER BY p.trending_score DESC, p.created_at DESC
                LIMIT %s
            ''', followed_params)
            followed_posts = cursor.fetchall()

            followed_ids = {p['id'] for p in followed_posts}
            gap = limit - len(followed_posts)

            # top up with global posts
            global_posts = []
            if gap > 0:
                ph = ','.join(['%s'] * len(followed_ids)) if followed_ids else '0'
                global_params = [profile_id] + list(followed_ids) + [profile_id] + [user_id]
                if time_param:
                    global_params.append(time_param)
                global_params.append(gap)

                cursor.execute(f'''
                    {POST_SELECT}
                    WHERE p.id NOT IN ({ph})
                    AND (u.is_shadowbanned = 0 OR p.profile_id = %s)
                    AND {BLOCKED_FILTER}
                    {time_clause}
                    ORDER BY p.trending_score DESC, p.created_at DESC
                    LIMIT %s
                ''', global_params)
                global_posts = cursor.fetchall()

            combined = list(followed_posts) + list(global_posts)
            next_cursor = str(combined[-1]['created_at']) if len(combined) >= limit else None

            return jsonify({'status': 'success', 'data': serialize_dates(combined), 'nextCursor': next_cursor}), 200
        except mysql.connector.Error as err:
            print(f'[db-error] {request.path}: {err}')
            return jsonify({'status': 'error', 'message': 'A database error occurred'}), 500
        finally:
            if cursor: cursor.close()
            if conn: conn.close()
    except Exception as e:
        print(f'[error] {request.path}: {e}')
        return jsonify({'status': 'error', 'message': 'An internal error occurred'}), 500
