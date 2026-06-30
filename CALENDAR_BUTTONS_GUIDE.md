# 📅 Guía: Sistema de Botones de Calendario (Registral → Judicial)

## 🔍 Cómo funciona el sistema actual (Registral)

### 1. **El Componente CalendarButtons** (`components/CalendarButtons.tsx`)

Este componente es muy simple pero poderoso. Recibe 3 props:

```typescript
interface CalendarButtonsProps {
  title: string;           // Ej: "Subsanación — Exp-2024-001"
  date: string;            // Ej: "2024-12-31"
  description?: string;    // Ej: "Trámite: Expediente X\nTipo: General"
}
```

### 2. **Generación de URLs**

#### 📍 Google Calendar
```typescript
// Convierte: 2024-12-31 → 20241231T090000/20241231T100000
// Genera URL: https://calendar.google.com/calendar/render?
//   action=TEMPLATE
//   text=Subsanación
//   dates=20241231T090000/20241231T100000
//   details=Descripción del evento

// Google Calendar interpreta estos parámetros automáticamente:
// - action=TEMPLATE: Abre el formulario de nuevo evento
// - text: Título del evento
// - dates: Rango de horario (ISO 8601 sin símbolos)
// - details: Descripción completa
```

#### 📍 Outlook
```typescript
// Convierte: 2024-12-31 → 2024-12-31T09:00:00 (ISO)
// Genera URL: https://outlook.live.com/calendar/0/deeplink/compose?
//   subject=Subsanación
//   startdt=2024-12-31T09:00:00.000Z
//   enddt=2024-12-31T10:00:00.000Z
//   body=Descripción

// Outlook interpreta estos parámetros:
// - subject: Título
// - startdt/enddt: Horario ISO completo
// - body: Descripción
// - path: /calendar/action/compose (abrir editor)
```

### 3. **Cómo se integra en Registral**

En `app/dashboard/agenda/page.tsx`:

```typescript
// Para cada plazo, renderiza:
<CalendarButtons
  title={`${plazo.descripcion} — ${plazo.alias || ''}`}
  date={plazo.fecha_vencimiento}
  description={`Trámite: ${plazo.alias || ''}\nTipo: ${plazo.tipo || 'General'}`}
/>

// Los botones aparecen dentro de cada fila de la agenda
// Al hacer click → abre Google Calendar o Outlook en pestaña nueva
```

---

## 🎯 Cómo aplicarlo en Judicial

### Opción A: Usar el mismo componente (Recomendado)

Tu página judicial ya tiene:
- ✅ `proximo_evento`: Nombre del evento (Ej: "Audiencia de apelación")
- ✅ `proximo_evento_fecha`: Fecha del evento (Ej: "2024-12-31")
- ✅ Funciones `calendarGoogleUrl` y `calendarOutlookUrl` (pero básicas)

**Puedes reemplazar tu código actual con:**

```typescript
import CalendarButtons from '@/components/CalendarButtons';

// En el render de cada caso:
<CalendarButtons
  title={`${c.proximo_evento} — ${c.alias || c.cliente}`}
  date={c.proximo_evento_fecha}
  description={
    `Expediente: ${c.numero_expediente}\n` +
    `Tipo: ${c.tipo_proceso || 'General'}\n` +
    `Evento: ${c.proximo_evento}\n` +
    `Partes: ${c.partes || 'No disponible'}`
  }
/>
```

**Ventajas:**
- Reutilizas código existente
- Consistencia visual entre registral y judicial
- URLs más robustas (maneja fechas correctamente)
- Menos código que mantener

### Opción B: Crear un componente específico para judicial

Si necesitas customización adicional:

```typescript
// components/JudicialCalendarButtons.tsx
import CalendarButtons from './CalendarButtons';

interface JudicialCalendarButtonsProps {
  caso: Caso;
  evento: string;
  fechaEvento: string;
}

export default function JudicialCalendarButtons({ 
  caso, 
  evento, 
  fechaEvento 
}: JudicialCalendarButtonsProps) {
  const description = `
Número Expediente: ${caso.numero_expediente}
Tipo Proceso: ${caso.tipo_proceso || 'General'}
Evento: ${evento}
Partes: ${caso.partes || 'No disponible'}
Alias: ${caso.alias || caso.cliente || 'Sin alias'}
  `.trim();

  return (
    <CalendarButtons
      title={`${evento} — ${caso.alias || caso.cliente}`}
      date={fechaEvento}
      description={description}
    />
  );
}
```

---

## 📊 Comparación: Registral vs Judicial

| Aspecto | Registral | Judicial | Necesita cambio |
|---------|-----------|----------|-----------------|
| **URL Builder** | URLSearchParams (moderno) | encodeURIComponent (legacy) | ✅ Actualizar |
| **Descripción** | Detallada (tipo, trámite) | Mínima (solo alias) | ✅ Mejorar |
| **Horario** | Fijo 09:00-10:00 | Fijo 09:00-10:00 | ❌ OK |
| **Componente** | Reutilizable | Inline en página | ✅ Extraer |
| **Manejo de clics** | e.stopPropagation() | ✅ Ya lo hace | ❌ OK |

---

## 🔧 Pasos para implementar en Judicial

### Paso 1: Verifica que tengas las fechas correctas
```typescript
// En tu API /api/casos/:id
// Asegúrate que devuelve:
{
  id: 1,
  proximo_evento: "Audiencia de apelación",
  proximo_evento_fecha: "2024-12-31",  // formato YYYY-MM-DD
  // ... otros campos
}
```

### Paso 2: Reemplaza las URLs hardcodeadas

Busca en `app/judicial/page.tsx` donde está:
```typescript
{calendarHoverId === c.id && calParts && (
  <div style={{...}}>
    <a href={calendarGoogleUrl(...)}>Google Calendar</a>
    <a href={calendarOutlookUrl(...)}>Outlook</a>
  </div>
)}
```

**Reemplaza con:**
```typescript
{c.proximo_evento_fecha && (
  <CalendarButtons
    title={`${c.proximo_evento} — ${c.alias || c.cliente}`}
    date={c.proximo_evento_fecha}
    description={`Expediente: ${c.numero_expediente}\nEvento: ${c.proximo_evento}`}
  />
)}
```

### Paso 3: Elimina las funciones legacy (opcional)

Las funciones `calendarGoogleUrl` y `calendarOutlookUrl` pueden eliminarse si usas el componente.

---

## 💡 Ejemplo completo de integración

### Antes (Código actual judicial):
```typescript
const calParts = nextAud ? parseEventDateForCalendar(nextAud.fecha) : null;

// ... en el render:
{calendarHoverId === c.id && calParts && (
  <div style={{...}}>
    <a href={calendarGoogleUrl(eventAlias, calParts.ymd)} target="_blank">
      Google Calendar
    </a>
    <a href={calendarOutlookUrl(eventAlias, calParts.ymdDash)} target="_blank">
      Outlook
    </a>
  </div>
)}
```

### Después (Con componente):
```typescript
// Al inicio del componente:
import CalendarButtons from '@/components/CalendarButtons';

// ... en el render:
{nextAud && (
  <CalendarButtons
    title={`${c.proximo_evento} — ${eventAlias}`}
    date={nextAud.fecha}
    description={`Expediente: ${c.numero_expediente}\nTipo: ${c.tipo_proceso}`}
  />
)}
```

---

## 🎨 Ventajas del componente registral

1. **URLSearchParams**: Más legible y mantenible que concatenar strings
2. **ISO 8601 correcto**: Maneja conversiones de zona horaria automáticamente
3. **Estilos internacionales**: Los colores de Google (#4285f4) y Outlook (#0078d4) ya están definidos
4. **Reutilizable**: Ya funciona en registral, judicial puede usarlo igual

---

## ❓ Preguntas frecuentes

**P: ¿Qué pasa si la fecha no tiene horario?**
R: El componente asume 09:00-10:00 automáticamente. Puedes modificar el componente si necesitas otro horario.

**P: ¿Se sincronizan los eventos entre apps?**
R: No. Cada botón simplemente abre el editor de la app con los datos prellenados. El usuario debe guardar.

**P: ¿Funciona sin estar logueado a Google/Outlook?**
R: Sí. Te redirige a la pantalla de login primero.

**P: ¿Qué formato de fecha necesita?**
R: `YYYY-MM-DD` (ISO 8601 simple). El componente lo convierte internamente.

