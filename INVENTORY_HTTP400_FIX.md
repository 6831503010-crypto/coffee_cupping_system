# Coffee inventory GET /api/samples/mine — HTTP 400 fix

## Diagnosis

The uploaded original `feature-connect-form-endpoint` backend had only
`GET /api/samples/{id}` with `@PathVariable Integer id`. If the newer Angular
inventory page runs against that older backend, `/api/samples/mine` is matched
as the sample ID `mine`, which cannot convert to an integer: HTTP 400.

The updated controller included here explicitly supports `GET /api/samples/mine`
for the logged-in user's own samples and limits the sample ID GET endpoint to
numeric path segments. The Inventory template also avoids mistakenly showing
"inventory is empty" after a failed request.

## Apply

1. Copy these two files over the matching paths in your current
   `feature-connect-form-endpoint` project, keeping all other files unchanged.
2. **Stop the existing Spring Boot process on port 8080 completely**, then
   start the backend again from the project `backend` folder.
   A frontend restart alone cannot update Java controllers.
3. Keep the same authenticated browser session or log in again.
4. Reload `/inventory` and check DevTools > Network > `samples/mine`:
   expected `200 OK` with a JSON array, which may be `[]` for a new user.
5. Ensure `GET /api/auth/me` returns `200` for the same logged-in browser.

No Flyway migration is needed. Do not edit the scoring or teammate evaluation code.

## If 400 persists

In DevTools > Network, click `samples/mine` and inspect the **Response** tab.
If it reports a type mismatch converting `mine` to an Integer, the old backend
is still running or the controller was copied to the wrong package/folder.
Check the terminal logs and which process owns port 8080. If the response
shows a different error, capture that response and corresponding backend log.

**Scope of verification:** Code inspection of uploaded original and merged
projects, with static consistency checks only. Live MySQL/server tests were
not performed.
