# Coffee Inventory implementation — T08 integrated project

## Added user flows

- **Home** shows a live preview of the signed-in user's three most recently created samples, total samples, and number of samples used in at least one cupping session. Links to the full inventory and Create Sample.
- **My Coffee Inventory** is available at `/inventory`. Users can search/view their saved coffee, create a sample, edit unused samples, and delete unused samples after confirmation.
- **Create Individual Session** retains its existing *Select Existing Sample* and *Create a new sample* options. New samples are staged in the form and inserted into `coffee_samples` when `Create Session` succeeds. A failed/cancelled session creation does not insert them.
- The two workflows use the same sample fields (`CoffeeSampleFields` component) and write to the same `coffee_samples` database table with `created_by` set by the server.

## Backend

- `GET /api/samples/mine`: only the authenticated user's inventory; includes `sessionCount` for each sample. Samples available to a user through a shared cupping session do not appear here.
- Existing `POST /api/samples`, `PUT /api/samples/{id}`, `DELETE /api/samples/{id}`, `GET /api/samples/{id}` are reused; the server sets ownership for creation.
- `PUT` and `DELETE` return HTTP 409 when the sample is already referenced by `session_samples` (including historic sessions). This avoids changing recorded sample metadata and avoids foreign-key violations. Unused samples can be edited/deleted by their owners only.
- Both sample creation routes validate a name, column lengths, and harvest years (1900–2100); no new database columns or Flyway migration.
- `/api/individual-sessions/library` remains available for existing clients; the updated session form now reads the canonical `/api/samples/mine` endpoint.

## Files

### Backend modified

- `backend/src/main/java/th/mfu/cupping/controller/CoffeeSampleController.java`
- `backend/src/main/java/th/mfu/cupping/repository/SessionSampleRepository.java`
- `backend/src/main/java/th/mfu/cupping/dto/CoffeeSampleRequest.java`
- `backend/src/main/java/th/mfu/cupping/dto/IndividualSessionDtos.java`

### Frontend modified

- `frontend/src/app/app.routes.ts`
- `frontend/src/app/pages/home/home.ts`, `.html`, `.css`
- `frontend/src/app/pages/individual-session/individual-session.ts`, `.html`
- `frontend/src/app/services/individual-session.service.ts`
- `frontend/src/app/shared/site-header/site-header.html`

### Frontend added

- `frontend/src/app/services/coffee-inventory.service.ts`
- `frontend/src/app/shared/coffee-sample-fields/coffee-sample-fields.ts`, `.html`, `.css`
- `frontend/src/app/pages/inventory/inventory.ts`, `.html`, `.css`

## Installation

Use the **full-project ZIP** as a replacement checkout of the *uploaded* integrated project, or extract the **changed-files ZIP** at the root of that same code version. Merge directories; replace only the modified files. Do **not** delete your existing project folders. Flyway V1–V6 are unchanged; do not modify applied migrations.

### Run locally

1. Configure MySQL and start the Spring Boot backend as usual (`backend`).
2. Use the Node and npm versions specified in `frontend/package.json` (Node `24.18.1`, npm `11.16.0`).
3. In `frontend`, run `npm ci` and `npm start`.
4. Sign in and open `http://localhost:4200/inventory`.

## Manual verification checklist

1. Sign in as User A and create a new sample in Inventory. Refresh: it should remain listed.
2. Open `/individual/new`: newly created sample should appear in **Saved Samples**. Create a session using it; return to Inventory and confirm it is marked `In 1 session`.
3. Open session creation again, choose **Create a new sample**, enter sample details and code, then create the session. Return to Inventory: the created sample should appear automatically as an owned inventory item.
4. Create a second *unused* sample in Inventory; edit and delete it. Ensure changes survive refresh, and deletion requires confirmation.
5. Try PUT/DELETE on a **used** sample: expect HTTP 409. Try editing another account's sample: expect HTTP 403.
6. Sign in as User B: User A's private inventory must not appear. User B can evaluate a shared session but should not own the session creator's sample.
7. Confirm T07/T08 join and evaluator permissions, evaluation save/reload, and history still function.

## Validation status

TypeScript sources passed a syntax parser. Full Angular compilation and live MySQL/API execution were **not** performed in the authoring environment; the local Node version does not meet this project's declared requirements and the locked npm dependencies are not fully available offline. Complete the manual checks above before deployment.
