# Dashboards por rol — DSH-01, DSH-02 y DSH-03

Implementación de SCRUM-140, SCRUM-141 y SCRUM-142. Las rutas están bajo el
prefijo `/api/v1`; todos los resultados exitosos usan `{ "data": ... }`.
Los contratos TypeScript están en `src/modules/dashboard/dashboard.types.ts`.

| Endpoint | Rol requerido | Alcance |
| --- | --- | --- |
| `GET /api/v1/dashboard/admin` | `ADM` | Todo el club |
| `GET /api/v1/dashboard/profesor` | `PROF` | Categorías del profesor autenticado |
| `GET /api/v1/dashboard/alumno` | `ALU` | Alumno vinculado a la cuenta autenticada |

Enviar `Authorization: Bearer <accessToken>` de Supabase Auth. No se aceptan
IDs de alumno/profesor por query o body: el middleware obtiene la identidad y
el rol desde `usuarios`. Las cuentas deshabilitadas no tienen acceso.

## DSH-01: administrador

```json
{
  "data": {
    "alumnos": { "total": 3, "activos": 2, "inactivos": 1 },
    "asistenciasHoy": 2,
    "pagos": { "vencidos": 2, "pendientes": 1 },
    "proximasActividades": [],
    "ultimosRegistros": []
  }
}
```

- `alumnos`: conteos exactos, no limitados a la primera página de Supabase.
- `asistenciasHoy`: registros cuya `fecha` corresponde a hoy en Lima.
- `pagos`: cantidad de mensualidades, no de alumnos. Un pago `pendiente` con
  vencimiento anterior a hoy se cuenta como `vencido`; el día de vencimiento
  aún se considera pendiente. No se modifica la tabla al consultar.
- `proximasActividades`: hasta 5 entrenamientos/eventos ordenados por fecha.
- `ultimosRegistros`: hasta 5 asistencias recientes, con
  `id`, `estudianteId`, `estudiante`, `categoria`, `fechaHora` y `metodo`.

## DSH-02: profesor

```json
{
  "data": {
    "categorias": [{ "id": "uuid", "nombre": "Sub-17" }],
    "alumnosAsignados": 2,
    "alumnosSinEvaluacion": 1,
    "proximasSesiones": [],
    "misEvaluaciones": []
  }
}
```

- Las categorías provienen de `profesores_categorias` para el profesor del token.
- `alumnosAsignados`: padrón completo de sus categorías, incluidos inactivos.
- `alumnosSinEvaluacion`: alumnos asignados sin ninguna evaluación registrada
  por este profesor. No implica un plazo de evaluación inventado.
- `proximasSesiones`: hasta 5 actividades de sus categorías y eventos generales;
  un evento general aparece una sola vez aunque tenga varias categorías.
- `misEvaluaciones`: hasta 5 evaluaciones recientes, exclusivamente de este
  profesor para alumnos actualmente en sus categorías. Campos:
  `id`, `alumnoId`, `fecha`, `rendimientoTecnico`, `rendimientoFisico`, `actitud`,
  `observaciones`. Las notas opcionales sin valor se devuelven como `null`.
- Sin categorías, el profesor obtiene listas vacías y conteos cero, además de
  los eventos generales disponibles.

## DSH-03: alumno

```json
{
  "data": {
    "mensualidadActual": {
      "id": "uuid", "periodo": "2026-10", "monto": 180,
      "estado": "vencido", "vencimiento": "2026-10-05",
      "fechaPago": null, "metodoPago": null
    },
    "asistenciasDelMes": 1,
    "proximaActividad": null,
    "anuncios": [],
    "movimientos": []
  }
}
```

- `mensualidadActual`: mensualidad del periodo más reciente registrado, igual
  que en el frontend actual; `null` si no existe. Monto numérico en soles. El
  estado se normaliza por vencimiento al igual que en Admin.
- `asistenciasDelMes`: conteo exacto de registros del mes calendario de Lima.
- `proximaActividad`: primera actividad de su categoría o evento general;
  `null` si no hay agenda. Un alumno sin categoría puede ver eventos generales.
- `anuncios`: hasta 5 anuncios `enviado` en los que aparece explícitamente en
  `anuncios_destinatarios`. Nunca se incluyen borradores ni mensajes de otros
  alumnos. Campos: `id`, `titulo`, `mensaje`, `fechaCreacion`.
- `movimientos`: hasta 5 asistencias y pagos realizados, combinados y ordenados
  del más reciente al más antiguo. Campos: `id`, `tipo` (`asistencia`/`pago`),
  `fecha`, `titulo`, `detalle`. Como `pagos.fecha_pago` solo guarda un día, se
  utiliza mediodía de Lima para ordenarlo; no representa la hora real del pago.

## Agenda y errores

Las actividades incluyen `id`, `tipo`, `titulo`, `fecha`, `horaInicio`, `horaFin`,
`ubicacion`, `categoriaId`, `categoria`. Las fechas son `YYYY-MM-DD`, las horas
`HH:mm`; `horaFin` y categoría pueden ser `null` para eventos generales.

Se expanden los horarios activos desde hoy hasta 35 días después, incluyendo
los extremos. Se normalizan los días en español con o sin tilde. Los eventos
se consultan por su fecha real, incluso si quedan fuera de esa ventana.
Se excluyen actividades cuyo inicio ya pasó en `America/Lima`.

| Código HTTP | Situación |
| --- | --- |
| `200` | Resumen, también cuando no hay datos (ceros, listas vacías y `null`) |
| `401` | Falta token, token inválido o cuenta no configurada en `usuarios` |
| `403` | Rol distinto, cuenta deshabilitada o alumno sin `estudiante_id` |
| `404` | Perfil de alumno/profesor vinculado inexistente |
| `500` | Error de base de datos; no se sustituye por un resumen vacío |

No se consultan correos, DNI, teléfonos, claves ni tokens para armar el
dashboard. Los GET no realizan escrituras ni ejecutan migraciones.

## Pruebas y ejecución

```powershell
npm ci
npm run typecheck
npm test
```

`npm test` compila TypeScript y ejecuta pruebas con `node:test`, el SDK real
de Supabase con transporte HTTP simulado y un servidor Express local temporal.
Usa exclusivamente credenciales ficticias: no requiere `.env`, no conecta a
Supabase y no altera datos. Cubre conteos, alcance por usuario, pagos vencidos,
límites de paginación, fechas, agenda, errores y matriz de permisos HTTP.

Para verificar contra la base real, configura `.env` siguiendo `.env.example`,
con las credenciales del equipo, e inicia `npm run dev`. El esquema requerido
es el de `supabase/migrations/001_initial_schema.sql`; no se agregó una migración.
En `http://localhost:4000/api/v1/docs`, inicia sesión con cada rol, copia su
`accessToken` en **Authorize** y prueba su endpoint. Con el token de Alumno,
Admin/Profesor deben responder `403`; sin token, los tres deben responder `401`.

Ejemplo desde PowerShell, usando un token válido obtenido al iniciar sesión:

```powershell
$tokenDashboard = Read-Host 'Pega el accessToken del rol a comprobar'
Invoke-RestMethod -Uri 'http://localhost:4000/api/v1/dashboard/admin' `
  -Headers @{ Authorization = "Bearer $tokenDashboard" } |
  ConvertTo-Json -Depth 10
```

Para Profesor/Alumno cambia la última parte de la URL por `profesor` o `alumno`
y utiliza el token del rol correspondiente. Esta implementación no cambia el
frontend: conectar sus pantallas a estos GET es un trabajo separado.
