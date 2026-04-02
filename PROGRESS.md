# Arthur Síguelo — Estado del Proyecto

## ✅ Completado

- Proyecto Next.js 16 + TypeScript + Tailwind CSS v4
- Página principal con lista de títulos registrales monitoreados
- Formulario para agregar títulos (oficina registral, año, número, cliente, email, WhatsApp)
- Server Actions para guardar datos (Next.js 16 nativo)
- Cliente Supabase configurado (`lib/supabase.ts`)
- Tipos TypeScript (`types/index.ts`)
- Repositorio en GitHub: https://github.com/czavala19365-max/arthur-siguelo

---

## 🔲 Pendiente

### 1. Configurar Supabase
- Crear proyecto en supabase.com
- Ejecutar `supabase-schema.sql` en el SQL Editor
- Copiar `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Crear `.env.local` con las credenciales (ver `.env.local.example`)

### 2. Scraper de SIGUELO con 2captcha
- Integrar cliente HTTP (fetch o axios) para consultar el portal de SUNARP/SIGUELO
- Resolver el CAPTCHA del portal usando la API de 2captcha
  - Necesita: API key de 2captcha
  - Flujo: enviar imagen del captcha → recibir solución → enviar formulario
- Parsear la respuesta HTML para extraer el estado actual del título
- Guardar resultado de cada consulta en tabla `consultas` de Supabase
- Variables de entorno a agregar:
  - `TWOCAPTCHA_API_KEY`
  - `SIGUELO_URL` (URL base del portal)

### 3. Scheduler — 3 consultas diarias por título
- Configurar un cron job (opciones):
  - **Vercel Cron Jobs** (recomendado, nativo): `vercel.json` con schedule
  - Alternativa: servicio externo (Upstash QStash, cron-job.org)
- Lógica: iterar todos los títulos activos y ejecutar el scraper por cada uno
- Horarios sugeridos: 08:00, 13:00 y 18:00 (hora Perú, UTC-5)
- Registrar cada ejecución en tabla `logs_consultas` para auditoría

### 4. Alertas por Email y WhatsApp
- **Email** (cuando cambia el estado del título):
  - Integrar Resend o Nodemailer + SMTP
  - Template HTML con: título, estado anterior, estado nuevo, fecha
  - Variable de entorno: `RESEND_API_KEY` o credenciales SMTP
- **WhatsApp** (notificación instantánea):
  - Integrar Twilio WhatsApp API o WhatsApp Business API (Meta)
  - Enviar mensaje al `whatsapp_cliente` registrado
  - Variable de entorno: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM`
- Lógica de alerta: comparar estado nuevo vs. último estado guardado → si cambia, notificar

---

## Arquitectura objetivo

```
Cron (3x/día)
    └── /api/cron/consultar
            ├── Obtener títulos activos (Supabase)
            ├── Para cada título:
            │     ├── Scraper SIGUELO + 2captcha
            │     ├── Guardar resultado en Supabase
            │     └── Si estado cambió → Enviar email + WhatsApp
            └── Registrar log de ejecución
```

## Variables de entorno finales

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
TWOCAPTCHA_API_KEY=
RESEND_API_KEY=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
```
