# Training schedule endpoints

Base URL: http://localhost:4000/api/v1

All routes require an Authorization Bearer header (Supabase access token).
All active roles can read; only ADM can write. Both identifiers must be UUIDs.
Writes are scoped by **both** category and schedule identifiers.

## HOR-03 / SCRUM-99 — DELETE

DELETE /categorias/:id/horarios/:horarioId

- Permanently deletes the schedule. No request body.
- Returns **204**, without a response body.
- Returns **404** if the category or its schedule does not exist, including a
  repeated deletion or a schedule belonging to another category.
- Returns **409** if related records prevent deletion through a foreign key.
- Use cancellation rather than deletion when the schedule must be retained.

## HOR-04 / SCRUM-100 — PATCH

PATCH /categorias/:id/horarios/:horarioId

Send a JSON object with **at least one** supported field. Omitted fields are
preserved. Unknown fields (including id, categoriaId and database snake_case
names) are rejected, not silently ignored.

| Field | Accepted value |
| --- | --- |
| dia | lunes, martes, miércoles, jueves, viernes, sábado, domingo |
| horaInicio | HH:mm or HH:mm:ss, 00:00 through 23:59:59 |
| horaFin | Same format; must be strictly after the resulting start time |
| cancha | Trimmed nonempty text, maximum 200 characters; null clears it |
| estado | activo or cancelado |

Days are normalized to lowercase and trimmed, retaining Spanish accents.
Null is only accepted for cancha. Overnight intervals are not supported by the
existing database constraint. Updating only one hour still validates it against
the other stored hour. The SQL constraint remains the final safeguard during
concurrent updates. A row disappearing before the write returns 404.

Example request:

    {
      "dia": "miércoles",
      "horaInicio": "18:00",
      "horaFin": "20:00",
      "cancha": "Cancha 2",
      "estado": "activo"
    }

Cancellation without deletion:

    { "estado": "cancelado" }

Response **200**:

    {
      "data": {
        "id": "<schedule UUID>",
        "categoriaId": "<category UUID>",
        "dia": "miércoles",
        "horaInicio": "18:00",
        "horaFin": "20:00",
        "cancha": "Cancha 2",
        "estado": "activo",
        "createdAt": "2026-10-11T00:00:00Z"
      }
    }

Response times omit zero seconds but retain significant seconds, e.g. 18:00:30.
The integration retains GET/POST collection routes and GET/PUT detail routes
from dev, alongside PATCH and DELETE. PUT remains a compatibility alias.
POST uses HH:mm and a 100-character court limit; partial updates retain the
previous PATCH contract. At most one schedule per category/day is allowed, even
if cancelled; duplicate days return 409. Apply the existing
*_horarios_dia_unico.sql migration before live use. It refuses duplicates without
deleting data. Swagger operation IDs distinguish CREATE and the PUT alias from
HOR-03 DELETE and HOR-04 PATCH in SCRUM-99/100.

## Errors

Errors use the existing error envelope with code and message; validation errors
may include details.

| HTTP | Meaning |
| --- | --- |
| 400 | Invalid UUID or request data |
| 401 | Missing/invalid token or account not configured |
| 403 | Inactive account or role other than ADM |
| 404 | Category or nested schedule not found |
| 409 | Related records prevent deletion |
| 413 | JSON body exceeds Express's existing size limit |
| 500 | Unexpected server/database failure; internal details are not exposed |

## Local verification

Use Node.js 22 or newer (required by the installed Supabase SDK).

Run npm ci, npm run typecheck, npm test, then npm run dev.

The test command compiles TypeScript and runs Node's built-in test runner.
Tests exercise the actual API router, middleware and Supabase query builder
with an in-memory transport. They use fictional credentials and never contact
the real Supabase project. No extra test dependency is required.

Interactive documentation: http://localhost:4000/api/v1/docs

For a live DELETE check, create disposable fixtures first. Do not delete a real
training schedule just to verify this endpoint.

To check PATCH interactively, sign in as an administrator, open Swagger, authorize
with the returned access token and provide existing category/schedule UUIDs.
First send a state-only change; then edit the hours and verify the response.
Test an invalid interval and a non-ADM token: expect 400 and 403 respectively.
The mock suite does not validate the team's Supabase deployment or real JWTs.
Live verification requires a reachable, correctly configured Supabase project.
