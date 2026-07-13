# Confessly — React Frontend

This replaces the old vanilla HTML/CSS/JS frontend with a React (Vite) app.
The Flask backend (`/backend`) was **not touched** — same routes, same DB, same port 5000.

## Run it

Backend (unchanged):
```
cd backend
pip install -r requirements.txt
python app.py
```

Frontend (new):
```
cd frontend
npm install
npm run dev
```
Opens on http://localhost:5173 and talks to the Flask API at http://127.0.0.1:5000
(see `src/api.js` if you ever need to change that base URL).

## What maps to what

| Old file | New location |
|---|---|
| index.html | src/pages/Welcome.jsx |
| login.html | src/pages/Login.jsx |
| register.html | src/pages/Register.jsx |
| feed.html | src/pages/Feed.jsx |
| trending.html | src/pages/Trending.jsx |
| create.html | src/pages/Create.jsx |
| post.html | src/pages/PostDetail.jsx (route `/post/:id` instead of `?id=`) |
| profile.html | src/pages/Profile.jsx |
| css/*.css | src/styles/*.css (copied over almost 1:1, imported per page) |
| js/main.js | logic split into each page component (the dead localStorage post-saving code from main.js was dropped — feed/trending/post all read from the real API) |

## Things fixed while porting (not new features, just correctness)

- **Create Confession was silently broken**: the old `create.html` sent JSON, but
  `app.py`'s `/api/confessions` POST route reads `request.form` (multipart). So posting
  never actually worked. The React version now sends `FormData`, matching what the
  backend already expects — and that's also what lets image upload actually go through
  (the old upload box wasn't wired to a file input at all).
- Routing uses `/post/:id` via React Router instead of `post.html?id=X` — cleaner, but
  functionally the same page.

## Still mocked (same as before — didn't add scope)

Login/Register just redirect to `/feed` — there's no `/api/login` or `/api/register`
route on the backend yet, so this matches the original behavior exactly.
