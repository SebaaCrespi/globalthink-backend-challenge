# globalthink-backend-challenge

API REST para gestión de usuarios con perfiles y autenticación JWT, construida con **NestJS** y **MongoDB**.

> **Estado del proyecto:** ✅ Entrega completa. API funcional con autenticación JWT, CRUD de usuarios, suite de testing integral y stack Docker Compose listo para ejecutar.

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

Las variables de entorno se validan al arrancar la aplicación mediante `@nestjs/config` con un schema Joi explícito. Si falta alguna o tiene tipo incorrecto, **la aplicación falla rápido** (fail-fast) en lugar de romper en runtime de forma impredecible.

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

Esto previene la fuga de detalles internos (errores crudos de Mongo, stack traces) hacia el cliente. Los errores no controlados se reportan como 500 genérico mientras el detalle crudo queda en el log del servidor.

### 6. Default-deny en autenticación

Todos los endpoints están protegidos por defecto mediante un `JwtAuthGuard` global. Los endpoints públicos (registro, login) se marcan explícitamente con un decorador `@Public()`. Este enfoque de *default-deny* es más seguro que el opuesto: olvidar proteger un endpoint es imposible, mientras que olvidar exponer uno es inmediatamente visible.

---

## 🤖 Pipeline de Desarrollo Asistido por IA

Este proyecto fue desarrollado mediante un pipeline estructurado de co-trabajo con IA, optimizando el tiempo de entrega sin sacrificar calidad. El rol humano fue de **arquitecto y supervisor**: la IA aceleró la generación de código, pero cada output pasó por ejecución local y code review antes de integrarse.

| Fase | Herramienta | Rol |
|------|-------------|-----|
| Planificación y revisión arquitectónica | Claude (chat) | Diseño conceptual, análisis crítico, code review |
| Generación de boilerplate | Claude Code (CLI local) | DTOs, schemas, stubs de tests, exception filters |
| Implementación y verificación | Desarrollador (manual) | Ejecución local, validación de outputs, debugging |
| Documentación | Claude (chat) | Estructura del README, justificación técnica |

La metodología por sprints divide el trabajo en módulos acotados. Cada sprint sigue el ciclo: **planificación → prompt modular → generación → ejecución local → code review → commit**.

---

## 📓 Bitácora de Desarrollo

Esta sección documenta de forma transparente los problemas reales encontrados durante el desarrollo y cómo se resolvieron. Refleja que el pipeline asistido por IA incluye supervisión humana activa: varios problemas de toolchain solo se detectaron al ejecutar localmente, validando la importancia del rol del desarrollador en el loop.

### Sprint 0 — Scaffolding y configuración base

- Inicialización con Nest CLI usando Yarn como gestor de paquetes (eliminación de `package-lock.json`).
- Configuración de TypeScript en modo estricto (`strict`, `noUnusedLocals`, `noUnusedParameters`, etc.).
- Definición de `.env.example`, `.dockerignore`, `.nvmrc` (Node 24 LTS) y `.gitattributes` (finales de línea LF normalizados para evitar conflictos cross-platform entre Windows y entornos Unix).
- Limpieza de los archivos de ejemplo del scaffold (`app.controller.ts`, `app.service.ts`).

### Sprint 1 — Capa transversal (config, validación, errores, Swagger)

Se construyó la infraestructura compartida del proyecto: módulo de configuración tipada con validación Joi, filtro global de excepciones, pipe de validación global, y bootstrap de Swagger. Durante este sprint se resolvieron dos problemas de toolchain y se tomó una decisión de diseño cross-platform que vale la pena documentar:

**1. Conflicto entre Prettier y ESLint.**
ESLint reportaba cientos de errores de formato (`prettier/prettier`) pese a que Prettier consideraba los archivos correctamente formateados. La causa: `eslint-plugin-prettier` no lee el archivo `.prettierrc` por defecto, usando su propia configuración interna. **Solución:** configurar la regla como `['error', {}, { usePrettierrc: true }]` para forzar que respete el `.prettierrc` del proyecto. Es un gotcha común del stack NestJS con ESLint flat config.

**2. Build que no emitía el entry file.**
`nest build` reportaba éxito ("Done in Xs") pero `dist/main.js` no se generaba, provocando `MODULE_NOT_FOUND` al arrancar. Se identificaron **dos causas simultáneas**:

- Faltaba `experimentalDecorators: true` en `tsconfig.json`, necesario para que TypeScript procese correctamente los decoradores de NestJS y Mongoose.
- La opción `rootDir: "./src"` (agregada inicialmente para silenciar un warning de deprecación de TypeScript 5.x) **rompe el pipeline de `nest build`**. En proyectos NestJS, el directorio raíz de fuentes lo gestiona internamente `nest-cli.json` vía `sourceRoot`; forzar `rootDir` en `tsconfig.json` es contraproducente.

**Solución:** restaurar `experimentalDecorators` y omitir `rootDir`, usando en su lugar `"include": ["src/**/*"]` para delimitar el alcance de compilación. El warning informativo del Language Server sobre `rootDir` se acepta como ruido benigno, ya que no afecta el build ni la ejecución.

**3. Estandarización de finales de línea (decisión de diseño cross-platform).**
Se tomó la decisión proactiva de fijar **LF como único estándar de finales de línea** para todo el repositorio, anticipando un escenario de equipo heterogéneo: el desarrollo local se realiza en **Windows** (que usa CRLF nativamente), la empresa trabaja sobre **macOS** (que usa LF), y los entornos de ejecución (servidores y contenedores Docker) corren sobre **Linux** (LF). Sin una política explícita, cada sistema operativo introduciría su propio carácter de fin de línea, generando diffs ruidosos, conflictos de merge artificiales y warnings inconsistentes según la máquina.

**Decisión:** un archivo `.gitattributes` con `* text=auto eol=lf` normaliza todos los archivos de texto a LF en el repositorio, con la excepción explícita de los scripts batch de Windows (`*.bat`, `*.cmd`) que requieren CRLF para funcionar, y los binarios marcados para que Git no los altere. Esto garantiza que cualquier colaborador —sin importar su sistema operativo— vea exactamente el mismo contenido, eliminando la variable del SO de la ecuación. La configuración vive en el repositorio y no depende de los ajustes de Git locales de cada persona.

> **Conclusión del sprint:** los problemas de toolchain (Prettier/ESLint y el build) eran de configuración del entorno, no de lógica de negocio, y ninguno habría sido detectado sin ejecución local —lo que valida el principio central del pipeline: la IA genera, pero el humano supervisa, ejecuta y verifica. La estandarización de finales de línea, en cambio, fue una decisión de diseño anticipatoria pensada para un equipo cross-platform, no una reacción a un problema. Ambos tipos de intervención (corrección reactiva y diseño proactivo) reflejan el criterio humano que el pipeline asistido por IA requiere para producir un resultado profesional.

### Sprint 2 — Módulo Users (desarrollo híbrido por limitación de contexto)

Este sprint introdujo una dinámica distinta al pipeline habitual. Por una limitación de contexto (ventana de tokens agotada durante la sesión de planificación), el desarrollo se dividió en dos fases:

**Fase 1 — Avance manual sin asistencia IA:**
Ante la imposibilidad temporal de continuar con el asistente, el desarrollador avanzó de forma autónoma cubriendo tareas de múltiples sprints:

*Trabajo correspondiente al Sprint 2 (módulo users):*
- Schemas de Mongoose: `User` con `Profile` embebido (`{ _id: false }`), enum `UserRole`, password con `select: false`, email indexado y único, timestamps automáticos.
- DTOs de entrada: `CreateUserDto` con `@ValidateNested()` para el perfil anidado, `UpdateUserDto` vía `PartialType`, `UserQueryDto` con paginación y búsqueda por texto libre.
- Stubs compilables de `UsersService`, `UsersController` y `UsersModule` (con `MongooseModule.forFeature` y export del service anticipando el Sprint 3).

*Trabajo correspondiente al Sprint 3 (módulo auth) — adelantado:*
- Esqueleto de `AuthModule`, `AuthController` y `AuthService` como stubs vacíos.
- Decorador `@Public()` para la estrategia de autenticación default-deny.

*Trabajo correspondiente al Sprint 4 (infraestructura Docker) — adelantado:*
- `Dockerfile` multi-stage optimizado: stage `builder` con dependencias completas de TypeScript, stage `runner` liviano basado en `node:24-alpine` ejecutando solo `/dist` y dependencias productivas con Yarn.
- Actualización de `.dockerignore` para excluir `node_modules`, `dist`, `.env` y archivos de desarrollo.

Durante esta fase surgieron dos problemas técnicos resueltos de forma independiente:

- **`TS2564` — Strict property initialization:** Los campos requeridos en DTOs y schemas lanzaban error de inicialización estricta. Solución: operador de aserción definitiva `!` (`firstName!: string`), patrón consistente con la forma en que NestJS y Mongoose inyectan los datos dinámicamente en runtime.
- **Validación de Joi en container Docker aislado:** Al probar el Dockerfile de forma individual, la app crasheaba por dos causas: variable de entorno nombrada `MONGO_URI` en lugar de `MONGODB_URI` (el schema Joi del Sprint 1 es estricto con los nombres), y ausencia del `.env` dentro del container (correctamente ignorado por `.dockerignore`). Solución: inyección con `--env-file` y mapeo de `localhost` a `host.docker.internal` para alcanzar la base de datos del host desde el container Alpine.

Todo compilando en verde (`yarn build`) con TypeScript estricto y levantando correctamente en desarrollo (`yarn start:dev`).

**Fase 2 — Completado asistido por IA:**
Al recuperar el contexto, se completó la implementación: `UsersService` con toda la lógica de negocio (hashing con bcrypt, paginación con `Promise.all`, filtro `$or` con regex, manejo de duplicados Mongo 11000), `UsersController` con los 5 endpoints REST documentados con Swagger, `UserResponseDto` sin campo password, y 14 unit tests cubriendo todas las ramas del service.

Durante el code review se identificó una mutación directa del DTO en el método `update` (`dto.password = await bcrypt.hash(...)`) que violaba inmutabilidad. Se corrigió trabajando sobre una copia del objeto (`const updateData = { ...dto }`).

> **Conclusión:** La interrupción del pipeline IA no bloqueó el desarrollo. El desarrollador tomó decisiones técnicas correctas de forma autónoma (aserción definitiva `!`, stubs compilables, Dockerfile funcional) y las documentó para reincorporarlas al contexto. Esto refleja que el pipeline asistido por IA potencia la velocidad pero no crea dependencia: el criterio técnico reside en el desarrollador.

### Sprint 3 — Módulo Auth + Testing integral

Implementación completa del módulo de autenticación siguiendo la estrategia default-deny diseñada en el Sprint 1, más hardening de cobertura y suite e2e.

**Archivos implementados:**
- `LoginDto` y `AuthResponseDto` — contratos de entrada/salida para el flujo de autenticación.
- `JwtStrategy` — extracción de token Bearer, validación de payload tipado, mapeo a `{ userId, email, role }`.
- `JwtAuthGuard` — guard global registrado con `APP_GUARD`; lee el metadata `IS_PUBLIC_KEY` vía `Reflector` para permitir rutas públicas.
- `AuthService` — orquesta registro (delega creación a `UsersService` + firma JWT), login (valida credenciales con bcrypt + firma JWT) y consulta de perfil. Mensaje genérico `"Invalid credentials"` para login fallido (previene enumeración de usuarios).
- `AuthController` — tres endpoints: `POST /auth/register` (público), `POST /auth/login` (público), `GET /auth/profile` (protegido con `@ApiBearerAuth()`).
- `AuthModule` — `JwtModule.registerAsync` con secret y expiración desde config tipada.
- `UsersService.findByEmailWithPassword` — método agregado para recuperar el documento con el campo `password` (excluido por defecto vía `select: false` en el schema).

**Problemas resueltos:**
- **Tipo `expiresIn` en `JwtModule`:** jsonwebtoken tipifica `expiresIn` como `ms.StringValue | number`, incompatible con `string` plano. Se resolvió con un cast explícito a `JwtModuleOptions['signOptions']`, documentado en código con comentario.
- **Mock de `bcrypt.compare` en tests:** `jest.spyOn` no puede redefinir la propiedad porque no es configurable en el módulo compilado. Se resolvió con `jest.mock('bcrypt')` parcial usando `requireActual` + override puntual de `compare`.
- **Swagger sin `addBearerAuth()`:** Los endpoints protegidos no funcionaban en `/docs` porque el `DocumentBuilder` no incluía `.addBearerAuth()`. Detectado en code review y corregido en `main.ts`.
- **`UsersModule` importado dos veces en `AppModule`:** Estaba tanto en el array principal de `imports` como dentro de `MongooseModule.forRootAsync.imports` (donde no tenía razón de estar). Se removió del `forRootAsync`.

**Testing — hardening de cobertura:**
Se configuró `collectCoverageFrom` en Jest para excluir archivos declarativos sin lógica testeable (modules, DTOs, schemas, decoradores, `main.ts`, config), reflejando la cobertura real sobre código con comportamiento. Se agregaron tests unitarios para `JwtAuthGuard` (ruta pública vs protegida) y `JwtStrategy` (mapeo de payload).

| Archivo | Stmts | Branch | Funcs | Lines |
|---------|-------|--------|-------|-------|
| `auth.service.ts` | 100% | 100% | 100% | 100% |
| `users.service.ts` | 96.7% | 88% | 88.8% | 96.6% |
| `jwt-auth.guard.ts` | 100% | 100% | 100% | 100% |
| `jwt.strategy.ts` | 100% | 100% | 100% | 100% |
| `http-exception.filter.ts` | 90.9% | 69.2% | 100% | 90% |
| **Global (lógica testeable)** | **74.4%** | **85.2%** | **63.3%** | **74.6%** |

Los controllers quedan en 0% de forma intencional: son delegadores puros sin lógica propia, y su cobertura corresponde a tests de integración/e2e.

**Tests e2e (integración completa):**
Se implementó una suite e2e con `supertest` y `mongodb-memory-server` que valida el flujo real de la aplicación contra una instancia de MongoDB en memoria, sin mocks. Cubre 17 escenarios en tres bloques:

- **Auth (8 tests):** registro exitoso y duplicado, validación de campos, login con credenciales válidas/inválidas, acceso a perfil protegido con y sin token.
- **Users CRUD (6 tests):** listado paginado, detalle por ID (válido, inexistente, inválido), actualización parcial y eliminación con verificación posterior.
- **Paginación y filtros (3 tests):** paginación con límite, búsqueda por texto.

Setup: variables de entorno inyectadas vía `process.env` antes de compilar el módulo de testing, evitando overrides invasivos de `ConfigService`. Los pipes y filtros globales se aplican idénticamente a `main.ts`.

**Total: 50 tests (33 unitarios + 17 e2e), 6 suites, todos en verde.**

> **Conclusión:** El Sprint 3 cierra los dos módulos funcionales del challenge (users + auth) con cobertura de testing en ambos niveles — unitario sobre la lógica de negocio y e2e sobre el flujo real. La detección de bugs como el `addBearerAuth()` faltante y la doble importación de `UsersModule` ocurrió en la fase de code review humano, no en la generación automática, reafirmando que el pipeline IA requiere supervisión activa para alcanzar calidad de producción.

### Sprint 4 — Infraestructura Docker Compose

Cierre de la capa de infraestructura: orquestación de la app + base de datos en un único comando reproducible.

**Archivos:**
- `docker-compose.yml` — dos servicios (`app` y `mongo`), volumen nombrado `mongo-data` para persistencia de datos, `restart: unless-stopped` en ambos, variables de entorno inline con valores funcionales por defecto.

**Decisiones de diseño:**

- **Variables inline en lugar de `env_file`.** El compose define las variables directamente para que `docker compose up --build` funcione sin ningún paso previo de configuración. El `JWT_SECRET` tiene un valor explícitamente nombrado (`changeme-use-a-real-secret-in-production`) que invita a sobrescribirlo en escenarios reales. El `.env.example` se mantiene como documentación de las variables esperadas por el `ConfigModule` con validación Joi.
- **Imagen `mongo:8`.** Versión mayor reciente (LTS al momento de la entrega), compatible con el driver de Mongoose usado por el proyecto. La aplicación se conecta vía `mongodb://mongo:27017/globalthink` aprovechando la resolución DNS interna de la red por defecto que Compose crea.
- **`depends_on` con condición `service_started`.** Suficiente para este escenario: la app reintenta la conexión a Mongo automáticamente si el contenedor de base aún no terminó su arranque. Usar `service_healthy` requeriría definir un healthcheck explícito en Mongo, lo cual es overkill para un proyecto de esta escala (YAGNI).
- **Volumen nombrado `mongo-data`.** Persiste los datos entre `docker compose down` y `up` sucesivos. Para wipe completo de datos: `docker compose down -v`.

**Verificación:**
- Build multi-stage exitoso, ambos contenedores `Up`, app conectada a Mongo, rutas mapeadas correctamente.
- `http://localhost:3000/docs` responde HTTP 200 con la documentación Swagger completa.
- Flujo end-to-end funcional dentro del stack: registro → login → endpoints protegidos.

> **Conclusión del sprint:** Con un solo comando (`docker compose up --build`) cualquier evaluador puede levantar el proyecto completo en segundos, sin instalar Node ni MongoDB localmente. Esto cierra el círculo de portabilidad y reproducibilidad que busca el challenge.

---

## 🚀 Instalación y Ejecución

### Prerrequisitos

- **Docker y Docker Compose** (recomendado, único requisito necesario)
- Alternativamente, para ejecución sin Docker: Node.js 24+ (ver `.nvmrc`), Yarn, y una instancia de MongoDB accesible.

### Opción 1 — Docker Compose (recomendada)

Un solo comando levanta la app y la base de datos:

```bash
git clone <repo-url>
cd globalthink-backend-challenge
docker compose up --build
```

- API disponible en `http://localhost:3000`
- Documentación Swagger en `http://localhost:3000/docs`
- MongoDB expuesto en `localhost:27017` (para inspección con MongoDB Compass u otra herramienta)

Para detener el stack:
```bash
docker compose down       # Mantiene los datos
docker compose down -v    # Elimina también el volumen de Mongo (wipe total)
```

### Opción 2 — Ejecución local con Yarn

```bash
# 1. Clonar e instalar dependencias
git clone <repo-url>
cd globalthink-backend-challenge
yarn install

# 2. Configurar variables de entorno
cp .env.example .env
# Editar .env: el JWT_SECRET debe tener mínimo 16 caracteres

# 3. Levantar MongoDB localmente (puede ser via Docker individual)
docker run -d --name local-mongo -p 27017:27017 mongo:8

# 4. Iniciar la aplicación
yarn start:dev
```

### Flujo de prueba rápido

Una vez levantada la app, en Swagger (`/docs`):

1. `POST /auth/register` con un body como:
   ```json
   {
     "email": "test@example.com",
     "password": "securePass123",
     "profile": { "firstName": "Test", "lastName": "User" }
   }
   ```
2. Copiar el `accessToken` de la respuesta.
3. Click en el botón **Authorize** (candado, arriba a la derecha) y pegar el token.
4. Probar `GET /users`, `GET /auth/profile`, `PATCH /users/:id`, etc.

---

## 🧪 Testing

```bash
# Pruebas unitarias
yarn test

# Pruebas unitarias en modo watch
yarn test:watch

# Pruebas unitarias con cobertura
yarn test:cov

# Pruebas e2e  (requiere descarga automática de mongodb-memory-server en primera ejecución)
yarn test:e2e
```

**Objetivo de cobertura:** ≥80% en los services (lógica de negocio).

---

## 📂 Estructura del Proyecto

```
.
├── docker-compose.yml              # Stack App + MongoDB
├── Dockerfile                      # Build multi-stage (builder + runner alpine)
├── .env.example                    # Variables de entorno documentadas
├── package.json
├── src/
│   ├── main.ts                     # Bootstrap (pipes, filters, Swagger)
│   ├── app.module.ts               # Módulo raíz
│   ├── common/
│   │   ├── decorators/             # @Public()
│   │   └── filters/                # HttpExceptionFilter global
│   ├── config/                     # Configuración tipada con validación Joi
│   └── modules/
│       ├── users/
│       │   ├── schemas/            # User + Profile (embebido)
│       │   ├── dto/                # Create, Update, Query, Response
│       │   ├── users.controller.ts
│       │   ├── users.service.ts 
│       │   └── users.module.ts
│       └── auth/
│           ├── dto/                # Login, AuthResponse
│           ├── guards/             # JwtAuthGuard global
│           ├── strategies/         # JwtStrategy (Passport)
│           ├── auth.controller.ts
│           ├── auth.service.ts
│           └── auth.module.ts
└── test/
    └── app.e2e-spec.ts             # E2e con mongodb-memory-server (auth + CRUD + paginación)
```

---

## 📋 Roadmap de Desarrollo

- [x] **Sprint 0** — Scaffolding, configuración base, dependencias
- [x] **Sprint 1** — Config tipada, filtros globales, validación, Swagger bootstrap
- [x] **Sprint 2** — Módulo `users` (schemas, DTOs, service, controller, tests)
- [x] **Sprint 3** — Módulo `auth` (JWT strategy, guards, register/login, tests)
- [x] **Sprint 4** — Dockerfile multi-stage + Docker Compose
- [x] **Sprint 5** — README final y cierre de documentación

---

## 📝 Licencia

Proyecto desarrollado como parte de una prueba técnica. Uso interno y de evaluación.

---

## 👤 Autor

**Seba** — Desarrollado en mayo 2026.