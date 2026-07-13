# jwt + password hashing + turnstile check
import bcrypt
import jwt
import requests
from datetime import datetime, timedelta, timezone
from config import (
    JWT_SECRET, JWT_ALGORITHM, JWT_EXPIRY_HOURS,
    TURNSTILE_SECRET_KEY, TURNSTILE_DEV_BYPASS,
)

TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')


def check_password(password: str, password_hash: str) -> bool:
    # social login accounts don't have a password hash
    if not password or not password_hash:
        return False
    try:
        return bcrypt.checkpw(password.encode('utf-8'), password_hash.encode('utf-8'))
    except ValueError:
        return False


def create_jwt(user_id: int) -> str:
    payload = {
        'user_id': user_id,
        'exp':     datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRY_HOURS),
        'iat':     datetime.now(timezone.utc),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_jwt(token: str) -> dict | None:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
        return None


def verify_turnstile_token(token: str, remote_ip: str | None = None) -> bool:
    # fails closed on any missing token/secret, network error, or bad verdict.
    # no ip-based bypass - behind a proxy everything looks like localhost
    if TURNSTILE_DEV_BYPASS:
        return True

    if not TURNSTILE_SECRET_KEY:
        print('[turnstile] CLOUDFLARE_SECRET_KEY not set, rejecting')
        return False

    if not token or not isinstance(token, str) or len(token) > 2048:
        return False

    payload = {'secret': TURNSTILE_SECRET_KEY, 'response': token}
    if remote_ip:
        payload['remoteip'] = remote_ip

    try:
        resp = requests.post(TURNSTILE_VERIFY_URL, data=payload, timeout=10)
        result = resp.json()
    except (requests.RequestException, ValueError) as e:
        print(f'[turnstile] request failed: {e}')
        return False

    if not result.get('success'):
        print(f"[turnstile] rejected: {result.get('error-codes')}")
        return False

    return True
