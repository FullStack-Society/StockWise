"""Small Resend API client for transactional StockWise email."""

import json
from urllib.error import URLError
from urllib.request import Request, urlopen

from app.core.config import settings

RESEND_EMAILS_URL = "https://api.resend.com/emails"


class ResendEmailError(Exception):
    """Raised when Resend rejects or cannot accept an email request."""


def send_resend_email(*, to: str, subject: str, text: str) -> None:
    if not settings.resend_api_key or not settings.email_from:
        raise ResendEmailError("Resend email configuration is missing.")

    payload = json.dumps(
        {
            "from": settings.email_from,
            "to": [to.strip().lower()],
            "subject": subject,
            "text": text,
        }
    ).encode("utf-8")
    request = Request(
        RESEND_EMAILS_URL,
        data=payload,
        headers={
            "Authorization": f"Bearer {settings.resend_api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )

    try:
        with urlopen(request, timeout=15) as response:
            if not 200 <= response.status < 300:
                raise ResendEmailError(
                    f"Resend returned HTTP status {response.status}."
                )
    except (URLError, TimeoutError, OSError) as exc:
        raise ResendEmailError("Unable to reach the Resend email API.") from exc
