export const prompts = [
  {
    name: "explicador-codigo-mcp",
    description: "🔍 Análisis automático del proyecto con explicaciones didácticas"
  },
  {
    name: "actualizador-readme-principal",
    description: "📝 Actualiza el README principal del proyecto automáticamente"
  },
  {
    name: "revisor-de-codigo-autonomo-mcp",
    description: "✅ Revisión exhaustiva de código con estándares de calidad"
  },
  {
    name: "detector-de-brechas-de-seguridad-mcp",
    description: "🔒 Análisis de vulnerabilidades según estándares internacionales"
  },
  {
    name: "analizador-de-mensajes-sonar-mcp",
    description: "📊 Interpreta y soluciona reportes de SonarQube"
  },
  {
    name: "plantilla-generar-y-analizar-soluciones-mcp",
    description: "💡 Genera soluciones técnicas detalladas con ONE_SPEC.md"
  }
,
  {
    name: "analizador-de-test-unitarios",
    description: "Analiza el proyecto o recurso para evaluar los test unitarios y analizar su covertura"
  }
,
  {
    name: "limpiar-one-spec",
    description: "limpia el one spec y deja la plantilla lista para un nuevo uso"
  }
,
  {
    name: "refactorizacion-codigo",
    description: "Asiste al desarrollador en la refactorización de componentes sin alterar su funcionalidad ni contratos públicos. Analiza responsabilidades mezcladas, code smells, dependencias y principios SOLID aplicables. Propone una versión refactorizada explicando los cambios, beneficios y métricas antes/después."
  }
,
  {
    name: "solucion-en-one_spec",
    description: "Proporciona una solución completa y detallada usando el ONE_SPEC.md como guía para su futura ejecución"
  },
  {
    name: "correccion-test-unitarios",
    description: "Analiza los test unitarios del proyecto o los que proporciona el usuario y corrige aquellos que estén fallando, proporcionando una explicación detallada de las correcciones realizadas."
  },
  {
    name: "probador-flujos-completos",
    description: "🧪 Analiza estáticamente el flujo completo de un servicio indicado por el usuario (controller HTTP, consumer de cola, handler de evento). Detecta errores, riesgos de seguridad, cuellos de botella y genera un plan de pruebas detallado sin ejecutar ningún código."
  },
  {
    name: "generador-commit-automatico",
    description: "🤖 Genera un commit automático con un mensaje contextual basado en el análisis de los cambios realizados en el proyecto, para eso analiza el archivo #cambios-registro.md. NUNCA hagas push, solo genera el commit localmente."
  },
  {
    name: "crear-script-registro-commit",
    description: "Crea un script para monitorear cambios en el proyecto y registrar esos cambios en un archivo de texto, este script es para uso local y no debe afectar el repositorio remoto por ende se debe agregar a .gitignore"
  }
];