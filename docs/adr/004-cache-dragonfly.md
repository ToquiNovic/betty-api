# ADR 004: Uso de Dragonfly como Motor de Cache y Pub/Sub

## Estado
Aceptado

## Contexto
Se requiere un sistema de caché en memoria de alto rendimiento para:
- Invalidación y aceleración de consultas de datos de sensores y tableros.
- Almacenamiento temporal de refresh tokens revocables.
- Canal de publicación/suscripción (Pub/Sub) para distribuir eventos de sensores hacia el WebSocket Gateway.

## Decisión
Se utiliza **Dragonfly** autohosteado como reemplazo drop-in de Redis.

## Justificación
1. **Arquitectura Multihilo:** A diferencia de Redis (monohilo tradicional), Dragonfly aprovecha todos los núcleos de CPU del servidor, logrando hasta 25x mayor throughput y menor latencia.
2. **100% Compatible con el Protocolo RESP:** No requiere clientes especiales; utiliza la librería estándar `ioredis`.
3. **Eficiencia en Memoria:** Mayor densidad de datos con menor consumo de RAM por clave almacenada.

## Consecuencias
- Despliegue simple mediante Docker con soporte para persistencia RDB periódica.
