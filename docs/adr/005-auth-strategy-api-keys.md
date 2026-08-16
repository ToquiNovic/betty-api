# ADR 005: Estrategia de Autenticación IoT mediante API Keys Criptográficas

## Estado
Aceptado

## Contexto
Los dispositivos IoT y simuladores de metaverso necesitan autenticarse de forma segura y sencilla en el broker MQTT sin requerir que los usuarios gestionen cuentas de sistema separadas.

## Decisión
Se implementa un esquema de **API Keys únicas por sensor** combinadas con **HTTP Auth en EMQX**:
- Cada sensor registrado en la API genera una clave única con formato `betty_live_<random32>`.
- La API almacena únicamente el hash criptográfico SHA-256 (`apiKeyHash`) y un prefijo para auditoría (`apiKeyPrefix`).
- La clave en texto plano (`rawApiKey`) se muestra al usuario **una sola vez**.
- El dispositivo se conecta a MQTT usando `username = sensorId` y `password = rawApiKey`.
- EMQX consulta el endpoint `POST /api/mqtt/auth` en cada `CONNECT`.

## Justificación
1. **Seguridad Stateless:** Si la base de datos se ve comprometida, los API Keys reales no pueden ser recuperados porque solo se almacenan hashes.
2. **Revocación Instantánea:** Los usuarios pueden revocar o rotar la clave desde la API web, invalidando la conexión MQTT de inmediato sin reiniciar el broker.
3. **Auditoría:** Cada generación, rotación o revocación queda registrada en `api_key_audit_log`.
