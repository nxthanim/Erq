"""E2E smoke test for the FastAPI backend on a fresh SQLite dev DB."""
import json
import os
import sqlite3
import urllib.error
import urllib.request
import uuid
import sys

BASE = f"http://localhost:{os.environ.get('SMOKE_PORT', '8000')}"


def req(method, path, body=None, token=None):
    r = urllib.request.Request(f"{BASE}{path}", method=method)
    r.add_header("Content-Type", "application/json")
    if token:
        r.add_header("Authorization", f"Bearer {token}")
    data = json.dumps(body).encode() if body is not None else None
    try:
        with urllib.request.urlopen(r, data=data) as resp:
            return resp.status, json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode())


failures = []


def check(name, ok, detail=""):
    status = "PASS" if ok else "FAIL"
    print(f"[{status}] {name} {detail}")
    if not ok:
        failures.append(name)


con = sqlite3.connect("erq_dev.db")
email = f"freelancer{uuid.uuid4().hex[:8]}@test.et"
con.execute(
    """INSERT INTO email_verifications
       (id, user_id, email, email_address, status, status_detail,
        is_format_valid, is_mx_valid, domain, score, is_disposable)
       VALUES (?, NULL, ?, ?, 'deliverable', 'ok', 1, 1, 'test.et', 0.9, 0)""",
    (str(uuid.uuid4()), email, email),
)
con.commit()
con.close()

s, res = req("POST", "/api/auth/signup",
             {"email": email, "password": "TestPass123!",
              "fullName": "Test Freelancer", "role": "freelancer"})
check("signup", s == 200, f"({s})")
token = res.get("token", "")

s, gig = req("POST", "/api/gigs",
             {"title": "Logo Design", "description": "Modern logo in 3 days",
              "price": 1500, "category": "Graphic Design", "deliveryTime": 3}, token)
check("create gig", s == 200, f"({s})")

s, lst = req("GET", "/api/gigs")
check("list gigs", s == 200 and len(lst.get("gigs", [])) >= 1, f"({s}, {len(lst.get('gigs', []))})")

s, matches = req("POST", "/api/ai/smart-match",
                 {"projectDescription": "design a logo and branding"}, token)
check("smart match (parameterized)", s == 200, f"({s})")
s, matches = req("POST", "/api/ai/smart-match",
                 {"projectDescription": "design a logo", "category": "Graphic Design"}, token)
check("smart match with category", s == 200 and len(matches.get("matches", [])) >= 1, f"({s})")

s, feed = req("GET", "/api/features/activity-feed?limit=5", token=token)
check("activity feed", s == 200, f"({s})")

s, dash = req("GET", "/api/features/dashboard", token=token)
check("dashboard", s == 200 and "orders_sold" in dash.get("stats", {}), f"({s})")

s, _ = req("GET", "/api/user/analytics/overview", token=token)
check("user analytics overview", s == 200, f"({s})")
s, g = req("GET", "/api/user/analytics/gigs", token=token)
check("user analytics gigs (DATE_TRUNC path)", s == 200, f"({s})")

s, _ = req("POST", "/api/agents",
           {"name": "My Agent", "role": "assistant", "instructions": "help"}, token)
check("create agent", s == 200, f"({s})")
s, agents = req("GET", "/api/agents", token=token)
check("list agents", s == 200 and len(agents.get("agents", [])) >= 1, f"({s}, {len(agents.get('agents', []))})")

s, tips = req("GET", "/api/features/tips/me/received", token=token)
check("my received tips (tips table)", s == 200, f"({s})")

# Admin flow
s, adm = req("POST", "/api/auth/login",
             {"email": "admin@gebeya.et", "password": "admin123"})
check("admin login", s == 200, f"({s})")
admin_token = adm.get("token", "")
s, _ = req("GET", "/api/admin/analytics/financial?range=30d", token=admin_token)
check("admin financial analytics", s == 200, f"({s})")
s, _ = req("GET", "/api/admin/analytics/platform?range=7d", token=admin_token)
check("admin platform analytics", s == 200, f"({s})")
s, _ = req("GET", "/api/admin/analytics", token=admin_token)
check("admin 12mo analytics", s == 200, f"({s})")
s, _ = req("GET", "/api/admin/stats", token=admin_token)
check("admin stats", s == 200, f"({s})")

# Public browse
s, cats = req("GET", "/api/categories")
check("categories seeded", s == 200 and len(cats.get("categories", [])) == 9, f"({s})")
s, _ = req("GET", "/api/gigs/trending")
check("trending", s == 200, f"({s})")
s, _ = req("GET", "/api/users/freelancers")
check("freelancers list", s == 200, f"({s})")

print()
if failures:
    print(f"{len(failures)} FAILURES: {failures}")
    sys.exit(1)
print("ALL E2E CHECKS PASSED")
