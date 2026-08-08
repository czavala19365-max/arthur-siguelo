const sessionId =
  "599cb3b3-e65d-48ad-969b-0728020fd2b5-0097c54d-18ae-4545-90d9-d16682519cc3";

const xml = `<?xml version="1.0" encoding="utf-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ws="http://ws.sunarp.gob.pe/">
  <soapenv:Header>
    <ws:sunarp-sesion-id>${sessionId}</ws:sunarp-sesion-id>
  </soapenv:Header>
  <soapenv:Body>
    <ws:buscarRefNumPart>
      <numPartida>13010349</numPartida>
      <oficRegId>01</oficRegId>
      <regPubId>01</regPubId>
      <codArea>22000</codArea>
    </ws:buscarRefNumPart>
  </soapenv:Body>
</soapenv:Envelope>`;

async function main() {
  const response = await fetch(
    "https://sprl.sunarp.gob.pe/SunarpSoap2/SunarpLstSoapImplService",
    {
      method: "POST",
      headers: {
        Accept: "application/json, text/plain, */*",
        "Content-Type": "text/xml",
        Origin: "https://sprl.sunarp.gob.pe",
        Referer: "https://sprl.sunarp.gob.pe/sprl/main/sp-certificada",
      },
      body: xml,
    }
  );

  console.log("STATUS:", response.status);
  console.log("STATUS TEXT:", response.statusText);

  console.log("\n=== RESPONSE HEADERS ===");
  for (const [k, v] of response.headers.entries()) {
    console.log(`${k}: ${v}`);
  }

  const text = await response.text();

  console.log("\n=== RESPONSE BODY ===");
  console.log(text);
}

main().catch(console.error);