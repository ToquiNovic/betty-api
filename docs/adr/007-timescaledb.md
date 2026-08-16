# ADR 007: Particionamiento y Series Temporales con TimescaleDB

## Estado
Aceptado

## Contexto
En un PaaS IoT con decenas o cientos de sensores publicando telemetría cada pocos segundos, el volumen de filas en la tabla auxiliar `sensor_data` crece rápidamente. Las tablas uniparticionadas tradicionales sufren degradación de rendimiento en lecturas de rangos de fechas e índices B-Tree masivos.

## Decisión
Se utiliza la imagen oficial **TimescaleDB sobre PostgreSQL 16**, configurando la tabla `sensor_data` como una **Hypertable** particionada por tiempo (`recorded_at`).

## Justificación
1. **Rendimiento de Ingesta Sostenido:** Mantiene velocidades de escritura constantes incluso con cientos de millones de registros.
2. **Consultas Temporales Optimizadas:** Exclusión automática de particiones al consultar rangos específicos de fechas (`startDate`, `endDate`).
3. **Políticas de Retención y Compresión:** Facilidad para habilitar compresión nativa de datos históricos en el futuro.
4. **Transparencia SQL:** Permite el uso estándar de Drizzle ORM y sintaxis PostgreSQL relacional sin requerir una base de datos de series temporales separada.
