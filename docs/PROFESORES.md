# Profesores (PRF-01..06)

Los seis endpoints requieren ADM. GET /api/v1/profesores acepta texto (nombre literal) y sedeId (UUID). GET/PUT/DELETE /api/v1/profesores/:id requieren UUID.
POST /api/v1/profesores recibe:

```json
{"nombre":"Profesor","usuario":"profe","email":"profe@example.com","password":"secreto123","sedeId":"UUID_DE_SEDE","categoriaIds":["UUID_DE_CATEGORIA"]}
```

categoriaIds es opcional en creacion. PUT /profesores/:id acepta nombre, usuario o sedeId (al menos uno). PUT /profesores/:id/categorias recibe {"categoriaIds":[]} para desasignar todas, o una lista sin duplicados para reemplazar las asignaciones.
Las respuestas usan {data: ...} con id, nombre, usuario, email, sedeId y categoriaIds; nunca incluyen password.

La cuenta Auth usa correo real. usuario se guarda en minusculas y permite letras, numeros, punto, guion y guion bajo. Los cambios de nombre y usuario actualizan tambien usuarios, la fuente de verdad del login y los roles. La sede y categorias deben existir.
Crear el profesor crea primero Auth y guarda perfil, usuario y categorias en una transaccion. Si esta falla, revierte la cuenta Auth. Si tambien falla la compensacion, devuelve AUTH_CLEANUP_REQUIRED con authUserId para que el administrador limpie esa cuenta antes de repetir la creacion.
Las asignaciones se reemplazan en una transaccion con bloqueo del profesor. Una categoria inexistente devuelve 400 y mantiene todas las asignaciones anteriores.
Eliminar devuelve 409 si existen evaluaciones, anuncios u otras referencias y conserva la cuenta y perfil. Una eliminacion permitida borra perfil y usuario y registra una limpieza pendiente; si Auth falla, devuelve 500 con instruccion de reintentar DELETE del mismo id. La limpieza pendiente permite reintentar sin borrar cuentas ajenas. Las credenciales activas no permiten acceso al API porque requireAuth exige la fila en usuarios.

## Preparar Supabase

Despues del esquema existente (001..004), ejecutar la migracion *_horarios_dia_unico.sql y luego *_profesores_transacciones.sql. Revisar duplicados de horarios antes de aplicar el indice unico. Estas migraciones se entregan como archivos; no se aplicaron al proyecto compartido.
Las funciones son SECURITY INVOKER, con search_path vacio, sin permiso para PUBLIC, anon ni authenticated. Solo service_role puede ejecutarlas. La tabla de limpieza tiene RLS y acceso reservado al backend.

## Conexion con el frontend

El formulario actual usa localStorage y no contiene email: agregar ese campo al conectarlo. No enviar ni almacenar passwords en respuestas o estado persistente. En edicion, enviar nombre, usuario y sedeId a PUT /profesores/:id, las categorias a PUT /profesores/:id/categorias, y la nueva password (si existe) al endpoint de usuarios ya implementado: POST /usuarios/:id/reset-password con {"nuevaPassword":"..."}.
No cambiar email desde PUT de profesores: requiere coordinacion con Auth y esta fuera del contrato de edicion.

## Verificacion

npm test ejecuta validaciones, permisos HTTP, pruebas del SDK con transporte simulado y transacciones reales en Postgres embebido (PGlite). No usa el Supabase del equipo. Aun falta probar Auth y PostgREST reales con las migraciones y credenciales del proyecto. Documentacion oficial consultada: https://supabase.com/docs/reference/javascript/auth-admin-createuser y https://supabase.com/docs/reference/javascript/rpc.

Las plantillas mencionan docs/ENDPOINTS.md pero ese archivo no esta en dev. Los contratos siguen las rutas de las plantillas, el esquema SQL y los formularios; PRF-06 se implementa como asignacion de categorias.
