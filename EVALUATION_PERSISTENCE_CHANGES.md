# Evaluation saving integration — T08 baseline

Built from the **user-uploaded `feature/t08-evaluator-participation` ZIP**, not from `main` or a live Git checkout. No existing Flyway migration (V1–V5), membership controller, or session creation logic was overwritten.

## Setup

1. **Back up your working tree and database** before merging. If using the changed-files ZIP, extract it and merge its `backend/` and `frontend/` directories into the corresponding project folders, preserving all existing files. If using the full-project ZIP, open that project directly.
2. Keep Flyway V1–V5 unchanged. The only new migration is `backend/src/main/resources/db/migration/V6__typed_evaluation_notes.sql`. It adds an optional `stage` to `text_evaluations`; old unlabeled notes remain `NULL` rather than being misrepresented. A unique index prevents duplicate Aroma/Flavor notes for the same evaluation.
3. In `backend/`, run `./mvnw test` and `./mvnw spring-boot:run` (on Windows use `mvnw.cmd`). Verify the MySQL connection and Flyway V6 application.
4. In `frontend/`, run `npm ci`, `npm run build`, and `npm start`. Use the authenticated Angular app at `http://localhost:4200`.
5. Create/join a T08 session, open the Cupping form, save a draft, reload it, and finalize after completing all samples.

## REST APIs added

- `GET /api/individual-sessions/{sessionId}/my-evaluations`: returns only **this account's** saved scores, selected option names, per-cup results, stage-specific notes, status, and backend total.
- `PUT /api/individual-sessions/{sessionId}/my-evaluations`: atomic save/upsert for the current evaluator across samples. Body: `{ "finalize": false, "samples": [ ... ] }` (or `true` for completion). Each sample uses the **real sessionSampleId**, not its ordinal position. See `EvaluationSubmissionDtos.Sample` for fields.
- `GET /api/individual-sessions/my-evaluation-history`: database-confirmed finalized results for the signed-in evaluator. Browser-only practice remains visibly labeled and can be cleared separately.

The Angular service obtains `/api/csrf`, adds the returned header, and sends session cookies with all requests.

## Score authority and validation

Only the backend calculates the official total and stores it in `evaluations.total_score`; the frontend displays the server-returned value. The shared `CoffeeScoreCalculator` applies the **existing form's** scoring convention:

`total = aromaQuality + flavor + aftertaste + acidity + body + balance + overall + (2 × passed uniformity cups) + (2 × passed clean cups) + (2 × passed sweetness cups) − (failed uniformity cups × configured defect points)`

Dry/Break Aroma, color intensity, acidity intensity, and body level are observations, not part of the summed categories. Scored categories must be 6–10 inclusive in 0.25 steps; intensity fields 1–5; cup numbers exactly 1–5. Draft totals are `null` when incomplete. Finalization validates all required fields, descriptions, the five cups, and defects. Defect points come from the database catalog. Existing legacy parent and cup CRUD endpoints also derive totals on the backend and ignore client-supplied `totalScore`; raw parent CRUD may no longer finalize without saving the children.

These are **the current project's scoring rules**, not a certification that they reproduce a particular official SCA rubric.

## Preservation and safety

- Sessions and memberships are not mutated by evaluation finalization; one evaluator finishing **does not close the session**.
- A session row is locked before membership, using the same lock order as T08 evaluator removal. An existing evaluation blocks membership removal as before.
- A unique evaluator/sample constraint plus transactionally locked upsert avoids duplicate drafts and partial writes.
- The backend rejects other evaluators' writes, mismatched sample IDs, closed sessions, invalid descriptors, and attempts to modify finalized results.
- Idempotent finalization retries succeed only if their content matches already-finalized data; divergent retries receive HTTP 409.
- Legacy `GENERAL`/unlabeled text notes have no reliable Aroma/Flavor origin and are **not silently converted**. New saves use separate `AROMA` and `FLAVOR` rows.
- Browser-only cupping with no session continues as *practice* and has **no authoritative database score**. To save official results, start from a session.
- This implementation requires the reference descriptor and defect catalogs already present in the uploaded branch (V3 development seeder). A production deployment should seed these catalogs separately without demo users/passwords.

## Verification checklist

- [ ] Draft: save each form field, selections, all cup states, and both notes, refresh and confirm fidelity.
- [ ] Retry: save the same draft repeatedly; verify one `evaluations` row per evaluator/sample and one row per cup/stage/checkbox.
- [ ] Two evaluators: scores remain independent; a different judge cannot change another judge's score.
- [ ] Finalize: verify server total, locked read-only form, persisted History, no session-wide closure.
- [ ] Validation: incomplete form, unrecognized catalog names, wrong sessionSampleId, score out of range, notes >1000 characters return errors and roll back.
- [ ] Closed/cancelled session: draft/final mutation rejected; already-finalized data remains readable.
- [ ] Concurrent save/removal: no orphaned evaluations or unintended deletion; regression-test T08 participation.
- [ ] Flyway V6 applies to a copy of the existing MySQL database without modifying old notes.

## Verification performed in this environment

- The new submission service/controller/DTO compiled against lightweight Java API stubs (not the actual Spring runtime).
- All 67 Java source files passed Java 21 syntax parsing.
- All modified TypeScript files passed syntax parsing.
- `CoffeeScoreCalculator` compiled and passed direct numerical smoke checks.
- **Not verified:** real Maven/Spring Boot build, Angular build/template compilation, live MySQL Flyway migration, or end-to-end multiuser HTTP tests. The Maven wrapper could not download Maven; Angular dependencies were absent. Do not treat this as production-verified until those checks pass.
