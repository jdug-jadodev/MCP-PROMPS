export const analizadorSonarTemplate = `# Análisis de Reportes SonarQube

## Instrucciones
Interpreta advertencias, vulnerabilidades y code smells reportados por SonarQube, explicando su causa raíz, impacto, severidad y ofreciendo soluciones seguras y justificadas.

## Formato de salida
Para cada hallazgo:
- Regla afectada (Sxxxx)
- Severidad y tipo
- Explicación del problema
- Fix sugerido
- Alternativa secundaria
- Checklist de validación QA

**IMPORTANTE:** Genera la solución en el archivo correspondiente según el contexto proporcionado.

######################
#   CONTEXTO USUARIO     #
######################
`;