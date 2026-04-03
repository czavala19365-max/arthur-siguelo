# Integración Arthur-Jorge → Arthur-Síguelo

**Rama de trabajo:** `integracion-jorge`
**Fecha:** 2026-04-03
**Estado:** ✅ BUILD EXITOSO — pendiente confirmación para commit

---

## Estado de cada paso

| Paso | Descripción | Estado |
|------|-------------|--------|
| 1 | Crear rama `integracion-jorge` | ✅ Completo |
| 2 | Reemplazar `globals.css` (CSS vars premium) | ✅ Completo |
| 3 | Reemplazar `app/layout.tsx` (fonts Playfair/DM Mono/Inter) | ✅ Completo |
| 4 | Reemplazar `app/page.tsx` (landing animada → login) | ✅ Completo |
| 5 | Reemplazar `next.config.ts` (serverExternalPackages) | ✅ Completo |
| 6 | Crear `app/login/page.tsx` + `app/select/page.tsx` | ✅ Completo |
| 7 | Crear `app/api/auth/route.ts` | ✅ Completo |
| 8 | Crear `app/dashboard/layout.tsx` (auth guard + Sidebar) | ✅ Completo |
| 9 | Crear páginas dashboard (6 páginas + tramites/[id]) | ✅ Completo |
| 10 | Crear `app/dashboard/siguelo/page.tsx` (SUNARP en nuevo hogar) | ✅ Completo |
| 11 | Crear módulo judicial `/judicial/` (7 páginas + layout) | ✅ Completo |
| 12 | Crear API routes tramites (6 routes) | ✅ Completo |
| 13 | Crear API routes casos (5 routes) | ✅ Completo |
| 14 | Crear API routes misc (5 routes) | ✅ Completo |
| 15 | Crear `lib/db.ts` (SQLite para módulos nuevos) | ✅ Completo |
| 16 | Crear libs de Jorge (ai-service, cej-scraper, scheduler, etc.) | ✅ Completo |
| 17 | Crear componentes de Jorge (Sidebar, JudicialSidebar, etc.) | ✅ Completo |
| 18 | Crear `components/siguelo/` con componentes SUNARP originales | ✅ Completo |
| 19 | Fusionar `package.json` (Jorge base + supabase/resend de siguelo) | ✅ Completo |
| 20 | Mantener `vercel.json` (crons `/api/cron/consultar`) | ✅ Sin cambios |
| 21 | Instalar dependencias (`npm install`) | ✅ 357 paquetes nuevos |
| 22 | `npm run build` | ✅ 0 errores, 38 rutas |
| 23 | Commit en rama `integracion-jorge` | ⬜ Pendiente confirmación |
| 24 | Push a GitHub / deploy a Vercel | ⬜ Pendiente |

---

## Resultado del build

```
✓ Compiled successfully in 14.5s
✓ TypeScript: 0 errores
✓ 38 rutas generadas
```

Rutas clave verificadas:
- `/` — Landing page animada (AnimatedBackground)
- `/login` — Autenticación con ACCESS_CODE
- `/select` — Selector de módulo (Registral / Judicial)
- `/dashboard/siguelo` — ✅ SUNARP Síguelo (Supabase, intacto)
- `/dashboard` — Trámites registrales (SQLite, Jorge)
- `/judicial` — Módulo CEJ (SQLite, Jorge)
- `/api/cron/consultar` — ✅ Cron SUNARP (Supabase, intacto)
- `/api/descargar-esquela` — ✅ Descargas PDF (Supabase, intacto)
- `/api/descargar-asiento` — ✅ Descargas PDF (Supabase, intacto)

---

## Arquitectura de la integración

### Dos bases de datos conviviendo (Opción B)

| Módulo | Base de datos | Archivo clave |
|--------|---------------|---------------|
| SUNARP Síguelo (original) | Supabase (cloud) | `lib/supabase.ts` |
| Trámites registrales (Jorge) | SQLite (`arthur.db`) | `lib/db.ts` |
| Módulo judicial CEJ (Jorge) | SQLite (`arthur.db`) | `lib/db.ts` |

### Rutas SUNARP Síguelo — intactas

Estos archivos NO fueron modificados:
- `lib/supabase.ts`
- `lib/scraper.ts`
- `lib/alertas.ts`
- `lib/estados.ts`
- `lib/excel.ts`
- `lib/oficinas.ts`
- `app/actions.ts`
- `app/api/cron/consultar/`
- `app/api/descargar-esquela/`
- `app/api/descargar-asiento/`
- `types/index.ts`

### Cambio de URL del módulo SUNARP

| Antes | Después |
|-------|---------|
| `/` (raíz) | `/dashboard/siguelo` |

La landing `/` ahora es la página de entrada premium de Arthur.

---

## Variables de entorno requeridas

### Ya presentes en arthur-siguelo (`.env.local`)
```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
RESEND_API_KEY=...
RESEND_FROM_EMAIL=...
TWOCAPTCHA_API_KEY=...
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_WHATSAPP_FROM=...
```

### Nuevas — requeridas por módulos de Jorge
```env
ACCESS_CODE=ARTHUR2026
ANTHROPIC_API_KEY=...
OPENAI_API_KEY=...
GEMINI_API_KEY=...
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=...
EMAIL_PASS=...
```

---

## Archivos creados/modificados (resumen)

```
REEMPLAZADOS (4):
  app/globals.css
  app/layout.tsx
  app/page.tsx
  next.config.ts

CREADOS (~55 archivos):
  app/login/page.tsx
  app/select/page.tsx
  app/api/auth/route.ts
  app/dashboard/layout.tsx
  app/dashboard/page.tsx
  app/dashboard/agenda/page.tsx
  app/dashboard/alertas/page.tsx
  app/dashboard/archivados/page.tsx
  app/dashboard/eliminados/page.tsx
  app/dashboard/chat/page.tsx
  app/dashboard/siguelo/page.tsx
  app/dashboard/tramites/[id]/page.tsx
  app/dashboard/tramites/[id]/redactar/page.tsx
  app/judicial/ (7 archivos)
  app/api/tramites/ (6 routes)
  app/api/casos/ (5 routes)
  app/api/chat/route.ts
  app/api/dashboard/stats/route.ts
  app/api/scheduler/start/route.ts
  app/api/debug-cej/route.ts
  app/api/debug-sunarp/route.ts
  lib/db.ts
  lib/ai-service.ts
  lib/cej-scraper.ts
  lib/scheduler.ts
  lib/notifications.ts
  lib/app-url.ts
  lib/llm-providers.ts
  lib/format-partes-judicial.ts
  lib/alertas-sunarp.ts
  lib/sunarp-oficinas.ts
  lib/sunarp-scraper.ts
  lib/sunarp-turnstile.ts
  components/Sidebar.tsx
  components/JudicialSidebar.tsx
  components/AddTramiteDrawer.tsx
  components/AnimatedBackground.tsx
  components/CalendarButtons.tsx
  components/StatusBadge.tsx
  components/siguelo/ (7 componentes originales con Supabase)
  instrumentation.ts

FUSIONADOS (1):
  package.json (Jorge base + @supabase/supabase-js + resend)

SIN CAMBIOS (vercel.json y todo el módulo SUNARP original)
```

---

*Última actualización: 2026-04-03 — Build exitoso, pendiente confirmación de commit.*
