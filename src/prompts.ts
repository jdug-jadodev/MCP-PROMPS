export const prompts = [
    {
        name: "explicador-codigo-mcp",
        description: "Explora automáticamente el repositorio/proyecto actual, detecta lenguajes, frameworks, patrones y contexto arquitectónico, y genera explicaciones didácticas adaptadas al nivel técnico solicitado. Incluye feedback (lo bien hecho, mejoras) y referencias útiles para el desarrollador.",
        arguments: [],
        template: `Explora automáticamente el repositorio/proyecto actual, detecta lenguajes, frameworks, patrones y contexto arquitectónico, y genera explicaciones didácticas adaptadas al nivel técnico solicitado. Incluye feedback (lo bien hecho, mejoras) y referencias útiles para el desarrollador.
        El resultado será un Informe Markdown (secciones: contexto detectado, archivos analizados, explicación por nivel, puntos fuertes, áreas de mejora, próximos pasos, recursos).
        
        IMPORTANTE: Una vez generado el informe, utiliza tus herramientas para crear un archivo llamado "informe-exploracion.md" en la raíz del proyecto que tengo abierto actualmente y guarda todo el contenido generado en ese archivo.
        `
    }, {
        name: "actualizador-readme-principal",
        description: "Actualiza automáticamente el README principal del proyecto con la información más reciente.",
        arguments: [],
        template: `Utiliza tus herramientas para actualizar automáticamente el README principal del proyecto con la información más reciente y relevante.
        `
    }, {
        name: "revisor-de-codigo-autonomo-mcp",
        description: "Realiza revisiones exhaustivas de código fuente de manera autónoma, detectando automáticamente cambios recientes o analizando archivos específicos. Aplica estándares de calidad, guías de estilo y mejores prácticas según el contexto tecnológico del proyecto, generando informes claros y accionables.",
        arguments: [],
        template: `Realiza revisiones exhaustivas de código fuente de manera autónoma, detectando automáticamente cambios recientes o analizando archivos específicos. Aplica estándares de calidad, guías de estilo y mejores prácticas según el contexto tecnológico del proyecto, generando informes claros y accionables.
        - Aplica guías de gigantes tecnologicos con muy buenas practicas como Google, Microsoft, Amazon, airbnb, java-rules, custom, etc. dependiendo del lenguaje y framework detectado.
        - Enfoque de revisión: calidad, seguridad y rendimiento, mantenibilidad, default completo.
        - Severidad minima: crítico, alto, medio, bajo.

        El resultado será un Informe Markdown (secciones: archivos revisados, hallazgos clave, recomendaciones de mejora, antipatrones y patrones bien implementados).
         IMPORTANTE: Una vez generado el informe, utiliza tus herramientas para crear un archivo llamado "analisis-calidad-codigo.md" en la raíz del proyecto que tengo abierto actualmente y guarda todo el contenido generado en ese archivo.
        `
    }, {
        name: "detector-de-brechas-de-seguridad-mcp",
        description: "Analiza automáticamente el proyecto para detectar vulnerabilidades de seguridad según estándares internacionales (OWASP Top 10, CWE, ISO 27001, PCI DSS). Detecta lenguaje, arquitectura y contexto del sistema; evalúa riesgos, prioriza vulnerabilidades y sugiere acciones de mitigación con estimación de esfuerzo.",
        arguments: [],
        template: `Analiza automáticamente el proyecto para detectar vulnerabilidades de seguridad según estándares internacionales (OWASP Top 10, CWE, ISO 27001, PCI DSS). Detecta lenguaje, arquitectura y contexto del sistema; evalúa riesgos, prioriza vulnerabilidades y sugiere acciones de mitigación con estimación de esfuerzo.
        Usa el contexto técnico (lenguaje, arquitectura, dependencias) para identificar vulnerabilidades críticas y generar un informe técnico priorizado.
        Informe Markdown con secciones:
        • Resumen ejecutivo (tecnología, score, total de vulnerabilidades por severidad).
        • Tabla de vulnerabilidades (severidad, tipo, ubicación, CWE, descripción, remediación, esfuerzo).
        • Recomendaciones priorizadas (inmediato, corto, mediano plazo).
        
        IMPORTANTE: Una vez generado el informe, utiliza tus herramientas para crear un archivo llamado "brechas-seguridad.md" en la raíz del proyecto que tengo abierto actualmente y guarda todo el contenido generado en ese archivo.
        `
    },{
        name: "analizador-de-mensajes-sonar-mcp",
        description: "Interpreta advertencias, vulnerabilidades y code smells reportados por SonarQube, explicando su causa raíz, impacto, severidad y ofreciendo soluciones seguras y justificadas. Adapta las sugerencias según el lenguaje detectado y el contexto del código, generando un informe técnico comprensible y accionable.",
        arguments: [],
        template: `Interpreta advertencias, vulnerabilidades y code smells reportados por SonarQube, explicando su causa raíz, impacto, severidad y ofreciendo soluciones seguras y justificadas. Adapta las sugerencias según el lenguaje detectado y el contexto del código, generando un informe técnico comprensible y accionable.
        naliza los reportes de SonarQube, identifica la regla afectada (Sxxxx), evalúa severidad y tipo de hallazgo, explica el problema y genera un fix sugerido junto a una alternativa secundaria y un checklist de validación QA.

        El resultado será la solucion de las advertencias de sonar, en el archivo que obtengas como contexto,(puede ser uno o mas archivos, incluso todo el proyecto, eso depende del usuario, default archivo actual abierto).
        `
    },{
        name: "plantilla-generar-y-analizar-soluciones-mcp",
        description: "Genera soluciones técnicas a problemas de desarrollo, explicando su funcionamiento, ventajas, desventajas y casos de uso recomendados. Analiza la viabilidad de cada solución en el contexto del proyecto, considerando factores como rendimiento, seguridad, mantenibilidad y escalabilidad, y proporciona una recomendación fundamentada.",
        arguments: [],
        template: `
            Genera soluciones técnicas a problemas de desarrollo, explicando su funcionamiento, ventajas, desventajas y casos de uso recomendados. Analiza la viabilidad de cada solución en el contexto del proyecto, considerando factores como rendimiento, seguridad, mantenibilidad y escalabilidad, y proporciona una recomendación fundamentada.
            Todo esto según el contexto que introduzca el usuario, que puede ser un problema específico, un requerimiento o una mejora deseada. El resultado será una solución técnica detallada y adaptada al contexto del proyecto, que el usuario podrá implementar para resolver su problema o mejorar su sistema.
            Esta solución se generará en un formato markdown en un archivo llamado ONE_SPEC.md con las siguientes secciones:

            # One Spec (Root Spec)
 
            ## Objetivo
            
            
            ## Alcance / No alcance
            
            
            ## Definiciones (lenguaje de dominio)
            
            
            ## Principios / Reglas no negociables
            
            ## Límites
            
            ## Eventos y estados (visión raíz)
            
            ## Criterios de aceptación (root)
            
            ## Trazabilidad

            Este archivo será la guía para la ejecución de la solución propuesta por el agente de IA, por ende, debe estar bien estructurada, ser lo mas clara posible y si es necesario generar mas pasos para evitar fallos y que la solución sea optima, eficiente, mantenible y sostenible.
            También debe ser lo suficientemente detallada para que cualquier desarrollador pueda entenderla e implementarla sin necesidad de aclaraciones adicionales.
            Adicional tendrás en cuenta cualquier archivo de analisis de codigo o instructions para que tengas un mejor panorama del proyecto y puedas generar una solución mas adaptada al contexto del mismo.

            IMPORTANTE: Una vez generado el informe, utiliza tus herramientas para crear un archivo llamado "ONE_SPEC.md" en la raíz del proyecto que tengo abierto actualmente y guarda todo el contenido generado en ese archivo.
        `
    }
]; 