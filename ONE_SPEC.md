# One Spec (Root Spec)

## Objetivo
Agregar una sección explícita de **CONTEXTO USUARIO** al final de cada template de prompt del servidor MCP, permitiendo que el usuario enriquezca dinámicamente cada prompt con información adicional relevante (archivos adjuntos, fragmentos de código, restricciones de negocio, datos de entorno, etc.) sin alterar la instrucción base del prompt.

## Alcance / No alcance

**Alcance:**
- Agregar el bloque `CONTEXTO USUARIO` al final del contenido de cada uno de los 7 templates existentes.
- El bloque actúa como una zona de extensión libre: el usuario pega allí archivos, fragmentos de código, URLs, restricciones o cualquier dato adicional que el modelo necesite para mejorar la respuesta.
- No se modifica ninguna otra parte del template (instrucciones, formato de salida, reglas IMPORTANTE).

**No alcance:**
- Creación de lógica de parsing o validación del contenido ingresado en el campo CONTEXTO USUARIO.
- Persistencia dinámica del contexto proporcionado por el usuario.
- Modificación de la arquitectura del servidor MCP (`index.ts`, `prompts.ts`).

## Definiciones (lenguaje de dominio)
- **Prompt:** Instrucción o conjunto de instrucciones diseñadas para guiar a un modelo de IA en la realización de una tarea específica.
- **Template (Plantilla):** El contenido en formato Markdown que define la estructura y las instrucciones detalladas del prompt.
- **CONTEXTO USUARIO:** Sección libre al final de cada template donde el usuario proporciona información adicional y específica de su situación (archivos, código, restricciones, datos de entorno) para personalizar la respuesta del modelo.
- **MCP (Model Context Protocol):** Protocolo estándar para la comunicación entre asistentes de IA y fuentes de contexto/herramientas locales.
- **Campo de extensión:** Área del template reservada exclusivamente para la entrada del usuario, separada de las instrucciones base del prompt.

## Principios / Reglas no negociables
- **No invasividad:** El bloque `CONTEXTO USUARIO` se agrega únicamente al final del template, nunca en medio de las instrucciones existentes.
- **Uniformidad:** El formato del bloque es idéntico en los 7 templates (`######################\n#   CONTEXTO USUARIO     #\n######################`).
- **Claridad:** El nombre del bloque debe ser autoexplicativo para el usuario final, sin requerir documentación adicional.
- **Compatibilidad:** La adición no debe romper la carga, listado ni ejecución de los prompts en el servidor MCP.

## Límites
- La sección `CONTEXTO USUARIO` no tiene validación de contenido; es responsabilidad del usuario proporcionar información relevante y coherente con el prompt.
- El servidor MCP no procesa ni estructura el contenido del campo; lo pasa tal cual al modelo de IA.
- Los 7 templates afectados son: `actualizador-readme`, `analizador-de-test-unitarios`, `analizador-sonar`, `detector-seguridad`, `explicador-codigo`, `generador-soluciones`, `revisor-codigo`.

## Eventos y estados (visión raíz)

**Estados:**
- `Template base`: El template contiene únicamente sus instrucciones originales.
- `Template extendido`: El template incluye el bloque `CONTEXTO USUARIO` al final.
- `Prompt en uso`: El usuario ha llenado el bloque `CONTEXTO USUARIO` con datos específicos y lo envía al modelo.

**Eventos:**
- `Edición de template`: Se agrega el bloque `CONTEXTO USUARIO` al final del template TypeScript.
- `Uso del prompt`: El usuario copia/activa el prompt, llena el bloque con su contexto y lo ejecuta en el chat.

## Criterios de aceptación (root)
1. **Presencia del bloque:** Los 7 archivos `.template.ts` contienen el bloque `CONTEXTO USUARIO` al final de su contenido.
2. **Formato consistente:** El bloque sigue exactamente el formato de 3 líneas definido (`######################`, `#   CONTEXTO USUARIO     #`, `######################`).
3. **Sin regresiones:** El servidor MCP compila (`npm run build`) y lista correctamente los 7 prompts sin errores.
4. **No modificación de instrucciones base:** El contenido original de cada template permanece intacto, sin alteraciones.
5. **Usabilidad:** Al activar cualquiera de los prompts, el bloque `CONTEXTO USUARIO` es visible y claramente identificable como zona de entrada del usuario.

## Trazabilidad
- **Requerimiento de origen:** "A cada prompt agrégale un campo en el template de `CONTEXTO USUARIO` así explícitamente para que el usuario pueda mejorar aún más los prompts de acuerdo a sus necesidades, como pasar archivos o más datos relevantes."
- **Archivos afectados:** `src/templates/actualizador-readme.template.ts`, `src/templates/analizador-de-test-unitarios.template.ts`, `src/templates/analizador-sonar.template.ts`, `src/templates/detector-seguridad.template.ts`, `src/templates/explicador-codigo.template.ts`, `src/templates/generador-soluciones.template.ts`, `src/templates/revisor-codigo.template.ts`.
- **Impacto:** Mínimo — solo se agrega contenido al final de cada string de template. No hay cambios estructurales ni de lógica en el servidor.

---

## Solución Técnica Propuesta

### Funcionamiento
Cada archivo `.template.ts` exporta una constante de tipo `string` (template literal). Se agrega al final del contenido de cada template el siguiente bloque, antes del cierre del template literal:

\`\`\`
######################
#   CONTEXTO USUARIO     #
######################
\`\`\`

Este bloque actúa como separador visual y zona de extensión libre. El usuario puede agregar debajo de él cualquier información adicional que el modelo necesite: rutas de archivos, fragmentos de código, requisitos de negocio, restricciones de entorno, etc.

### Ventajas
- **Cero fricción de adopción:** El bloque es autoexplicativo y no requiere documentación adicional.
- **Flexibilidad máxima:** El usuario puede pegar cualquier tipo de contenido sin restricciones de formato.
- **Compatibilidad total:** No rompe ninguna parte del servidor MCP ni requiere recompilación especial.

### Desventajas / Riesgos
- **Sin validación:** El modelo recibe el contexto tal cual; si el usuario proporciona información irrelevante o malformada, puede degradar la calidad de la respuesta.
- **Dependencia del usuario:** La utilidad del campo depende completamente de que el usuario lo rellene con información pertinente.
