"""
config.py — configuration, all secrets come from .env
"""
import os
from dotenv import load_dotenv

# load .env early so every module that imports config gets env vars
load_dotenv()

# mysql — override via env in production
MYSQL_CONFIG = {
    'host': os.getenv('MYSQL_HOST', 'localhost'),
    'user': os.getenv('MYSQL_USER', 'confessly'),
    'password': os.getenv('MYSQL_PASSWORD', 'confessly_secret_2024'),
    'database': os.getenv('MYSQL_DATABASE', 'confessly'),
    'autocommit': True,
}

# jwt
JWT_SECRET = os.getenv('JWT_SECRET', 'confessly-jwt-secret-change-in-production-2024').strip().strip('"')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRY_HOURS = 24

# flask session secret
FLASK_SECRET_KEY = os.getenv('FLASK_SECRET_KEY', 'confessly-session-secret-change-in-production').strip().strip('"')

# cloudflare turnstile — new CLOUDFLARE_* names win, old TURNSTILE_* kept as fallback
TURNSTILE_SITE_KEY = (os.getenv('VITE_CLOUDFLARE_SITE_KEY') or os.getenv('TURNSTILE_SITE_KEY') or '').strip().strip('"')
TURNSTILE_SECRET_KEY = (os.getenv('CLOUDFLARE_SECRET_KEY') or os.getenv('TURNSTILE_SECRET_KEY') or '').strip().strip('"')

# opt-in escape hatch for offline dev only — leave unset so bot protection is enforced
TURNSTILE_DEV_BYPASS = os.getenv('TURNSTILE_DEV_BYPASS', '0') == '1'

# set COOKIE_SECURE=1 in production (https only)
COOKIE_SECURE = os.getenv('COOKIE_SECURE', '0') == '1'

# allowed browser origin for cors
FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://localhost:5173').strip().strip('"')

# this server's own public URL — used to build OAuth callback URLs and
# absolute links to uploaded files. MUST be set to the real public URL
# once the backend is deployed (and must match the OAuth app's registered
# redirect URI in the Google/Facebook developer consoles).
BACKEND_URL = os.getenv('BACKEND_URL', 'http://localhost:5000').strip().strip('"')

# file uploads
UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'static', 'uploads')
AVATAR_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'static', 'avatars')
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'webp'}
MAX_CONTENT_LENGTH = 5 * 1024 * 1024  # 5MB
