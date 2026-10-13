# Contrato acordado: pagos y mensualidades

## PAG-02 — Estado mensual

- `filtro` acepta `todos`, `alDia` y `porPagar`; si se omite, usa `todos`.
- La consulta incluye a todos los alumnos activos, incluso si aún no tienen cargo en el período.
- `alDia` muestra solo alumnos cuyo pago está `pagado`.
- `porPagar` muestra pagos `pendiente` o `vencido`, además de alumnos sin cargo.
- Si el alumno no tiene fila en `pagos`, la respuesta muestra `estado: "sin_cargo"` y `pago: null`; no se crea un registro ficticio.
- `totales.alumnos`, `totales.alDia` y `totales.porPagar` se calculan después de aplicar el filtro.

## PAG-11 — Mensualidad actual del alumno

- El período vigente se calcula con el año y mes actuales en la zona horaria `America/Lima`, compartida con las reglas temporales del dashboard.
- La identidad del alumno se obtiene del token autenticado; el cliente no envía un `estudianteId`.
- Si no existe un pago para el período vigente, responde HTTP 200 con `{ "data": null }`.

## PAG-03 — Crear cargo

- La pareja `(alumno_id, periodo)` identifica un cargo único en la base de datos.
- Si ya existe un cargo para esa pareja, responde HTTP 409 con el código `CONFLICT`.
- La restricción única de la base de datos es la autoridad final, incluyendo intentos concurrentes.
