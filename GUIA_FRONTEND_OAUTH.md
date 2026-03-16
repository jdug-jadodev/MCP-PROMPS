# 🔐 Guía de Implementación OAuth para el Frontend

## Flujo OAuth Completo

### 1. Usuario inicia autenticación desde VS Code

1. VS Code abre el navegador con esta URL:
   ```
   https://mcp-promps.onrender.com/authorize?
     client_id=vscode-mcp-client&
     redirect_uri=http://127.0.0.1:XXXXX/&
     response_type=code&
     code_challenge=...&
     code_challenge_method=S256&
     scope=mcp:read+mcp:write&
     state=...
   ```

2. El servidor backend valida los parámetros y redirige a:
   ```
   https://front-mcp-gules.vercel.app/login?oauth_request=UUID-DEL-REQUEST
   ```

### 2. Usuario hace login en el frontend

Tu frontend debe:

1. **Detectar el parámetro `oauth_request`** en la URL:
   ```javascript
   const urlParams = new URLSearchParams(window.location.search);
   const oauthRequestId = urlParams.get('oauth_request');
   ```

2. **Mostrar página de login normal** (o detectar si ya tiene sesión activa)

3. **Después del login exitoso**, obtener el JWT token del usuario

### 3. Frontend hace callback al servidor OAuth

Después de obtener el JWT token del usuario, el frontend debe hacer:

```javascript
// Después de login exitoso, tienes el JWT token
const jwtToken = localStorage.getItem('authToken'); // O de donde lo guardes
const oauthRequestId = urlParams.get('oauth_request');

try {
  const response = await fetch('https://mcp-promps.onrender.com/oauth/callback', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      oauth_request: oauthRequestId,
      token: jwtToken
    })
  });

  const data = await response.json();
  
  if (data.success) {
    // El servidor nos da la URL de redirección para VS Code
    console.log('Redirigiendo a VS Code:', data.redirect_uri);
    
    // IMPORTANTE: Redirigir al usuario a esta URL
    window.location.href = data.redirect_uri;
    
    // Ejemplo de redirect_uri:
    // http://127.0.0.1:12345/?code=AUTH_CODE&state=...
  } else {
    console.error('Error en OAuth callback:', data);
  }
} catch (error) {
  console.error('Error calling OAuth callback:', error);
}
```

### 4. VS Code intercepta el código

Cuando rediriges al usuario a `data.redirect_uri`:
- La URL es `http://127.0.0.1:XXXXX/?code=AUTH_CODE&state=...`
- VS Code está escuchando en ese puerto local
- VS Code intercepta el código automáticamente
- VS Code hace POST a `/token` para obtener el access token
- ¡Listo! El usuario está autenticado en VS Code

## Ejemplo Completo en React

```jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

function LoginPage() {
  const [oauthRequestId, setOauthRequestId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Detectar si es un flujo OAuth
    const urlParams = new URLSearchParams(window.location.search);
    const oauth_request = urlParams.get('oauth_request');
    
    if (oauth_request) {
      console.log('🔐 Flujo OAuth detectado:', oauth_request);
      setOauthRequestId(oauth_request);
    }
  }, []);

  const handleLoginSuccess = async (jwtToken) => {
    // Si NO es flujo OAuth, navegación normal
    if (!oauthRequestId) {
      navigate('/dashboard');
      return;
    }

    // SI es flujo OAuth, hacer callback
    try {
      console.log('🔐 Haciendo callback OAuth...');
      
      const response = await fetch('https://mcp-promps.onrender.com/oauth/callback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          oauth_request: oauthRequestId,
          token: jwtToken
        })
      });

      const data = await response.json();
      
      if (data.success) {
        console.log('✅ OAuth exitoso, redirigiendo a VS Code...');
        
        // Mostrar mensaje al usuario
        alert('Autenticación exitosa! Redirigiendo a VS Code...');
        
        // Redirigir a VS Code
        window.location.href = data.redirect_uri;
      } else {
        console.error('❌ Error en OAuth callback:', data);
        alert('Error en autenticación OAuth: ' + data.message);
      }
    } catch (error) {
      console.error('❌ Error calling OAuth callback:', error);
      alert('Error de red al hacer callback OAuth');
    }
  };

  return (
    <div>
      <h1>Login</h1>
      {oauthRequestId && (
        <div className="oauth-notice">
          🔐 Autenticando para VS Code GitHub Copilot
        </div>
      )}
      
      {/* Tu formulario de login normal */}
      <LoginForm onSuccess={handleLoginSuccess} />
    </div>
  );
}
```

## Checklist de Implementación

- [ ] **Detectar parámetro `oauth_request`** en la URL
- [ ] **Mostrar página de login** normal (o usar sesión existente)
- [ ] **Después del login**, hacer POST a `/oauth/callback` con:
  - `oauth_request`: El UUID recibido
  - `token`: El JWT del usuario
- [ ] **Redirigir** al usuario a `data.redirect_uri` (URL de VS Code)
- [ ] **Mostrar mensaje** al usuario explicando que se está redirigiendo a VS Code

## Testing

Para probar el flujo:

1. En VS Code, intenta usar un comando de Copilot que requiera MCP
2. VS Code abrirá el navegador con la página de login
3. Haz login normalmente
4. Deberías ver el mensaje "Redirigiendo a VS Code..."
5. El navegador redirige a `http://127.0.0.1:XXXXX`
6. VS Code muestra "Authenticated successfully"

## Troubleshooting

### El frontend no recibe el parámetro `oauth_request`
- Verifica que el backend esté redirigiendo correctamente
- Revisa los logs del backend: `console.log('🔗 URL de frontend:', loginRedirectUrl)`

### Error "invalid_token" en el callback
- Verifica que el JWT enviado sea válido
- Asegúrate de que el JWT_SECRET del backend coincida

### El navegador no redirige a VS Code
- Verifica que `data.redirect_uri` tenga el formato correcto: `http://127.0.0.1:XXXXX/?code=...`
- Asegúrate de hacer `window.location.href = data.redirect_uri`

### VS Code no intercepta el código
- VS Code debe estar ejecutándose y esperando en el puerto
- Verifica que no haya bloqueadores de popup o extensiones que interfieran
