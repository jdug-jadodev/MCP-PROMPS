export const prompts = [
    {
        name: "mcp-nuevo",
        description: "Analiza el proyecto actual y genera la estructura completa actual.",
        arguments: [
        ],
        template: `Analiza todo el proyecto actual(revisa todos los archivos) y genera un documento markdown con la siguiente información. Debes mostrar:

- Capas:carpetas, modulos, etc (depende de como este configurado el proyecto actual).
- Configuraciones: application.yml o equivalente (si las tiene).
- Flujo: Diagrama de flujo o descripción del flujo de la aplicación (como se comunican las capas entre si).
- Patrones: patrones de diseño, arquitectónicos, etc (si los tiene).
- Tests: unitarios y de integración (si los tiene).
- Observabilidad: logs, métricas, tracing (si las tiene).
- CI/CD: pipeline básico (GitHub Actions o similar) (si lo tiene).
- Documentación inicial: README, API docs (si las tiene).

Además, proporciona:

1. Árbol de directorios propuesto.
2. Ejemplo de archivo de dependencias (pom.xml, package.json, requirements.txt) para el lenguaje que se esta usando actualmente en el proyecto.
3. Stack Tecnológico usado en el proyecto.
4. Información de como se esta implementando cada tecnología y la clase especifica donde inicia esta implementacion.

El resultado debe ser un documento MARKDOWN, con la información que obtengas del analisis del proyecto [el que tengo abierto en el editor].
`
    },{
        name: "explicador-codigo-mcp",
        description: "Explora automáticamente el repositorio/proyecto actual, detecta lenguajes, frameworks, patrones y contexto arquitectónico, y genera explicaciones didácticas adaptadas al nivel técnico solicitado. Incluye feedback (lo bien hecho, mejoras) y referencias útiles para el desarrollador.",
        arguments: [],
        template: `Explora automáticamente el repositorio/proyecto actual, detecta lenguajes, frameworks, patrones y contexto arquitectónico, y genera explicaciones didácticas adaptadas al nivel técnico solicitado. Incluye feedback (lo bien hecho, mejoras) y referencias útiles para el desarrollador.
        El resultado será un Informe Markdown (secciones: contexto detectado, archivos analizados, explicación por nivel, puntos fuertes, áreas de mejora, próximos pasos, recursos).
        
        IMPORTANTE: Una vez generado el informe, utiliza tus herramientas para crear un archivo llamado "informe-exploracion.md" en la raíz del proyecto que tengo abierto actualmente y guarda todo el contenido generado en ese archivo.
        `
    }

];