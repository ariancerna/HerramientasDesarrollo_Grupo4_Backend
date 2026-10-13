# Endpoints de cuentas, alumnos y configuración

Rama local: feature/cuentas-alumnos-y-configuracion. Base: /api/v1.
Se integró origin/dev conservando los cuatro commits locales de horarios.
Los cambios no se publican ni se incorporan a dev durante este trabajo.

## AUTH-10 / SCRUM-58 — PATCH /auth/password

Requiere una cuenta activa y su token Bearer (ADM, PROF o ALU).
JSON: passwordActual y passwordNueva. La nueva debe tener al menos seis
caracteres, ser distinta y cumplir la política adicional del proyecto Supabase.
Los campos ajenos se rechazan. Nunca enviar un id o correo para elegir otra cuenta.

Devuelve 200 con data.mensaje. Contraseña actual incorrecta: 401; entrada/política
inválida: 400; límite del proveedor: 429; fallo inesperado: 500.
La verificación usa un cliente Auth aislado por petición, comprueba el mismo UUID
del token y actualiza como ese usuario. Finalmente cierra solo esa sesión temporal.
No muta el cliente compartido ni registra contraseñas o tokens.
No promete cerrar todas las sesiones previas: su revocación sigue la política de Supabase.

## USR-01 / SCRUM-49 — POST /alumnos/:id/cuenta

Solo ADM. UUID de alumno existente; JSON estricto con usuario (3–50 caracteres,
se recortan espacios) y password (mínimo seis y política de Supabase).
Devuelve 201 con data.mensaje, nunca la contraseña.
Rechaza alumno inexistente (404), sin correo (400) y cuentas/usuarios/correos
ocupados (409). Los fallos SQL no se confunden con registros inexistentes.

Aplicar 20261012210000_cuenta_alumno_atomica.sql antes del uso real.
Añade unicidad de estudiante_id y de lower(usuario), y una función SQL accesible
solo a service_role. Bloquea el alumno y verifica que su correo siga vigente.
Si ya existen duplicados, la migración se detiene sin eliminar datos.
Auth no participa en la transacción SQL: ante fallo se elimina solo la nueva
cuenta Auth. Si esa compensación falla, se devuelve AUTH_CLEANUP_REQUIRED con
authUserId para limpieza administrativa; nunca se elimina una cuenta previa.

## SED-02 / SCRUM-52 — GET /sedes/:id

Cualquier cuenta activa autenticada. UUID válido obligatorio; devuelve 200 con
data: id, nombre, direccion (nullable) y created_at. UUID inválido: 400;
sede inexistente: 404; fallo de base de datos: 500 sin detalles internos.
No requiere nuevas migraciones ni cambia las otras rutas CRUD de sedes.

## ALU-01 / SCRUM-108 — GET /alumnos

ADM consulta el listado completo; PROF solo sus categorías asignadas, resueltas
desde su vínculo real o su UUID Auth. ALU recibe 403. Un profesor sin categorías
recibe una página vacía sin consultar todos los alumnos.

Filtros: texto (máximo 100 caracteres, sin controles ni *), categoriaId (UUID),
estado (activo/inactivo), page (1–1000000; defecto 1), limit (1–100; defecto 20).
Parámetros repetidos, fracciones y campos desconocidos devuelven 400.
Los caracteres reservados del texto se entrecomillan según la gramática de
PostgREST; % y _ se escapan. Orden estable por apellidos, nombres e id.
Se conserva la envoltura existente data: {data: [], page, limit, total, totalPages}.
Sin resultados, totalPages es cero, no uno.

## CFG-01 / SCRUM-143 — GET /me/configuracion

Todos los roles activos. El UUID sale del token, no de parámetros del cliente.
La ruta correcta es /api/v1/me/configuracion, sin prefijo duplicado.
Devuelve data: {tema: claro|oscuro|sistema, notificacionesSilenciadas: boolean}.
Sin configuración guardada devuelve sistema y false, sin crear una fila.
Un error de base de datos devuelve 500, nunca valores por defecto engañosos.
Parámetros desconocidos o de suplantación devuelven 400.

## CFG-02 / SCRUM-144 — PATCH /me/configuracion

Todos los roles activos. JSON no vacío con tema y/o notificacionesSilenciadas.
Sin null, campos desconocidos ni usuarioId. Devuelve 200 con el mismo formato
que GET. Campos omitidos conservan su valor y false se guarda correctamente.
Sin fila, usa los valores por defecto solo para las preferencias no enviadas.
Errores de validación: 400; falta de token: 401; cuenta inactiva: 403;
fallos de guardado: 500, sin fingir éxito.

Aplicar 20261012211000_configuracion_parcial_atomica.sql antes del uso real.
La función INSERT ... ON CONFLICT aplica cada campo dentro de una sola escritura.
Dos cambios concurrentes a campos distintos se conservan; sobre el mismo campo
prevalece la última escritura. La RPC solo puede ejecutarla service_role y el
backend toma el propietario del token.

## Migraciones y alcance

No se aplicó ninguna migración al Supabase compartido.
Sobre el esquema inicial, comprobar las migraciones de dev para día único de
horarios y transacciones de profesores, y después las dos nuevas de cuentas y
configuración, en orden de nombre. La creación de índices se detiene si ya hay
duplicados: revisar con el equipo, no borrar registros automáticamente.
USR-01 y CFG-02 requieren estas migraciones para funcionar en la base real.

La auditoría, las pruebas HTTP con transporte ficticio y Postgres embebido no
confirman conectividad ni políticas del Supabase desplegado. Verificar con los
datos de prueba del equipo después de aplicar las migraciones.

## Verificación y Git

Usar Node.js 22 o superior. En la carpeta del backend:

    npm ci
    npm run typecheck
    npm test
    npm run dev

Se usaron estos pasos Git (la rama ya existe; no repetir su creación):

    git status --short --branch
    git branch -vv
    git remote -v
    git fetch origin --prune
    git switch -c feature/cuentas-alumnos-y-configuracion
    git merge --no-commit --no-ff origin/dev

Tras revisar y resolver los conflictos, se prepararon archivos explícitos con
git add y se creó un commit de integración. Cada endpoint tiene dos commits:
implementación y pruebas/documentación. No se hizo rebase, reset ni force push.
Para comparar y revisar el resultado local:

    git status
    git log --oneline origin/dev..HEAD
    git diff --stat origin/dev..HEAD
    git diff --check

No se ejecutó git push ni se incorporaron cambios de funcionalidad a dev. La publicación requiere
la autorización posterior del usuario; no incorporar a dev sin revisión del equipo.

Ejecutar npm run typecheck y npm test en la carpeta del backend.
Swagger: http://localhost:4000/api/v1/docs al iniciar npm run dev.
Las pruebas locales usan datos ficticios; no modifican Supabase compartido.

Auditoría de dependencias: tres alertas altas en la cadena de desarrollo
ts-node-dev -> chokidar -> braces, heredadas de dev y sin corrección automática
disponible según npm audit. No se cambió el ejecutor ni el lockfile para ocultarlas.
Se recomienda revisar ese cambio de herramienta con el equipo.
