"""Tiny in-process TTL cache for expensive read endpoints.

Designed for the default single-process local server AND small Postgres
deployments: entries expire after `ttl` seconds and the store self-evicts
above `max_entries` so it can never grow unbounded. Not shared across
serverless instances — there it only reduces per-instance DB load, which
is still a big win on cold-start dominated workloads.

Use it on public/read-only endpoints only. Never cache per-user data.
"""

import asyncio
import time
from functools import wraps

_lock = asyncio.Lock()
_store = {}


def get_cache():
    return _store


def clear_cache():
    _store.clear()


def cache_ttl(seconds: int = 30, max_entries: int = 512):
    """Decorator: cache the JSON-safe result of an async endpoint.

    The cache key is derived from the endpoint's path + query params so
    filtered listings (category/search/sort) stay correct.
    """

    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Build a stable key from positional + keyword args.
            key_parts = [func.__module__, func.__qualname__]
            key_parts.extend(repr(a) for a in args)
            key_parts.extend(f"{k}={v!r}" for k, v in sorted(kwargs.items()))
            key = "|".join(key_parts)

            now = time.monotonic()
            async with _lock:
                hit = _store.get(key)
                if hit is not None and hit[0] > now:
                    return hit[1]

            result = await func(*args, **kwargs)

            async with _lock:
                _store[key] = (now + seconds, result)
                # Opportunistic eviction: drop expired + oldest when full.
                if len(_store) > max_entries:
                    expired = [k for k, (exp, _) in _store.items() if exp <= now]
                    for k in expired:
                        _store.pop(k, None)
                while len(_store) > max_entries:
                    oldest = min(_store, key=lambda k: _store[k][0])
                    _store.pop(oldest, None)
            return result

        return wrapper

    return decorator
