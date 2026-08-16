# ADR 008: Adopción de Scalar para Documentación Interactiva de APIs

## Estado
Aceptado

## Contexto
Se requería una interfaz de documentación interactiva de APIs moderna, rápida y con excelente experiencia de usuario (UX) para desarrolladores, investigadores y creadores de proyectos IoT y Metaversos.

## Decisión
Se integra **Scalar** (`@scalar/nestjs-api-reference`) sobre la especificación OpenAPI de NestJS en sustitución de Swagger UI tradicional.

## Justificación
1. **Interfaz Moderna y Rápida:** Diseño elegante con soporte nativo de modo oscuro, navegación fluida y renderizado reactivo sin recarga de página.
2. **Cliente HTTP Interactivo Avanzado:** Generación de snippets de código en múltiples lenguajes (JavaScript Fetch, Python, cURL, etc.) y ejecución de peticiones de prueba con soporte de Bearer Tokens.
3. **Ecosistema OpenAPI:** Totalmente compatible con los decoradores `@ApiTags`, `@ApiOperation`, `@ApiResponse` y `@ApiProperty` de NestJS.
