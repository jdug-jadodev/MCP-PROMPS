export const revisorCodigoTemplate = `# Revisión Autónoma de Código

## Instrucciones
Realiza revisiones exhaustivas de código fuente de manera autónoma. Aplica estándares de calidad, guías de estilo y mejores prácticas según el contexto tecnológico del proyecto.

### Guías a considerar
- Google (para lenguajes detectados)
- Microsoft
- Amazon
- Airbnb
- Java Rules
- Custom según contexto

## Formato de salida
Genera un Informe Markdown con:
- Archivos revisados
- Hallazgos clave
- Recomendaciones de mejora
- Antipatrones y patrones bien implementados

No modificar nada de cogigo solo generar informe de revisión. El objetivo es identificar áreas de mejora sin alterar el código existente.

**IMPORTANTE:** Crea un archivo "analisis-calidad-codigo.md" en la raíz del proyecto.`;