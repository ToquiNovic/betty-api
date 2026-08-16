# ADR 006: Adopción de Arquitectura Hexagonal y Patrones de Diseño

## Estado
Aceptado

## Contexto
El backend de Betty API debe ser mantenible, testeable y permitir evolucionar componentes tecnológicos (por ejemplo, cambiar proveedores de email, clientes MQTT o bases de datos) sin alterar la lógica de negocio nuclear.

## Decisión
Se estructura el proyecto siguiendo principios de **Clean Code y Arquitectura Hexagonal (Puertos y Adaptadores)**:
- **Domain Layer:** Entidades puras y puertos (interfaces de repositorios y servicios).
- **Application Layer:** Casos de uso y DTOs de transporte.
- **Infrastructure Layer:** Adaptadores para Drizzle ORM, Passport, Dragonfly, EMQX y Resend.
- **Interface Layer:** Controladores REST, Gateway de WebSockets y filtros de excepciones.

### Patrones de Diseño Implementados
- **Repository Pattern:** Desacopla la persistencia de los servicios de dominio.
- **Strategy Pattern:** Estrategias de autenticación intercambiables (JWT, Local, Google OAuth).
- **Observer / Pub-Sub Pattern:** Difusión de eventos de sensores vía Dragonfly y WebSockets.
- **Factory & Singleton:** Gestión de conexiones seguras a bases de datos y brokers.
- **Guard & Interceptor Pattern:** Manejo transversal de autorización, auditoría, transformación y logging.
