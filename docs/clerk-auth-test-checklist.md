# Clerk Auth Flow — Manual Test Checklist

App: Erq Marketplace · Clerk mode (publishable key configured)
Run: `python -m uvicorn python_backend.main:app --port 8000` + `cd client && npm run dev` → http://localhost:5173

> **Before you start:** clear localStorage once (DevTools → Application → Local Storage → clear) so
> `erq_token`, `gebeya_user`, `erq_role_selected` start empty. Use an incognito window if you want a
> totally clean Clerk session.

---

## 1. Sign-in redirect ✅/❌

| # | Step | Expected |
|---|------|----------|
| 1.1 | Open http://localhost:5173/login | Clerk widget renders (Google/Facebook/TikTok + email/password). No console errors. |
| 1.2 | Sign in with an **existing** account that already picked a role | Smooth SPA redirect to **`/` (homepage)**. **No page reload flash, no glitch, no staying stuck on /login.** |
| 1.3 | Check the top nav | Shows your **real name** (avatar / initial), not "Clerk User". "My Dashboard" link appears. |
| 1.4 | Sign in with a **brand-new** Clerk account (role defaults to `client`, no role picked) | Lands on **`/choose-role`** exactly once. |
| 1.5 | Sign in as an **admin** account | Lands on **`/admin`**. |
| 1.6 | Watch the Network tab during sign-in | Exactly one `POST /api/auth/clerk/sync` (StrictMode dev may fire it twice — expected, harmless). Response includes `user.full_name` = your real name and `token`. |
| 1.7 | DevTools → Application → Local Storage | `erq_token` set, `gebeya_user` set with correct `full_name` (not "Clerk User"). |

**Regression checks for the old bugs**
- [ ] No `window.history.pushState`/`PopStateEvent` hacks firing — URL changes come from React Router.
- [ ] No full page reload during redirect (network log should NOT show a new document load of `/`).

## 2. Refresh / session restore ✅/❌

| # | Step | Expected |
|---|------|----------|
| 2.1 | While signed in, press **F5** on `/` | Stays signed in. Short loading spinner only; **no glitch, no flicker back to /login**. |
| 2.2 | Refresh on a deep page (e.g. `/dashboard`, `/profile`) | Stays on that page — **must NOT** be yanked to `/` or `/choose-role`. |
| 2.3 | Refresh on `/login` while already signed in | Auto-redirected away from /login to `/` (or `/choose-role` if role not picked). |
| 2.4 | After refresh, check nav again | Real name + avatar persist. |
| 2.5 | DevTools → Network → `POST /api/auth/clerk/sync` | 200; backend `users` row healed with real `full_name`/`profile_picture` if it was previously "Clerk User". |

## 3. Choose-role flow ✅/❌

| # | Step | Expected |
|---|------|----------|
| 3.1 | (New user) on `/choose-role`, pick **Freelancer** | "You're all set" → auto-redirect to **`/dashboard`** after ~1.8s. |
| 3.2 | localStorage after choosing | `erq_role_selected` = `true`; `gebeya_user.role` updated. |
| 3.3 | Sign out, sign back in with the same account | Goes straight to `/` (homepage) — **no** `/choose-role` anymore. |
| 3.4 | Backend check | `PUT /api/auth/role` persisted the role (visible on Profile page). |

## 4. Logout ✅/❌

| # | Step | Expected |
|---|------|----------|
| 4.1 | Log out from the UI (profile menu → Sign out) | Clerk session ends; `erq_token` + `gebeya_user` removed from localStorage. |
| 4.2 | After logout, try visiting a protected route (e.g. `/dashboard`) | Redirected to **`/login`** (ProtectedRoute guard). |
| 4.3 | Reload after logout | Still logged out (Clerk session actually signed out — no auto-restore). |
| 4.4 | Log in with a **different** account | New account's identity replaces the old one; no leftover user data from the previous session. |

## 5. Backend / API sanity ✅/❌

| # | Step | Expected |
|---|------|----------|
| 5.1 | `curl http://localhost:8000/api/health` | `200` |
| 5.2 | `curl -X POST http://localhost:8000/api/auth/clerk/sync -H "Content-Type: application/json" -d '{"token":"bogus"}'` | `401 {"detail":"Invalid Clerk session"}` |
| 5.3 | With a valid session (from DevTools, copy the `erq_token`): `curl -H "Authorization: Bearer <token>" http://localhost:8000/api/auth/me` | `200` with your user object |
| 5.4 | `grep CLERK_SECRET_KEY .env` | Active (uncommented) — if it's `sk_test_...` and you want real profile fetches, confirm it's the **current** key (stale keys return 401 from `api.clerk.com`). |

## Quick pass/fail summary

| Area | Pass? |
|------|-------|
| Sign-in redirect (existing / new / admin) | ☐ |
| No redirect glitch or reload | ☐ |
| Refresh restores session, no name glitch | ☐ |
| Choose-role → dashboard | ☐ |
| Logout + protected-route guard | ☐ |

---

### Environment details (as of this checklist)
- Auth mode: **Clerk** (`VITE_CLERK_PUBLISHABLE_KEY` set in `client/.env` + `CLERK_PUBLISHABLE_KEY` in root `.env`).
- Post-login routing is owned by `ClerkAuthBridge` in `client/src/context/AuthContext.jsx` (single source of truth, `useNavigate`).
- Clerk redirects wired through React Router via `routerPush`/`routerReplace` in `client/src/main.jsx`.
- Real profile passed to `POST /api/auth/clerk/sync`; backend heals old "Clerk User" records (`python_backend/auth.py`).
