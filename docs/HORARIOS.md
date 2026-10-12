# Horarios (HOR-01..05)

Rutas: GET/POST /api/v1/categorias/:id/horarios y GET/PUT/DELETE /api/v1/categorias/:id/horarios/:horarioId.
Todos los roles autenticados pueden leer; solo ADM puede escribir. Ambos identificadores requieren UUID.
POST recibe {"dia":"lunes","horaInicio":"09:00","horaFin":"11:00","cancha":"Cancha 1"}. estado es activo por defecto. PUT admite cambios parciales, incluido {"estado":"cancelado"}.
GET lista acepta ?estado=activo o cancelado. Respuestas: {data: ...}, con los nombres usados por el frontend.
Se valida hora real HH:mm, horaFin posterior a horaInicio y un horario por dia por categoria (tambien si esta cancelado). Actualizar una sola hora se valida contra la hora guardada.
Un horario de otra categoria devuelve 404; nunca se cambia usando solamente horarioId. Un dia repetido devuelve 409.
La comprobacion de dia repetido en el servicio no es una garantia frente a escrituras concurrentes; el esquema actual no contiene una restriccion unica por categoria/dia. Se recomienda agregarla al integrar el esquema con el equipo.

El formulario del frontend debe crear la categoria primero y luego enviar sus horarios mediante POST. Los ids temporales h-* no se envian: el servidor genera UUID. Para editar, enviar los cambios y eliminaciones individualmente.
Verificacion: npm test y Swagger en /api/v1/docs.
