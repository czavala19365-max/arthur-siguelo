from __future__ import annotations

import time
from dataclasses import dataclass

import requests


@dataclass
class CaptchaSolver:
    api_key: str
    capsolver_api_key: str | None = None
    poll_interval_s: float = 5.0
    timeout_s: float = 120.0

    def solve_image_base64(self, image_b64: str) -> str:
        """
        2Captcha normal captcha (image) using base64 payload.
        """
        submit = requests.post(
            "https://2captcha.com/in.php",
            data={
                "key": self.api_key,
                "method": "base64",
                "body": image_b64,
                "json": 1,
            },
            timeout=30,
        ).json()

        if submit.get("status") != 1:
            raise RuntimeError(f"2captcha submit failed: {submit}")

        task_id = submit.get("request")
        deadline = time.time() + self.timeout_s

        while time.time() < deadline:
            time.sleep(self.poll_interval_s)
            res = requests.get(
                "https://2captcha.com/res.php",
                params={"key": self.api_key, "action": "get", "id": task_id, "json": 1},
                timeout=30,
            ).json()

            if res.get("status") == 1:
                return str(res.get("request") or "").strip()
            if res.get("request") != "CAPCHA_NOT_READY":
                raise RuntimeError(f"2captcha solve failed: {res}")

        raise TimeoutError("2captcha timeout (image captcha)")

    def solve_hcaptcha(self, sitekey: str, pageurl: str) -> str:
        """
        hCaptcha (proxyless).

        Strategy:
        - If CapSolver key is configured, try CapSolver first (often better for Radware/perfdrive).
        - Fallback to 2Captcha API v2 (then v1).
        """
        capsolver_err: dict | None = None
        if self.capsolver_api_key:
            create = requests.post(
                "https://api.capsolver.com/createTask",
                json={
                    "clientKey": self.capsolver_api_key,
                    "task": {
                        "type": "HCaptchaTaskProxyLess",
                        "websiteURL": pageurl,
                        "websiteKey": sitekey,
                    },
                },
                timeout=30,
            ).json()
            if create.get("errorId") == 0 and create.get("taskId"):
                task_id = create["taskId"]
                deadline = time.time() + max(self.timeout_s, 180.0)
                while time.time() < deadline:
                    time.sleep(self.poll_interval_s)
                    res = requests.post(
                        "https://api.capsolver.com/getTaskResult",
                        json={"clientKey": self.capsolver_api_key, "taskId": task_id},
                        timeout=30,
                    ).json()
                    if res.get("errorId") != 0:
                        raise RuntimeError(f"capsolver hcaptcha solve failed: {res}")
                    if res.get("status") == "ready":
                        token = (res.get("solution") or {}).get("gRecaptchaResponse")
                        if not token:
                            raise RuntimeError(f"capsolver returned no token: {res}")
                        return str(token).strip()
                raise TimeoutError("capsolver timeout (hcaptcha)")
            capsolver_err = create

        # Prefer API v2 task-based endpoints (more reliable for modern challenge pages).
        create = requests.post(
            "https://api.2captcha.com/createTask",
            json={
                "clientKey": self.api_key,
                "task": {
                    "type": "HCaptchaTaskProxyless",
                    "websiteURL": pageurl,
                    "websiteKey": sitekey,
                },
            },
            timeout=30,
        ).json()

        if create.get("errorId") != 0:
            # Log v2 error for diagnosis, then fallback to legacy v1.
            # (We keep fallback because some accounts are only enabled for API v1.)
            err = create
            submit = requests.post(
                "https://2captcha.com/in.php",
                data={
                    "key": self.api_key,
                    "method": "hcaptcha",
                    "sitekey": sitekey,
                    "pageurl": pageurl,
                    "json": 1,
                },
                timeout=30,
            ).json()
            if submit.get("status") != 1:
                extra = ""
                if capsolver_err is not None:
                    extra = f" (capsolver createTask was: {capsolver_err})"
                raise RuntimeError(f"2captcha hcaptcha submit failed: {submit} (v2 createTask was: {err}){extra}")

            task_id = submit.get("request")
            deadline = time.time() + max(self.timeout_s, 180.0)
            while time.time() < deadline:
                time.sleep(self.poll_interval_s)
                res = requests.get(
                    "https://2captcha.com/res.php",
                    params={"key": self.api_key, "action": "get", "id": task_id, "json": 1},
                    timeout=30,
                ).json()
                if res.get("status") == 1:
                    return str(res.get("request") or "").strip()
                if res.get("request") != "CAPCHA_NOT_READY":
                    raise RuntimeError(f"2captcha hcaptcha solve failed: {res}")
            raise TimeoutError("2captcha timeout (hcaptcha)")

        task_id = create.get("taskId")
        deadline = time.time() + max(self.timeout_s, 180.0)
        while time.time() < deadline:
            time.sleep(self.poll_interval_s)
            res = requests.post(
                "https://api.2captcha.com/getTaskResult",
                json={"clientKey": self.api_key, "taskId": task_id},
                timeout=30,
            ).json()
            if res.get("errorId") != 0:
                raise RuntimeError(f"2captcha hcaptcha solve failed: {res}")
            if res.get("status") == "ready":
                solution = (res.get("solution") or {}).get("gRecaptchaResponse")
                if not solution:
                    raise RuntimeError(f"2captcha hcaptcha solve returned no token: {res}")
                return str(solution).strip()

        raise TimeoutError("2captcha timeout (hcaptcha)")

