export const probadorFlujosCompletosTemplate = `
# 🧪 Probador de Flujos Completos

## Instrucciones

El usuario te indicará un servicio específico a analizar (un controller HTTP, un consumer de cola, un handler de evento, etc.).
Tu tarea es ejecutar un análisis estático completo del flujo de ese servicio y generar un reporte de diagnóstico detallado.

**Lenguajes soportados:** TypeScript/JavaScript y Java/SpringBoot WebFlux.

**NO ejecutes ningún código. TODO el análisis es mediante lectura e interpretación del código fuente.**

**NUNCA insertes, modifiques ni elimines datos reales de ninguna base de datos durante el análisis.**

---

## PASO 1 — Identificar y leer el servicio

1. Lee el archivo que el usuario especificó usando tus herramientas.
2. Localiza la función, método o handler indicado.
3. Identifica el tipo de servicio:
   - Controller HTTP (Express, NestJS, SpringBoot, etc.)
   - Consumer de cola (RabbitMQ, Kafka, SQS, etc.)
   - Handler de evento / Lambda / Cloud Function (AWS, Azure, GCP)
   - Otro (indicar cuál)
4. **Identifica los objetos de entrada y salida:**
   - Si el usuario los proporcionó, úsalos directamente.
   - Si NO los proporcionó, búscalos en el proyecto usando grep_search o semantic_search:
     - Busca la clase/tipo del parámetro del método (ej: UserRequest, MessageEvent, @RequestBody)
     - Busca el tipo de retorno declarado (ej: ResponseEntity, Promise<UserResponse>)
     - Busca cómo el código accede a los datos de entrada (ej: req.body, message.payload, event.Records)
   - Documenta los campos relevantes de cada objeto encontrado.
5. Determina el rango de líneas del flujo principal (línea inicio → línea fin).
6. Usa grep_search o semantic_search para rastrear las dependencias importadas (servicios, repositorios, utilidades).
   - Analiza hasta **3 niveles de profundidad** como máximo (el servicio → sus dependencias → las dependencias de sus dependencias).
   - Si supera los 3 niveles, documenta la dependencia pero no la analices internamente.

---

## PASO 2 — Mapear el flujo completo

Construye el mapa del flujo trazando:

**Entradas:**
- Parámetros de la función / request body / query params / headers
- Variables de entorno utilizadas (process.env.*)
- Estado externo accedido (singletons, variables globales, this.*)
- Para cada entrada: ¿tiene validación antes de ser usada? (Sí / No / Parcial)

**Transformaciones línea a línea:**
- Para cada operación significativa, documenta:
  - Qué dato entra
  - Qué transformación ocurre
  - Qué dato sale
  - Si hay una bifurcación (if/else/switch), lista todos los caminos posibles

**Salidas:**
- Lista TODOS los posibles return / throw / respuestas (res.send, res.json, etc.)
- Para cada salida: ¿qué status code retorna? ¿qué datos expone?

**Dependencias externas:**
- Llamadas a base de datos
- Llamadas a APIs externas (fetch, axios, http)
- Llamadas a otros servicios internos
- Lectura/escritura de archivos

---

## PASO 3 — Detectar riesgos (escaneo estático)

Escanea el código buscando estos antipatrones. Para cada uno encontrado, registra: severidad, línea exacta, descripción del riesgo e impacto.

**Validación de entrada:**
- Parámetros usados antes de validar (null, undefined, tipo incorrecto, formato inválido)
- Ausencia de validación de tipos en parámetros tipados como \`any\` o \`unknown\`
- Datos del request usados directamente sin sanitizar

**Manejo de errores:**
- Operaciones \`await\` fuera de \`try-catch\`
- \`Promise\` sin \`.catch()\`
- Excepciones capturadas pero silenciadas (\`catch(e) {}\`)
- Errores de terceros no re-lanzados ni logueados

**Recursos:**
- Conexiones a BD abiertas sin \`finally\` / \`close()\`
- Handles de archivo abiertos sin cerrar
- Streams sin manejo de \`error\` event

**Concurrencia:**
- Variables globales o de clase modificadas en código async
- Operaciones de lectura-modificación-escritura no atómicas
- Mutación de objetos compartidos entre requests

**Seguridad:**
- Datos sensibles (password, token, secret, key) incluidos en respuestas o logs
- Interpolación directa de parámetros en queries SQL / comandos shell
- Exposición de stack traces al cliente
- Variables de entorno accedidas sin valor por defecto

---

## PASO 4 — Identificar cuellos de botella

**Complejidad algorítmica:**
- Loops anidados: calcular complejidad Big-O resultante
- Uso de \`.find()\` / \`.filter()\` dentro de loops (convierte O(n) en O(n²))
- Ordenamientos innecesarios dentro de loops

**Operaciones I/O:**
- Múltiples \`await\` secuenciales que son independientes entre sí (paralelizable con \`Promise.all\`)
- Loop con \`await\` adentro (patrón N+1): debería ser batch o JOIN
- Ausencia de timeout en llamadas a servicios externos
- Ausencia de retry/circuit-breaker en integraciones críticas

**Memoria:**
- Acumulación de datos en arrays sin límite de tamaño
- Carga de colecciones completas de BD sin paginación

---

## PASO 5 — Generar el Plan de Pruebas

Basándote en los riesgos y cuellos de botella encontrados, genera entre 5 y 15 casos de prueba concretos.

Para cada caso de prueba usa este formato:

**CT-NNN: [Nombre descriptivo]**
- Vinculado a: [ID del riesgo o cuello de botella]
- Entrada: [datos específicos de entrada]
- Flujo esperado (comportamiento correcto): [descripción paso a paso]
- Flujo actual (según código): [lo que realmente hace el código]
- Veredicto: ✅ PASA / ❌ FALLA / ⚠️ RIESGO LATENTE
- Recomendación: [corrección concreta]

---

## PASO 6 — Compilar el Reporte

Genera un Reporte de Diagnóstico completo en Markdown con estas secciones:

\`\`\`
# Reporte de Diagnóstico — Flujo Completo
## Servicio: [nombre del servicio analizado]
## Archivo: [ruta del archivo]
## Fecha: [fecha actual]

---

### 📊 Resumen Ejecutivo
[2-3 párrafos: qué hace el servicio, estado general de salud, recomendación principal]
[Veredicto final: ✅ LISTO / ⚠️ REQUIERE AJUSTES / ❌ NO LISTO PARA PRODUCCIÓN]

---

### 🔍 Diagrama de Flujo
[Diagrama ASCII que muestre: entrada → pasos clave → bifurcaciones → salidas]
[Marcar con ❌ / ⚠️ los puntos con riesgos detectados]

---

### 🚨 Riesgos Detectados

| ID | Severidad | Tipo | Línea | Descripción | Impacto |
|----|-----------|------|-------|-------------|---------|
| R1 | CRÍTICA/ALTA/MEDIA/BAJA | tipo | L## | descripción | impacto |

---

### ⚡ Cuellos de Botella

| ID | Severidad | Tipo | Línea | Descripción | Solución |
|----|-----------|------|-------|-------------|---------|
| CB1 | ... | ... | L## | ... | ... |

---

### ✅ Plan de Pruebas

[Lista de todos los casos de prueba CT-NNN]

---

### 📈 Métricas

- Líneas analizadas: ##
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

- Usa **read_file** para leer el código fuente línea por línea.
- Usa **grep_search** para buscar patrones específicos (ej: \`await\`, \`try\`, \`catch\`, \`return\`, \`throw\`).
- Usa **semantic_search** para encontrar dependencias y usages del servicio.
- Vincula **cada hallazgo a una línea específica** del código.
- Si el servicio tiene más de 200 líneas, analiza el flujo principal primero y luego los métodos auxiliares llamados.
- Guarda el reporte como **reporte-flujo-[nombre-servicio].md** en la raíz del proyecto.
`;
