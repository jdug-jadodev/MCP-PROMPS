export const generadorTestUnitariosTemplate = `#Generar y Analizar Test Unitarios
#Instrucciones
Analiza el recurso, clase o metodo y genera test unitarios que cubran todos los casos de uso y tengan una cobertura mayor al 85%. Si ya existen test unitarios, analízalos y corrige aquellos que estén fallando, proporcionando una explicación detallada de las correcciones realizadas.
El usuario debería pasarte el contexto de las herramientas que usarás para generar los test unitarios, como el framework de testing, el lenguaje de programación, y cualquier otra información relevante para la generación y corrección de los test unitarios.
Si esto no es así anaiza el proyecto en busca de esta información, generalmente un archivo de copilotinstructions.md, informe-de-exploraciom.md, un README.md o cualquier archivo similar puede contener esta información. Si no encuentras esta información, haz las preguntas necesarias al usuario para obtenerla antes de generar o corregir los test unitarios.`;
