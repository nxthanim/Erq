"""JSON-safe serialization helpers.

FastAPI already converts most Python types, but raw SQL rows can carry
Decimal (Postgres NUMERIC), datetime, bytes, UUIDs and sets that some
clients choke on. These helpers normalize rows defensively so no endpoint
can 500 on an odd column type.
"""

import base64
from datetime import datetime, date
from decimal import Decimal


def sane(value):
    """Recursively convert DB-ish values into plain JSON-safe primitives."""
    if value is None or isinstance(value, (bool, int, str)):
        return value
    if isinstance(value, (Decimal, float)):
        return float(value)
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, date):
        return value.isoformat()
    if isinstance(value, bytes):
        try:
            return value.decode("utf-8", errors="replace")
        except Exception:
            return base64.b64encode(value).decode()
    if isinstance(value, dict):
        return {k: sane(v) for k, v in value.items()}
    if isinstance(value, (list, tuple, set)):
        return [sane(v) for v in value]
    return str(value)


def row(row):
    """Coerce a single SQLAlchemy RowMapping / dict into a JSON-safe dict."""
    if row is None:
        return None
    if isinstance(row, dict):
        return {k: sane(v) for k, v in row.items()}
    try:
        return sane(dict(row))
    except Exception:
        return {}


def rows(rows_iter):
    """Coerce an iterable of rows into a list of JSON-safe dicts."""
    return [row(r) for r in (rows_iter or [])]


def num(value, default=0):
    """Safely coerce a DB value to float (rating, amounts, counts)."""
    try:
        return float(value) if value is not None else float(default)
    except (TypeError, ValueError):
        return float(default)


def public_user(u):
    """Normalize a user dict for the client: numeric rating/counts, no password."""
    u = row(u) or {}
    u.pop("password", None)
    u["rating"] = num(u.get("rating"))
    u["review_count"] = int(num(u.get("review_count")))
    u["verified"] = int(num(u.get("verified"), 0))
    return u
