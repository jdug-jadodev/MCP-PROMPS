export const probadorFlujosCompletosTemplate = `
# 🧪 Probador de Flujos Completos — End to End

## Instrucciones

El usuario te indicará un punto de entrada del sistema a analizar (un controller HTTP, un consumer de cola, un handler de evento, etc.).
Tu tarea es **seguir y leer el código de TODA la cadena de llamadas** desde ese punto de entrada hasta el punto final del flujo (respuesta HTTP, publicación en cola, escritura en BD, llamada a API externa, etc.).

**⚠️ REGLA FUNDAMENTAL:** No te limites al archivo inicial. Debes leer el código fuente real de cada servicio, repositorio, helper o adaptador que sea invocado en la cadena. El análisis es end-to-end.

**Lenguajes soportados:** TypeScript/JavaScript y Java/SpringBoot WebFlux.

**NO ejecutes ningún código. TODO el análisis es mediante lectura e interpretación del código fuente.**

**NUNCA insertes, modifiques ni elimines datos reales de ninguna base de datos durante el análisis.**

---

## PASO 1 — Identificar el punto de entrada

1. Lee el archivo que el usuario especificó.
2. Localiza la función, método o handler indicado.
3. Identifica el tipo de punto de entrada:
   - Controller HTTP (Express, NestJS, SpringBoot, etc.)
   - Consumer / Listener de cola (RabbitMQ, Kafka, SQS, etc.)
   - Handler de evento / Lambda / Cloud Function (AWS, Azure, GCP)
   - Otro (indicar cuál)
4. **Identifica los objetos de entrada:**
   - Si el usuario los proporcionó, úsalos directamente.
   - Si NO los proporcionó, búscalos con grep_search o semantic_search:
     - Clase/tipo del parámetro (ej: UserRequest, MessageEvent, @RequestBody)
     - Cómo el código accede a los datos (ej: req.body, message.payload, event.Records)
   - Lee el archivo donde esté definido ese tipo/clase y documenta sus campos.
5. Lista todos los métodos y dependencias que son invocados desde este punto de entrada (servicios inyectados, funciones importadas, etc.).

---

## PASO 2 — Rastrear y leer la cadena de llamadas completa

**Esta es la parte más importante del análisis. Debes leer el código de cada eslabón de la cadena.**

Para cada dependencia identificada en el PASO 1, sigue estos pasos en orden:

1. Usa grep_search o semantic_search para localizar el archivo donde está implementada esa clase/función.
2. **Lee el archivo completo** (o el método específico relevante) con read_file.
3. Dentro de ese archivo, identifica qué otras dependencias invoca (nuevos servicios, repositorios, clientes HTTP, ORMs, SDKs de colas, etc.).
4. Repite recursivamente para cada nueva dependencia encontrada hasta llegar a un punto final real:
   - ✅ Consulta o escritura a base de datos (SQL, ORM, NoSQL)
   - ✅ Publicación de mensaje en cola / topic (RabbitMQ, Kafka, SQS, SNS)
   - ✅ Llamada a API externa (fetch, axios, HttpClient)
   - ✅ Respuesta HTTP enviada al cliente (res.send, res.json, ResponseEntity)
   - ✅ Lectura/escritura de archivos o almacenamiento externo (S3, blob, filesystem)
   - ✅ Emisión de evento de dominio o integración

**Registra cada archivo leído** con su ruta, el método analizado y qué invoca a continuación.

**Ejemplo de cadena esperada:**
\`\`\`
OrderController.createOrder()
  → OrderService.processOrder()        [leer src/services/order.service.ts]
    → InventoryRepository.reserve()    [leer src/repositories/inventory.repo.ts]
      → DB: UPDATE inventory SET ...   ✅ PUNTO FINAL (BD)
    → PaymentClient.charge()           [leer src/clients/payment.client.ts]
      → HTTP POST api.payment.com/...  ✅ PUNTO FINAL (API externa)
    → OrderEventPublisher.publish()    [leer src/events/order.publisher.ts]
      → RabbitMQ: exchange=orders      ✅ PUNTO FINAL (Cola)
\`\`\`

---

## PASO 3 — Mapear el flujo completo end-to-end

Con todos los archivos ya leídos, construye el mapa consolidado del flujo:

**Entradas:**
- Parámetros de la función / request body / query params / headers / mensaje de cola
- Variables de entorno utilizadas (process.env.*) en cualquier punto de la cadena
- Estado externo accedido (singletons, variables globales, this.*) en cualquier capa
- Para cada entrada: ¿tiene validación antes de ser usada? (Sí / No / Parcial)

**Transformaciones capa por capa:**
- Para cada operación significativa en toda la cadena, documenta:
  - Archivo y línea donde ocurre
  - Qué dato entra → qué transformación ocurre → qué dato sale
  - Si hay bifurcación (if/else/switch/try-catch), lista todos los caminos posibles y a qué punto final lleva cada uno

**Puntos finales del flujo:**
- Lista TODOS los puntos de salida posibles del flujo completo:
  - Respuestas HTTP (status code, cuerpo de respuesta)
  - Mensajes publicados en colas (exchange, routing key, payload)
  - Escrituras en BD (tabla, operación)
  - Llamadas a APIs externas (método, endpoint, payload)
  - Errores lanzados que terminan el flujo

**Dependencias externas cruzadas:**
- Mapa de qué capa del código interactúa con qué sistema externo

---

## PASO 4 — Detectar riesgos en toda la cadena (escaneo estático)

Escanea **todos los archivos leídos** buscando estos antipatrones. Para cada uno encontrado, registra: archivo, línea exacta, severidad, descripción e impacto.

**Validación de entrada:**
- Parámetros usados antes de validar en cualquier capa de la cadena (null, undefined, tipo incorrecto, formato inválido)
- Ausencia de validación de tipos en parámetros tipados como \`any\` o \`unknown\`
- Datos del request o mensaje de cola usados directamente sin sanitizar en capas intermedias
- Ausencia de validación del payload antes de publicar a una cola o llamar a una API externa

**Manejo de errores:**
- Operaciones \`await\` fuera de \`try-catch\` en cualquier capa
- \`Promise\` sin \`.catch()\`
- Excepciones capturadas pero silenciadas (\`catch(e) {}\`)
- Errores de servicios intermedios no propagados al punto de entrada
- Falta de manejo de errores de la cola (mensaje que no puede ser procesado: ¿se reencola, se manda a DLQ, se ignora?)

**Recursos:**
- Conexiones a BD abiertas sin \`finally\` / \`close()\`
- Handles de archivo abiertos sin cerrar
- Streams sin manejo de \`error\` event

**Concurrencia:**
- Variables globales o de clase modificadas en código async en cualquier capa
- Operaciones de lectura-modificación-escritura no atómicas entre capas
- Mutación de objetos compartidos entre requests

**Seguridad:**
- Datos sensibles (password, token, secret, key) incluidos en respuestas, logs o payloads de cola
- Interpolación directa de parámetros en queries SQL / comandos shell
- Exposición de stack traces al cliente
- Variables de entorno accedidas sin valor por defecto

**Integridad del flujo end-to-end:**
- ¿Qué pasa si uno de los pasos intermedios falla? ¿Se deshacen los pasos anteriores (transaccionalidad)?
- ¿Hay riesgo de duplicidad si el mensaje es reprocesado (idempotencia)?
- ¿Hay timeouts configurados en cada llamada a sistema externo?

---

## PASO 5 — Identificar cuellos de botella en toda la cadena

**Complejidad algorítmica:**
- Loops anidados en cualquier capa: calcular complejidad Big-O resultante
- Uso de \`.find()\` / \`.filter()\` dentro de loops (convierte O(n) en O(n²))
- Ordenamientos innecesarios dentro de loops

**Operaciones I/O en la cadena completa:**
- Múltiples \`await\` secuenciales entre capas que son independientes entre sí (paralelizable con \`Promise.all\`)
- Loop con \`await\` adentro en cualquier capa (patrón N+1): debería ser batch o JOIN
- Ausencia de timeout en llamadas a servicios externos en cualquier eslabón
- Ausencia de retry/circuit-breaker en integraciones críticas
- Llamadas redundantes al mismo sistema externo desde distintas capas de la cadena

**Memoria:**
- Acumulación de datos en arrays sin límite de tamaño en cualquier capa
- Carga de colecciones completas de BD sin paginación

---

## PASO 6 — Generar el Plan de Pruebas

Basándote en los riesgos y cuellos de botella encontrados **en toda la cadena**, genera entre 5 y 15 casos de prueba concretos que cubran el flujo end-to-end.

Para cada caso de prueba usa este formato:

**CT-NNN: [Nombre descriptivo]**
- Vinculado a: [ID del riesgo o cuello de botella]
- Capa donde ocurre: [archivo/componente]
- Entrada: [datos específicos de entrada en el punto de entrada del flujo]
- Flujo esperado (comportamiento correcto): [descripción paso a paso a través de TODAS las capas]
- Flujo actual (según código): [lo que realmente hace el código, indicando en qué capa diverge]
- Veredicto: ✅ PASA / ❌ FALLA / ⚠️ RIESGO LATENTE
- Recomendación: [corrección concreta con archivo y línea]

Asegúrate de incluir casos que prueben:
- El camino feliz completo (entrada válida → todas las capas → punto final exitoso)
- Fallo en una capa intermedia (¿cómo se propaga el error hasta el punto de entrada?)
- Idempotencia (¿qué pasa si el mismo mensaje/request llega dos veces?)
- Fallo del sistema externo en el último eslabón (BD caída, cola no disponible, API externa con timeout)

---

## PASO 7 — Compilar el Reporte

Genera un Reporte de Diagnóstico completo en Markdown con estas secciones:

\`\`\`
# Reporte de Diagnóstico — Flujo Completo End-to-End
## Punto de entrada: [nombre del controller/listener/handler analizado]
## Archivos analizados: [lista de todos los archivos leídos en la cadena]
## Fecha: [fecha actual]

---

### 📊 Resumen Ejecutivo
[2-3 párrafos: qué hace el flujo completo, cuántas capas tiene, estado general de salud, recomendación principal]
[Veredicto final: ✅ LISTO / ⚠️ REQUIERE AJUSTES / ❌ NO LISTO PARA PRODUCCIÓN]

---

### 🔍 Diagrama de Flujo End-to-End
[Diagrama ASCII que muestre: punto de entrada → cada capa → sistemas externos → puntos finales]
[Incluir archivo y método en cada nodo]
[Marcar con ❌ / ⚠️ los puntos con riesgos detectados]

Ejemplo:
[POST /orders] ──→ OrderController.create() [controller.ts:L45]
                        │
                        ▼
               OrderService.process() [order.service.ts:L82]  ⚠️ R2
                  │              │
                  ▼              ▼
  InventoryRepo.reserve()   PaymentClient.charge()
  [inventory.repo.ts:L31]   [payment.client.ts:L19]  ❌ R4
          │                        │
          ▼                        ▼
  DB: UPDATE inventory      HTTP POST api.payment.com
  ✅ PUNTO FINAL (BD)       ✅ PUNTO FINAL (API externa)

---

### 📁 Archivos Analizados

| Archivo | Capa | Método(s) Clave | Sistemas Externos |
|---------|------|-----------------|-------------------|
| src/... | Controller | createOrder() | — |
| src/... | Service | processOrder() | — |
| src/... | Repository | reserve() | PostgreSQL |
| src/... | Client | charge() | api.payment.com |

---

### 🚨 Riesgos Detectados

| ID | Severidad | Tipo | Archivo | Línea | Descripción | Impacto |
|----|-----------|------|---------|-------|-------------|---------|
| R1 | CRÍTICA/ALTA/MEDIA/BAJA | tipo | src/... | L## | descripción | impacto |

---

### ⚡ Cuellos de Botella

| ID | Severidad | Tipo | Archivo | Línea | Descripción | Solución |
|----|-----------|------|---------|-------|-------------|---------|
| CB1 | ... | ... | src/... | L## | ... | ... |

---

### ✅ Plan de Pruebas

[Lista de todos los casos de prueba CT-NNN]

---

### 📈 Métricas

- Archivos analizados en la cadena: ##
- Capas identificadas: ##
- Puntos finales del flujo: ## (BD: #, Colas: #, APIs externas: #, HTTP: #)
- Líneas totales analizadas: ##
- Riesgos detectados: ## (Críticos: #, Altos: #, Medios: #, Bajos: #)
- Cuellos de botella: ##
- Casos de prueba generados: ##
- Cobertura de escenarios: ##%

---

### 🔧 Recomendaciones Prioritizadas

#### 🔴 Urgente (antes de producción)
1. ...

#### 🟠 Importante (próxima semana)
1. ...

#### 🟡 Recomendado (deuda técnica)
1. ...
\`\`\`

---

## IMPORTANTE

- **Lee el código real de cada dependencia** usando read_file. No asumas implementaciones.
- Usa **grep_search** para localizar archivos de servicios, repositorios y clientes (busca el nombre de la clase o función).
- Usa **semantic_search** para encontrar implementaciones cuando grep no encuentre el archivo exacto.
- **Vincula cada hallazgo a un archivo y línea específica** del código.
- Si encuentras una dependencia que es una librería externa (npm/maven) y no tienes acceso al código fuente, documenta qué hace pero no la analices internamente.
- Si el flujo tiene ramas (múltiples caminos según condiciones), traza y analiza TODOS los caminos posibles.
- Guarda el reporte como **reporte-flujo-[nombre-servicio].md** en la raíz del proyecto.
`;