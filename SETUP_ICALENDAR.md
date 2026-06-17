# Integración: Sistema de Alertas Judiciales con iCalendar

## 📋 Archivos Creados

1. **`lib/calendar-ics.ts`** - Genera archivos iCalendar (RFC 5545)
2. **`lib/extract-due-dates.ts`** - Extrae fechas de PDFs usando Claude 3.5 Sonnet
3. **`lib/judicial-alerts.ts`** - Orquestador principal (descarga PDF → IA → email)
4. **`lib/channels/email-channel.ts`** - ACTUALIZADO para soportar adjuntos .ics

## ✅ Requisitos

### Variables de Entorno
```bash
RESEND_API_KEY=tu_clave_resend
ANTHROPIC_API_KEY=tu_clave_claude  # Ya debería existir
RESEND_FROM_EMAIL=alertas@arthur-legal.com
```

### Dependencias NPM (verificar si ya existen)
```bash
npm install pdf-parse @anthropic-ai/sdk
```

## 🔌 Integración en `app/api/casos/route.ts`

### Paso 1: Agregar imports al inicio del archivo

En la línea donde están los imports, agrega:

```typescript
import { enviarAlertaJudicialConIA } from '@/lib/judicial-alerts'
```

### Paso 2: Reemplazar la lógica de envío de alertas

En la función `runInitialCejSync()`, busca la sección que dice:

```typescript
if (mostRecentToAlert) {
  try {
    const cfg = await getAlertaConfigParaCaso(caso.id)
    if (cfg) {
      const { mov, cls } = mostRecentToAlert
      const nivel: 'alta' | 'media' | 'baja' = ...
      const descripcion = mov.sumilla || mov.acto || 'Movimiento judicial'
      const alertaResult = await enviarAlertaMovimiento(...)
      // ...
    }
  }
}
```

**Reemplázalo con:**

```typescript
if (mostRecentToAlert) {
  try {
    const cfg = await getAlertaConfigParaCaso(caso.id)
    if (cfg) {
      const { mov, cls } = mostRecentToAlert
      const nivel: 'alta' | 'media' | 'baja' =
        cls.urgencia === 'alta' ? 'alta' : cls.urgencia === 'normal' ? 'media' : 'baja'
      const descripcion = mov.sumilla || mov.acto || 'Movimiento judicial'
      
      const alertaResult = await enviarAlertaMovimiento(
        {
          expedienteId: String(caso.id),
          numeroExpediente: caso.numero_expediente,
          descripcion,
          nivelUrgencia: nivel,
          sugerenciaIA: cls.sugerencia || 'Revisar movimiento en CEJ.',
          casoNombre: caso.alias || caso.cliente || undefined,
        },
        cfg
      )
      
      // ✨ NUEVO: Si hay email, procesar con extracción de fechas y .ics
      if (cfg.email && mov.documentoUrl) {
        console.log('[Alert] Enviando con extracción de fechas a:', cfg.email)
        await enviarAlertaJudicialConIA(
          cfg.email,
          {
            expedienteId: String(caso.id),
            numeroExpediente: caso.numero_expediente,
            descripcion,
            nivelUrgencia: nivel,
            sugerenciaIA: cls.sugerencia || 'Revisar movimiento en CEJ.',
            casoNombre: caso.alias || caso.cliente || undefined,
          },
          mov.documentoUrl
        )
      }
      
      for (const canal of alertaResult.canalesExitosos) {
        await logNotificacionJudicial(caso.id, canal, descripcion, nivel, cls.sugerencia || '', true)
      }
      if (!alertaResult.enviado) {
        await logNotificacionJudicial(caso.id, 'ninguno', descripcion, nivel, cls.sugerencia || '', false)
      }
    }
  } catch (e) {
    console.error('[API] Alert send failed:', e)
  }
}
```

## 🧪 Prueba Local

### 1. Verifica las variables de entorno
```bash
echo $RESEND_API_KEY
echo $ANTHROPIC_API_KEY
```

### 2. Instala dependencias
```bash
npm install pdf-parse @anthropic-ai/sdk
```

### 3. Crea un caso desde la UI
- Ve a `/judicial`
- Ingresa un número de expediente válido del Poder Judicial Peruano
- **Importante**: Usa tu email real en el campo de email
- Haz clic en "Crear caso"

### 4. Verifica el email
- Revisa tu inbox (y spam si es necesario)
- Deberías ver:
  - ✉️ Email formateado de Arthur-IA
  - ⏰ **Botón "Add to Calendar"** (Gmail, Outlook, Apple Mail, etc.)
  - 📎 Adjunto `.ics` con el nombre del expediente
  
### 5. Prueba la integración con calendario
- Haz clic en el botón "Add to Calendar"
- El evento debería aparecer automáticamente en tu calendario
- La fecha y descripción del plazo se cargarán del análisis de IA

## 🔍 Debugging

### Ver logs de PDF
```bash
# En la consola del servidor (npm run dev)
[PDF] Descargando: https://...
[PDF] Analizando con IA...
[Alert] Fecha extraída: 2026-07-15 Presentar demanda ante juzgado
```

### Casos de error comunes

**Error: `RESEND_API_KEY no configurado`**
- Solución: Agrega a `.env.local`

**Error: `pdf-parse module not found`**
- Solución: `npm install pdf-parse`

**PDF sin fecha extraída**
- Normal: El documento no tenía fecha clara o la confianza fue baja
- El email se envía igual, solo sin fecha en el .ics
- Cambia `confidence` en `extract-due-dates.ts` line ~95 si quieres ajustar

## 📊 Flujo Completo

```
Usuario crea caso en /judicial
    ↓
POST /api/casos recibe: {numero_expediente, email, ...}
    ↓
Scraper CEJ obtiene movimientos + PDFs
    ↓
enviarAlertaJudicialConIA() ejecuta:
    ├─ downloadPdfFromUrl() → descarga PDF
    ├─ findNextDueDate() → Claude extrae fecha (IA)
    ├─ generateICalendar() → Crea .ics
    └─ enviarEmail() → Resend envía con adjunto
    ↓
Email llega con:
├─ HTML formateado
├─ Fecha pendiente destacada
├─ .ics adjunto (Add to Calendar)
└─ Enlace a panel de Arthur-IA
```

## 🎯 Siguientes Pasos

1. **Verificar variables de entorno** en `.env.local`
2. **Instalar pdf-parse**: `npm install pdf-parse`
3. **Realizar cambios en `app/api/casos/route.ts`** (ver Paso 2 arriba)
4. **Testear con un caso real**
5. **Monitorear logs** en `npm run dev`

---

**Listo para usar y probar en producción** ✅
