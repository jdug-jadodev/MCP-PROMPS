# Guía: Corrección del Redirect OAuth para VS Code

## Problema actual

El frontend recibe correctamente la respuesta del `/oauth/callback` con `{ status: 'success', redirectUrl: '...' }`, pero **no ejecuta la navegación** hacia esa URL.

Esto causa que VS Code nunca reciba el `authorization_code` y no pueda conectarse al MCP.

---

## ¿Por qué ocurre?

El backend antes devolvía una URL como:
```
http://127.0.0.1:33418/?code=abc&state=xyz
```

Un browser en una página **HTTPS** (Vercel) **no puede navegar a HTTP** — lo bloquea por política de mixed-content. Por eso el frontend mostraba el mensaje de fallback "Puedes volver a VS Code" sin redirigir.

**Ahora el backend devuelve una URL HTTPS propia:**
```
https://mcp-promps.onrender.com/oauth/redirect/SESSION_ID
```

El backend HTTPS hace el redirect final a `http://127.0.0.1` — esto sí funciona porque es el **servidor** quien hace el redirect, no el browser desde HTTPS.

---

## Lo que debe hacer el frontend

Cuando el POST a `/oauth/callback` devuelve `{ status: 'success', redirectUrl: '...' }`:

### ❌ Comportamiento actual (incorrecto)
```typescript
if (oauthRes.status === 'success') {
  sessionStorage.removeItem('oauth_request')
  // No ejecuta la navegación o la ejecuta condicionalmente
  window.location.href = oauthRes.redirectUrl  // ← puede estar faltando o en un bloque catch
}
```

### ✅ Comportamiento correcto

**La regla es simple: si `status === 'success'` y hay `redirectUrl`, navegar SIN EXCEPCIONES.**

```typescript
if (oauthRes.status === 'success' && oauthRes.redirectUrl) {
  sessionStorage.removeItem('oauth_request')
  // CRÍTICO: navegar siempre, sin condiciones adicionales
  window.location.href = oauthRes.redirectUrl
  return  // no continuar después del redirect
}
```

### ✅ Flujo completo recomendado en el Login

```typescript
async function handleSubmit(e: React.FormEvent) {
  e.preventDefault()
  setLoading(true)

  try {
    // 1. Login normal
    const res = await authService.login(email, password)

    if (res.status === 'success') {
      const { token, user } = res
      saveAuth(token, user)

      // 2. Verificar si hay oauth_request pendiente
      const oauthRequest = sessionStorage.getItem('oauth_request')

      if (oauthRequest) {
        try {
          // 3. Llamar al oauth/callback del backend MCP
          const oauthRes = await authService.oauthCallback(oauthRequest, token)

          // 4. SIEMPRE limpiar sessionStorage
          sessionStorage.removeItem('oauth_request')

          if (oauthRes.status === 'success' && oauthRes.redirectUrl) {
            // 5. NAVEGAR INMEDIATAMENTE - no mostrar mensaje, no esperar
            window.location.href = oauthRes.redirectUrl
            return  // ← importante: detener ejecución aquí
          }

          // Si el backend respondió error, ir al dashboard
          console.error('OAuth callback error:', oauthRes)
          navigate('/dashboard')
          return

        } catch (oauthErr) {
          // Error de red: limpiar y continuar al dashboard
          console.error('OAuth callback exception:', oauthErr)
          sessionStorage.removeItem('oauth_request')
          navigate('/dashboard')
          return
        }
      }

      // Sin oauth_request: navegación normal
      navigate('/dashboard')
    }
  } catch (err) {
    setError('Error de conexión')
  } finally {
    setLoading(false)
  }
}
```

---

## Verificación en el authService

Asegúrate de que `oauthCallback` envía el JWT en el campo `jwt` (no `token`):

```typescript
async oauthCallback(oauthRequest: string, jwtToken: string) {
  return api.post('/oauth/callback', {
    oauth_request: oauthRequest,
    jwt: jwtToken          // ← debe ser 'jwt', no 'token'
  })
}
```

> **Nota:** El backend acepta tanto `jwt` como `token`, pero se recomienda usar `jwt` para consistencia con la guía de integración.

---

## URL del endpoint

```
POST https://mcp-promps.onrender.com/oauth/callback
Content-Type: application/json

{
  "oauth_request": "<valor del sessionStorage>",
  "jwt": "<token JWT del usuario>"
}
```

### Respuesta esperada (200 OK)
```json
{
  "status": "success",
  "redirectUrl": "https://mcp-promps.onrender.com/oauth/redirect/SESSION_ID"
}
```

> La `redirectUrl` ahora siempre será **HTTPS** (nunca `http://localhost` directamente).
> El backend se encarga del redirect final a VS Code.

---

## Flujo completo visual

```
VS Code
  │
  ├─► GET /authorize → backend redirige a:
  │       https://front-mcp-gules.vercel.app/login?oauth_request=ABC
  │
Frontend (login)
  │
  ├─► POST /auth/login → JWT
  ├─► POST /oauth/callback  { oauth_request: ABC, jwt: TOKEN }
  │       ← { status: 'success', redirectUrl: 'https://mcp-promps.onrender.com/oauth/redirect/XYZ' }
  │
  ├─► window.location.href = 'https://mcp-promps.onrender.com/oauth/redirect/XYZ'
  │
Backend (redirect)
  │
  ├─► GET /oauth/redirect/XYZ → 302 → http://127.0.0.1:PORT/?code=CODE&state=STATE
  │
VS Code intercepta http://127.0.0.1:PORT
  │
  ├─► POST /token { code: CODE, ... } → access_token
  │
  └─► ✅ MCP conectado
```

---

## Checklist para el frontend

- [ ] `window.location.href = oauthRes.redirectUrl` se ejecuta **siempre** cuando `status === 'success'`
- [ ] No hay `if` extra que condicione la navegación (validación de URL, delay, etc.)
- [ ] Se usa `return` después del redirect para no continuar con `navigate('/dashboard')`
- [ ] El campo JWT se envía como `jwt` en el body del POST
- [ ] `sessionStorage.removeItem('oauth_request')` se llama **antes** de navegar
- [ ] No se muestra "Puedes volver a VS Code" — ese mensaje solo debe aparecer si **falla** el callback, nunca en el caso exitoso

---

## Mensaje de éxito vs fallback

| Situación | Comportamiento correcto |
|-----------|------------------------|
| `status === 'success'` con `redirectUrl` | `window.location.href = redirectUrl` inmediatamente |
| `status === 'error'` del backend | Mostrar error + `navigate('/dashboard')` |
| Excepción de red | Mostrar error + `navigate('/dashboard')` |
| "Puedes volver a VS Code" | **Solo** si no hay `redirectUrl` (nunca debería pasar con el backend actual) |
