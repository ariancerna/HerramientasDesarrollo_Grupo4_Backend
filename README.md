# Club de Vóley — Backend

API REST para la gestión de un club de vóley. El backend administra cuentas de acceso, alumnos, categorías, horarios de entrenamiento, profesores y mensualidades, y ofrece resúmenes de inicio por rol.

La aplicación utiliza Express y TypeScript. Supabase proporciona PostgreSQL, autenticación y almacenamiento de archivos.

## Tecnologías

- Node.js 20 o superior y npm.
- TypeScript y Express.
- Supabase: Database, Auth y Storage.
- Zod para validación de entradas.
- OpenAPI y Swagger UI para documentación del API.
- Node Test Runner y PGlite para pruebas automatizadas.

## Instalación

```bash
git clone https://github.com/ariancerna/HerramientasDesarrollo_Grupo4_Backend.git
cd HerramientasDesarrollo_Grupo4_Backend
git switch dev
npm ci
```

La rama `dev` contiene la integración de los módulos en desarrollo.

## Configuración

La configuración se carga desde un archivo `.env` en la raíz del proyecto. La plantilla `.env.example` contiene las variables requeridas.

En PowerShell:

```powershell
Copy-Item .env.example .env
```

En Linux o macOS:

```bash
cp .env.example .env
```

| Variable | Descripción | Valor de referencia |
|---|---|---|
| `PORT` | Puerto del servidor | `4000` |
| `NODE_ENV` | Entorno de ejecución | `development` |
| `CORS_ORIGIN` | Origen autorizado del frontend | `http://localhost:3000` |
| `SUPABASE_URL` | URL del proyecto compartido | Configuración del proyecto |
| `SUPABASE_ANON_KEY` | Clave utilizada por el cliente de autenticación | Configuración del proyecto |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave administrativa utilizada por los repositorios | Configuración del proyecto |

Las credenciales corresponden al proyecto de Supabase del equipo. `.env` está excluido del control de versiones. La clave administrativa se utiliza exclusivamente en el backend.

## Base de datos

Los scripts SQL se encuentran en `supabase/migrations/` y se aplican desde el SQL Editor de Supabase por un administrador del proyecto.

Una instalación nueva requiere los scripts base `001` a `004`, en orden, seguidos de las migraciones adicionales:

| Archivo | Función |
|---|---|
| `001_initial_schema.sql` | Tablas, relaciones y restricciones del modelo |
| `002_rls.sql` | Políticas de seguridad por fila |
| `003_functions.sql` | Funciones del esquema base |
| `004_storage_avatares.sql` | Configuración del almacenamiento de avatares |
| `20261012155228_horarios_dia_unico.sql` | Restricción de un horario por día y categoría |
| `20261012155319_profesores_transacciones.sql` | Transacciones de profesores y seguimiento de limpieza de cuentas Auth |

En una base de datos existente se aplican únicamente los scripts pendientes. La migración de horarios requiere que no existan días duplicados dentro de una misma categoría; si los hay, deben resolverse antes de crear el índice único.

## Ejecución

```bash
npm run dev
```

El servidor utiliza `http://localhost:4000` por defecto. Para ejecutar la compilación:

```bash
npm run build
npm start
```

En PowerShell también puede utilizarse `npm.cmd` para ejecutar estos comandos.

## Documentación del API

Todas las rutas utilizan el prefijo `/api/v1`.

| Recurso | Dirección local |
|---|---|
| Estado del servicio | `http://localhost:4000/api/v1/health` |
| Swagger UI | `http://localhost:4000/api/v1/docs` |
| Especificación OpenAPI | `http://localhost:4000/api/v1/openapi.json` |

Las rutas protegidas reciben el token de Supabase en `Authorization: Bearer <accessToken>`. Swagger permite configurarlo mediante **Authorize**. Los roles del sistema son `ADM`, `PROF` y `ALU`.

### Módulos documentados

| Módulo | Contrato y comportamiento |
|---|---|
| Autenticación, cuentas de acceso y sedes | Swagger UI |
| Alumnos y perfil | Swagger UI y pruebas en `tests/alumnos-*.test.cjs` |
| Categorías | [CATEGORIAS.md](docs/CATEGORIAS.md) |
| Horarios de entrenamiento | [HORARIOS.md](docs/HORARIOS.md) |
| Profesores y asignaciones | [PROFESORES.md](docs/PROFESORES.md) |
| Pagos y mensualidades | [PAGOS.md](docs/PAGOS.md) |
| Resúmenes de inicio por rol | [DASHBOARD.md](docs/DASHBOARD.md) |

Los módulos restantes mantienen sus rutas y archivos dentro de `src/modules/`; su implementación y documentación se incorporan progresivamente.

## Verificación

```bash
npm run typecheck
npm test
```

`npm test` compila el proyecto y ejecuta pruebas de validación, permisos HTTP, consultas y reglas de negocio. Las pruebas utilizan transporte simulado para Supabase y PostgreSQL embebido con PGlite para las transacciones SQL; no escriben en la base de datos compartida.

La comprobación de los flujos completos con Auth y PostgREST reales se realiza por separado, con la configuración del proyecto.

## Estructura

```text
src/
  config/          Variables de entorno y clientes Supabase
  docs/            Registro de endpoints y generación de OpenAPI
  lib/             Errores y utilidades compartidas
  middlewares/     Autenticación, roles y validación
  modules/         Rutas, controladores, servicios, esquemas y repositorios
  routes/          Montaje del API
  types/           Tipos compartidos
supabase/          Scripts SQL y datos iniciales
tests/             Pruebas automatizadas
docs/              Contratos y documentación de módulos
```

## Desarrollo

Las funcionalidades se trabajan en ramas `feature/<funcionalidad>` y se integran en `dev` después de validar la compilación y las pruebas. Los commits agrupan cambios concretos de implementación, correcciones, pruebas o documentación.

Los nuevos endpoints se registran en `src/docs/data/` y se incluyen en `src/docs/data/index.ts` para incorporarlos a Swagger. Los cambios del modelo de datos se entregan como archivos SQL versionados.
