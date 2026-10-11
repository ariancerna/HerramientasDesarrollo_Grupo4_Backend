# Training schedule endpoints

Base URL: http://localhost:4000/api/v1

All routes require an Authorization Bearer header (Supabase access token) and an
active ADM account in usuarios. Both identifiers must be UUIDs.
Writes are scoped by **both** category and schedule identifiers.

## HOR-03 / SCRUM-99 — DELETE

DELETE /categorias/:id/horarios/:horarioId

- Permanently deletes the schedule. No request body.
- Returns **204**, without a response body.
- Returns **404** if the category or its schedule does not exist, including a
  repeated deletion or a schedule belonging to another category.
- Returns **409** if related records prevent deletion through a foreign key.
- Use cancellation rather than deletion when the schedule must be retained.

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
| 500 | Unexpected server/database failure; internal details are not exposed |

## Local verification

Run npm ci, npm run typecheck, npm test, then npm run dev.

The test command compiles TypeScript and runs Node's built-in test runner.
Tests exercise the actual API router, middleware and Supabase query builder
with an in-memory transport. They use fictional credentials and never contact
the real Supabase project. No extra test dependency is required.

Interactive documentation: http://localhost:4000/api/v1/docs

For a live DELETE check, create disposable fixtures first. Do not delete a real
training schedule just to verify this endpoint.
