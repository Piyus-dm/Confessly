"""oauth routes — google + facebook social login"""
import os
from datetime import datetime, timezone, timedelta
from urllib.parse import quote

from flask import Blueprint, request, jsonify, redirect
import mysql.connector
import requests
import jwt as pyjwt

from config import JWT_SECRET, JWT_ALGORITHM, COOKIE_SECURE, FRONTEND_URL, BACKEND_URL
from db import get_db
from auth_utils import create_jwt

bp = Blueprint('oauth', __name__)

GOOGLE_CLIENT_ID = os.getenv('GOOGLE_CLIENT_ID', '').strip().strip('"')
GOOGLE_CLIENT_SECRET = os.getenv('GOOGLE_CLIENT_SECRET', '').strip().strip('"')
FACEBOOK_CLIENT_ID = os.getenv('FACEBOOK_CLIENT_ID', '').strip().strip('"')
FACEBOOK_CLIENT_SECRET = os.getenv('FACEBOOK_CLIENT_SECRET', '').strip().strip('"')


def _make_state():
    # short-lived signed state so callbacks can't be forged (oauth csrf)
    return pyjwt.encode(
        {'purpose': 'oauth_state', 'exp': datetime.now(timezone.utc) + timedelta(minutes=10)},
        JWT_SECRET, algorithm=JWT_ALGORITHM,
    )


def _check_state(state):
    try:
        payload = pyjwt.decode(state, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload.get('purpose') == 'oauth_state'
    except pyjwt.InvalidTokenError:
        return False


def _make_pending_token(user_info):
    # signed proof of a completed oauth exchange, consumed by finalize-social
    return pyjwt.encode(
        {
            'purpose': 'social_setup',
            'email': user_info['email'],
            'provider': user_info['provider'],
            'provider_id': user_info['provider_id'],
            'avatar_url': user_info['avatar_url'],
            'exp': datetime.now(timezone.utc) + timedelta(minutes=15),
        },
        JWT_SECRET, algorithm=JWT_ALGORITHM,
    )


def _decode_pending_token(token):
    try:
        payload = pyjwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get('purpose') != 'social_setup':
            return None
        return payload
    except pyjwt.InvalidTokenError:
        return None


def _exchange_google_code(code):
    # swap auth code for user info
    token_resp = requests.post('https://oauth2.googleapis.com/token', data={
        'code': code,
        'client_id': GOOGLE_CLIENT_ID,
        'client_secret': GOOGLE_CLIENT_SECRET,
        'redirect_uri': f"{BACKEND_URL}/api/auth/callback/google",
        'grant_type': 'authorization_code',
    }, timeout=10)
    token_data = token_resp.json()
    access_token = token_data.get('access_token')
    if not access_token:
        return None

    user_resp = requests.get(
        'https://www.googleapis.com/oauth2/v2/userinfo',
        headers={'Authorization': f'Bearer {access_token}'},
        timeout=10,
    )
    user_data = user_resp.json()
    if not user_data.get('id'):
        return None
    return {
        'provider': 'google',
        'provider_id': str(user_data['id']),
        'email': user_data.get('email', ''),
        'avatar_url': user_data.get('picture', ''),
        'name': user_data.get('name', ''),
    }


def _exchange_facebook_code(code):
    # swap auth code for user info
    token_resp = requests.get('https://graph.facebook.com/v18.0/oauth/access_token', params={
        'client_id': FACEBOOK_CLIENT_ID,
        'client_secret': FACEBOOK_CLIENT_SECRET,
        'redirect_uri': f"{BACKEND_URL}/api/auth/callback/facebook",
        'code': code,
    }, timeout=10)
    token_data = token_resp.json()
    access_token = token_data.get('access_token')
    if not access_token:
        return None

    user_resp = requests.get(
        'https://graph.facebook.com/v18.0/me',
        params={
            'fields': 'id,name,email,picture',
            'access_token': access_token,
        },
        timeout=10,
    )
    user_data = user_resp.json()
    if not user_data.get('id'):
        return None
    pic_url = ''
    if isinstance(user_data.get('picture'), dict):
        pic_data = user_data['picture'].get('data', {})
        if isinstance(pic_data, dict):
            pic_url = pic_data.get('url', '')
    return {
        'provider': 'facebook',
        'provider_id': str(user_data['id']),
        'email': user_data.get('email', ''),
        'avatar_url': pic_url,
        'name': user_data.get('name', ''),
    }


def _oauth_set_token_cookie(response, user_id):
    token = create_jwt(user_id)
    response.set_cookie('token', token, httponly=True, samesite='Lax',
                        secure=COOKIE_SECURE, max_age=24 * 60 * 60)
    return response


@bp.route('/api/auth/login/google')
def oauth_login_google():
    # send the user to google's consent screen
    params = {
        'client_id': GOOGLE_CLIENT_ID,
        'redirect_uri': f"{BACKEND_URL}/api/auth/callback/google",
        'response_type': 'code',
        'scope': 'openid email profile',
        'access_type': 'offline',
        'state': _make_state(),
    }
    qs = '&'.join(f'{k}={quote(str(v))}' for k, v in params.items())
    return redirect(f"https://accounts.google.com/o/oauth2/v2/auth?{qs}")


@bp.route('/api/auth/login/facebook')
def oauth_login_facebook():
    # send the user to facebook's oauth dialog
    params = {
        'client_id': FACEBOOK_CLIENT_ID,
        'redirect_uri': f"{BACKEND_URL}/api/auth/callback/facebook",
        'response_type': 'code',
        'scope': 'email,public_profile',
        'state': _make_state(),
    }
    qs = '&'.join(f'{k}={quote(str(v))}' for k, v in params.items())
    return redirect(f"https://www.facebook.com/v18.0/dialog/oauth?{qs}")


@bp.route('/api/auth/callback/google')
def oauth_callback_google():
    if not _check_state(request.args.get('state', '')):
        return redirect(f"{FRONTEND_URL}/login?error=invalid_state")
    code = request.args.get('code')
    if not code:
        return redirect(f"{FRONTEND_URL}/login?error=no_code")

    user_info = _exchange_google_code(code)
    if not user_info:
        return redirect(f"{FRONTEND_URL}/login?error=exchange_failed")

    return _oauth_login_or_intercept(user_info)


@bp.route('/api/auth/callback/facebook')
def oauth_callback_facebook():
    if not _check_state(request.args.get('state', '')):
        return redirect(f"{FRONTEND_URL}/login?error=invalid_state")
    code = request.args.get('code')
    if not code:
        return redirect(f"{FRONTEND_URL}/login?error=no_code")

    user_info = _exchange_facebook_code(code)
    if not user_info:
        return redirect(f"{FRONTEND_URL}/login?error=exchange_failed")

    return _oauth_login_or_intercept(user_info)


def _oauth_login_or_intercept(user_info):
    # existing user -> login, new user -> setup-username flow
    provider = user_info['provider']
    provider_id = user_info['provider_id']
    email = user_info['email']
    avatar_url = user_info['avatar_url']

    conn = cursor = None
    try:
        conn = get_db()
        cursor = conn.cursor(dictionary=True)

        existing_user = None
        if email:
            cursor.execute('SELECT id FROM users WHERE email = %s', (email,))
            existing_user = cursor.fetchone()

        if not existing_user:
            cursor.execute(
                'SELECT u.id FROM users u JOIN social_accounts sa ON sa.user_id = u.id WHERE sa.provider = %s AND sa.provider_id = %s',
                (provider, provider_id)
            )
            existing_user = cursor.fetchone()

        if existing_user:
            resp = redirect(f"{FRONTEND_URL}/")
            _oauth_set_token_cookie(resp, existing_user['id'])
            return resp
        else:
            # identity travels in a signed token; the display params are cosmetic
            pending = _make_pending_token(user_info)
            qp = f"token={quote(pending)}&email={quote(email)}&provider={quote(provider)}&avatar_url={quote(avatar_url)}"
            return redirect(f"{FRONTEND_URL}/setup-username?{qp}")

    except Exception:
        return redirect(f"{FRONTEND_URL}/login?error=server_error")
    finally:
        if cursor: cursor.close()
        if conn: conn.close()


@bp.route('/api/auth/finalize-social', methods=['POST'])
def finalize_social_account():
    # last step of social signup: pick a username
    # identity comes from the signed pending token, never from raw client fields
    try:
        data = request.get_json()
        username = data.get('username', '').strip()
        pending = _decode_pending_token(data.get('token', ''))

        if not pending:
            return jsonify({'status': 'error', 'message': 'Invalid or expired signup session. Please sign in again.'}), 400

        email = (pending.get('email') or '').strip().lower()
        provider = (pending.get('provider') or '').strip()
        provider_id = (pending.get('provider_id') or '').strip()
        avatar_url = (pending.get('avatar_url') or '').strip()

        if not username or not email or not provider or not provider_id:
            return jsonify({'status': 'error', 'message': 'username and a valid signup token are required'}), 400
        if len(username) < 3 or len(username) > 30:
            return jsonify({'status': 'error', 'message': 'Username must be 3-30 characters'}), 400

        conn = cursor = None
        try:
            conn = get_db()
            cursor = conn.cursor(dictionary=True)

            cursor.execute('SELECT id FROM users WHERE email = %s', (email,))
            if cursor.fetchone():
                return jsonify({'status': 'error', 'message': 'Email already registered'}), 409
            cursor.execute('SELECT id FROM profiles WHERE anonymous_handle = %s', (username,))
            if cursor.fetchone():
                return jsonify({'status': 'error', 'message': 'Username already taken'}), 409

            cursor.execute('INSERT INTO users (email, password_hash) VALUES (%s, %s)', (email, ''))
            user_id = cursor.lastrowid

            cursor.execute(
                'INSERT INTO profiles (user_id, anonymous_handle, avatar_url) VALUES (%s, %s, %s)',
                (user_id, username, avatar_url)
            )

            cursor.execute(
                'INSERT INTO social_accounts (user_id, provider, provider_id) VALUES (%s, %s, %s)',
                (user_id, provider, provider_id)
            )

            conn.commit()

            response = jsonify({'status': 'success', 'message': 'Account created'})
            _oauth_set_token_cookie(response, user_id)
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
