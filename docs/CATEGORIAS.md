# Categorías (CAT-01..05)

Lectura para ADM, PROF y ALU autenticados; creación, edición y eliminación solo ADM.
GET /api/v1/categorias admite texto (búsqueda literal por nombre). GET, PUT y DELETE /api/v1/categorias/:id requieren UUID.
POST recibe {"nombre":"Sub-12","descripcion":"Grupo inicial"}. PUT admite cualquiera de esos campos y exige al menos uno.
Las respuestas usan el sobre habitual {data: ...}. Cada categoría contiene id, nombre, descripcion, profesorIds y horarios con dia, horaInicio, horaFin, cancha y estado.
No se aceptan profesorIds ni horarios en POST/PUT: se gestionan mediante los endpoints de profesores y horarios. El frontend debe separar esas solicitudes al conectar sus formularios; actualmente usa localStorage.
Un id inexistente devuelve 404. El borrado devuelve 204, o 409 si existen alumnos, eventos u otras referencias. Los horarios y asignaciones se eliminan en cascada según el esquema existente.

Verificación: npm test. Las pruebas no requieren credenciales reales. Swagger: /api/v1/docs.
