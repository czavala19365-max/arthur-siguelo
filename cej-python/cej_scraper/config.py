from __future__ import annotations

import os
import uuid
from dataclasses import dataclass

from dotenv import load_dotenv


load_dotenv()


@dataclass(frozen=True)
class ProxyConfig:
    server: str | None
    username: str | None
    password: str | None
    country: str = "PE"

    def session_username(self) -> str | None:
        """
        Many residential proxy providers allow rotating IPs by embedding a session id
        inside the username. We keep this generic: if you provide a username that already
        includes session/country params, we leave it as-is; otherwise we append a session token.
        """
        if not self.username:
            return None
        # Best-effort: create a new session on each run to rotate IP.
        sess = uuid.uuid4().hex[:12]
        if "session" in self.username.lower() or "country" in self.username.lower():
            return self.username
        # Generic pattern that works for many providers (adjust to yours if needed).
        return f"{self.username}-country-{self.country}-session-{sess}"


@dataclass(frozen=True)
class Settings:
    two_captcha_api_key: str
    capsolver_api_key: str | None
    db_url: str
    proxy: ProxyConfig

    cej_url: str = "https://cej.pj.gob.pe/cej/forms/busquedaform.html"


def load_settings() -> Settings:
    key = os.getenv("TWOCAPTCHA_API_KEY", "").strip()
    if not key:
        raise RuntimeError("TWOCAPTCHA_API_KEY no está configurado.")

    capsolver_key = os.getenv("CAPSOLVER_API_KEY", "").strip() or None
    db_url = os.getenv("DB_URL", "sqlite:///cej.db").strip()

    proxy = ProxyConfig(
        server=os.getenv("PROXY_SERVER"),
        username=os.getenv("PROXY_USERNAME"),
        password=os.getenv("PROXY_PASSWORD"),
        country=os.getenv("PROXY_COUNTRY", "PE"),
    )

    return Settings(two_captcha_api_key=key, capsolver_api_key=capsolver_key, db_url=db_url, proxy=proxy)

