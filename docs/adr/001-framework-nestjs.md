# ADR 001: Adopción del Framework NestJS

## Estado
Aceptado

## Contexto
El proyecto Betty API requiere construir una plataforma PaaS orientada a IoT y Metaversos para comunidades universitarias. Se necesita una base sólida que soporte escalabilidad, tipado estático con TypeScript, inyección de dependencias, soporte para microservicios y protocolos en tiempo real (WebSockets y MQTT).

## Decisión
Se decide utilizar **NestJS 11** como framework principal backend en TypeScript.

## Consecuencias

### Positivas
- **Estructura Arquitectónica Robusta:** Sistema modular nativo, inyección de dependencias (DI) e integración con Clean Architecture.
- **Ecosistema Completo:** Módulos oficiales para JWT, Passport, WebSockets (Socket.IO), Swagger OpenAPI y microservicios.
- **Mantenibilidad:** Código fuertemente tipado con decoradores que reducen boilerplate.

### Negativas
- Curva de aprendizaje inicial superior comparada con micro-frameworks como Express o Fastify puro.
