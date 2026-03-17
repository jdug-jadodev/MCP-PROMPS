# 🔑 Plan de Trabajo: Backend de Login - Verificación y Coordinación de Logout

**Fecha:** 17 de marzo de 2026  
**Equipo:** Backend Loggin-MCP  
**Repositorio:** Loggin-Mcp  
**URL Producción:** https://loggin-mcp.onrender.com

---

## 📋 Resumen Ejecutivo

### Tu Rol en el Sistema

El **Backend de Login (Loggin-MCP)** es el microservicio que:
- Gestiona autenticación de usuarios (login, registro, reset password)
- Genera JWT con `jti` único para cada token
- **YA tiene implementado sistema de revocación de tokens** ✅
- Tabla `revoked_tokens` en PostgreSQL

### Estado Actual

✅ **TU SISTEMA YA ESTÁ IMPLEMENTADO**

| Componente | Estado |
|------------|--------|
| Tabla `revoked_tokens` | ✅ Funcionando |
| Endpoint `POST /auth/logout` | ✅ Funcionando |
| Middleware con validación de revocación | ✅ Funcionando |
| Función `clean_revoked_tokens()` | ✅ Funcionando |

### Objetivo de Este Plan

1. **Verificar** que todo funciona correctamente
2. **Coordinarse** con Frontend y MCP Server
3. **Validar** el flujo end-to-end

### Dependencias

| Dependencia | Estado | Notas |
|-------------|--------|-------|
| Frontend | 🔶 En proceso | Llamará a `/auth/logout` |
| MCP Server | ⚪ Sin dependencia | Sistemas independientes |

---

## ⏱️ Cronograma

| Fase | Duración | Prioridad |
|------|----------|-----------|
| FASE 1: Verificación de Implementación | 30 min | 🟠 ALTA |
| FASE 2: Testing del Endpoint | 30 min | 🟠 ALTA |
| FASE 3: Coordinación con Frontend | 15 min | 🟢 MEDIA |
| FASE 4: Documentación | 15 min | 🟢 MEDIA |
| **TOTAL** | **1.5 horas** | |

---

## FASE 1: Verificación de Implementación Existente

**Duración:** 30 minutos

### 1.1. Verificar Tabla de Tokens Revocados

**Ubicación:** Base de datos PostgreSQL (Supabase)

Ejecutar en SQL Editor de Supabase:

```sql
-- Verificar que la tabla existe
SELECT * FROM revoked_tokens LIMIT 5;

-- Ver estructura
\d revoked_tokens

-- Contar tokens revocados
SELECT COUNT(*) as total_revoked FROM revoked_tokens;

-- Ver tokens revocados por fecha
SELECT 
  DATE(created_at) as fecha,
  COUNT(*) as cantidad
FROM revoked_tokens
GROUP BY DATE(created_at)
ORDER BY fecha DESC
LIMIT 7;
```

**Estructura esperada:**

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `jti` | TEXT, PRIMARY KEY | JWT ID único |
| `expires_at` | TIMESTAMP WITH TIME ZONE | Expiración del token |
| `created_at` | TIMESTAMP WITH TIME ZONE | Momento de revocación |

### 1.2. Verificar Endpoint de Logout

**Archivo:** `src/infrastructure/routes/auth.routes.ts`

```typescript
// Debe existir esta ruta
router.post('/logout', authMiddleware, (req, res) => 
  authController.logout(req, res)
);
```

### 1.3. Verificar Controlador de Logout

**Archivo:** `src/infrastructure/controller/AuthController.ts`

El método `logout` debe:
1. ✅ Extraer token del header Authorization
2. ✅ Decodificar y obtener `jti` del payload
3. ✅ Llamar a `revokedTokenRepository.revokeToken(jti, expiresAt)`
4. ✅ Responder 200 OK

### 1.4. Verificar Middleware de Auth

**Archivo:** `src/infrastructure/middleware/auth.middleware.ts`

El middleware debe:
1. ✅ Verificar firma JWT
2. ✅ Extraer `jti` del payload
3. ✅ Llamar a `revokedRepo.isRevoked(jti)`
4. ✅ Retornar 401 si está revocado

### 1.5. Verificar Repositorio de Revocación

**Archivo:** `src/infrastructure/repository/adapter/SupabaseRevokedTokenRepositoryAdapter.ts`

Métodos que deben existir:
- ✅ `revokeToken(jti, expiresAt)`
- ✅ `isRevoked(jti)`
- ✅ `deleteExpiredRevokedTokens()`

### ✅ Checklist FASE 1

- [ ] Tabla `revoked_tokens` existe en Supabase
- [ ] Estructura de tabla correcta (jti, expires_at, created_at)
- [ ] Índice `idx_revoked_tokens_expires_at` existe
- [ ] Ruta `/auth/logout` registrada
- [ ] Controlador `logout` implementado
- [ ] Middleware valida tokens revocados
- [ ] Repositorio tiene métodos de revocación

---

## FASE 2: Testing del Endpoint

**Duración:** 30 minutos

### 2.1. Test Manual con cURL

#### Test 1: Login para obtener JWT

```powershell
$response = Invoke-RestMethod -Uri "https://loggin-mcp.onrender.com/auth/login" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"email":"test@example.com","password":"password123"}'

$token = $response.token
Write-Host "Token: $token"
```

#### Test 2: Verificar que el token funciona

```powershell
# Usar el token en una ruta protegida (si existe alguna)
# Por ejemplo, verificar sesión
Invoke-RestMethod -Uri "https://loggin-mcp.onrender.com/auth/me" `
  -Method GET `
  -Headers @{ Authorization = "Bearer $token" }
```

#### Test 3: Hacer logout (revocar token)

```powershell
Invoke-RestMethod -Uri "https://loggin-mcp.onrender.com/auth/logout" `
  -Method POST `
  -Headers @{ Authorization = "Bearer $token" }

# Debería responder: { "status": "success", "message": "Logged out" }
```

#### Test 4: Verificar que el token ya NO funciona

```powershell
# Intentar usar el token revocado
Invoke-RestMethod -Uri "https://loggin-mcp.onrender.com/auth/me" `
  -Method GET `
  -Headers @{ Authorization = "Bearer $token" }

# Debería responder: 401 Unauthorized
# { "status": "error", "message": "Token has been revoked", "code": "UNAUTHORIZED" }
```

#### Test 5: Verificar en base de datos

```sql
-- Buscar el jti del token en la tabla
SELECT * FROM revoked_tokens 
ORDER BY created_at DESC 
LIMIT 1;

-- Debería mostrar el jti del token que acabamos de revocar
```

### 2.2. Script de Test Automatizado

**Archivo:** `test-logout.js` (crear en raíz del proyecto)

```javascript
const fetch = require('node-fetch');

const BASE_URL = 'https://loggin-mcp.onrender.com';

async function testLogout() {
  const EMAIL = process.env.TEST_EMAIL;
  const PASSWORD = process.env.TEST_PASSWORD;
  
  if (!EMAIL || !PASSWORD) {
    console.error('❌ Configura TEST_EMAIL y TEST_PASSWORD');
    process.exit(1);
  }
  
  console.log('🧪 Test 1: Login para obtener JWT');
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD })
  });
  
  const loginData = await loginRes.json();
  if (loginData.status !== 'success') {
    console.error('❌ Login falló:', loginData);
    process.exit(1);
  }
  
  const token = loginData.token;
  console.log('✅ Login exitoso\n');
  
  console.log('🧪 Test 2: Logout (revocar token)');
  const logoutRes = await fetch(`${BASE_URL}/auth/logout`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  const logoutData = await logoutRes.json();
  console.log('   Response:', JSON.stringify(logoutData, null, 2));
  
  if (logoutRes.status !== 200 || logoutData.status !== 'success') {
    console.error('❌ Logout falló');
    process.exit(1);
  }
  console.log('✅ Logout exitoso\n');
  
  console.log('🧪 Test 3: Verificar que token revocado NO funciona');
  const verifyRes = await fetch(`${BASE_URL}/auth/logout`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  console.log(`   Status: ${verifyRes.status}`);
  
  if (verifyRes.status !== 401) {
    console.error('❌ Token revocado debería dar 401');
    process.exit(1);
  }
  console.log('✅ Token revocado rechazado correctamente\n');
  
  console.log('✅✅✅ TODOS LOS TESTS PASARON ✅✅✅');
}

testLogout().catch(console.error);
```

**Ejecutar:**

```powershell
$env:TEST_EMAIL="test@example.com"
$env:TEST_PASSWORD="password123"
node test-logout.js
```

### ✅ Checklist FASE 2

- [ ] Login funciona y devuelve JWT
- [ ] Logout responde 200 OK con `{ status: "success" }`
- [ ] Token revocado da 401 al intentar usarlo
- [ ] jti aparece en tabla `revoked_tokens`
- [ ] Script de test automatizado pasa

---

## FASE 3: Coordinación con Frontend

**Duración:** 15 minutos

### 3.1. Documentar el Contrato de API

El Frontend necesita saber exactamente cómo llamar a `/auth/logout`:

#### Request

```http
POST /auth/logout
Authorization: Bearer <jwt_token>
```

**Notas:**
- No requiere body
- El token debe estar en el header Authorization
- El token debe ser válido (no expirado, firma correcta)

#### Response - Éxito

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "status": "success",
  "message": "Logged out"
}
```

#### Response - Error (token inválido)

```http
HTTP/1.1 401 Unauthorized
Content-Type: application/json

{
  "status": "error",
  "message": "Token has been revoked",
  "code": "UNAUTHORIZED"
}
```

#### Response - Error (sin token)

```http
HTTP/1.1 401 Unauthorized
Content-Type: application/json

{
  "status": "error",
  "message": "No authorization token provided",
  "code": "UNAUTHORIZED"
}
```

### 3.2. Confirmaciones para el Frontend

Enviar al equipo Frontend:

```markdown
## 📡 Endpoint de Logout - Backend de Login

**URL:** `POST https://loggin-mcp.onrender.com/auth/logout`

**Headers requeridos:**
- `Authorization: Bearer <jwt_token>`

**Response exitoso:**
```json
{
  "status": "success",
  "message": "Logged out"
}
```

**Comportamiento:**
- El token JWT queda inmediatamente invalidado
- Cualquier request futuro con ese token devolverá 401
- El jti del token se guarda en blacklist hasta que expire naturalmente

**Estados del servidor:**
✅ Endpoint funcionando
✅ Blacklist activa
✅ Listo para integración
```

### ✅ Checklist FASE 3

- [ ] Documentación del contrato de API lista
- [ ] Frontend notificado de que está listo
- [ ] Coordinar fecha de testing integrado

---

## FASE 4: Documentación y Mantenimiento

**Duración:** 15 minutos

### 4.1. Verificar Limpieza Automática

La función `clean_revoked_tokens()` debe ejecutarse periódicamente para limpiar tokens expirados.

#### Verificar que existe la función:

```sql
-- En Supabase SQL Editor
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_name = 'clean_revoked_tokens';
```

#### Ejecutar limpieza manualmente:

```sql
SELECT clean_revoked_tokens();
```

#### Configurar cron job (si no existe):

En Supabase, ir a **Database → Extensions** y habilitar `pg_cron`, luego:

```sql
-- Ejecutar cada día a las 3 AM
SELECT cron.schedule(
  'clean-revoked-tokens',
  '0 3 * * *',
  'SELECT clean_revoked_tokens()'
);
```

### 4.2. Monitoreo

#### Queries útiles para monitoreo:

```sql
-- Tokens revocados en las últimas 24h
SELECT COUNT(*) 
FROM revoked_tokens 
WHERE created_at > NOW() - INTERVAL '24 hours';

-- Tokens que ya expiraron (pendientes de limpieza)
SELECT COUNT(*) 
FROM revoked_tokens 
WHERE expires_at < NOW();

-- Top 5 días con más logouts
SELECT 
  DATE(created_at) as fecha,
  COUNT(*) as logouts
FROM revoked_tokens
GROUP BY DATE(created_at)
ORDER BY logouts DESC
LIMIT 5;
```

### 4.3. Alertas (Opcional)

Configurar alertas si:
- Más de 100 logouts por hora (posible ataque)
- Errores en la función de limpieza
- Tabla `revoked_tokens` supera 100,000 registros

### ✅ Checklist FASE 4

- [ ] Función `clean_revoked_tokens()` existe
- [ ] Cron job configurado para limpieza
- [ ] Queries de monitoreo documentadas
- [ ] Alertas configuradas (opcional)

---

## 📡 Lo Que el Frontend Espera de Ti

### Resumen del Contrato

| Aspecto | Detalle |
|---------|---------|
| **Endpoint** | `POST /auth/logout` |
| **Auth** | `Authorization: Bearer <jwt>` |
| **Body** | No requerido |
| **Success** | `200 OK { "status": "success" }` |
| **Error** | `401 { "status": "error", "code": "UNAUTHORIZED" }` |

### Comportamiento Esperado

1. Frontend envía `POST /auth/logout` con el JWT
2. Tu backend extrae `jti` del token
3. Guarda `jti` en `revoked_tokens`
4. Responde 200 OK
5. Cualquier uso futuro de ese token → 401

### Timeline de Coordinación

```
┌─────────────────────────────────────────────────────────────────┐
│                    TIMELINE DE INTEGRACIÓN                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Backend Login ─────[YA LISTO]───────────────────────────────>  │
│                                                                  │
│  MCP Server ────────[En progreso]───────[Listo]──────────────>  │
│                                                                  │
│  Frontend ───────────────────────[Implementando]──[Testing]──>  │
│                                                                  │
│  Testing E2E ─────────────────────────────────────[Aquí]─────>  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📊 Estructura del JWT que Generas

### Payload del Token

```json
{
  "userId": "uuid-del-usuario",
  "email": "usuario@example.com",
  "iat": 1710691200,
  "exp": 1710745200,
  "jti": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

### Importancia del `jti`

El campo `jti` (JWT ID) es **CRÍTICO** para tu sistema de revocación:

- ✅ Es único para cada token
- ✅ Se guarda en `revoked_tokens` al hacer logout
- ✅ El middleware verifica si está revocado
- ✅ Permite revocar tokens específicos sin afectar otros

### Verificar que generas `jti`:

**Archivo:** `src/utils/jwt/generateToken.ts`

```typescript
// Debe incluir jti
const token = jwt.sign(payload, jwtSecret, {
  expiresIn,
  jwtid: jti  // ← CRÍTICO
});
```

---

## ✅ Checklist Final

### FASE 1: Verificación
- [ ] Tabla `revoked_tokens` existe
- [ ] Índice creado
- [ ] Ruta `/auth/logout` registrada
- [ ] Controlador implementado
- [ ] Middleware valida revocación
- [ ] Repositorio con métodos

### FASE 2: Testing
- [ ] Login funciona
- [ ] Logout responde 200 OK
- [ ] Token revocado da 401
- [ ] jti en tabla
- [ ] Script automatizado pasa

### FASE 3: Coordinación
- [ ] Contrato de API documentado
- [ ] Frontend notificado
- [ ] Fecha de testing acordada

### FASE 4: Mantenimiento
- [ ] Función de limpieza existe
- [ ] Cron job configurado
- [ ] Monitoreo documentado

---

## 🎯 Tu Trabajo Ya Está Hecho

### Estado Actual: ✅ COMPLETO

Tu sistema de logout con revocación de tokens **ya está implementado y funcionando**. 

Este plan es principalmente para:
1. **Verificar** que todo está bien
2. **Documentar** para los otros equipos
3. **Coordinar** el testing integrado

### Próximos Pasos (No Técnicos)

1. [ ] Confirmar al Frontend que endpoint está listo
2. [ ] Participar en testing end-to-end cuando todos estén listos
3. [ ] Monitorear logs después del deploy del Frontend

---

## 🚨 Troubleshooting

### Si el logout no funciona:

1. **Verificar logs del servidor**
   ```bash
   # En Render dashboard
   Ver "Logs" del servicio
   ```

2. **Verificar que el token tiene jti**
   ```javascript
   // Decodificar token
   const decoded = jwt.decode(token);
   console.log(decoded.jti); // Debe existir
   ```

3. **Verificar conexión a Supabase**
   ```sql
   SELECT NOW(); -- Si funciona, conexión OK
   ```

4. **Verificar que el middleware llama a isRevoked**
   - Añadir logs en `auth.middleware.ts`

### Si tokens revocados siguen funcionando:

1. **Verificar que jti se guardó**
   ```sql
   SELECT * FROM revoked_tokens 
   WHERE jti = 'el-jti-del-token';
   ```

2. **Verificar orden del middleware**
   - `isRevoked()` debe llamarse ANTES de continuar

3. **Verificar instancia de repositorio**
   - Debe ser singleton o la misma que guarda

---

**Tiempo Total Estimado:** 1.5 horas  
**Prioridad:** 🟠 ALTA (verificación y coordinación)  
**Estado:** ✅ Ya implementado, solo verificar

---

*Plan de trabajo generado el 17 de marzo de 2026*
