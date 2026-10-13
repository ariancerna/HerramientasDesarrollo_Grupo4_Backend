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

## Verificación

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

## Verificación local

Ejecutar npm run typecheck y npm test en la carpeta del backend.
Swagger: http://localhost:4000/api/v1/docs al iniciar npm run dev.
Las pruebas locales usan datos ficticios; no modifican Supabase compartido.
