# Confessly

Anonymous confessions app — React (Vite) frontend + Flask/MySQL backend.

## Structure

```
Confessly-final/
  backend/    Flask API (routes/, config.py, init_db.py, requirements.txt)
  frontend/   React + Vite SPA (src/, vercel.json)
```

## Local development

**Backend**
```bash
cd Confessly-final/backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill in real values
python init_db.py      # creates/migrates tables
python app.py           # http://localhost:5000
```

**Frontend**
```bash
cd Confessly-final/frontend
npm install
cp .env.example .env   # fill in your Turnstile site key
npm run dev              # http://localhost:5173
```

## Deployment

- **Frontend (Vercel):** set the project's Root Directory to `Confessly-final/frontend`.
  `vercel.json` there rewrites `/api/*` to the backend and serves the SPA for
  everything else. **Update the rewrite destination** in that file to your
  real deployed backend URL before going live.
- **Backend (any Python host — Render, Railway, Fly, etc.):** set the Root
  Directory to `Confessly-final/backend`. It ships a `Procfile`
  (`gunicorn app:app`) and `requirements.txt`. Needs a reachable MySQL
  database — run `python init_db.py` once against it to create the schema.

### Required backend env vars
See `Confessly-final/backend/.env.example` for the full list: MySQL
credentials, `JWT_SECRET`/`FLASK_SECRET_KEY` (generate strong random values),
`BACKEND_URL` / `FRONTEND_URL`, Google/Facebook OAuth credentials, Gmail SMTP
credentials for password-reset emails, and Cloudflare Turnstile keys.

**Important:** `BACKEND_URL` must exactly match the redirect URI registered
in the Google/Facebook OAuth app consoles once deployed, or social login
will fail.

### Required frontend env vars
See `Confessly-final/frontend/.env.example` — just the public Turnstile
site key (`VITE_CLOUDFLARE_SITE_KEY`).
