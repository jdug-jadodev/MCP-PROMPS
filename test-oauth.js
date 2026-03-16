// Script para probar el flujo OAuth

const baseUrl = process.env.OAUTH_ISSUER || 'https://mcp-promps.onrender.com';

console.log('🧪 Testing OAuth Configuration\n');

// Test 1: Verificar metadata OAuth
console.log('📋 Test 1: Metadata OAuth');
console.log(`  URL: ${baseUrl}/.well-known/oauth-authorization-server`);

fetch(`${baseUrl}/.well-known/oauth-authorization-server`)
  .then(res => res.json())
  .then(metadata => {
    console.log('  ✅ Metadata recibido:');
    console.log(`    - issuer: ${metadata.issuer}`);
    console.log(`    - authorization_endpoint: ${metadata.authorization_endpoint}`);
    console.log(`    - token_endpoint: ${metadata.token_endpoint}`);
    console.log(`    - code_challenge_methods: ${metadata.code_challenge_methods_supported?.join(', ')}`);
    console.log(`    - scopes: ${metadata.scopes_supported?.join(', ')}`);
    
    // Test 2: Simular inicio de flujo OAuth
    console.log('\n📋 Test 2: Simulando flujo OAuth autorización');
    const authUrl = new URL(`${baseUrl}/authorize`);
    authUrl.searchParams.set('client_id', 'vscode-mcp-client');
    authUrl.searchParams.set('redirect_uri', 'http://127.0.0.1:12345/');
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('code_challenge', 'test_challenge');
    authUrl.searchParams.set('code_challenge_method', 'S256');
    authUrl.searchParams.set('scope', 'mcp:read mcp:write');
    authUrl.searchParams.set('state', 'test_state');
    
    console.log(`  URL de autorización: ${authUrl.toString()}`);
    console.log('\n⚠️  Para probar completamente, abre esta URL en tu navegador:');
    console.log(`  ${authUrl.toString()}`);
    console.log('\n  Debería redirigir a: https://front-mcp-gules.vercel.app/login?oauth_request=...');
  })
  .catch(err => {
    console.error('  ❌ Error:', err.message);
  });
