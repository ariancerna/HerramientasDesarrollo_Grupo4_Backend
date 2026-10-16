# Integración con el front — cambios del contrato v1

Guía para reemplazar los stores/mocks del front por llamadas HTTP. Base URL: `/api/v1`.
Todo lo de aquí está documentado también en Swagger: `GET /api/v1/docs`.

## Convenciones (aplican a todos los módulos)

- Respuesta simple: `{ "data": ... }`.
- Lista paginada: `{ "data": [...], "meta": { "page", "limit", "total" } }` (`?page=1&limit=20`, máx. 100).
- Error: `{ "error": { "code", "message", "details?" } }` con 400 / 401 / 403 / 404 / 409 / 422 / 429.
- Propiedades en **camelCase**. La categoría viaja como `categoriaId` + `categoria` (nombre).
- Header: `Authorization: Bearer <accessToken>`.

## Sesión (AUTH)

| Endpoint | Qué cambia para el front |
|---|---|
| `POST /auth/login` `{usuario, password}` | Responde `{ accessToken, refreshToken, expiresIn, usuario: { id, usuario, nombre, rol, estudianteId? } }`. Cuenta bloqueada → 403. |
| `POST /auth/refresh` `{refreshToken}` | Llamarlo al recibir 401 por token expirado. |
| `POST /auth/logout` | Revoca la sesión en el servidor. Borrar también los tokens locales. |
| `GET /auth/me` | Para rehidratar al recargar. |
| `POST /auth/register` `{dni, usuario, password}` | Solo para alumnos que ya existen (decisión #2). 404 si el DNI no está registrado. |
| `GET /auth/usuario-disponible?usuario=&excluirId=` | `{ disponible: boolean }`. |
| `POST /auth/password/forgot` `{correo}` | Siempre 200. Se puede reenviar cada 30 s. |
| `POST /auth/password/verify` `{correo, codigo}` | `{ resetToken }`. Código incorrecto → 400; 5 fallos → **429** (hay que pedir otro código). |
| `POST /auth/password/reset` `{resetToken, nuevaPassword}` | Falta la pantalla en el front. |

## Rutas "mis datos" (`/me/*`)

| Rol | Endpoint |
|---|---|
| ALU | `GET/PATCH /me/perfil`, `PUT/DELETE /me/perfil/foto` (multipart, campo `foto`) |
| ALU | `GET /me/asistencias?desde=&hasta=&metodo=&page=&limit=` (paginado) |
| ALU | `GET /me/pagos`, `GET /me/pagos/actual` |
| ALU | `GET /me/anuncios?limite=` |
| PROF | `GET /me/categorias`, `GET /me/horarios?dia=` |
| Todos | `GET /me/notificaciones?soloNoLeidas=true`, `PATCH /me/notificaciones/:id/leida`, `POST /me/notificaciones/leer-todas`, `DELETE /me/notificaciones/:id` |
| Todos | `GET/PATCH /me/configuracion` |

## Cambios de forma respecto a lo que esperaba el front

- **Alumno (`Student`)**: `{ id, codigo, dni, nombres, apellidos, email, telefono, categoriaId, categoria, estado, fotoUrl, createdAt }`.
  Ya no existen `carrera` ni `ciclo` (decisión #3). `codigo` es opcional al crear: el backend genera `GC-AAAA-NNN`.
- **Pago (`PagoMensualidad`)**: `{ id, estudianteId, periodo, monto, estado, fechaPago, metodoPago, codigoOperacion, vencimiento }`.
  Si no se envía `monto`/`vencimiento`, se usan los valores de `GET /configuracion/club`.
- **Registro de asistencia**: `{ id, estudianteId, estudiante, dni, codigo, categoriaId, categoria, fecha, fechaHora, metodo }`.
  `fecha` es el día en hora de Lima.
- **Profesor**: nunca devuelve `password`. El id del profesor **es** el id del usuario (ya no hay `prof-001` / `u-002`).
  `PUT /profesores/:id` acepta `password` (opcional) y `categoriaIds[]`. `DELETE` quita el acceso pero conserva su historial.
- **Evaluación**: `{ id, alumnoId, alumno, profesorId, profesor, fecha, rendimientoTecnico, rendimientoFisico, actitud, observaciones, createdAt }`.
- **Anuncio**: `{ id, titulo, mensaje, estado, categoriaId, categoria, profesorId, profesor, destinatarios[], fechaCreacion }`.
  Enviar = `POST /anuncios/:id/enviar` (o crear con `estado: "enviado"`). Un anuncio enviado no vuelve a borrador.
- **Evento**: `{ id, titulo, fecha, horaInicio, horaFin, ubicacion, categoriaId, categoria, descripcion }` en `/eventos`.
- **Próximas actividades**: `GET /calendario/actividades?categoriaId=&tipo=entrenamiento|evento&limite=`.
- **Categoría**: se puede crear/editar con `horarios[]`; en la edición, enviar `horarios` **reemplaza** la lista completa.
- **Horario**: cancelar o reactivar una clase con `PATCH /categorias/:id/horarios/:horarioId/estado` `{ estado }`.

## Notificaciones

Las genera el servidor (anuncio enviado, asistencia registrada, pago registrado). Las notificaciones fijas del front se reemplazan por `GET /me/notificaciones`.
El campo `href` apunta a las rutas definidas en `src/lib/utils/rutas-front.ts`: **ajustarlas a las rutas reales del front**.
