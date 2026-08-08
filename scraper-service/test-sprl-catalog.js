'use strict';

const fetch = require('node-fetch');
const { HttpsProxyAgent } = require('https-proxy-agent');

const CATALOGO_URL =
  'https://api06-catalogo-sunarp-sprl.apps.ocp-prod.sunarp.gob.pe/v1/sunarp-services/catalogo/listarPublicidadCertificados';

// ============================================================
// CONFIGURACIÓN SMARTPROXY
// ============================================================

const PROXY_HOST = 'us.smartproxy.net';
const PROXY_PORT = '3120';
const PROXY_USER =
  'smart-jorgeganoza_area-PE_city-LIMA_life-60_session-TbYbAGVFoUD';
const PROXY_PASS = 'Cocoroco20';

const proxyUrl = `http://${PROXY_HOST}:${PROXY_PORT}`;

const proxyAuth = Buffer.from(
  `${PROXY_USER}:${PROXY_PASS}`
).toString('base64');

const proxyAgent = new HttpsProxyAgent(proxyUrl, {
  keepAlive: true,
  rejectUnauthorized: false,
  headers: {
    'Proxy-Authorization': `Basic ${proxyAuth}`
  }
});

// ============================================================
// DATOS SUNARP
// ============================================================

const accessToken =
  'ac6ede2b-c4a3-477d-ac08-2a6346409dd1-5965de4c-54b2-4518-893b-5e2b13b58e1a';

const sunarpCookieHeader =
  'JSESSIONID%3D9DEBF60FE89717D229AD43230F84C489%3B%20_ga%3DGA1.1.556298825.1786225441%3B%2089c834e13f8e0f3275d54b8fd39e7d35%3D842596026297897415dd4b0819ed1fb8%3B%20_ga_C4XX4CF718%3DGS2.1.s1786225440%24o1%24g1%24t1786225476%24j24%24l0%24h0';

const codArea = '22000';
const tipoCert = 'G';

// ============================================================
// UTILIDADES
// ============================================================

function now() {
  return new Date().toISOString();
}

function elapsed(start) {
  return `${Date.now() - start} ms`;
}

function mask(value, visible = 8) {
  if (!value) return '(vacío)';
  if (value.length <= visible) return '********';
  return `${value.slice(0, visible)}...********`;
}

function printHeaders(headers) {
  console.log('\n--- RESPONSE HEADERS ---');

  headers.forEach((value, key) => {
    console.log(`${key}: ${value}`);
  });
}

function diagnoseError(error) {
  console.log('\n');
  console.log('============================================================');
  console.log('                    DIAGNÓSTICO DEL ERROR');
  console.log('============================================================');

  console.log('Nombre:', error?.name || '(sin name)');
  console.log('Código:', error?.code || '(sin code)');
  console.log('Mensaje:', error?.message || String(error));

  if (error?.type) {
    console.log('Tipo:', error.type);
  }

  if (error?.errno) {
    console.log('Errno:', error.errno);
  }

  if (error?.syscall) {
    console.log('Syscall:', error.syscall);
  }

  if (error?.address) {
    console.log('Address:', error.address);
  }

  if (error?.port) {
    console.log('Port:', error.port);
  }

  console.log('\n--- INTERPRETACIÓN ---');

  const message = String(error?.message || '').toLowerCase();
  const code = String(error?.code || '').toUpperCase();

  if (
    code.includes('ECONNREFUSED') ||
    message.includes('connection refused')
  ) {
    console.log('❌ CONEXIÓN RECHAZADA.');
    console.log(
      'El host/puerto rechazó la conexión. Revisar SmartProxy o destino.'
    );
  } else if (
    code.includes('ETIMEDOUT') ||
    message.includes('timeout')
  ) {
    console.log('❌ TIMEOUT.');
    console.log(
      'La conexión no respondió dentro del tiempo esperado.'
    );
    console.log(
      'Posibles causas: proxy, firewall, SUNARP o ruta de red.'
    );
  } else if (
    code.includes('ENOTFOUND') ||
    message.includes('getaddrinfo')
  ) {
    console.log('❌ DNS.');
    console.log(
      'No se pudo resolver el dominio.'
    );
  } else if (
    code.includes('ECONNRESET') ||
    message.includes('socket hang up')
  ) {
    console.log('❌ CONEXIÓN RESET.');
    console.log(
      'El servidor/proxy cerró la conexión inesperadamente.'
    );
  } else if (
    message.includes('certificate') ||
    message.includes('ssl') ||
    message.includes('tls')
  ) {
    console.log('❌ PROBLEMA TLS/SSL.');
    console.log(
      'El fallo está relacionado con el certificado o negociación TLS.'
    );
  } else if (
    message.includes('proxy') ||
    message.includes('tunneling')
  ) {
    console.log('❌ PROBLEMA CON EL PROXY.');
    console.log(
      'El túnel HTTPS mediante SmartProxy no pudo establecerse.'
    );
  } else {
    console.log(
      '⚠️ No se pudo clasificar automáticamente el error.'
    );
  }

  console.log('============================================================\n');
}

// ============================================================
// TEST PRINCIPAL
// ============================================================

async function testCatalog() {
  const globalStart = Date.now();

  console.log('\n');
  console.log('============================================================');
  console.log('       SPRL CATALOG DIRECT TEST - SMARTPROXY');
  console.log('============================================================');
  console.log('Inicio:', now());
  console.log('============================================================');

  // ==========================================================
  // 1. CONFIGURACIÓN
  // ==========================================================

  console.log('\n[1] CONFIGURACIÓN');
  console.log('------------------------------------------------------------');

  console.log('CATALOGO_URL:', CATALOGO_URL);
  console.log('Proxy host:', PROXY_HOST);
  console.log('Proxy port:', PROXY_PORT);
  console.log('Proxy user:', mask(PROXY_USER));
  console.log('Proxy password:', mask(PROXY_PASS, 2));

  console.log(
    'AccessToken:',
    mask(accessToken)
  );

  console.log(
    'Cookie:',
    mask(sunarpCookieHeader, 30)
  );

  console.log('codArea:', codArea);
  console.log('tipoCert:', tipoCert);

  // ==========================================================
  // 2. VALIDACIÓN BÁSICA
  // ==========================================================

  console.log('\n[2] VALIDACIÓN');
  console.log('------------------------------------------------------------');

  if (!CATALOGO_URL.startsWith('https://')) {
    console.error('❌ CATALOGO_URL NO ES HTTPS');
    return;
  }

  if (!PROXY_HOST || !PROXY_PORT) {
    console.error('❌ PROXY INCOMPLETO');
    return;
  }

  if (!PROXY_USER || !PROXY_PASS) {
    console.error('❌ CREDENCIALES DEL PROXY INCOMPLETAS');
    return;
  }

  if (!accessToken) {
    console.error('❌ ACCESS TOKEN VACÍO');
    return;
  }

  if (!sunarpCookieHeader) {
    console.error('❌ COOKIE VACÍA');
    return;
  }

  console.log('✅ URL HTTPS válida');
  console.log('✅ Proxy configurado');
  console.log('✅ Credenciales proxy presentes');
  console.log('✅ AccessToken presente');
  console.log('✅ Cookie presente');

  // ==========================================================
  // 3. BODY
  // ==========================================================

  const body = {
    codArea,
    tipoCert
  };

  console.log('\n[3] REQUEST BODY');
  console.log('------------------------------------------------------------');
  console.log(JSON.stringify(body, null, 2));

  // ==========================================================
  // 4. COOKIE
  // ==========================================================

  console.log('\n[4] COOKIE');
  console.log('------------------------------------------------------------');

  let decodedCookie;

  try {
    decodedCookie = decodeURIComponent(sunarpCookieHeader);

    console.log('✅ Cookie decodeada correctamente');

    console.log(
      'JSESSIONID presente:',
      decodedCookie.includes('JSESSIONID')
    );

    console.log(
      'Google Analytics presente:',
      decodedCookie.includes('_ga')
    );

    console.log(
      'Longitud cookie:',
      decodedCookie.length
    );

    console.log(
      'Cookie inicio:',
      decodedCookie.substring(0, 80) + '...'
    );
  } catch (error) {
    console.error('❌ ERROR DECODIFICANDO COOKIE');
    diagnoseError(error);
    return;
  }

  // ==========================================================
  // 5. HEADERS
  // ==========================================================

  const requestHeaders = {
    'Content-Type': 'application/json',
    'Accept': 'application/json, text/plain, */*',
    'Authorization': `Bearer ${accessToken}`,
    'Cookie': decodedCookie,
    'Origin': 'https://sprl.sunarp.gob.pe',
    'Referer': 'https://sprl.sunarp.gob.pe/',
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  };

  console.log('\n[5] REQUEST HEADERS');
  console.log('------------------------------------------------------------');

  for (const [key, value] of Object.entries(requestHeaders)) {
    if (key === 'Authorization') {
      console.log(`${key}: Bearer ${mask(accessToken)}`);
    } else if (key === 'Cookie') {
      console.log(`${key}: ${mask(value, 40)}`);
    } else {
      console.log(`${key}: ${value}`);
    }
  }

  // ==========================================================
  // 6. REQUEST
  // ==========================================================

  console.log('\n[6] ENVIANDO REQUEST');
  console.log('------------------------------------------------------------');

  console.log('Timestamp:', now());
  console.log('Destino:', CATALOGO_URL);
  console.log('Método: POST');
  console.log('Proxy:', `${PROXY_HOST}:${PROXY_PORT}`);
  console.log('Agent:', 'HttpsProxyAgent');
  console.log('KeepAlive:', true);
  console.log('rejectUnauthorized:', false);

  const requestStart = Date.now();

  try {
    console.log('\n⏳ Esperando respuesta de SUNARP...\n');

    const response = await fetch(CATALOGO_URL, {
      method: 'POST',
      agent: proxyAgent,
      headers: requestHeaders,
      body: JSON.stringify(body),

      // Timeout de node-fetch
      timeout: 30000
    });

    const requestTime = elapsed(requestStart);

    // ========================================================
    // 7. HTTP RESPONSE
    // ========================================================

    console.log('\n[7] RESPONSE HTTP');
    console.log('------------------------------------------------------------');

    console.log('Tiempo:', requestTime);
    console.log('Status:', response.status);
    console.log('StatusText:', response.statusText);
    console.log('OK:', response.ok);
    console.log('URL final:', response.url);

    // ========================================================
    // 8. HEADERS RESPONSE
    // ========================================================

    printHeaders(response.headers);

    // ========================================================
    // 9. BODY
    // ========================================================

    console.log('\n[8] RESPONSE BODY');
    console.log('------------------------------------------------------------');

    const text = await response.text();

    console.log('Longitud:', text.length);
    console.log('Content-Type:',
      response.headers.get('content-type') || '(no enviado)'
    );

    console.log('\nBODY RAW:\n');

    if (!text) {
      console.log('(BODY VACÍO)');
    } else {
      console.log(text);
    }

    // ========================================================
    // 10. ANÁLISIS DEL STATUS
    // ========================================================

    console.log('\n[9] ANÁLISIS HTTP');
    console.log('------------------------------------------------------------');

    if (response.status >= 200 && response.status < 300) {
      console.log('✅ HTTP EXITOSO');

      if (!text) {
        console.log(
          '⚠️ Aunque HTTP fue exitoso, SUNARP devolvió BODY VACÍO.'
        );
      }
    } else if (response.status === 400) {
      console.log('❌ HTTP 400 - BAD REQUEST');
      console.log(
        'SUNARP recibió la petición pero considera incorrectos los datos.'
      );
    } else if (response.status === 401) {
      console.log('❌ HTTP 401 - UNAUTHORIZED');
      console.log(
        'El AccessToken o la autenticación no son válidos.'
      );
    } else if (response.status === 403) {
      console.log('❌ HTTP 403 - FORBIDDEN');
      console.log(
        'La petición fue entendida pero SUNARP/proxy la está rechazando.'
      );
    } else if (response.status === 404) {
      console.log('❌ HTTP 404 - NOT FOUND');
      console.log(
        'El endpoint no existe o la ruta es incorrecta.'
      );
    } else if (response.status === 408) {
      console.log('❌ HTTP 408 - REQUEST TIMEOUT');
    } else if (response.status === 429) {
      console.log('❌ HTTP 429 - TOO MANY REQUESTS');
      console.log(
        'Posible rate limit.'
      );
    } else if (response.status >= 500) {
      console.log(
        `❌ HTTP ${response.status} - ERROR DEL SERVIDOR`
      );
      console.log(
        'El servidor SUNARP/proxy devolvió un error interno.'
      );
    } else {
      console.log(
        `⚠️ HTTP ${response.status}`
      );
    }

    // ========================================================
    // 11. INTENTAR PARSEAR JSON
    // ========================================================

    console.log('\n[10] ANÁLISIS JSON');
    console.log('------------------------------------------------------------');

    if (!text) {
      console.log('⚠️ No existe body para parsear.');
    } else {
      try {
        const json = JSON.parse(text);

        console.log('✅ RESPONSE ES JSON VÁLIDO');
        console.log('\nJSON PARSEADO:\n');
        console.dir(json, {
          depth: null,
          colors: false
        });

        // Mostrar estructura principal
        if (typeof json === 'object' && json !== null) {
          console.log('\nClaves principales:');
          console.log(Object.keys(json));

          if (json.message) {
            console.log('message:', json.message);
          }

          if (json.error) {
            console.log('error:', json.error);
          }

          if (json.errors) {
            console.log('errors:', json.errors);
          }

          if (json.status) {
            console.log('status:', json.status);
          }

          if (json.code) {
            console.log('code:', json.code);
          }
        }
      } catch (jsonError) {
        console.log('❌ RESPONSE NO ES JSON VÁLIDO');
        console.log('Error JSON:', jsonError.message);

        console.log(
          'Primeros 200 caracteres:',
          text.substring(0, 200)
        );
      }
    }

    // ========================================================
    // 12. DIAGNÓSTICO FINAL
    // ========================================================

    console.log('\n[11] DIAGNÓSTICO FINAL');
    console.log('------------------------------------------------------------');

    if (response.ok) {
      console.log('🟢 REQUEST COMPLETADO A NIVEL HTTP');

      console.log(
        'Esto significa que la conexión llegó al endpoint y hubo respuesta HTTP.'
      );

      if (response.status === 200 && text) {
        console.log(
          '🟢 SUNARP RESPONDIÓ 200 + BODY'
        );
      }
    } else {
      console.log('🔴 REQUEST NO EXITOSO A NIVEL HTTP');

      console.log(
        `Status exacto recibido: ${response.status}`
      );

      console.log(
        'Revisar especialmente el RESPONSE BODY y RESPONSE HEADERS anteriores.'
      );
    }
  } catch (error) {
    console.log('\n[7] ❌ FETCH FALLÓ ANTES DE RECIBIR HTTP RESPONSE');

    console.log('Tiempo hasta error:', elapsed(requestStart));
    console.log('Timestamp:', now());

    diagnoseError(error);

    console.log('\n--- STACK COMPLETO ---');
    console.error(error?.stack || error);

    console.log('\n--- REQUEST QUE INTENTAMOS REALIZAR ---');
    console.log('URL:', CATALOGO_URL);
    console.log('Method: POST');
    console.log('Proxy:', `${PROXY_HOST}:${PROXY_PORT}`);
    console.log('User-Agent:', requestHeaders['User-Agent']);
  }

  // ==========================================================
  // FINAL
  // ==========================================================

  console.log('\n');
  console.log('============================================================');
  console.log('                    FIN DEL TEST');
  console.log('============================================================');
  console.log('Tiempo total:', elapsed(globalStart));
  console.log('Finalizado:', now());
  console.log('============================================================\n');
}

testCatalog().catch((error) => {
  console.error('\n❌ ERROR NO CONTROLADO EN TEST');
  diagnoseError(error);
});