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

Ejecutar npm run typecheck y npm test en la carpeta del backend.
Swagger: http://localhost:4000/api/v1/docs al iniciar npm run dev.
Las pruebas locales usan datos ficticios; no modifican Supabase compartido.
