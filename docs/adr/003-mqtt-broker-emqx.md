# ADR 003: Selección de EMQX como Broker MQTT Autohosteado

## Estado
Aceptado

## Contexto
El sistema necesita recibir lecturas de sensores IoT y gemelos digitales en tiempo real vía MQTT. Se requería decidir entre un broker liviano tradicional (Mosquitto) y un broker empresarial moderno y extensible (EMQX).

## Decisión
Se elige **EMQX 5.x Open Source** desplegado en Docker.

## Justificación
1. **HTTP Authentication Nativo:** EMQX permite delegar la autenticación de cada conexión MQTT directamente a Betty API mediante un webhook HTTP simple (`POST /api/mqtt/auth`).
2. **Rule Engine y Webhooks:** Permite reenviar los mensajes entrantes hacia Betty API (`POST /api/mqtt/webhook`) de forma eficiente sin necesidad de dependencias intermedias complejas.
3. **Dashboard Web Integrado:** Interfaz web visual (`http://localhost:18083`) para monitoreo de conexiones, throughput y gestión de reglas.
4. **Soporte de Clustering:** Capacidad de escalado horizontal si la comunidad universitaria crece.

## Consecuencias
- Mayor consumo de memoria base comparado con Mosquitto, pero con capacidades muy superiores de integración y administración.
