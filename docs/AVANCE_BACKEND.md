# Avance: categorias, horarios y profesores

Ramas locales, en orden de integracion:

1. feature/categorias: CRUD, relaciones de lectura y validaciones.
2. feature/horarios: incluye categorias, CRUD anidado y migracion de dia unico.
3. feature/profesores: incluye las anteriores, cuentas Auth, CRUD y asignaciones atomicas.

La rama activa feature/profesores contiene todo el avance. dev conserva exactamente origin/dev. No se hizo push ni merge a dev/main.
Los commits separan validaciones/rutas, persistencia/reglas, pruebas y documentacion. Para revisar los cambios de cada modulo, comparar feature/categorias contra dev, feature/horarios contra feature/categorias y feature/profesores contra feature/horarios.

Para continuar: npm ci, configurar .env siguiendo README, aplicar las dos migraciones nuevas despues del esquema del equipo y ejecutar npm test. Las pruebas usan credenciales ficticias y Postgres embebido; el API real necesita las credenciales del equipo.
Consultar CATEGORIAS.md, HORARIOS.md y PROFESORES.md para contratos y adaptacion pendiente del frontend. No se modifico el frontend.
