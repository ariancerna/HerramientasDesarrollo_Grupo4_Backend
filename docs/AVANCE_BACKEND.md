# Avance: categorias, horarios y profesores

Ramas locales, en orden de integracion:

1. feature/categorias: CRUD, relaciones de lectura y validaciones.
2. feature/horarios: incluye categorias, CRUD anidado y migracion de dia unico.
3. feature/profesores: incluye las anteriores, cuentas Auth, CRUD y asignaciones atomicas.

feature/profesores contiene el avance de los tres modulos. Las tres ramas de funcionalidad estan publicadas en GitHub.
Los commits separan validaciones/rutas, persistencia/reglas, pruebas y documentacion. Para revisar los cambios de cada modulo, comparar feature/categorias contra dev, feature/horarios contra feature/categorias y feature/profesores contra feature/horarios.

Para continuar: npm ci, configurar .env siguiendo README, aplicar las dos migraciones nuevas despues del esquema del equipo y ejecutar npm test. Las pruebas usan credenciales ficticias y Postgres embebido; el API real necesita las credenciales del equipo.
Consultar CATEGORIAS.md, HORARIOS.md y PROFESORES.md para contratos y adaptacion pendiente del frontend. No se modifico el frontend.

## Integracion con dev

La rama feature/integracion-backend combina estos modulos con dev (8d935d4), incluidos los cambios de asistencia y calendario del equipo.
Se restauraron los montajes GET /api/v1/me/pagos, GET /api/v1/me/pagos/actual y POST /api/v1/alumnos/:id/cuenta, perdidos durante la integracion anterior de dev.
Validacion de la combinacion: npm run typecheck y npm test, con 102 pruebas aprobadas. La prueba adicional comprueba que crear una cuenta de alumno exige autenticacion, rol ADM y un cuerpo valido.
Las dos migraciones nuevas siguen pendientes de aplicacion en el Supabase compartido; las pruebas de Postgres son locales. La integracion se publica en dev sin modificar main.
