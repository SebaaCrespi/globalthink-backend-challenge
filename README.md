# globalthink-backend-challenge

API REST para gestión de usuarios con perfiles y autenticación JWT, construida con **NestJS** y **MongoDB**.

> **Estado del proyecto:** 🚧 En desarrollo activo. Este README se actualizará progresivamente con cada sprint hasta la entrega final.

---

## 🎯 Objetivo

Implementar una API REST robusta y modular que cumpla con los requerimientos del challenge:

- CRUD completo de usuarios con perfil asociado.
- Listado con filtros por texto, paginación y ordenamiento dinámico.
- Módulo de autenticación con JWT.
- Validación estricta de inputs, manejo global de errores y documentación viva con Swagger.
- Cobertura de pruebas unitarias sobre la lógica de negocio.
- Infraestructura reproducible con Docker.

---

## 🧱 Stack Técnico

| Capa | Tecnología |
|------|-----------|
| Runtime | Node.js 24 LTS |
| Framework | NestJS 10+ (TypeScript estricto) |
| Base de datos | MongoDB |
| ODM | Mongoose vía `@nestjs/mongoose` |
| Autenticación | JWT + Passport (`@nestjs/jwt`, `@nestjs/passport`) |
| Validación | `class-validator` + `class-transformer` |
| Documentación | Swagger (`@nestjs/swagger`) |
| Testing | Jest + Supertest + `mongodb-memory-server` |
| Gestor de paquetes | Yarn |
| Contenedorización | Docker (multi-stage) + Docker Compose |

---

## 🏛️ Decisiones de Arquitectura

Las decisiones técnicas de este proyecto se rigen por dos principios:

1. **KISS** (Keep It Simple, Stupid) — evitar abstracciones prematuras.
2. **YAGNI** (You Aren't Gonna Need It) — no construir flexibilidad para escenarios hipotéticos.

A continuación, las decisiones más relevantes y su justificación:

### 1. Estructura modular por dominio (`src/modules/`)

Cada feature funcional vive en su propio módulo (`users`, `auth`), con capas internas claras:

- **Controller** → recibe HTTP, valida vía DTOs, expone Swagger. No contiene lógica de negocio.
- **Service** → orquesta reglas de negocio. Es donde se concentra la lógica testeable.
- **Schema** → modelo de persistencia Mongoose.
- **DTOs** → contratos de entrada/salida con validación declarativa.

### 2. Perfil embebido como subdocumento Mongoose

La relación `Usuario ↔ Perfil` es **1:1** y se consultan siempre juntos. Modelarlos como colecciones separadas y resolver con `populate` o `$lookup` introduce overhead de queries y latencia sin beneficio funcional.

**Decisión:** `Profile` se define como `@Schema({ _id: false })` independiente y se embebe en `User` vía `@Prop({ type: ProfileSchema })`. Esto respeta la regla de oro de modelado NoSQL — *"data that is accessed together should be stored together"* — y mantiene los schemas modulares y testeables por separado.

### 3. Inyección directa de Mongoose Models (sin patrón Repositorio)

Se evaluó introducir una capa de abstracción `IUserRepository` + `MongooseUserRepository` para desacoplar la lógica de negocio del ODM. **Se descartó** por las siguientes razones:

- El stack está fijo: el challenge exige MongoDB. La probabilidad de cambio de proveedor es nula en el horizonte del proyecto.
- Mongoose ya es una capa de abstracción sobre el driver nativo. Envolverla agrega indirección sin valor real.
- El patrón idiomático de NestJS con `@InjectModel()` es ampliamente reconocido y mantenible.

Esta decisión es **consciente**: introducir el patrón cuando no se justifica viola YAGNI y agrega complejidad cognitiva al code review. Si en el futuro la lógica de persistencia se vuelve compleja o se prevén múltiples backends, refactorizar es trivial.

### 4. Validación de entorno tipada al boot

Las variables de entorno se validan al arrancar la aplicación mediante `@nestjs/config` con un schema explícito. Si falta alguna o tiene tipo incorrecto, **la aplicación falla rápido** (fail-fast) en lugar de romper en runtime de forma impredecible.

### 5. Manejo global de errores

Un `HttpExceptionFilter` global captura todas las excepciones y devuelve un formato JSON estandarizado:

```json
{
  "statusCode": 404,
  "timestamp": "2026-05-27T14:00:00.000Z",
  "path": "/users/abc123",
  "message": "User not found"
}
```

Esto previene la fuga de detalles internos (errores crudos de Mongo, stack traces) hacia el cliente.

### 6. Default-deny en autenticación

Todos los endpoints están protegidos por defecto mediante un `JwtAuthGuard` global. Los endpoints públicos (registro, login) se marcan explícitamente con un decorador `@Public()`. Este enfoque de *default-deny* es más seguro que el opuesto: olvidar proteger un endpoint es imposible, mientras que olvidar exponer uno es inmediatamente visible.

---

## 🤖 Pipeline de Desarrollo Asistido por IA

Este proyecto fue desarrollado mediante un pipeline estructurado de co-trabajo con IA, optimizando el tiempo de entrega sin sacrificar calidad:

| Fase | Herramienta | Rol |
|------|-------------|-----|
| Planificación y revisión arquitectónica | Claude (chat) | Diseño conceptual, análisis crítico, code review |
| Generación de boilerplate | Claude Code (CLI local) | DTOs, schemas, stubs de tests, exception filters |
| Implementación de lógica de negocio | Desarrollador (manual) | Decisiones de dominio, validación de outputs |
| Documentación | Claude (chat) | Estructura del README, justificación técnica |

La sección final del README ampliará esta tabla con métricas concretas del proceso (sprints, tareas automatizadas, intervenciones manuales).

---

## 🚀 Instalación y Ejecución

> ⚠️ Esta sección se completará al final del desarrollo con instrucciones definitivas. Lo que sigue es una guía preliminar.

### Prerrequisitos

- Node.js 24+ (ver `.nvmrc`)
- Yarn
- Docker y Docker Compose (opcional, para ejecución contenedorizada)

### Ejecución local con Yarn

```bash
# 1. Clonar el repositorio
git clone <repo-url>
cd globalthink-backend-challenge

# 2. Instalar dependencias
yarn install

# 3. Configurar variables de entorno
cp .env.example .env
# Editar .env con valores reales (en especial JWT_SECRET)

# 4. Levantar MongoDB localmente (o usar uno existente)
# El docker-compose.yml estará disponible al cierre del Sprint 4

# 5. Iniciar la aplicación en modo desarrollo
yarn start:dev
```

La API quedará disponible en `http://localhost:3000` y la documentación Swagger en `http://localhost:3000/docs`.

### Ejecución con Docker Compose

```bash
# (Disponible al cierre del Sprint 4)
docker compose up --build
```

---

## 🧪 Testing

```bash
# Pruebas unitarias
yarn test

# Pruebas unitarias en modo watch
yarn test:watch

# Pruebas unitarias con cobertura
yarn test:cov

# Pruebas e2e
yarn test:e2e
```

**Objetivo de cobertura:** ≥80% en los services (lógica de negocio).

---

## 📂 Estructura del Proyecto

```
src/
├── main.ts                          # Bootstrap de la aplicación
├── app.module.ts                    # Módulo raíz
├── common/                          # Recursos transversales
│   ├── decorators/                  # @Public(), etc.
│   ├── filters/                     # HttpExceptionFilter global
│   └── dtos/                        # PaginationQueryDto base
├── config/                          # Configuración tipada y validada
└── modules/
    ├── users/
    │   ├── schemas/                 # User + Profile (embebido)
    │   ├── dto/                     # Create, Update, Query, Response
    │   ├── users.controller.ts
    │   ├── users.service.ts
    │   └── users.module.ts
    └── auth/
        ├── dto/
        ├── guards/                  # JwtAuthGuard global
        ├── strategies/              # JwtStrategy (Passport)
        ├── auth.controller.ts
        ├── auth.service.ts
        └── auth.module.ts

test/
└── app.e2e-spec.ts                  # Flujo end-to-end: register → login → recurso protegido
```

---

## 📋 Roadmap de Desarrollo

- [x] **Sprint 0** — Scaffolding, configuración base, dependencias
- [ ] **Sprint 1** — Config tipada, filtros globales, validación, Swagger bootstrap
- [ ] **Sprint 2** — Módulo `users` (schemas, DTOs, service, controller, tests)
- [ ] **Sprint 3** — Módulo `auth` (JWT strategy, guards, register/login, tests)
- [ ] **Sprint 4** — Dockerfile multi-stage + Docker Compose
- [ ] **Sprint 5** — README final, ajustes de cobertura, revisión integral

---

## 📝 Licencia

Proyecto desarrollado como parte de una prueba técnica. Uso interno y de evaluación.

---

## 👤 Autor

**Seba** — Desarrollado en mayo 2026.