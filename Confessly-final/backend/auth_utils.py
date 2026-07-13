"""
auth_utils.py — JWT creation/verification, password hashing, Turnstile validation
"""
import bcrypt
import jwt
import requests
from datetime import datetime, timedelta, timezone
from config import (
    JWT_SECRET, JWT_ALGORITHM, JWT_EXPIRY_HOURS,
    TURNSTILE_SECRET_KEY, TURNSTILE_DEV_BYPASS,
)

TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

# ── Password hashing (bcrypt) ──────────────────────────────────

def hash_password(password: str) -> str:
    """Return a bcrypt hash of the given plaintext password."""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')


def check_password(password: str, password_hash: str) -> bool:
    """Verify a plaintext password against a stored bcrypt hash."""
    # social-login accounts have no password hash — never a match
    if not password or not password_hash:
        return False
    try:
        return bcrypt.checkpw(password.encode('utf-8'), password_hash.encode('utf-8'))
    except ValueError:
        return False


# ── JWT tokens ─────────────────────────────────────────────────

def create_jwt(user_id: int) -> str:
    """Create a signed JWT with the user_id embedded."""
    payload = {
        'user_id': user_id,
        'exp':     datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRY_HOURS),
        'iat':     datetime.now(timezone.utc),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_jwt(token: str) -> dict | None:
    """Decode and validate a JWT. Returns the payload dict or None."""
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
        return None


# ── Turnstile CAPTCHA ──────────────────────────────────────────

def verify_turnstile_token(token: str, remote_ip: str | None = None) -> bool:
    """
    Validate a Cloudflare Turnstile token against the siteverify API.

    Fails closed: any missing token, missing secret, network error, or
    unsuccessful verdict returns False. There is deliberately no
    IP-based bypass — behind a reverse proxy every request looks like
    it came from localhost, which would disable bot protection entirely.
    """
    # explicit, opt-in only (TURNSTILE_DEV_BYPASS=1)
    if TURNSTILE_DEV_BYPASS:
        return True

    if not TURNSTILE_SECRET_KEY:
        print('[turnstile] CLOUDFLARE_SECRET_KEY is not configured — rejecting request')
        return False

    # tokens are ~short strings; anything huge is junk
    if not token or not isinstance(token, str) or len(token) > 2048:
        return False

    payload = {'secret': TURNSTILE_SECRET_KEY, 'response': token}
    if remote_ip:
        payload['remoteip'] = remote_ip

    try:
        resp = requests.post(TURNSTILE_VERIFY_URL, data=payload, timeout=10)
        result = resp.json()
    except (requests.RequestException, ValueError) as e:
        print(f'[turnstile] verification request failed: {e}')
        return False

    if not result.get('success'):
        print(f"[turnstile] rejected: {result.get('error-codes')}")
        return False

    return True
