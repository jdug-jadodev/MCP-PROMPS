# Análisis del Sistema de Autenticación - Frontend MCP

**Fecha:** 17 de marzo de 2026  
**Audiencia:** Equipo Backend  
**Propósito:** Documentar el funcionamiento actual del sistema de autenticación del frontend para facilitar la integración backend

---

## 📋 Índice

1. [Stack Tecnológico](#stack-tecnológico)
2. [Arquitectura General](#arquitectura-general)
3. [Flujo de Inicio de Sesión (Login)](#flujo-de-inicio-de-sesión-login)
4. [Flujo de Cierre de Sesión (Logout)](#flujo-de-cierre-de-sesión-logout)
5. [Gestión de Tokens y Sesión](#gestión-de-tokens-y-sesión)
6. [Flujo OAuth (MCP Integration)](#flujo-oauth-mcp-integration)
7. [Recuperación de Contraseña](#recuperación-de-contraseña)
8. [Protección de Rutas](#protección-de-rutas)
9. [Endpoints Backend Requeridos](#endpoints-backend-requeridos)
10. [Variables de Entorno](#variables-de-entorno)
11. [Seguridad Implementada](#seguridad-implementada)
12. [Datos Esperados del Backend](#datos-esperados-del-backend)

---

## 🛠️ Stack Tecnológico

### Frontend
- **Framework:** React 19.2.0
- **Routing:** React Router DOM 7.13.1
- **Build Tool:** Vite 7.3.1
- **Lenguaje:** TypeScript 5.9.3
- **Estilos:** Tailwind CSS 4.2.1
- **HTTP Client:** Fetch API nativa (sin axios en uso activo)

### Dependencias Clave
```json
{
  "react": "^19.2.0",
  "react-dom": "^19.2.0",
  "react-router-dom": "^7.13.1"
}
```

---

## 🏗️ Arquitectura General

### Estructura de Archivos de Autenticación

```
src/
├── services/
│   └── authService.ts          # Servicios de autenticación (API calls)
├── lib/
│   └── api.ts                  # Cliente HTTP y gestión de tokens
├── pages/
│   ├── Login.tsx               # Página de inicio de sesión
│   ├── Dashboard.tsx           # Página principal post-login
│   ├── ForgotPassword.tsx      # Solicitud de recuperación
│   ├── ResetPassword.tsx       # Restablecimiento con token
│   ├── CreatePassword.tsx      # Creación de contraseña inicial
│   └── AdminUsers.tsx          # Administración de usuarios
├── hooks/
│   ├── useTokenFromUrl.ts      # Extracción de tokens de URL
│   ├── useCooldown.ts          # Anti-spam de requests
│   └── useRequestLock.ts       # Prevención de doble submit
└── config/
    └── security.ts             # Configuración de seguridad
```

---

## 🔐 Flujo de Inicio de Sesión (Login)

### 1. Página de Login (`Login.tsx`)

**URL:** `/login`

**Captura de Parámetros:**
- Al cargar la página, el frontend verifica si existe un parámetro `oauth_request` en la URL
- Si existe, se guarda en `sessionStorage` para usarlo después del login

```typescript
// Captura automática en useEffect
const oauthRequest = params.get('oauth_request')
if (oauthRequest) {
  sessionStorage.setItem('oauth_request', oauthRequest)
}
```

### 2. Validación en Cliente

Antes de enviar al backend:
- **Email:** Formato válido (regex: `/^[^@\s]+@[^@\s]+\.[^@\s]+$/`)
- **Password:** Campo no vacío

### 3. Request al Backend

**Endpoint:** `POST /auth/login`

**Payload:**
```json
{
  "email": "usuario@example.com",
  "password": "password123"
}
```

**Headers:**
```http
Content-Type: application/json
```

### 4. Respuesta Esperada del Backend

#### ✅ Éxito (200 OK)
```json
{
  "status": "success",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "userId": "123",
    "email": "usuario@example.com"
  },
  "expiresIn": "15h"  // Opcional
}
```

#### ❌ Error (401 Unauthorized)
```json
{
  "status": "error",
  "message": "Credenciales incorrectas",
  "code": "INVALID_CREDENTIALS"
}
```

### 5. Procesamiento de Respuesta

Si el login es exitoso:
```typescript
// 1. Guardar token y usuario
saveAuth(token, user)  // localStorage + memoria

// 2. Verificar si hay oauth_request pendiente
// (ya fue guardado en sessionStorage)

// 3. Redirigir al dashboard
navigate('/dashboard')
```

### 6. Post-Login en Dashboard

Una vez en el dashboard, si existe `oauth_request`:
```typescript
// Se ejecuta automáticamente
const oauthRequest = sessionStorage.getItem('oauth_request')
const token = getToken()

// Llamar al callback de OAuth
authService.oauthCallback(oauthRequest, token)
```

---

## 🚪 Flujo de Cierre de Sesión (Logout)

### Implementación Actual

**Ubicación:** Dashboard → Botón "Cerrar Sesión"

**Código:**
```typescript
const handleLogout = () => {
  clearAuth();        // Limpia todo el almacenamiento
  navigate('/login'); // Redirige al login
}
```

### Función `clearAuth()` (`api.ts`)

```typescript
export const clearAuth = () => {
  inMemoryAuthToken = null;  // Limpia memoria
  localStorage.removeItem('authToken');
  localStorage.removeItem('user');
}
```

### ⚠️ Nota Importante para Backend

**NO HAY LLAMADA AL BACKEND EN LOGOUT**

El logout es completamente del lado del cliente. El frontend:
- Elimina el token de localStorage
- Elimina el token de memoria
- Elimina datos del usuario
- Redirige a `/login`

**Implicaciones:**
- El token JWT sigue siendo válido hasta su expiración natural
- Si el backend necesita invalidación de tokens, debe implementar:
  - Lista negra de tokens (blacklist)
  - Endpoint `POST /auth/logout` que el frontend pueda llamar
  - Sistema de revocación de tokens

---

## 🔑 Gestión de Tokens y Sesión

### Almacenamiento Dual (Memoria + localStorage)

```typescript
// Variable en memoria (prioridad)
let inMemoryAuthToken: string | null = null;

// Guardar token
export const saveAuth = (token: string, user: AuthUser) => {
  inMemoryAuthToken = token;  // Memoria (evita re-escrituras)
  localStorage.setItem('authToken', token);     // Persistencia
  localStorage.setItem('user', JSON.stringify(user));
}

// Obtener token
export const getToken = () => {
  if (inMemoryAuthToken) return inMemoryAuthToken;
  const stored = localStorage.getItem('authToken');
  if (stored) {
    inMemoryAuthToken = stored;
    return inMemoryAuthToken;
  }
  return null;
}
```

### Verificación de Autenticación

```typescript
export const isAuthenticated = () => {
  const token = getToken();
  if (!token) return false;
  
  const payload = safeParseJwt(token);
  if (!payload) return false;
  
  const exp = payload.exp * 1000;  // JWT exp en segundos → ms
  return Date.now() < exp;  // Token no expirado
}
```

### Auto-Envío de Token en Requests

**Todas las peticiones automáticamente incluyen:**
```typescript
const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${token}`  // Si existe
};
```

### Manejo de 401 Unauthorized

```typescript
if (response.status === 401) {
  // Solo si viene del API principal (no OAuth externo)
  if (url.startsWith(this.baseURL)) {
    clearAuth();
    window.location.href = '/login';
  }
  throw new Error('Unauthorized');
}
```

---

## 🔄 Flujo OAuth (MCP Integration)

### Contexto
Este flujo permite que VS Code inicie sesión en el frontend y reciba un token de vuelta.

### 1. VS Code Abre el Frontend
```
https://front-mcp.com/login?oauth_request=abc123
```

### 2. Login del Usuario
- Usuario ingresa credenciales
- `oauth_request=abc123` se guarda en `sessionStorage`
- Login normal procede

### 3. Dashboard Automático (Post-Login)
```typescript
useEffect(() => {
  async function handleOauthCallback() {
    const oauthRequest = sessionStorage.getItem('oauth_request');
    const token = getToken();
    
    if (!oauthRequest || !token) return;
    
    // Llamar al callback de OAuth
    const res = await authService.oauthCallback(oauthRequest, token);
    
    sessionStorage.removeItem('oauth_request');
    
    if (res.status === 'success' && res.redirectUrl) {
      // Abrir en nueva pestaña (no salir del dashboard)
      window.open(res.redirectUrl, '_blank');
    }
  }
  
  handleOauthCallback();
}, []);
```

### 4. OAuth Callback Request

**Endpoint:** `POST https://mcp-promps.onrender.com/oauth/callback`  
(Configurable vía `VITE_MCP_CALLBACK`)

**Payload:**
```json
{
  "oauth_request": "abc123",
  "jwt": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Respuesta Esperada:**
```json
{
  "status": "success",
  "redirectUrl": "https://backend.com/oauth/complete?token=xyz"
}
```

### 5. Redirección a VS Code
- El `redirectUrl` del backend redirige a un esquema custom de VS Code
- Ejemplo: `vscode://extension/mcp-auth?token=xyz`

---

## 🔄 Recuperación de Contraseña

### Flujo Completo

#### 1. Solicitar Recuperación

**Página:** `/forgot-password`

**Request:**
```http
POST /auth/forgot-password
Content-Type: application/json

{
  "email": "usuario@example.com"
}
```

**Respuesta Esperada:**
```json
{
  "status": "success",
  "message": "Email enviado",
  "emailSent": true
}
```

**Comportamiento Frontend:**
- Muestra mensaje genérico: "Si el email existe, recibirás instrucciones"
- Redirige a `/login` después de 3 segundos

#### 2. Usuario Recibe Email

Backend debe enviar email con link:
```
https://front-mcp.com/reset-password?token=RESET_TOKEN_123
```

#### 3. Página de Reset Password

**URL:** `/reset-password?token=RESET_TOKEN_123`

**Verificación de Token:**
```http
POST /auth/verify-reset-token
Content-Type: application/json

{
  "token": "RESET_TOKEN_123"
}
```

**Respuesta:**
```json
{
  "status": "success"
}
```

**Reset de Contraseña:**
```http
POST /auth/reset-password
Content-Type: application/json

{
  "token": "RESET_TOKEN_123",
  "newPassword": "NuevaPassword123!"
}
```

**Respuesta:**
```json
{
  "status": "success",
  "message": "Contraseña actualizada"
}
```

---

## 🛡️ Protección de Rutas

### PrivateRoute Component

```typescript
const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  return isAuthenticated() ? <>{children}</> : <Navigate to="/login" replace />;
};
```

### Rutas Protegidas Actuales
- `/dashboard` - Requiere autenticación
- `/admin/users` - Requiere autenticación (no verifica rol admin en frontend)

### Rutas Públicas
- `/login`
- `/forgot-password`
- `/reset-password`
- `/create-password`

---

## 🌐 Endpoints Backend Requeridos

### Implementados y en Uso

| Método | Endpoint | Propósito | Auth | Request | Response |
|--------|----------|-----------|------|---------|----------|
| `POST` | `/auth/login` | Inicio de sesión | No | `{ email, password }` | `{ token, user }` |
| `POST` | `/auth/check-email` | Verificar si email existe | No | `{ email }` | `{ exists, hasPassword }` |
| `POST` | `/auth/create-password` | Crear contraseña inicial | No | `{ token, password }` | `{ userId, email }` |
| `POST` | `/auth/forgot-password` | Solicitar reset | No | `{ email }` | `{ message, emailSent }` |
| `POST` | `/auth/verify-reset-token` | Validar token de reset | No | `{ token }` | `{ status: 'success' }` |
| `POST` | `/auth/reset-password` | Resetear contraseña | No | `{ token, newPassword }` | `{ message }` |
| `POST` | `/auth/register-email` | Registrar nuevo usuario (admin) | Sí | `{ email }` | `{ userId, email }` |

### Endpoint Externo OAuth
| Método | Endpoint | Propósito |
|--------|----------|-----------|
| `POST` | `https://mcp-promps.onrender.com/oauth/callback` | Callback OAuth MCP |

---

## 🔧 Variables de Entorno

### Frontend (.env)

```bash
# URL del backend de autenticación
VITE_API_URL=http://localhost:4000

# Endpoint de OAuth callback (servidor MCP)
VITE_MCP_CALLBACK=https://mcp-promps.onrender.com/oauth/callback

# Configuración de seguridad
VITE_COOLDOWN_MS=2000          # Anti-spam entre requests
VITE_DEBOUNCE_MS=300           # Debounce de validaciones
VITE_ENABLE_RECAPTCHA=false    # Activar reCAPTCHA (no implementado)
VITE_RECAPTCHA_KEY=            # Key de reCAPTCHA
```

### Valores por Defecto en Código

```typescript
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
const MCP_CALLBACK = import.meta.env.VITE_MCP_CALLBACK || 
  'https://mcp-promps.onrender.com/oauth/callback';
const COOLDOWN_MS = Number(import.meta.env.VITE_COOLDOWN_MS) || 2000;
const DEBOUNCE_MS = Number(import.meta.env.VITE_DEBOUNCE_MS) || 300;
```

---

## 🔒 Seguridad Implementada

### 1. Validación de Email
```typescript
/^[^@\s]+@[^@\s]+\.[^@\s]+$/
```

### 2. Validación de Contraseña (CreatePassword/ResetPassword)

**Requisitos:**
- ✅ Mínimo 8 caracteres
- ✅ Al menos 1 mayúscula
- ✅ Al menos 1 minúscula
- ✅ Al menos 1 número
- ✅ Al menos 1 carácter especial

```typescript
const validators = {
  minLength: (password: string) => password.length >= 8,
  hasUpperCase: (password: string) => /[A-Z]/.test(password),
  hasLowerCase: (password: string) => /[a-z]/.test(password),
  hasNumber: (password: string) => /[0-9]/.test(password),
  hasSpecialChar: (password: string) => /[!@#$%^&*(),.?":{}|<>]/.test(password)
};
```

### 3. Protección XSS

**Escape HTML en inputs:**
```typescript
export function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
```

### 4. Anti-Spam (Cooldown Hook)

```typescript
// Previene múltiples requests en 2 segundos
const { canProceed, triggerCooldown } = useCooldown(2000);
```

### 5. Request Lock (Prevención Doble Submit)

```typescript
const { isLocked, withLock } = useRequestLock();

await withLock(async () => {
  // Código que no puede ejecutarse dos veces simultáneamente
});
```

### 6. Limpieza de Tokens en URL

```typescript
// useTokenFromUrl hook
// Extrae token de URL y lo elimina del historial
window.history.replaceState({}, document.title, newUrl);
```

### 7. Gestión de Errores de Token

```typescript
if (code === 'TOKEN_ALREADY_USED' || code === 'INVALID_TOKEN') {
  const err = new Error(message || 'Invalid or already used token');
  err.code = code;
  throw err;
}
```

---

## 📊 Datos Esperados del Backend

### JWT Structure

El frontend espera decodificar:
```json
{
  "userId": "123",
  "email": "user@example.com",
  "exp": 1234567890,  // Timestamp en segundos (Unix)
  "iat": 1234567000   // Opcional
}
```

### User Object en Respuestas

```typescript
interface AuthUser {
  userId: string;      // ID único del usuario
  email: string;       // Email del usuario
  [key: string]: unknown;  // Campos adicionales opcionales
}
```

### Campos Opcionales que Backend Puede Enviar

```typescript
{
  "name": "Juan Pérez",
  "role": "admin",
  "avatar": "https://...",
  "permissions": ["read", "write"]
}
```

---

## 🚨 Puntos Importantes para Backend

### 1. **NO hay endpoint de logout**
El frontend solo limpia localmente. Si necesitas invalidar tokens:
- Implementa blacklist de tokens
- Crea `POST /auth/logout`

### 2. **Tokens en Headers**
Todas las requests autenticadas envían:
```
Authorization: Bearer <token>
```

### 3. **CORS debe permitir:**
```
Access-Control-Allow-Origin: http://localhost:5173
Access-Control-Allow-Methods: POST, GET, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
```

### 4. **Códigos de Error Esperados**
- `INVALID_CREDENTIALS` - Login fallido
- `TOKEN_ALREADY_USED` - Token de reset ya usado
- `INVALID_TOKEN` - Token inválido/expirado
- `EMAIL_ALREADY_EXISTS` - Email duplicado
- `FORBIDDEN` - Sin permisos

### 5. **Estructura de Respuesta Consistente**

✅ **Éxito:**
```json
{
  "status": "success",
  // ... datos
}
```

❌ **Error:**
```json
{
  "status": "error",
  "code": "ERROR_CODE",
  "message": "Descripción del error"
}
```

### 6. **Expiración de JWT**
- El frontend verifica la expiración del token antes de hacer requests
- Campo `exp` en el payload debe estar en **segundos Unix** (no milisegundos)
- Recomendado: 15 horas (`expiresIn: '15h'`)

### 7. **Email de Recuperación debe incluir:**
```
https://[FRONTEND_URL]/reset-password?token=[RESET_TOKEN]
```

### 8. **OAuth Callback debe retornar:**
```json
{
  "status": "success",
  "redirectUrl": "vscode://extension/mcp?token=xyz"
}
```

---

## 📝 Checklist de Integración Backend

- [ ] Endpoint `POST /auth/login` implementado
- [ ] Endpoint `POST /auth/check-email` implementado
- [ ] Endpoint `POST /auth/create-password` implementado
- [ ] Endpoint `POST /auth/forgot-password` implementado
- [ ] Endpoint `POST /auth/verify-reset-token` implementado
- [ ] Endpoint `POST /auth/reset-password` implementado
- [ ] Endpoint `POST /auth/register-email` implementado
- [ ] JWT con campo `exp` en segundos Unix
- [ ] CORS configurado para frontend
- [ ] Emails de recuperación con link correcto
- [ ] Manejo de 401 para tokens expirados
- [ ] Códigos de error consistentes
- [ ] OAuth callback externo configurado (opcional)

---

## 🔄 Próximos Pasos Sugeridos

### Frontend
1. Implementar `POST /auth/logout` call al backend
2. Añadir refresh token mechanism
3. Implementar reCAPTCHA
4. Mejorar manejo de roles (admin check)

### Backend
1. Implementar blacklist de tokens
2. Crear endpoint `/auth/logout`
3. Implementar refresh tokens
4. Validar permisos de admin en `/auth/register-email`

---

## 📧 Contacto

Para preguntas sobre la implementación frontend, consultar con el equipo de desarrollo frontend.

**Última actualización:** 17 de marzo de 2026
