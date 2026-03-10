export const detectorSeguridadTemplate = `# Análisis de Seguridad — Checkmarx-Aligned

## Objetivo
Analiza automáticamente el proyecto para detectar vulnerabilidades de seguridad 
alineadas con los estándares y presets oficiales de Checkmarx One (SAST, SCA, IaC, Secrets).

---

## Estándares de cobertura requeridos

Analiza cubriendo TODOS los siguientes frameworks (tal como los maneja Checkmarx):

### Código fuente (SAST)
- **OWASP Top 10 2021** — A01 a A10 con sus CWEs mapeados
- **OWASP Mobile Top 10 2024** — Si aplica al proyecto
- **SANS/CWE Top 25** — Debilidades de mayor impacto según MITRE
- **CWE** — Common Weakness Enumeration como identificador base
- **NIST SSDF (SP 800-218)** — Prácticas de desarrollo seguro
- **NIST SP 800-53** — Controles de seguridad (aplica para apps federales/FISMA)
- **PCI DSS** — Si el proyecto maneja datos de tarjetas de crédito
- **HIPAA** — Si el proyecto maneja datos de salud
- **ISO 27001** — Controles generales de seguridad de la información

### Dependencias (SCA)
- **CVE / CVSS v4.0** — Vulnerabilidades en librerías open source (severidad por NVD)
- **Riesgo legal de licencias** — Licencias incompatibles o restrictivas
- **Malware en paquetes** — Paquetes sospechosos o maliciosos en dependencias

### Infraestructura como Código (IaC)
- **Configuraciones inseguras** en Docker, Kubernetes, Terraform, CloudFormation, etc.
- **GDPR / privacidad** — Exposición de datos personales en configs

### Secretos y credenciales (Secrets Detection)
- API keys, tokens, contraseñas hardcodeadas, certificados expuestos

---

## Clasificación de severidad (según Checkmarx)

| Nivel    | Criterio                                                     |
|----------|--------------------------------------------------------------|
| CRÍTICA  | CVSS 9.0–10.0 / Explotable de forma inmediata               |
| ALTA     | CVSS 7.0–8.9 / Impacto significativo                         |
| MEDIA    | CVSS 4.0–6.9 / Requiere condiciones específicas              |
| BAJA     | CVSS 0.1–3.9 / Impacto menor                                 |
| INFO     | Buenas prácticas / sin riesgo directo                        |

Estado de cada hallazgo: To Verify | Confirmed | Urgent | Not Exploitable

---

## Formato de salida

Genera el informe en Markdown con las siguientes secciones:

### 1. Resumen Ejecutivo
- Tecnologías y lenguajes detectados
- Score de seguridad global (0–100)
- Conteo de vulnerabilidades por severidad (Crítica / Alta / Media / Baja / Info)
- Scanners aplicables: SAST / SCA / IaC / Secrets
- Frameworks de compliance evaluados

### 2. Tabla de Vulnerabilidades

| # | Severidad | Scanner | Tipo | Ubicación (archivo:línea) | CWE/CVE | OWASP | Estado | Descripción | Nodo origen → Nodo destino (flujo de datos) | Mejor ubicación de fix | Remediación | Esfuerzo |
|---|-----------|---------|------|--------------------------|---------|-------|--------|-------------|---------------------------------------------|------------------------|-------------|----------|

### 3. Cobertura por Framework de Compliance

Para cada estándar aplicado, indica:
- Categorías evaluadas
- Hallazgos asociados por categoría
- Estado de cumplimiento: Cumple | Parcial | No cumple

### 4. Dependencias con Riesgo (SCA)
- Paquete, versión afectada, CVE, CVSS, versión segura recomendada, riesgo de licencia

### 5. Secretos y Credenciales Expuestas
- Tipo de secreto, archivo, línea, nivel de riesgo, acción requerida

### 6. Hallazgos en IaC
- Recurso mal configurado, archivo, regla violada, remediación

### 7. Recomendaciones Priorizadas

Inmediato (0–7 días) — Críticas y Altas explotables
Corto plazo (8–30 días) — Altas y Medias confirmadas
Mediano plazo (31–90 días) — Medias, Bajas y mejoras estructurales

### 8. Métricas de Remediación
- MTTR estimado por severidad
- Vulnerabilidades recurrentes detectadas (mismo similarityID)
- Deuda técnica de seguridad acumulada

---

## Reglas de análisis

1. Para cada vulnerabilidad SAST, identificar el nodo origen (source) y el nodo destino (sink) del flujo de datos contaminado.
2. Señalar la mejor ubicación de fix (BFL) — el punto óptimo del código donde corregir impacta múltiples vulnerabilidades.
3. Marcar como Recurrente si la misma vulnerabilidad (mismo source/sink/vector) aparece en múltiples escaneos o archivos.
4. Para SCA, usar CVSS v4.0 si está disponible; si no, usar v3.1 del NVD.
5. Incluir evidencia de falsos positivos identificados con su justificación.
6. Evaluar riesgo de cadena de suministro (supply chain) en dependencias de terceros.

---

## IMPORTANTE

- Crea el archivo brechas-seguridad.md en la raíz del proyecto.
- Si ya existe, actualízalo incorporando los nuevos hallazgos y marcando los resueltos.
- Mantén un historial de cambios al final del archivo con fecha, versión y resumen de modificaciones.`;