"""auth routes — register, login, logout, me, password reset"""
import re
import secrets
from datetime import datetime, timezone, timedelta

from flask import Blueprint, request, jsonify, current_app
import mysql.connector

from config import COOKIE_SECURE
from db import get_db
from emailer import send_email
from auth_utils import hash_password, check_password, create_jwt, verify_turnstile_token
from helpers import require_auth, serialize_dates, fetch_profile_by_user_id
from security import rate_limit, client_ip

bp = Blueprint('auth', __name__)

EMAIL_RE = re.compile(r'^[^@\s]+@[^@\s]+\.[^@\s]+$')


def _set_auth_cookie(response, token):
    response.set_cookie('token', token, httponly=True, samesite='Lax',
                        secure=COOKIE_SECURE, max_age=24 * 60 * 60)


def _turnstile_passed(data):
    # cloudflare bot check — token is single-use, verified against siteverify
    token = (data.get('cf_turnstile_response') or data.get('turnstile_token') or '')
    if not isinstance(token, str):
        return False
    return verify_turnstile_token(token.strip(), client_ip(request))


TURNSTILE_FAILED = ({'status': 'error',
                     'message': 'Turnstile verification failed. Please try again.'}, 403)


@bp.route('/api/auth/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'status': 'error', 'message': 'Request body required'}), 400
        email = data.get('email', '').strip().lower()
        password = data.get('password', '')
        anonymous_handle = data.get('username', data.get('anonymous_handle', '')).strip()

        if not email or not password or not anonymous_handle:
            return jsonify({'status': 'error', 'message': 'Email, password, and username are required'}), 400
        if len(email) > 255 or not EMAIL_RE.match(email):
            return jsonify({'status': 'error', 'message': 'Please enter a valid email address'}), 400
        if len(password) < 6 or len(password) > 128:
            return jsonify({'status': 'error', 'message': 'Password must be 6-128 characters'}), 400
        if len(anonymous_handle) < 3 or len(anonymous_handle) > 30:
            return jsonify({'status': 'error', 'message': 'Username must be 3-30 characters'}), 400

        if not rate_limit(f'register:{client_ip(request)}', 10, 3600):
            return jsonify({'status': 'error', 'message': 'Too many attempts. Please try again later.'}), 429

        # bot check before any account is created
        if not _turnstile_passed(data):
            body, code = TURNSTILE_FAILED
            return jsonify(body), code

        conn = cursor = None
        try:
            conn = get_db()
            cursor = conn.cursor(dictionary=True)

            cursor.execute('SELECT id FROM users WHERE email = %s', (email,))
            if cursor.fetchone():
                return jsonify({'status': 'error', 'message': 'Email already registered'}), 409
            cursor.execute('SELECT id FROM profiles WHERE anonymous_handle = %s', (anonymous_handle,))
            if cursor.fetchone():
                return jsonify({'status': 'error', 'message': 'Handle already taken'}), 409

            pw_hash = hash_password(password)
            cursor.execute('INSERT INTO users (email, password_hash) VALUES (%s, %s)', (email, pw_hash))
            user_id = cursor.lastrowid
            cursor.execute('INSERT INTO profiles (user_id, anonymous_handle) VALUES (%s, %s)',
                           (user_id, anonymous_handle))
            conn.commit()

            token = create_jwt(user_id)
            response = jsonify({'status': 'success', 'message': 'Account created successfully'})
            _set_auth_cookie(response, token)
            return response, 201
        except mysql.connector.Error as err:
            print(f'[db-error] {request.path}: {err}')
            return jsonify({'status': 'error', 'message': 'A database error occurred'}), 500
        finally:
            if cursor: cursor.close()
            if conn: conn.close()
    except Exception as e:
        print(f'[error] {request.path}: {e}')
        return jsonify({'status': 'error', 'message': 'An internal error occurred'}), 500


@bp.route('/api/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'status': 'error', 'message': 'Request body required'}), 400
        email = data.get('email', '').strip().lower()
        password = data.get('password', '')
        if not email or not password:
            return jsonify({'status': 'error', 'message': 'Email and password are required'}), 400

        # slow down credential stuffing / brute force
        if not rate_limit(f'login:{client_ip(request)}:{email}', 10, 300):
            return jsonify({'status': 'error', 'message': 'Too many login attempts. Please wait a few minutes.'}), 429

        # bot check before any password is compared
        if not _turnstile_passed(data):
            body, code = TURNSTILE_FAILED
            return jsonify(body), code

        conn = cursor = None
        try:
            conn = get_db()
            cursor = conn.cursor(dictionary=True)
            cursor.execute(
                'SELECT id, password_hash, is_banned, banned_until FROM users WHERE email = %s',
                (email,)
            )
            user = cursor.fetchone()

            if not user or not check_password(password, user['password_hash']):
                return jsonify({'status': 'error', 'message': 'Invalid email or password'}), 401

            # blocked while a suspension is active
            if user['is_banned']:
                ban_end = user['banned_until']
                if ban_end is None or datetime.now(timezone.utc) < ban_end.replace(tzinfo=timezone.utc):
                    until_str = ban_end.isoformat() if ban_end else 'indefinite'
                    return jsonify({
                        'status': 'error',
                        'message': f'Your account has been suspended until {until_str}.'
                    }), 403

            token = create_jwt(user['id'])
            response = jsonify({'status': 'success', 'message': 'Logged in successfully'})
            _set_auth_cookie(response, token)
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


@bp.route('/api/auth/logout', methods=['POST'])
def logout():
    response = jsonify({'status': 'success', 'message': 'Logged out'})
    response.delete_cookie('token', path='/')
    return response, 200


@bp.route('/api/me', methods=['GET'])
@require_auth
def get_me():
    try:
        profile = fetch_profile_by_user_id(request.user_id)
        if not profile:
            return jsonify({'status': 'error', 'message': 'User not found'}), 404
        return jsonify({'status': 'success', 'profile': serialize_dates(profile)}), 200
    except Exception as e:
        print(f'[error] {request.path}: {e}')
        return jsonify({'status': 'error', 'message': 'An internal error occurred'}), 500


@bp.route('/api/auth/forgot-password', methods=['POST'])
def forgot_password():
    # make a 6-digit otp, store it, email it
    try:
        data = request.get_json()
        email = data.get('email', '').strip().lower()
        if not email:
            return jsonify({'status': 'error', 'message': 'Email is required'}), 400

        # cap how often codes can be requested
        if not rate_limit(f'otp-send:{client_ip(request)}', 5, 600) or not rate_limit(f'otp-send-email:{email}', 3, 600):
            return jsonify({'status': 'error', 'message': 'Too many requests. Please try again later.'}), 429

        conn = cursor = None
        try:
            conn = get_db()
            cursor = conn.cursor()
            cursor.execute('SELECT id FROM users WHERE email = %s', (email,))
            user = cursor.fetchone()
            # always claim success so emails can't be enumerated
            if not user:
                return jsonify({'status': 'success', 'message': 'If the email exists, an OTP has been sent.'}), 200

            # cryptographically secure code, and only the newest one stays valid
            otp = f'{secrets.randbelow(1000000):06d}'
            expires_at = datetime.now(timezone.utc) + timedelta(minutes=15)

            cursor.execute('UPDATE password_resets SET used = 1 WHERE email = %s AND used = 0', (email,))
            cursor.execute(
                'INSERT INTO password_resets (email, otp_code, expires_at) VALUES (%s, %s, %s)',
                (email, otp, expires_at)
            )
            conn.commit()

            try:
                send_email(
                    email,
                    'Your Confessly Password Reset Code',
                    f'''
                    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
                        <h2 style="color: #111;">Confessly Password Reset</h2>
                        <p>Your password reset code is:</p>
                        <p style="font-size: 28px; font-weight: bold; letter-spacing: 6px; color: #111;">{otp}</p>
                        <p style="color: #666;">This code expires in 15 minutes. If you didn't request this, you can safely ignore this email.</p>
                    </div>
                    ''',
                )
            except Exception as e:
                # swallow send failures for the same reason
                current_app.logger.error(f'[smtp] Failed to send OTP email to {email}: {e}')

            return jsonify({'status': 'success', 'message': 'If the email exists, an OTP has been sent.'}), 200

        except mysql.connector.Error as err:
            print(f'[db-error] {request.path}: {err}')
            return jsonify({'status': 'error', 'message': 'A database error occurred'}), 500
        finally:
            if cursor: cursor.close()
            if conn: conn.close()
    except Exception as e:
        print(f'[error] {request.path}: {e}')
        return jsonify({'status': 'error', 'message': 'An internal error occurred'}), 500


@bp.route('/api/auth/reset-password', methods=['POST'])
def reset_password():
    # check otp and set the new password
    try:
        data = request.get_json()
        email = data.get('email', '').strip().lower()
        otp_code = data.get('otp_code', '').strip()
        new_password = data.get('new_password', '')

        if not email or not otp_code or not new_password:
            return jsonify({'status': 'error', 'message': 'email, otp_code, and new_password are required'}), 400
        if len(new_password) < 6 or len(new_password) > 128:
            return jsonify({'status': 'error', 'message': 'Password must be 6-128 characters'}), 400

        # a 6-digit code must not be brute-forceable
        if not rate_limit(f'otp-verify:{client_ip(request)}:{email}', 8, 900):
            return jsonify({'status': 'error', 'message': 'Too many attempts. Please request a new code.'}), 429

        conn = cursor = None
        try:
            conn = get_db()
            cursor = conn.cursor(dictionary=True)

            cursor.execute(
                'SELECT id, expires_at FROM password_resets WHERE email = %s AND otp_code = %s AND used = 0 ORDER BY created_at DESC LIMIT 1',
                (email, otp_code)
            )
            record = cursor.fetchone()
            if not record:
                return jsonify({'status': 'error', 'message': 'Invalid or expired OTP'}), 400

            expires = record['expires_at']
            if isinstance(expires, datetime):
                if expires.tzinfo is None:
                    expires = expires.replace(tzinfo=timezone.utc)
            if datetime.now(timezone.utc) > expires:
                return jsonify({'status': 'error', 'message': 'OTP has expired'}), 400

            pw_hash = hash_password(new_password)
            cursor.execute('UPDATE users SET password_hash = %s WHERE email = %s', (pw_hash, email))
            cursor.execute('UPDATE password_resets SET used = 1 WHERE id = %s', (record['id'],))
            conn.commit()

            return jsonify({'status': 'success', 'message': 'Password updated successfully'}), 200

        except mysql.connector.Error as err:
            print(f'[db-error] {request.path}: {err}')
            return jsonify({'status': 'error', 'message': 'A database error occurred'}), 500
        finally:
            if cursor: cursor.close()
            if conn: conn.close()
    except Exception as e:
        print(f'[error] {request.path}: {e}')
        return jsonify({'status': 'error', 'message': 'An internal error occurred'}), 500
