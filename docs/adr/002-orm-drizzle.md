# ADR 002: Elección de Drizzle ORM sobre Prisma y TypeORM

## Estado
Aceptado

## Contexto
En un entorno PaaS IoT con alta frecuencia de inserciones y consultas analíticas sobre series temporales, el rendimiento y la sobrecarga de la capa de persistencia son factores críticos.

## Decisión
Se elige **Drizzle ORM** en lugar de Prisma o TypeORM.

## Justificación
1. **Rendimiento Máximo y Cero Sobrecarga:** Drizzle actúa como un wrapper delgado sobre SQL nativo con un bundle size mínimo (~12 KB) y sin motores binarios adicionales.
2. **SQL-First:** Facilita la creación de queries complejas para agregaciones temporales y compatibilidad con extensiones como TimescaleDB.
3. **Type Safety Completo:** Inferencia estricta de tipos de TypeScript tanto para inserts como para selects directos.

## Consecuencias
- Requiere escribir esquemas explícitos en TypeScript.
- Menor abstracción de alto nivel comparado con Prisma, pero control absoluto de las consultas generadas.
