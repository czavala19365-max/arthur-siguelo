# 🔄 Flujo Visual: Botón de Calendario → Google Calendar / Outlook

## 📱 Flujo completo

```
USER CLICK
   ↓
CalendarButtons component
   ├─ title: "Audiencia Civil — Exp-2024-001"
   ├─ date: "2024-12-31"
   └─ description: "Expediente: 2024-001\nEvento: Audiencia Civil"
   ↓
┌─────────────────────────────────────────────────────────────┐
│ Si hace click en "Google Calendar"                          │
├─────────────────────────────────────────────────────────────┤
│ 1. Convierte fecha:    2024-12-31 → 20241231               │
│ 2. Crea rango horario: 09:00-10:00 → T090000/T100000       │
│ 3. Construye URLSearchParams:                              │
│    {                                                         │
│      action: "TEMPLATE",                                    │
│      text: "Audiencia Civil — Exp-2024-001",               │
│      dates: "20241231T090000/20241231T100000",             │
│      details: "Expediente: 2024-001\nEvento: Audiencia..." │
│    }                                                         │
│ 4. Genera URL:                                              │
│    https://calendar.google.com/calendar/render?...         │
│ 5. window.open(URL, '_blank')                              │
└─────────────────────────────────────────────────────────────┘
   ↓
SE ABRE EN NAVEGADOR (pestaña nueva)
   ↓
GOOGLE CALENDAR INTERPRETA LOS PARÁMETROS
   ├─ action=TEMPLATE → "crear nuevo evento"
   ├─ text → "Audiencia Civil — Exp-2024-001"
   ├─ dates → Horario 09:00 a 10:00 el 31/12/2024
   └─ details → Descripción completa visible
   ↓
✅ USUARIO VE FORMULARIO PRELLENADO EN GOOGLE CALENDAR
   (puede guardar, editar horario, agregar recordatorios, etc.)
```

## 🟦 Google Calendar URL completa

```
https://calendar.google.com/calendar/render?
  action=TEMPLATE
  &text=Audiencia%20Civil%20%E2%80%94%20Exp-2024-001
  &dates=20241231T090000%2F20241231T100000
  &details=Expediente%3A%202024-001%0AEvento%3A%20Audiencia%20Civil
```

Desglosado:
| Parámetro | Valor | Significado |
|-----------|-------|-------------|
| `action` | `TEMPLATE` | Abre el formulario de crear evento |
| `text` | `Audiencia Civil — Exp-2024-001` | Título del evento |
| `dates` | `20241231T090000/20241231T100000` | Inicio/Fin (ISO sin símbolos) |
| `details` | `Expediente: 2024-001\nEvento...` | Descripción (multilinea) |

## 🟪 Outlook URL completa

```
https://outlook.live.com/calendar/0/deeplink/compose?
  subject=Audiencia%20Civil%20%E2%80%94%20Exp-2024-001
  &startdt=2024-12-31T09%3A00%3A00.000Z
  &enddt=2024-12-31T10%3A00%3A00.000Z
  &body=Expediente%3A%202024-001%0AEvento%3A%20Audiencia%20Civil
  &path=%2Fcalendar%2Faction%2Fcompose
```

Desglosado:
| Parámetro | Valor | Significado |
|-----------|-------|-------------|
| `subject` | `Audiencia Civil — Exp-2024-001` | Asunto del evento |
| `startdt` | `2024-12-31T09:00:00.000Z` | Hora inicio (ISO completo con zona) |
| `enddt` | `2024-12-31T10:00:00.000Z` | Hora fin (ISO completo con zona) |
| `body` | `Expediente: 2024-001\n...` | Descripción |
| `path` | `/calendar/action/compose` | Ruta para abrir editor |

## 🔀 Diferencias clave entre Google y Outlook

### Formato de fecha
```
ENTRADA: "2024-12-31"

GOOGLE CALENDAR:
  - Convierte a: 20241231T090000/20241231T100000
  - FORMATO: YYYYMMDDThhmmss (sin símbolos, sin zona)
  - USO: dates=START/END

OUTLOOK:
  - Convierte a: 2024-12-31T09:00:00.000Z
  - FORMATO: YYYY-MM-DDTHH:mm:ss.000Z (ISO completo con Z = UTC)
  - USO: startdt=START&enddt=END
```

### Comparación

| Aspecto | Google | Outlook |
|---------|--------|---------|
| **Base URL** | `calendar.google.com/calendar/render` | `outlook.live.com/calendar/0/deeplink/compose` |
| **Acción** | `action=TEMPLATE` | `path=/calendar/action/compose` |
| **Título** | `text=` | `subject=` |
| **Descripción** | `details=` | `body=` |
| **Fechas** | `dates=START/END` | `startdt=START&enddt=END` |
| **Formato fecha** | `YYYYMMDDThhmmss` | `YYYY-MM-DDTHH:mm:ss.000Z` |
| **Horario** | Fijo en URL | Fijo en URL |
| **Zona horaria** | Sin especificar (cliente) | Z (UTC) |

## 📝 Código paso a paso en CalendarButtons

```typescript
// INPUT
const title = "Audiencia Civil — Exp-2024-001"
const date = "2024-12-31"
const description = "Expediente: 2024-001\nEvento: Audiencia Civil"

// PASO 1: Google Calendar - Convertir fecha
const d = new Date("2024-12-31")  // → Date object
const toISONoSymbols = (dt) => dt.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
const start = toISONoSymbols(d)   // → "20241231T090000"
const end = toISONoSymbols(new Date(d.getTime() + 60*60*1000))  // → "20241231T100000"

// PASO 2: Google Calendar - Construir parámetros
const params = new URLSearchParams({
  action: "TEMPLATE",
  text: "Audiencia Civil — Exp-2024-001",
  dates: "20241231T090000/20241231T100000",
  details: "Expediente: 2024-001\nEvento: Audiencia Civil"
})

// PASO 3: Google Calendar - URL final
const url = `https://calendar.google.com/calendar/render?${params}`
// → https://calendar.google.com/calendar/render?action=TEMPLATE&text=Audiencia...

// PASO 4: Abrir en navegador
window.open(url, '_blank')

// SIMILAR PARA OUTLOOK...
const d = new Date("2024-12-31")
const end = new Date(d.getTime() + 60*60*1000)
const params = new URLSearchParams({
  subject: "Audiencia Civil — Exp-2024-001",
  startdt: d.toISOString(),         // → "2024-12-31T00:00:00.000Z"
  enddt: end.toISOString(),         // → "2024-12-31T01:00:00.000Z"
  body: "Expediente: 2024-001\n...",
  path: "/calendar/action/compose"
})
window.open(`https://outlook.live.com/calendar/0/deeplink/compose?${params}`, '_blank')
```

## 🎯 Lo importante para entender

1. **El componente NO guarda nada** - Solo abre un formulario prellenado
2. **El usuario debe hacer click en "Guardar"** en Google Calendar o Outlook
3. **El horario es fijo** - 09:00-10:00 por defecto (puedes cambiar)
4. **No necesitas backend** - Todo sucede en el navegador del usuario
5. **Funciona sin estar logueado** - Te redirige a login automáticamente

## 🚀 Para Judicial

Simplemente reemplaza en `app/judicial/page.tsx`:

```typescript
// ANTES:
<a href={calendarGoogleUrl(eventAlias, calParts.ymd)}>
  Google Calendar
</a>

// DESPUÉS:
<CalendarButtons
  title={`${c.proximo_evento} — ${c.alias}`}
  date={c.proximo_evento_fecha}
  description={`Expediente: ${c.numero_expediente}\nEvento: ${c.proximo_evento}`}
/>
```

¡Eso es todo! El componente maneja todas las conversiones de URL automáticamente.

