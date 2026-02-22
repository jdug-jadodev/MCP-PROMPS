import { explicadorCodigoTemplate } from './explicador-codigo.template.js';
import { actualizadorReadmeTemplate } from './actualizador-readme.template.js';
import { revisorCodigoTemplate } from './revisor-codigo.template.js';
import { detectorSeguridadTemplate } from './detector-seguridad.template.js';
import { analizadorSonarTemplate } from './analizador-sonar.template.js';
import { generadorSolucionesTemplate } from './generador-soluciones.template.js';

import { analizadorDeTestUnitariosTemplate } from './analizador-de-test-unitarios.template.js';

import { limpiarOneSpecTemplate } from './limpiar-one-spec.template.js';

export const templates = {
  'explicador-codigo-mcp': explicadorCodigoTemplate,
  'actualizador-readme-principal': actualizadorReadmeTemplate,
  'revisor-de-codigo-autonomo-mcp': revisorCodigoTemplate,
  'detector-de-brechas-de-seguridad-mcp': detectorSeguridadTemplate,
  'analizador-de-mensajes-sonar-mcp': analizadorSonarTemplate,
  'plantilla-generar-y-analizar-soluciones-mcp': generadorSolucionesTemplate,
  "analizador-de-test-unitarios": analizadorDeTestUnitariosTemplate,
  "limpiar-one-spec": limpiarOneSpecTemplate
};