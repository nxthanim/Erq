"""E2E test for rate limiting + automatic IP bans.

Expects the server already running (see scripts/ratelimit_test.sh / bash
runner) with these LOW limits set via env:
    RATE_LIMIT_MAX_REQUESTS=5
    AUTH_RATE_LIMIT_MAX=3
    SIGNUP_RATE_LIMIT_MAX=2
    BAN_THRESHOLD_MULTIPLIER=2
    BAN_DURATION_MINUTES=60

Each phase spoofs a distinct X-Forwarded-For IP so buckets don't interfere.
"""
import json
import os
import sys
import urllib.error
import urllib.request

BASE = f"http://localhost:{os.environ.get('SMOKE_PORT', '8000')}"


def req(method, path, body=None, token=None, ip="127.0.0.1"):
    r = urllib.request.Request(f"{BASE}{path}", method=method)
    r.add_header("Content-Type", "application/json")
    r.add_header("X-Forwarded-For", ip)
    if token:
        r.add_header("Authorization", f"Bearer {token}")
    data = json.dumps(body).encode() if body is not None else None
    try:
        with urllib.request.urlopen(r, data=data) as resp:
            return resp.status, json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read().decode())
        except Exception:
            return e.code, {}


failures = []


def check(name, ok, detail=""):
    status = "PASS" if ok else "FAIL"
    print(f"[{status}] {name} {detail}")
    if not ok:
        failures.append(name)


# ============================================================
# Phase A — general bucket: 5 allowed, 6th => 429, 2nd 429 => ban => 403
# ============================================================
IP_A = "1.1.1.1"
codes = []
for _ in range(5):
    s, _ = req("GET", "/api/categories", ip=IP_A)
    codes.append(s)
check("general: 5 requests allowed", all(c == 200 for c in codes), f"{codes}")

s, _ = req("GET", "/api/categories", ip=IP_A)
check("general: 6th request => 429", s == 429, f"({s})")

s, body = req("GET", "/api/categories", ip=IP_A)
check("general: 2nd breach => auto-ban => 403", s == 403, f"({s}) {body.get('error', '')}")
check("ban payload has banned_until", bool(body.get("banned_until")), "")

s, _ = req("GET", "/api/categories", ip=IP_A)
check("banned IP blocked on other buckets too", s == 403, f"({s})")

# ============================================================
# Phase B — auth bucket: 3 allowed, 4th => 429, 5th => 429 => ban
# ============================================================
IP_B = "2.2.2.2"
codes = []
for _ in range(3):
    s, _ = req("POST", "/api/auth/login",
               {"email": "nobody@test.et", "password": "wrong"}, ip=IP_B)
    codes.append(s)
check("auth: 3 attempts allowed (401 or 200)", all(c in (200, 401) for c in codes), f"{codes}")

s, _ = req("POST", "/api/auth/login",
           {"email": "nobody@test.et", "password": "wrong"}, ip=IP_B)
check("auth: 4th attempt => 429", s == 429, f"({s})")

s, _ = req("POST", "/api/auth/login",
           {"email": "nobody@test.et", "password": "wrong"}, ip=IP_B)
check("auth: 2nd breach => ban => 403", s == 403, f"({s})")

# ============================================================
# Phase C — signup bucket: 2 allowed, 3rd => 429
# ============================================================
IP_C = "3.3.3.3"
s1, _ = req("POST", "/api/auth/signup", {"email": "x@y.et"}, ip=IP_C)
s2, _ = req("POST", "/api/auth/signup", {"email": "x@y.et"}, ip=IP_C)
s3, _ = req("POST", "/api/auth/signup", {"email": "x@y.et"}, ip=IP_C)
check("signup: first two counted, third => 429", s3 == 429, f"({s1},{s2},{s3})")

# ============================================================
# Phase D — admin: list bans, unban, confirm restored
# ============================================================
IP_D = "4.4.4.4"
s, adm = req("POST", "/api/auth/login",
             {"email": "admin@gebeya.et", "password": "admin123"}, ip=IP_D)
check("admin login (auth bucket, under limit)", s == 200, f"({s})")
admin_token = adm.get("token", "")

s, body = req("GET", "/api/admin/security/banned-ips", token=admin_token, ip=IP_D)
ips = [b["ip"] for b in body.get("banned_ips", [])]
check("admin lists banned IPs", s == 200 and IP_A in ips and IP_B in ips, f"({s}) {ips}")

s, rl_body = req("GET", "/api/admin/security/rate-limits", token=admin_token, ip=IP_D)
check("admin rate-limit stats", s == 200 and "top_ips" in rl_body, f"({s})")
check("admin rate-limit stats has recent_breaches", s == 200 and "recent_breaches" in rl_body, f"({s})")

s, _ = req("DELETE", f"/api/admin/security/banned-ips/{IP_A}", token=admin_token, ip=IP_D)
check("admin unbans IP A", s == 200, f"({s})")

s, _ = req("GET", "/api/categories", ip=IP_A)
check("unbanned IP works again", s == 200, f"({s})")

s, _ = req("GET", "/api/categories", ip=IP_B)
check("non-unbanned IP still banned", s == 403, f"({s})")

print()
if failures:
    print(f"{len(failures)} FAILURES: {failures}")
    sys.exit(1)
print("ALL RATE-LIMIT CHECKS PASSED")
