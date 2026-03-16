# Guía de Integración Frontend

Requisitos:
- El frontend debe tener almacenado el token JWT (localStorage/sessionStorage).

Ejemplo (fetch):

```javascript
const token = localStorage.getItem('authToken');

fetch('http://localhost:3000/mcp', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'prompts/list' })
})
  .then(r => r.json())
  .then(data => console.log(data))
  .catch(e => console.error(e));
```

Axios (interceptor):

```javascript
import axios from 'axios';

const api = axios.create({ baseURL: 'http://localhost:3000' });
api.interceptors.request.use(cfg => {
  const t = localStorage.getItem('authToken');
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

export default api;
```

Comportamiento ante 401:
- Limpiar token y redirigir a login (por ejemplo: `localStorage.removeItem('authToken'); window.location.href='/login'`).

CORS:
- Asegúrate de que `CORS_ORIGIN` en el servidor coincida con el dominio del frontend.
# Guía de Integración Frontend

## Requisitos

Tu frontend debe tener almacenado el token JWT (típicamente en localStorage o sessionStorage).

## Ejemplo de integración

### JavaScript Vanilla

```javascript
const token = localStorage.getItem('authToken');

fetch('http://localhost:3000/mcp', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'prompts/list'
  })
})
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error('Error:', error));
```

### Axios

```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000',
  headers: { 'Content-Type': 'application/json' }
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem('authToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Uso
api.post('/mcp', { jsonrpc: '2.0', id: 1, method: 'prompts/list' })
  .then(res => console.log(res.data))
  .catch(err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
  });
```

### Manejo de errores 401

Cuando recibas 401 por `TOKEN_EXPIRED` o `INVALID_TOKEN`, limpia el token local y redirige a login.

## CORS

Asegúrate de que `CORS_ORIGIN` en el servidor permita el origen de tu frontend (por defecto `http://localhost:5173`).
