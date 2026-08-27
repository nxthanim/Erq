"""
Vercel Serverless Function Entry Point for Python/FastAPI backend.

This file wraps the FastAPI app as a single serverless function.
Vercel detects the ASGI app and serves it automatically.
"""

import os
os.environ.setdefault("VERCEL", "true")

# Import and expose the FastAPI app for Vercel's ASGI runtime
from python_backend.main import app

# Vercel ASGI expects the app to be exported at module level
# It will automatically handle the ASGI protocol
