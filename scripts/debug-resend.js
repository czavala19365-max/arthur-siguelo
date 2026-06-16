const { Resend } = require('resend');
require('dotenv').config({ path: '.env.local' });

async function test() {
  const apiKey = process.env.RESEND_API_KEY_JUDICIAL || process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
  console.log('API KEY:', apiKey ? 'exists' : 'missing');
  console.log('FROM:', fromEmail);

  if (!apiKey) {
    console.log('No API KEY');
    return;
  }

  const resend = new Resend(apiKey);
  console.log('Enviando a...', process.argv[2] || 'test@example.com');
  const { data, error } = await resend.emails.send({
    from: `Test <${fromEmail}>`,
    to: process.argv[2] || 'test@example.com',
    subject: 'Prueba',
    html: '<p>Test</p>',
  });

  if (error) {
    console.error('ERROR AL ENVIAR:', error);
  } else {
    console.log('ÉXITO:', data);
  }
}

test();
