// Simular el flujo completo de VS Code OAuth

const https = require('https');

console.log('🧪 Simulando flujo OAuth de VS Code\n');

// Paso 1: Initialize sin token
console.log('📋 Paso 1: Enviando initialize sin token...');
const initRequest = JSON.stringify({
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {
    protocolVersion: '2024-11-05',
    clientInfo: {
      name: 'test-client',
      version: '1.0.0'
    }
  }
});

const options = {
  hostname: 'mcp-promps.onrender.com',
  port: 443,
  path: '/mcp',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': initRequest.length
  }
};

const req = https.request(options, (res) => {
  console.log(`  Status: ${res.statusCode}`);
  
  let body = '';
  res.on('data', (chunk) => { body += chunk; });
  res.on('end', () => {
    console.log(`  Respuesta: ${body}\n`);
    
    if (res.statusCode === 200) {
      console.log('✅ Initialize exitoso!\n');
      
      // Paso 2: Intentar listar prompts sin token
      console.log('📋 Paso 2: Intentando listar prompts sin token...');
      const listRequest = JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        method: 'prompts/list'
      });
      
      const listOptions = {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': listRequest.length
        }
      };
      
      const listReq = https.request(listOptions, (listRes) => {
        console.log(`  Status: ${listRes.statusCode}`);
        console.log(`  Headers:`);
        Object.keys(listRes.headers).forEach(key => {
          console.log(`    ${key}: ${listRes.headers[key]}`);
        });
        
        if (listRes.statusCode === 401) {
          console.log(`\n✅ Recibió 401 como esperado`);
          
          if (listRes.headers['www-authenticate']) {
            console.log(`✅ Header WWW-Authenticate presente`);
            console.log(`\n🌐 VS Code debería abrir navegador a:`);
            
            // Extraer authorization_uri del header
            const authHeader = listRes.headers['www-authenticate'];
            const match = authHeader.match(/authorization_uri="([^"]+)"/);
            if (match) {
              console.log(`   ${match[1]}`);
            }
          } else {
            console.log(`❌ Header WWW-Authenticate NO está presente`);
          }
        }
        
        listRes.on('data', (chunk) => { console.log(`  Body: ${chunk}`); });
      });
      
      listReq.on('error', (e) => console.error(`❌ Error: ${e.message}`));
      listReq.write(listRequest);
      listReq.end();
    } else {
      console.log(`❌ Initialize falló con status ${res.statusCode}`);
    }
  });
});

req.on('error', (e) => {
  console.error(`❌ Error: ${e.message}`);
});

req.write(initRequest);
req.end();
