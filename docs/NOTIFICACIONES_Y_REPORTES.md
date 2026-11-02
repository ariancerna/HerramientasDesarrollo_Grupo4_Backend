# NOT y REP — API del club de vóley

Todas las rutas usan el prefijo `/api/v1` y requieren `Authorization: Bearer <accessToken>`.

## Notificaciones

- `GET /me/notificaciones?page=1&limit=20&leida=false`: lista solo las notificaciones de la cuenta autenticada. `leida` es opcional. Responde `{data: [...], meta: {page, limit, total, noLeidas}}`; `noLeidas` cuenta todas las pendientes del usuario, aunque el listado esté filtrado.
- `GET /me/notificaciones/:id`: consulta una notificación propia.
- `PATCH /me/notificaciones/:id/leida`: la marca como leída. No requiere cuerpo; repetir la llamada mantiene el estado.
- `DELETE /me/notificaciones/:id`: la elimina y responde 204.
- `POST /notificaciones`: solo `ADM`. Cuerpo `{usuarioId, titulo, descripcion?, tipo?, href?}`. `usuarioId` es el UUID de `usuarios`; `href`, si se envía, debe ser una ruta interna que empiece por `/`. Responde 201.

Los objetos de notificación tienen `{id, titulo, descripcion, tipo, href, leida, creadaEn}`. Los endpoints personales devuelven 404 para un ID ajeno o inexistente. La API no publica notificaciones de forma automática desde otros módulos: el administrador puede crearlas con el endpoint anterior. El frontend debe consultar `/me/notificaciones` para reemplazar sus datos fijos.

## Reporte de asistencia

Solo `ADM` puede consultar:

- `GET /reportes/asistencia?desde=YYYY-MM-DD&hasta=YYYY-MM-DD`: registros e indicadores.
- `GET /reportes/asistencia/export?desde=YYYY-MM-DD&hasta=YYYY-MM-DD`: CSV UTF-8 con encabezados `alumno,dni,categoria,fecha,hora,metodo`.

Los dos endpoints aceptan `categoriaId` y `metodo` (`ESCANEO` o `MANUAL`) como filtros opcionales. El rango incluye ambos días. Los indicadores son `totalAsistencias`, `estudiantesUnicos`, `diasConActividad`, `promedioPorDia`, `porcentajeEscaneo`, `porCategoria` y `porFecha`. `promedioPorDia` divide entre todos los días del rango, incluidos los días sin registros. La hora del CSV se expresa en `America/Lima`.

El reporte usa los registros de `asistencias` y las tablas `alumnos` y `categorias` ya existentes. Las consultas recorren páginas de Supabase para evitar que el límite por defecto recorte el resultado.
