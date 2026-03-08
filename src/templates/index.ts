import { explicadorCodigoTemplate } from './explicador-codigo.template.js';
import { actualizadorReadmeTemplate } from './actualizador-readme.template.js';
import { revisorCodigoTemplate } from './revisor-codigo.template.js';
import { detectorSeguridadTemplate } from './detector-seguridad.template.js';
import { analizadorSonarTemplate } from './analizador-sonar.template.js';
import { generadorSolucionesTemplate } from './generador-soluciones.template.js';
import { analizadorDeTestUnitariosTemplate } from './analizador-de-test-unitarios.template.js';
import { limpiarOneSpecTemplate } from './limpiar-one-spec.template.js';
import { refactorizacionCodigoTemplate } from './refactorizacion-codigo.template.js';
import { solucionEnOneTemplate } from './solucion-en-one_spec.js';
import { correccionTestUnitariosTemplate } from './correccion-test-unitarios.js';
import { probadorFlujosCompletosTemplate } from './probador-de-flujos.js';
import { generadorTestUnitariosTemplate } from './generador-test-unitarios.js';
import { generadorCommitAutomaticoTemplate } from './generador-commit-automatico.js';
import { generadorScriptRegistroCommitTemplate } from './crear-script-registro-commit.js';
import { generadorPlanTrabajo } from './generador-plan-trabajo.js';

export const templates = {
  'explicador-codigo-mcp': explicadorCodigoTemplate,
  'actualizador-readme-principal': actualizadorReadmeTemplate,
  'revisor-de-codigo-autonomo-mcp': revisorCodigoTemplate,
  'detector-de-brechas-de-seguridad-mcp': detectorSeguridadTemplate,
  'analizador-de-mensajes-sonar-mcp': analizadorSonarTemplate,
  'plantilla-generar-y-analizar-soluciones-mcp': generadorSolucionesTemplate,
  "analizador-de-test-unitarios": analizadorDeTestUnitariosTemplate,
  "limpiar-one-spec": limpiarOneSpecTemplate,
  "refactorizacion-codigo": refactorizacionCodigoTemplate,
  "solucion-en-one_spec": solucionEnOneTemplate,
  "correccion-test-unitarios": correccionTestUnitariosTemplate,
  "probador-flujos-completos": probadorFlujosCompletosTemplate,
  "generador-test-unitarios": generadorTestUnitariosTemplate,
  "generador-commit-automatico": generadorCommitAutomaticoTemplate,
  "crear-script-registro-commit": generadorScriptRegistroCommitTemplate,
  "generador-plan-trabajo": generadorPlanTrabajo,
};