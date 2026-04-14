import 'dotenv/config'
import { enviarAlertaMovimiento } from '../lib/alert-service'

const movimientoPrueba = {
  expedienteId: 'test-001',
  numeroExpediente: '00847-2023-0-1801-JR-CI-12',
  descripcion: 'Se ha emitido resolución N° 15 ordenando...',
  nivelUrgencia: 'alta' as const,
  sugerenciaIA: 'Preparar escrito de contestación dentro de 3 días hábiles.',
  plazosDias: 3,
  casoNombre: 'García vs. Inmobiliaria Horizonte SAC',
}

const configPrueba = {
  usuarioId: 'test-user',
  email: process.env.TEST_ALERT_EMAIL || 'jorge@ejemplo.com',
  telefonoCelular: process.env.TEST_ALERT_PHONE || '+34673364097',
  telegramChatId: process.env.TEST_ALERT_TELEGRAM || '8726463286',
  canalesActivos: {
    email: !!(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL),
    whatsapp: !!process.env.TWILIO_ACCOUNT_SID,
    telegram: !!process.env.TELEGRAM_BOT_TOKEN,
  },
}

console.log('Canales activos:', configPrueba.canalesActivos)

enviarAlertaMovimiento(movimientoPrueba, configPrueba)
  .then(r => console.log('Resultado:', r))
  .catch(console.error)
