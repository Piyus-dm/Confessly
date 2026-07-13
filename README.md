# Confessly

anonymous confessions app. React + Vite on the frontend, Flask + MySQL on the backend.

## stack

- React (Vite), react-router
- Flask, mysql-connector, JWT auth via httpOnly cookies
- Google/Facebook OAuth, Gmail SMTP for password reset
- Cloudflare Turnstile for bot checks

## running it locally

backend:

```bash
cd Confessly-final/backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill this in
python init_db.py
python app.py           # localhost:5000
```

frontend:

```bash
cd Confessly-final/frontend
npm install
cp .env.example .env   # needs your turnstile site key
npm run dev              # localhost:5173
```

## deploying

**frontend → vercel**: point the project root at `Confessly-final/frontend`.
there's a `vercel.json` in there that rewrites `/api/*` to the backend and
handles SPA routing. update the rewrite destination to your actual backend
url before going live.

**backend → wherever** (render/railway/fly/whatever): point root at
`Confessly-final/backend`. has a `Procfile` for gunicorn and a
`requirements.txt`. needs mysql — run `init_db.py` once against it to set up
the tables.

## env vars

check `.env.example` in each folder for the full list. backend needs mysql
creds, jwt/session secrets, oauth client ids/secrets, smtp creds, turnstile
keys. frontend just needs the turnstile site key.

one gotcha: `BACKEND_URL` has to match whatever redirect URI you register in
the google/facebook oauth consoles, or login with those will just break.
