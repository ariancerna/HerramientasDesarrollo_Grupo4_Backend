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

## PAG-12 — Pago en línea con Culqi

`POST /api/v1/me/pagos/culqi` (rol ALU). Cuerpo: `{ "token": "tkn_...", "email": "...", "periodo": "AAAA-MM" }`.

- El navegador abre Culqi Checkout con la llave pública y obtiene un token de tarjeta; los datos de la tarjeta nunca pasan por nuestro backend.
- El backend toma el importe de la base de datos (o de la configuración del club si aún no hay cargo del mes actual) y crea el cargo en Culqi con la llave secreta.
- Solo si Culqi aprueba, el pago queda `pagado` con `metodo_pago = 'Tarjeta'` y el id del cargo (`chr_...`) como `codigo_operacion`, y se notifica al alumno.
- Errores: 402 tarjeta rechazada (mensaje de Culqi), 404 período sin mensualidad, 409 ya pagada, 502 Culqi no responde.

### Modo demostración

Si `CULQI_SECRET_KEY` está vacía, el backend usa una pasarela simulada: no contacta a Culqi ni cobra dinero. Acepta los tokens `tkn_demo_...` que genera el formulario de tarjeta del frontend y registra el pago con un código `chr_demo_...`. El token `tkn_demo_rechazada` simula una tarjeta rechazada (HTTP 402). Para pasar a Culqi real basta con configurar las llaves; no hay que cambiar código.

Configuración:

1. Aplicar la migración `20261110120000_pagos_metodo_tarjeta.sql` en Supabase.
2. (Opcional) Definir `CULQI_SECRET_KEY` (llave `sk_test_...` del panel de Culqi) en el `.env` y en Railway. Sin ella se usa el modo demostración.
3. Con Culqi real, usar las tarjetas de prueba de Culqi (por ejemplo Visa `4111 1111 1111 1111`, fecha futura, CVV `123`).
