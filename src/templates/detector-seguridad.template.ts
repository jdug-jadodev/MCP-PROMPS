export const detectorSeguridadTemplate = `# Análisis de Seguridad

## Instrucciones
Analiza automáticamente el proyecto para detectar vulnerabilidades de seguridad según estándares internacionales (OWASP Top 10, CWE, ISO 27001, PCI DSS).

## Formato de salida
Genera informe Markdown con:
- Resumen ejecutivo (tecnología, score, total de vulnerabilidades por severidad)
- Tabla de vulnerabilidades (severidad, tipo, ubicación, CWE, descripción, remediación, esfuerzo)
- Recomendaciones priorizadas (inmediato, corto, mediano plazo)

**IMPORTANTE:** Crea un archivo "brechas-seguridad.md" en la raíz del proyecto, si ya existe lo actualizas con la nueva informacion.`;