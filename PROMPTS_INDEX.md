# Índice y Prompts del proyecto mcp-prompts-server

## Análisis detallado del proyecto

Resumen: este repositorio implementa un servidor de prompts (mcp-prompts-server) diseñado para exponer y ejecutar conjuntos de prompts útiles para automatizar tareas de análisis, generación de documentación, revisión de código y soporte al desarrollo. El archivo `src/prompts.ts` declara los prompts disponibles; las plantillas de comportamiento están en `src/templates/`.

Estructura clave:
- `src/prompts.ts`: lista canonical de prompts disponibles y sus descripciones.
- `src/templates/`: plantillas que contienen instrucciones y formato de salida esperados para cada prompt (ej.: `explicador-codigo.template.ts`, `detector-seguridad.template.ts`, `generador-soluciones.template.ts`).
- `src/index.ts`: cargador/servidor que expone endpoints para listar y obtener prompts dinámicamente.
- `ONE_SPEC.md`, `README.md`, `informe-exploracion.md` (archivos generados por algunos prompts cuando se ejecutan).

Público objetivo: desarrolladores y equipos de aseguramiento de calidad que quieren automatizar análisis estático, generación de especificaciones, revisiones y soporte para pruebas y documentación.

Limitaciones observadas: los templates piden crear archivos en la raíz del proyecto (por ejemplo `ONE_SPEC.md`, `brechas-seguridad.md`), lo cual es apropiado para escenarios locales con permisos; al exponer este comportamiento en un servidor, es importante controlar permisos y confirmar acciones que modifican el repo.

---

## Índice de prompts (en este documento)

1. explicador-codigo-mcp — Análisis automático y explicaciones del proyecto
2. detector-de-brechas-de-seguridad-mcp — Auditoría de seguridad (SAST/SCA/IaC/Secrets)
3. revisor-de-codigo-autonomo-mcp — Revisión de calidad y recomendaciones
4. analizador-de-test-unitarios — Cobertura y mejoras en tests unitarios
5. generador-test-unitarios — Generación y corrección de tests
6. generador-soluciones (plantilla-generar-y-analizar-soluciones-mcp) — Crear ONE_SPEC.md con solución técnica
7. refactorizacion-codigo — Propuesta de refactorización segura y explicada
8. probador-flujos-completos — Análisis estático de flujos y plan de pruebas
9. generador-plan-trabajo — Plan de trabajo por fases y tareas pequeñas
10. generador-commit-automatico — Generación de mensajes de commit contextuales
11. crear-script-registro-commit — Script para registrar cambios en `#cambios-registro.md`
12. actualizador-readme-principal — Actualiza el `README.md` principal
13. limpiar-one-spec — Limpia y prepara `ONE_SPEC.md` plantilla
14. solucion-en-one_spec — Desarrolla solución completa según `ONE_SPEC.md`

---

## Prompts desarrollados

Nota: cada prompt incluye —Propósito, Instrucciones detalladas, Entradas requeridas, Formato de salida y Restricciones— para facilitar su uso en demos o ejecuciones controladas.

### 1) explicador-codigo-mcp
- Propósito: Generar un informe didáctico y ejecutable que describa la estructura, decisiones arquitectónicas, y áreas de mejora del proyecto.
- Instrucciones:
  1. Explora el repositorio, detecta lenguajes, frameworks, dependencias y patrones arquitectónicos.
  2. Identifica archivos principales y módulos relevantes.
  3. Analiza responsabilidades, acoplamiento, y complejidad en módulos clave.
  4. Genera recomendaciones prácticas y pasos siguientes priorizados.
- Entradas: ruta del proyecto (si aplica) o contexto adicional del usuario.
- Formato de salida: archivo `informe-exploracion.md` con secciones: Contexto detectado; Archivos analizados; Explicación detallada; Puntos fuertes; Áreas de mejora; Próximos pasos; Recursos útiles.
- Restricciones: no modificar código; solo crear/actualizar `informe-exploracion.md`.

### 2) detector-de-brechas-de-seguridad-mcp
- Propósito: Producir un informe exhaustivo de vulnerabilidades SAST/SCA/IaC/Secrets, priorizado y accionable.
- Instrucciones:
  1. Analiza código fuente y dependencias para mapear CVE/CWE/OWASP cuando aplique.
  2. Inspecciona IaC y configuraciones (Docker, Kubernetes, Terraform) para malas prácticas.
  3. Detecta secretos hardcodeados.
  4. Prioriza hallazgos con criterios CRÍTICA/ALTA/MEDIA/BAJA/INFO y provee remediaciones.
- Entradas: contexto del proyecto; lista de lenguajes/entornos (opcional).
- Formato de salida: `brechas-seguridad.md` con Resumen Ejecutivo, Tabla de Vulnerabilidades, Recomendaciones Priorizadas y Métricas de Remediación.
- Restricciones: no ejecutar scanners externos sin confirmar; reportar evidencias y rutas de archivo:línea.

### 3) revisor-de-codigo-autonomo-mcp
- Propósito: Generar un informe de calidad y estilo aplicando guías (Google, Microsoft, Airbnb, reglas por lenguaje).
- Instrucciones:
  1. Revisar archivos relevantes, listar hallazgos y proponer cambios estructurados.
  2. Identificar antipatrons, problemas de diseño y mejoras en pruebas.
  3. Proponer ejemplos concretos de refactor y métricas de mejora.
- Formato de salida: `analisis-calidad-codigo.md` con Archivos revisados, Hallazgos clave, Recomendaciones y Prioridad.
- Restricciones: no aplicar cambios automáticos; solo recomendaciones.

### 4) analizador-de-test-unitarios
- Propósito: Evaluar la cobertura actual y proponer medidas concretas para elevar cobertura (>85% objetivo cuando sea razonable).
- Instrucciones:
  1. Detectar framework de testing y estructura de tests.
  2. Calcular métricas de cobertura por módulo/clase/función.
  3. Proponer tests faltantes y prioridades.
- Salida: Informe Markdown con % cobertura global y por archivo, lista de tests faltantes y fragmentos de ejemplo.

### 5) generador-test-unitarios
- Propósito: Generar o corregir tests unitarios según el framework y el lenguaje del proyecto.
- Instrucciones:
  1. Si no hay info del framework, preguntar al usuario.
  2. Generar tests que cubran casos nominales, límites y errores esperados.
  3. Si existen tests fallando, identificar causas y proponer correcciones explicadas.
- Salida: archivos de test listos para ejecutar y un informe de cambios propuestos.

### 6) generador-soluciones (plantilla-generar-y-analizar-soluciones-mcp)
- Propósito: Crear un `ONE_SPEC.md` que describa una solución técnica completa.
- Instrucciones:
  1. Redactar objetivo, alcance, definiciones de dominio, principios y criterios de aceptación.
  2. Incluir eventos/estados, trazabilidad y límites claros.
  3. Proveer pasos de implementación y riesgos.
- Salida: `ONE_SPEC.md` en la raíz con la estructura requerida.

### 7) refactorizacion-codigo
- Propósito: Proponer una refactorización que preserve contratos públicos y mejore calidad.
- Instrucciones:
  1. Identificar responsabilidades mezcladas, dependencias fuertes y code smells.
  2. Proponer reorganización de módulos, extracción de funciones y simplificación de interfaces.
  3. Mostrar ejemplos de antes/después y medir beneficios esperados.
- Salida: Informe y parches sugeridos (diffs) o snippets de código.

### 8) probador-flujos-completos
- Propósito: Inspeccionar flujos (controller HTTP, consumers, handlers) y generar un plan de pruebas estáticas y casos de prueba.
- Instrucciones: identificar puntos débiles, rutas críticas, condiciones de error y generar un conjunto priorizado de pruebas manuales/autómatas.

### 9) generador-plan-trabajo
- Propósito: Dividir un objetivo o problema en fases y tareas pequeñas con estimaciones y dependencias.
- Instrucciones: detectar contexto existente y adaptar el plan a módulos ya implementados o, si es nuevo, definir estructura mínima viable y roadmap.
- Salida: Plan en Markdown listo para asignación de tareas.

### 10) generador-commit-automatico
- Propósito: Sugerir un mensaje de commit claro y contextual basado en `#cambios-registro.md`.
- Instrucciones: analizar entradas en `#cambios-registro.md`, generar un mensaje único y descriptivo.
- Restricciones: el template advierte nunca hacer push; si se automatiza git, confirmar antes de ejecutar comandos que modifiquen el repositorio.

### 11) crear-script-registro-commit
- Propósito: Proveer un script local que registre cambios en un archivo de texto y que pueda estar en `.gitignore`.
- Instrucciones: generar script portable (node/ts/bash) con instrucciones de instalación y uso.

### 12) actualizador-readme-principal
- Propósito: Actualizar `README.md` con información clara sobre instalación, uso y estructura del proyecto.
- Instrucciones: extraer datos del repo (dependencias, scripts, arquitectura) y redactar secciones recomendadas.

### 13) limpiar-one-spec
- Propósito: Normalizar y limpiar plantillas `ONE_SPEC.md` para nuevo uso, eliminando ejemplos y dejando campos a completar.

### 14) solucion-en-one_spec
- Propósito: Producir una implementación conceptual completa acorde a `ONE_SPEC.md` para presentación o ejecución futura.

---

## Recomendaciones para la exposición
- Mostrar el archivo `src/prompts.ts` como índice canonical de capabilities.
- Presentar 3 demos en vivo: `explicador-codigo-mcp`, `detector-de-brechas-de-seguridad-mcp` y `generador-soluciones` (crear `ONE_SPEC.md`).
- Aclarar permisos: prompts que crean archivos o ejecutan `git` requieren confirmación humana.

---

Archivo generado: [PROMPTS_INDEX.md](PROMPTS_INDEX.md)

¿Quieres que aplique formato adicional (tabla de contenido interactiva) o que genere versiones en inglés para la presentación internacional?
