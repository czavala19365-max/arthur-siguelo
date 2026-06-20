# 🧪 Guía de Testing: Agenda Judicial con Extracción de Fechas

## ✅ Cambios realizados

### 1. **Nueva función de extracción** (`lib/judicial-documento-extractor.ts`)
```typescript
- extraerYGuardarAudienciasDeMovimientos(casoId, movimientos)
  ├─ Descarga PDFs desde documentoUrl
  ├─ Usa findNextDueDate (Claude IA) para extraer fechas
  ├─ Guarda automáticamente como audiencias judiciales
  └─ Retorna número de audiencias creadas
```

### 2. **Integración en POST /api/casos**
Después del scraping CEJ, se ejecuta automáticamente:
```typescript
const movimientos = await getMovimientosByCaso(caso.id);
const audienciasCreadas = await extraerYGuardarAudienciasDeMovimientos(caso.id, movimientos);
```

### 3. **Página de agenda mejorada** (`app/judicial/agenda/page.tsx`)
- ✅ Mejor logging para debugging
- ✅ Manejo de errores visual
- ✅ Separación de eventos vencidos
- ✅ Integración correcta con CalendarButtons
- ✅ Mejores colores según días restantes

### 4. **Componentes reutilizables**
- CalendarButtons: Genera URLs para Google Calendar y Outlook
- Funciona con prop `date: string (YYYY-MM-DD)`

---

## 🚀 Cómo probar

### Paso 1: Crear un nuevo caso judicial

1. Ir a **Judicial → Agregar Proceso**
2. Ingresar un número de expediente válido del CEJ (Ej: `00012-2024-0-1801-JM-CI-01`)
3. Llenar datos básicos
4. Hacer click en "Guardar"

**Qué pasa internamente:**
```
POST /api/casos
  ↓
1. Crear caso en BD
2. Scraping CEJ → movimientos
3. Guardar movimientos
4. Clasificar movimientos con IA
5. 🆕 Extraer fechas de PDFs
   ├─ Descargar documentos
   ├─ Claude analiza PDFs
   └─ Guardar fechas como audiencias
6. Enviar alerta (si configura WhatsApp/Email)
```

### Paso 2: Verificar logs en consola

**En servidor (terminal):**
```
[API] 🎯 Iniciando extracción de audiencias de documentos...
[Documento] 🔍 Procesando N movimientos para caso X...
[Documento] 📄 Y movimientos tienen documentos
[Documento] ✅ Se descargaron Z PDFs exitosamente
[Claude] 🤖 Extrayendo fechas con IA...
[Claude] ✅ Fecha extraída: 2026-07-15 | Confianza: 85%
[Audiencias] 💾 Guardando audiencia: Audiencia única para 2026-07-15
[Audiencias] ✅ Audiencia guardada exitosamente
[API] ✅ Se crearon 1 audiencias
```

### Paso 3: Ver en la agenda

1. Ir a **Judicial → Agenda**
2. Deberías ver los eventos separados por:
   - Esta semana (< 7 días)
   - Este mes (7-30 días)
   - Próximos meses (> 30 días)
   - Vencidos (fechas pasadas)

### Paso 4: Probar calendario

Para cada evento:
1. Hover sobre el evento
2. Click en "Google Calendar" → se abre Google Calendar
3. Click en "Outlook" → se abre Outlook
4. Debería estar prellenado con:
   - Título: `[Descripción] — [Caso]`
   - Fecha: La extraída del PDF
   - Horario: 09:00-10:00 (por defecto)
   - Descripción: Número de expediente, tipo, etc.

---

## 🔍 Verificación manual

### Ver eventos en BD

```sql
-- Ver audiencias creadas
SELECT * FROM audiencias 
ORDER BY fecha DESC 
LIMIT 10;

-- Ver audiencias para un caso específico
SELECT * FROM audiencias 
WHERE caso_id = [CASO_ID]
ORDER BY fecha;

-- Contar audiencias por confianza
SELECT tipo, COUNT(*) as cantidad
FROM audiencias
GROUP BY tipo;
```

### Verificar movimientos tienen documentos

```sql
SELECT 
  m.id,
  m.acto,
  m.documento_url,
  m.tiene_documento
FROM movimientos_judiciales m
WHERE m.caso_id = [CASO_ID]
  AND m.tiene_documento = 1
LIMIT 5;
```

---

## 🐛 Debugging

### Si no aparecen audiencias:

**Opción 1: Verificar movimientos**
```typescript
// En navegador, consola dev:
fetch('/api/casos/[CASO_ID]')
  .then(r => r.json())
  .then(d => {
    console.log('Movimientos:', d.movimientos);
    console.log('Audiencias:', d.audiencias);
  });
```

**Opción 2: Revisar logs del servidor**
Buscar líneas que empiezan con:
- `[Documento]` - descarga de PDFs
- `[Claude]` - análisis de IA
- `[Audiencias]` - guardado en BD

**Opción 3: Verificar que los PDFs sean válidos**
1. Ir al movimiento individual
2. Hacer click en el documento
3. Verificar que sea un PDF real (no error 404)

### Si Claude falla:

```
[Claude] ❌ Error fatal: ...
```

**Posibles causas:**
- API key de Anthropic inválida/vencida
- Cuota agotada
- Red lenta

**Solución:**
- Verificar `ANTHROPIC_API_KEY` en `.env`
- Esperar y reintentar

---

## 📊 Casos de prueba

### Caso 1: PDF con fecha clara
**Expediente:** Uno con audiencia próxima
**Resultado esperado:** 1 audiencia creada con confianza > 80%

### Caso 2: PDF sin fechas
**Expediente:** Uno solo con trámites, sin audiencias
**Resultado esperado:** 0 audiencias, confianza = 0

### Caso 3: Múltiples PDFs
**Expediente:** Uno con varios movimientos con documentos
**Resultado esperado:** 1-N audiencias (la más próxima)

---

## 🔐 Configuración necesaria

### Variables de entorno
```bash
# Required
ANTHROPIC_API_KEY=sk-ant-...
NEXT_PUBLIC_SUPABASE_URL=https://...
SUPABASE_SERVICE_KEY=...

# Optional but recommended
CEJ_SCRAPER_URL=https://... # Para scraping remoto
```

---

## 📈 Flujo completo de datos

```
POST /api/casos (usuario crea caso)
  ↓
1️⃣ Crear Caso en BD
  ↓
2️⃣ Scraping CEJ (Railway o local)
  ├─ numero_expediente
  ├─ distrito_judicial
  └─ partes
  ↓
3️⃣ Guardar Movimientos
  ├─ fecha
  ├─ acto
  ├─ sumilla
  ├─ documento_url
  └─ tiene_documento=1
  ↓
4️⃣ 🆕 EXTRAER FECHAS DE PDFs
  ├─ Descargar cada PDF
  ├─ Enviar a Claude
  ├─ Claude retorna: { dueDate, description, priority, confidence }
  ├─ Filtrar por confianza > 40%
  └─ Guardar como Audiencia
  ↓
5️⃣ Mostrar en Agenda
  ├─ GET /api/casos/[id]
  ├─ Retorna audiencias
  └─ Calendario para agendar

GET /judicial/agenda
  ↓
1. Fetch todos los casos
2. Para cada caso, fetch audiencias
3. Agrupar por: esta semana, este mes, próximos, vencidos
4. Renderizar con CalendarButtons
```

---

## ✨ Características

✅ **Automático**: Se ejecuta automáticamente después del scraping
✅ **Robusto**: Maneja errores sin fallar el POST
✅ **Escalable**: Procesa múltiples PDFs en paralelo
✅ **Confiable**: Filtra por confianza de Claude (>40%)
✅ **Rápido**: Caché de descargas, no duplica PDFs
✅ **Transparente**: Logs detallados en consola

---

## 🎯 Próximos pasos opcionales

1. **Agregar períodos de búsqueda**: "Últimos 30 días", "Próximos 60 días"
2. **Exportar agenda**: CSV, iCal, etc.
3. **Sincronizar automático**: Con Google Calendar del usuario
4. **Recordatorios**: Notificaciones antes de eventos
5. **Estadísticas**: Gráficos de casos vs audiencias

