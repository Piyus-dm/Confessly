# app config, secrets come from .env
import os
from urllib.parse import urlparse
from dotenv import load_dotenv

load_dotenv()

# DATABASE_URL (e.g. from Aiven/Railway/etc) wins if set, otherwise fall
# back to the discrete MYSQL_* vars for local dev
DATABASE_URL = os.getenv('DATABASE_URL', '').strip().strip('"')

if DATABASE_URL:
    _u = urlparse(DATABASE_URL)
    MYSQL_CONFIG = {
        'host': _u.hostname,
        'port': _u.port or 3306,
        'user': _u.username,
        'password': _u.password,
        'database': _u.path.lstrip('/'),
        'autocommit': True,
    }
else:
    MYSQL_CONFIG = {
        'host': os.getenv('MYSQL_HOST', 'localhost'),
        'port': int(os.getenv('MYSQL_PORT', '3306')),
        'user': os.getenv('MYSQL_USER', 'confessly'),
        'password': os.getenv('MYSQL_PASSWORD', 'confessly_secret_2024'),
        'database': os.getenv('MYSQL_DATABASE', 'confessly'),
        'autocommit': True,
    }

JWT_SECRET = os.getenv('JWT_SECRET', 'confessly-jwt-secret-change-in-production-2024').strip().strip('"')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRY_HOURS = 24

FLASK_SECRET_KEY = os.getenv('FLASK_SECRET_KEY', 'confessly-session-secret-change-in-production').strip().strip('"')

# CLOUDFLARE_* takes priority, TURNSTILE_* is just the old naming
TURNSTILE_SITE_KEY = (os.getenv('VITE_CLOUDFLARE_SITE_KEY') or os.getenv('TURNSTILE_SITE_KEY') or '').strip().strip('"')
TURNSTILE_SECRET_KEY = (os.getenv('CLOUDFLARE_SECRET_KEY') or os.getenv('TURNSTILE_SECRET_KEY') or '').strip().strip('"')

# only for local dev, don't set this in prod
TURNSTILE_DEV_BYPASS = os.getenv('TURNSTILE_DEV_BYPASS', '0') == '1'

COOKIE_SECURE = os.getenv('COOKIE_SECURE', '0') == '1'
FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://localhost:5173').strip().strip('"')

# needs to match the oauth redirect uri registered on google/facebook
BACKEND_URL = os.getenv('BACKEND_URL', 'http://localhost:5000').strip().strip('"')

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'webp'}
MAX_CONTENT_LENGTH = 5 * 1024 * 1024  # 5mb

CLOUDINARY_CLOUD_NAME = os.getenv('CLOUDINARY_CLOUD_NAME', '').strip().strip('"')
CLOUDINARY_API_KEY = os.getenv('CLOUDINARY_API_KEY', '').strip().strip('"')
CLOUDINARY_API_SECRET = os.getenv('CLOUDINARY_API_SECRET', '').strip().strip('"')
