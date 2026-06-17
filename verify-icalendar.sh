#!/bin/bash
# Verificar que todo está instalado para el sistema de alertas iCalendar

echo "🔍 Verificando dependencias..."

# Verificar pdf-parse
if npm list pdf-parse > /dev/null 2>&1; then
  echo "✅ pdf-parse instalado"
else
  echo "❌ pdf-parse NO instalado"
  echo "   Ejecuta: npm install pdf-parse"
fi

# Verificar @anthropic-ai/sdk
if npm list @anthropic-ai/sdk > /dev/null 2>&1; then
  echo "✅ @anthropic-ai/sdk instalado"
else
  echo "❌ @anthropic-ai/sdk NO instalado"
  echo "   Ejecuta: npm install @anthropic-ai/sdk"
fi

# Verificar variables de entorno
echo ""
echo "🔐 Verificando variables de entorno..."

if [ -z "$RESEND_API_KEY" ] && [ -z "$RESEND_API_KEY_JUDICIAL" ]; then
  echo "❌ RESEND_API_KEY no está configurado"
else
  echo "✅ RESEND_API_KEY configurado"
fi

if [ -z "$ANTHROPIC_API_KEY" ]; then
  echo "❌ ANTHROPIC_API_KEY no está configurado"
else
  echo "✅ ANTHROPIC_API_KEY configurado"
fi

echo ""
echo "📁 Archivos creados:"
echo "  ✅ lib/calendar-ics.ts - Generador de iCalendar"
echo "  ✅ lib/extract-due-dates.ts - Extracción IA de fechas"
echo "  ✅ lib/judicial-alerts.ts - Orquestador principal"
echo "  ✅ lib/channels/email-channel.ts - ACTUALIZADO para .ics"
echo ""
echo "📖 Lee SETUP_ICALENDAR.md para instrucciones de integración"
echo ""
