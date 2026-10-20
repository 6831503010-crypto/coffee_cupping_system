# Coffee Cupping backend API (V2)

Place the provided `src/main/java/...` files into the same paths in your existing backend. Keep your existing `V1` and `V2` Flyway SQL files. The distribution ZIP includes only files that are new or modified compared with the original backend.

The API uses the **existing session-cookie authentication**. Login: `POST /api/auth/login`. Use `credentials: "include"` in frontend fetch calls. Before `POST`, `PUT`, or `DELETE`, call `GET /api/auth/csrf` and send the returned `headerName` and `token` in a request header. The built-in login and register endpoints keep their existing CSRF exception. Configure MySQL as before.

| Table | Base path | Methods |
|---|---|---|
| users | `/api/users` | GET list (self), GET /{id}, PUT /{id} (name), DELETE /{id}; CREATE with existing `POST /api/auth/register` |
| cupping_sessions | `/api/sessions` | GET, GET /{id}, POST, PUT /{id}, DELETE /{id} |
| coffee_samples | `/api/samples` | GET, GET /{id}, POST, PUT /{id}, DELETE /{id} |
| session_samples | `/api/session-samples` | GET, GET /{id}, POST, PUT /{id}, DELETE /{id} |
| session_evaluators | `/api/session-evaluators` | GET, GET /{id}, POST, PUT /{id}, DELETE /{id} |
| evaluations | `/api/evaluations` | GET, GET /{id}, POST, PUT /{id}, DELETE /{id} |
| defect_cup_evaluations | `/api/defect-cup-evaluations` | GET, GET /{id}, POST, PUT /{id}, DELETE /{id} |
| evaluation_options | `/api/evaluation-options` | GET, GET /{id}, POST, PUT /{id}, DELETE /{id} |
| evaluation_option_selections | `/api/evaluation-option-selections` | GET, GET /{evaluationId}/{optionId}, POST, DELETE /{evaluationId}/{optionId} |
| defect_types | `/api/defect-types` | GET, GET /{id}, POST, PUT /{id}, DELETE /{id} |
| text_evaluations | `/api/text-evaluations` | GET, GET /{id}, POST, PUT /{id}, DELETE /{id} |

All IDs in JSON use camelCase (for example, `sessionId`, `sessionEvaluatorId`, `sampleCode`). Entities map to V2's snake_case database columns.

## Example requests

`POST /api/sessions`
```json
{"sessionName":"Friday cupping","mode":"INDIVIDUAL","description":"Testing beans","cuppingDate":"2026-10-16T14:30:00","resultVisibility":"PRIVATE"}
```
An INDIVIDUAL session automatically creates its one `session_evaluators` row for the logged-in creator.

`POST /api/samples`
```json
{"sampleName":"Ethiopia Natural","process":"NATURAL","harvestYear":2026,"growingLocation":"Sidama","ownerProducer":"Sample Producer"}
```

`POST /api/session-samples`
```json
{"sessionId":1,"sampleId":1,"sampleCode":"A01","displayOrder":1}
```

`POST /api/evaluations`
```json
{"sessionEvaluatorId":1,"sessionSampleId":1,"status":"DRAFT","dryAroma":7,"flavorScore":8.5}
```

`POST /api/evaluation-option-selections`
```json
{"evaluationId":1,"optionId":1}
```

## Permissions and application rules

- Account creation is through `/api/auth/register`, not direct writes to the `users` table. The user API only exposes the current account and only permits changing the name. Qualification status and password hashes cannot be changed with this API.
- Session owner creates, edits and deletes sessions, adds/removes session samples and adds/removes evaluator assignments.
- The coffee sample creator edits/deletes that sample. An evaluator can read samples attached to an accessible session.
- Only the assigned evaluator can create or edit their own evaluation, including per-cup checks, option selections and text. The session creator can read their evaluators' results.
- Public session results become visible to other logged-in users only after the session and the relevant evaluation have been finalized. All endpoints require authentication except the original auth registration/login and health endpoints.
- Individual sessions automatically assign their creator as the only evaluator. Event assignments are added through `/api/session-evaluators`.
- Database foreign keys / unique indexes enforce referential integrity. Attempting to delete a parent that still has children returns HTTP 409; delete children first.
- Each table's `POST` returns HTTP 201; `DELETE` returns HTTP 204; missing resources return HTTP 404.
- Reference tables `defect_types` and `evaluation_options` can be modified by any authenticated user because the original project does not contain an admin role. Restrict this before production.
- `totalScore` accepts the frontend value; it is **not calculated or validated** by the backend because a definitive scoring specification is not present in the provided schema.
- List endpoints filter in Java for simplicity; add database-side pagination and scope queries for production scale.

## Example: CSRF-protected fetch

```js
const csrf = await fetch('http://localhost:8080/api/auth/csrf', {credentials: 'include'}).then(r => r.json());
const response = await fetch('http://localhost:8080/api/sessions', {
  method: 'POST', credentials: 'include',
  headers: {'Content-Type': 'application/json', [csrf.headerName]: csrf.token},
  body: JSON.stringify({sessionName: 'Friday cupping', mode: 'INDIVIDUAL'})
});
```
