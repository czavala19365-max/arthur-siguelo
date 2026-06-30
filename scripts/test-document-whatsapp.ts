import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import { enviarWhatsApp, normalizeWhatsAppE164 } from '../lib/channels/whatsapp-channel'
import Anthropic from '@anthropic-ai/sdk'
import type { MovimientoJudicialAlerta } from '../lib/alert-service'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const MODEL = 'claude-3-5-sonnet-latest' // The current best model from Anthropic for text

/**
 * Lee un archivo y le dice a Claude que revise si es una resolución/documento legal
 * que requiera notificar urgentemente al cliente.
 */
async function analizarDocumentoYAlertar(rutaArchivo: string) {
  if (!fs.existsSync(rutaArchivo)) {
    console.error(`❌ El archivo no existe: ${rutaArchivo}`)
    return
  }

  const contenido = fs.readFileSync(rutaArchivo, 'utf-8')
  console.log(`📄 Analizando documento (${contenido.length} caracteres)...`)

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 800,
      system:
        'Eres un analista legal peruano experto. Lee este documento e indica si requiere notificar urgentemente al interesado. Extrae la información clave del caso. Responde ÚNICAMENTE con JSON válido, sin markdown ni comillas alrededor.',
      messages: [
        {
          role: 'user',
          content: `Documento:\n\n${contenido}\n\nResponde exactamente con este modelo JSON:
{
  "esUrgente": boolean,
  "resumen": "Resumen conciso del acto o documento",
  "diasPlazo": numero o null,
  "sugerenciaLegal": "Qué se debe hacer al respecto",
  "numeroExpediente": "Si se menciona el número, extraerlo",
  "casoNombre": "Nombre de las partes si aparece"
}`,
        },
      ],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const parsed = JSON.parse(text)

    console.log('🧠 Respuesta de Claude:', parsed)

    if (parsed.esUrgente) {
      console.log('🚨 ¡Es urgente! Procediendo a enviar alerta a WhatsApp.')

      const numeroCelular = process.env.TEST_ALERT_PHONE
      if (!numeroCelular) {
        console.error('❌ No se encontró process.env.TEST_ALERT_PHONE')
        return
      }

      // Preparamos nuestro objeto MovimientoJudicialAlerta (que espera la función enviarWhatsApp)
      const movimiento: MovimientoJudicialAlerta = {
        expedienteId: 'doc-local-001',
        numeroExpediente: parsed.numeroExpediente || 'No especificado',
        descripcion: parsed.resumen || 'Nuevo acto notificado',
        nivelUrgencia: 'alta',
        sugerenciaIA: parsed.sugerenciaLegal || 'Contacta a tu abogado urgentemente.',
        plazosDias: parsed.diasPlazo || undefined,
        casoNombre: parsed.casoNombre || 'Caso confidencial'
      }

      // Llamamos a la función real de nuestro sistema (el mismo que usa para las resoluciones)
      const exito = await enviarWhatsApp(numeroCelular, movimiento)

      if (exito) console.log('✅ Mensaje de WhatsApp enviado exitosamente a:', numeroCelular)
      else console.log('❌ Falló el envío del WhatsApp. Revisa las credenciales de Twilio.')

    } else {
      console.log('ℹ️ Claude indica que NO es urgente. No se enviará WhatsApp.')
    }

  } catch (error) {
    console.error('❌ Error general:', error)
  }
}

// === EJECUCIÓN DEL SCRIPT ===
// Vamos a crear un archivo temporal "test.txt" para probar si no existe:
const tempFile = path.join(__dirname, '../test.txt')
if (!fs.existsSync(tempFile)) {
  fs.writeFileSync(tempFile, 'CORTE SUPERIOR DE JUSTICIA DE LIMA Otorga 3 DÍAS HÁBILES bajo Apercibimiento a MARCOBRE S.A. para presentar descargo de demanda.\nExpediente: 01600-2022-0\nDemandante: ESTADO PERUANO')
  console.log('📝 Archivo de prueba "test.txt" creado! (Simula una resolución judicial)')
}

analizarDocumentoYAlertar(tempFile)
