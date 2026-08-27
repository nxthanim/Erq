"""Email sending utility using Resend API."""

import os
import httpx
from python_backend.config import settings


async def send_email(
    to: str,
    subject: str,
    html: str,
    from_addr: str = "",
) -> dict:
    """Send a transactional email via Resend API."""
    api_key = settings.RESEND_API_KEY
    if not from_addr:
        from_addr = settings.RESEND_FROM
    if not api_key:
        print(f"[email][DEV MODE] Would send to {to}: {subject}")
        return {"success": False, "error": "Resend not configured", "skipped": True}

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            response = await client.post(
                "https://api.resend.com/emails",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "from": from_addr,
                    "to": to,
                    "subject": subject,
                    "html": html,
                },
            )
            data = response.json()
            if response.is_error:
                print(f"[ERR] Resend error: {data}")
                return {"success": False, "error": str(data)}
            print(f"[OK] Email sent to {to}: {subject} (id: {data.get('id')})")
            return {"success": True, "data": data}
    except Exception as exc:
        print(f"[ERR] Failed to send email: {exc}")
        return {"success": False, "error": str(exc)}
