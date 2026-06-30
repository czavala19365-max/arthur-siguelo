require('dotenv').config({ path: '../.env.local' });

(async () => {
  console.log('🧪 Prueba Resend\n');
  const apiKey = process.env.RESEND_API_KEY_JUDICIAL || process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  const to = process.argv[2] || 'arthursiguelo@gmail.com';
  
  console.log('TO:', to);
  console.log('FROM:', from);
  console.log('API KEY:', apiKey ? '✅' : '❌');
  
  if (!apiKey) {
    console.error('\n❌ No hay API KEY');
    process.exit(1);
  }

  try {
    const { Resend } = await import('resend');
    const resend = new Resend(apiKey);
    
    const { data, error } = await resend.emails.send({
      from: `Arthur <${from}>`,
      to,
      subject: 'Prueba Arthur',
      html: '<h1>Test</h1>',
    });

    if (error) {
      console.error('\n❌ ERROR:', error);
      return;
    }
    
    console.log('\n✅ ENVIADO:', data?.id);
  } catch (e) {
    console.error('\n❌ EXCEPCIÓN:', e.message);
  }
})();