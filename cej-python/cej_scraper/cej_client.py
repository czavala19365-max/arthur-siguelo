from __future__ import annotations

import base64
import re
from dataclasses import dataclass
from pathlib import Path

from playwright.async_api import Browser, Page, async_playwright

from .captcha_solver import CaptchaSolver
from .config import ProxyConfig


EXP_RE_NEW = re.compile(
    r"^(?P<seq>\d{5})-(?P<anio>\d{4})-(?P<num>\d)-(?P<dist>\d{4})-(?P<inst>[A-Z]{2})-(?P<esp>[A-Z]{2})-(?P<juz>\d{2})$"
)

# Variante vista en CEJ: año primero (ej: 2001-33088-0-1801-JR-CI-03)
EXP_RE_OLD = re.compile(
    r"^(?P<anio>\d{4})-(?P<seq>\d{1,6})-(?P<num>\d)-(?P<dist>\d{4})-(?P<inst>[A-Z]{2})-(?P<esp>[A-Z]{2})-(?P<juz>\d{2,3})$"
)


def parse_expediente(numero: str) -> dict:
    raw = numero.strip().upper()
    m = EXP_RE_NEW.match(raw)
    if m:
        return m.groupdict()

    m2 = EXP_RE_OLD.match(raw)
    if m2:
        d = m2.groupdict()
        # Normaliza a lo que espera el formulario Por Código:
        # cod_expediente = nroExp (secuencia en esta variante), cod_instancia = 2 dígitos.
        d["seq"] = d["seq"].zfill(5)[:6]
        d["juz"] = d["juz"].zfill(2)[-2:]
        return d

    raise ValueError("Formato inválido. Esperado: XXXXX-YYYY-0-ZZZZ-JR-AA-NN (o YYYY-XXXXX-0-... variante CEJ)")

async def _safe_click(page: Page, selector: str, timeout_ms: int = 3000) -> bool:
    try:
        await page.click(selector, timeout=timeout_ms)
        return True
    except Exception:
        return False


async def _safe_fill(page: Page, selector: str, value: str, timeout_ms: int = 3000) -> bool:
    try:
        await page.fill(selector, value, timeout=timeout_ms)
        return True
    except Exception:
        return False


async def _is_radware_challenge(page: Page) -> bool:
    try:
        url = page.url.lower()
        title = (await page.title()).lower()
        if "perfdrive" in url or "radware" in url:
            return True
        if "radware" in title or "bot manager" in title:
            return True
        el = await page.query_selector("iframe[src*='hcaptcha'], iframe[src*='captcha'], [data-sitekey], .h-captcha")
        return el is not None
    except Exception:
        return False


async def _extract_hcaptcha_sitekey(page: Page) -> str:
    # Prefer direct data-sitekey
    try:
        key = await page.eval_on_selector("[data-sitekey]", "el => el.getAttribute('data-sitekey') || ''")
        if key:
            return str(key)
    except Exception:
        pass

    # Try iframe src parameter
    try:
        src = await page.eval_on_selector("iframe[src*='hcaptcha'][src*='sitekey']", "el => el.getAttribute('src') || ''")
        m = re.search(r"sitekey=([a-f0-9\\-]+)", str(src), flags=re.I)
        if m:
            return m.group(1)
    except Exception:
        pass

    return ""


async def _inject_hcaptcha_token(page: Page, token: str) -> None:
    await page.evaluate(
        """(t) => {
          const fields = [
            'textarea[name="h-captcha-response"]',
            'textarea[name="g-recaptcha-response"]',
            '[name="h-captcha-response"]',
            '[name="g-recaptcha-response"]'
          ];
          fields.forEach(sel => {
            const el = document.querySelector(sel);
            if (el) el.value = t;
          });
          try {
            if (typeof window.ocs === 'function') window.ocs();
          } catch (e) {}
          try {
            if (window.hcaptcha && window.hcaptcha.execute) window.hcaptcha.execute();
          } catch (e) {}
        }""",
        token,
    )


async def _maybe_solve_radware(page: Page, solver: CaptchaSolver) -> bool:
    if not await _is_radware_challenge(page):
        return False
    debug_dir = Path.cwd() / "debug"
    debug_dir.mkdir(parents=True, exist_ok=True)
    try:
        html = await page.content()
        (debug_dir / "radware-challenge.html").write_text(html, encoding="utf-8")
    except Exception:
        pass
    try:
        await page.screenshot(path=str(debug_dir / "radware-challenge.png"), full_page=True)
    except Exception:
        pass

    sitekey = await _extract_hcaptcha_sitekey(page)
    pageurl = page.url
    pageurl_base = pageurl.split("?", 1)[0]
    print("[radware] pageurl:", pageurl)
    print("[radware] pageurl_base:", pageurl_base)
    print("[radware] sitekey:", sitekey or "(empty)")
    if not sitekey:
        raise RuntimeError("Radware detectado pero no se pudo extraer sitekey (hCaptcha). Revisa debug/radware-challenge.html")

    token = solver.solve_hcaptcha(sitekey=sitekey, pageurl=pageurl_base)
    print("[radware] token recibido (len):", len(token))
    await _inject_hcaptcha_token(page, token)

    await page.wait_for_timeout(2500)
    try:
        html2 = await page.content()
        (debug_dir / "radware-after.html").write_text(html2, encoding="utf-8")
    except Exception:
        pass
    try:
        await page.screenshot(path=str(debug_dir / "radware-after.png"), full_page=True)
    except Exception:
        pass
    return True


@dataclass
class CEJClient:
    captcha_solver: CaptchaSolver
    proxy: ProxyConfig
    cej_url: str = "https://cej.pj.gob.pe/cej/forms/busquedaform.html"

    async def _new_browser(self) -> tuple[Browser, Page]:
        pw = await async_playwright().start()

        proxy_cfg = None
        if self.proxy.server:
            proxy_cfg = {
                "server": self.proxy.server,
                "username": self.proxy.session_username(),
                "password": self.proxy.password or "",
            }

        browser = await pw.chromium.launch(headless=True, args=["--no-sandbox"])
        context = await browser.new_context(
            locale="es-PE",
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            proxy=proxy_cfg,
            viewport={"width": 1280, "height": 800},
        )
        page = await context.new_page()
        page.on("close", lambda: None)
        # Keep playwright instance alive via browser._pw, we stop it in close().
        browser._pw = pw  # type: ignore[attr-defined]
        return browser, page

    async def _close_browser(self, browser: Browser) -> None:
        pw = getattr(browser, "_pw", None)
        await browser.close()
        if pw:
            await pw.stop()

    async def fetch_actuaciones(self, expediente: str, parte: str) -> list[dict]:
        """
        Navega CEJ, llena campos, resuelve captcha (imagen) y extrae tabla/actuaciones.
        """
        if not parte or not parte.strip():
            raise ValueError("El campo PARTE es obligatorio (Ley 29733).")

        parts = parse_expediente(expediente)
        browser, page = await self._new_browser()

        try:
            await page.goto(self.cej_url, wait_until="load", timeout=30_000)
            await page.wait_for_timeout(1500)

            # Radware/hCaptcha (si aparece en la entrada)
            await _maybe_solve_radware(page, self.captcha_solver)

            # En CEJ, el captcha de imagen suele estar en Tab 1.
            await _safe_click(page, 'a[href="#tabs-1"], a:has-text("Por filtros")')
            await page.wait_for_timeout(400)

            captcha_code = await self._solve_image_captcha_if_present(page)

            # Tab 2: Por Código de Expediente
            await _safe_click(page, 'a[href="#tabs-2"], a:has-text("Por Código")')
            await page.wait_for_timeout(700)

            # Fill by known IDs (observed in CEJ HTML)
            await page.evaluate(
                """(args) => {
                  const set = (id, v) => {
                    const el = document.getElementById(id);
                    if (!el) return;
                    el.value = v;
                    el.dispatchEvent(new Event('input', { bubbles: true }));
                    el.dispatchEvent(new Event('change', { bubbles: true }));
                  };
                  set('cod_expediente', args.seq);
                  set('cod_anio', args.anio);
                  set('cod_incidente', args.num);
                  set('cod_distprov', args.dist);
                  set('cod_organo', args.inst);
                  set('cod_especialidad', args.esp);
                  set('cod_instancia', args.juz);
                }""",
                parts,
            )

            await _safe_fill(page, 'input[placeholder*="APELLIDO"], input[name="parte"], #parte', parte.upper(), timeout_ms=6000)

            if captcha_code:
                await _safe_fill(page, '#codigoCaptcha, input[name*="captcha"], input[id*="captcha"]', captcha_code, timeout_ms=6000)

            # Click consultar
            await _safe_click(page, "#consultarExpedientes", timeout_ms=6000)

            # Radware puede dispararse tras submits/navegaciones también
            await _maybe_solve_radware(page, self.captcha_solver)

            # Si CEJ valida por AJAX, espera esa respuesta (si existe) para detectar fallas rápidas
            try:
                resp = await page.wait_for_response(lambda r: "ValidarFiltrosCodigo" in r.url, timeout=35_000)
                txt = (await resp.text()).strip()
                # códigos típicos de error (captcha/parte/distrito)
                if txt in {"-C", "-CM", "-CV", "parte_req", "DistJud_x", "1", "2", "3", "4", "5"}:
                    raise RuntimeError(f"Validación CEJ falló: {txt}")
            except Exception:
                # no siempre hay endpoint visible; continuar
                pass

            # Wait for results containers
            await _maybe_solve_radware(page, self.captcha_solver)
            await page.wait_for_selector(
                "table, #listadoExpedientes, #pnlSeguimiento1, .esquina",
                timeout=35_000,
            )

            # If results list page, click into detail
            btn = await page.query_selector(
                'button[title="Ver detalle de expediente"], form[action="detalleform.html"] button[type="submit"], form[action*="detalle"] button'
            )
            if btn:
                await btn.click()
                await page.wait_for_timeout(1500)
                await page.wait_for_selector("#pnlSeguimiento1, .esquina, table", timeout=20_000)

            actuaciones = await self._extract_actuaciones(page)
            return actuaciones
        finally:
            await self._close_browser(browser)

    async def _solve_image_captcha_if_present(self, page: Page) -> str:
        img = await page.query_selector("#captcha_image, img#captcha_image, #imgCaptcha, img[id*='captcha']")
        if not img:
            return ""

        # Screenshot element and send to 2captcha
        buf = await img.screenshot(type="jpeg", quality=80)
        image_b64 = base64.b64encode(buf).decode("ascii")
        return self.captcha_solver.solve_image_base64(image_b64)

    async def _extract_actuaciones(self, page: Page) -> list[dict]:
        """
        Extrae tabla estándar o paneles `.esquina` (detalleform).
        """
        # Try detalleform panels
        panels = await page.eval_on_selector_all(
            "#pnlSeguimiento1 .esquina, [id^='pnlSeguimiento'] .esquina",
            """(esqs) => esqs.map(esq => {
              const panel = esq.nextElementSibling;
              if (!panel) return null;
              const numero = (esq.textContent || '').trim();
              const getVal = (labelText) => {
                const labels = panel.querySelectorAll('.roptionss, .roptionss-corto');
                for (const lab of labels) {
                  const txt = (lab.textContent || '').trim().toLowerCase();
                  if (txt.includes(labelText.toLowerCase())) {
                    const wrap = lab.parentElement;
                    const fleft = wrap?.querySelector('.fleft');
                    if (fleft) return (fleft.textContent || '').trim();
                    const sib = lab.nextElementSibling;
                    if (sib) return (sib.textContent || '').trim();
                  }
                }
                return '';
              };
              const fecha = getVal('fecha de ingreso') || getVal('fecha');
              const acto = getVal('acto');
              const folio = getVal('folios') || getVal('folio');
              const sumilla = getVal('sumilla');
              const a = panel.querySelector('a[href*=".pdf"], a[href*="documento"]');
              const documento_url = a ? a.href : '';
              const tiene_documento = !!documento_url;
              return { numero, fecha, acto, folio, sumilla, documento_url, tiene_documento };
            }).filter(Boolean)""",
        )
        if panels is None:
            panels = []

        if panels:
            return panels

        # Fallback: extract from first table with expected columns
        try:
            rows = await page.eval_on_selector_all(
                "table tr",
                """(trs) => trs.map(tr => {
                  const tds = Array.from(tr.querySelectorAll('td'));
                  if (tds.length < 4) return null;
                  const numero = (tds[0].textContent||'').trim();
                  const fecha = (tds[1].textContent||'').trim();
                  const acto = (tds[2].textContent||'').trim();
                  const folio = (tds[3].textContent||'').trim();
                  const sumilla = (tds[4]?.textContent||'').trim();
                  const a = tr.querySelector('a[href*=".pdf"], a[href*="documento"]');
                  const documento_url = a ? a.href : '';
                  const tiene_documento = !!documento_url;
                  return { numero, fecha, acto, folio, sumilla, documento_url, tiene_documento };
                }).filter(Boolean)""",
            )
        except Exception:
            rows = []

        return rows or []

