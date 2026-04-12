from __future__ import annotations

import asyncio
import sys
from dataclasses import dataclass

from cej_scraper.captcha_solver import CaptchaSolver
from cej_scraper.cej_client import CEJClient
from cej_scraper.config import load_settings
from cej_scraper.db import DatabaseManager


@dataclass
class RetryPolicy:
    attempts: int = 3
    base_delay_s: float = 5.0


async def run(expediente: str, parte: str, retry: RetryPolicy) -> int:
    settings = load_settings()
    db = DatabaseManager(settings.db_url)
    db.init()

    db.get_or_create_expediente(expediente)

    solver = CaptchaSolver(settings.two_captcha_api_key, capsolver_api_key=settings.capsolver_api_key)
    client = CEJClient(captcha_solver=solver, proxy=settings.proxy, cej_url=settings.cej_url)

    last_err: Exception | None = None
    for i in range(1, retry.attempts + 1):
        try:
            actuaciones = await client.fetch_actuaciones(expediente, parte)
            nuevos = db.upsert_actuaciones(expediente, actuaciones)

            print("")
            print("=== CEJ SCRAPE OK ===")
            print("Expediente:", expediente)
            print("Total actuaciones extraídas:", len(actuaciones))
            print("Nuevas actuaciones guardadas:", len(nuevos))
            if nuevos:
                print("Pendiente de Notificar: SI")
                for a in nuevos[:5]:
                    print(f"- {a.fecha} | {a.acto} | {(a.sumilla or '')[:80]}")
            else:
                print("Pendiente de Notificar: NO")
            return 0
        except Exception as e:
            last_err = e
            print(f"[retry {i}/{retry.attempts}] error: {e}")
            if i < retry.attempts:
                await asyncio.sleep(retry.base_delay_s * i)

    print("FATAL:", last_err)
    return 2


def main() -> int:
    if len(sys.argv) < 3:
        print("Uso: python main.py <EXPEDIENTE> <PARTE>")
        print('Ej:  python main.py "00847-2023-0-1801-JR-CI-12" "GARCIA LOPEZ"')
        return 1

    expediente = sys.argv[1]
    parte = sys.argv[2]
    return asyncio.run(run(expediente, parte, RetryPolicy()))


if __name__ == "__main__":
    raise SystemExit(main())

