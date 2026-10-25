# Inventory merge — feature/connect-form-endpoint baseline

This patch is based on the uploaded `coffee_cupping_system-feature-connect-form-endpoint.zip`, **not** the earlier score-preview/average branch.

## What changed

- Home page: "My Coffee Inventory" preview (last 3 owned samples, counts) and New Sample/View All links.
- Nav bar: Inventory link; new `/inventory` route.
- Inventory: list, search, create, edit, delete your own coffee samples, with confirmation.
- Backend: `GET /api/samples/mine` returns only authenticated user's samples and a `sessionCount` per sample. Existing `POST /api/samples`, `PUT /api/samples/{id}`, and `DELETE /api/samples/{id}` are reused.
- Samples already assigned to any session are read-only; updating or deleting them returns HTTP 409 to protect historical cupping data.
- Validations for sample details/harvest year were strengthened.
- Cupping Review: removed **only** the Final Score `— / 100` card and outdated preview wording. The backend calculation and persistence logic are untouched.

## Preserved from your newer teammate branch

- Existing `sample-create-modal` and the enhanced session creation validation were NOT replaced by the older Inventory patch.
- Creating a new coffee sample while creating a session still works. The new sample is inserted into `coffee_samples` only after successfully creating the session, and therefore appears in Inventory.
- Session evaluator participation, authorization, evaluation saving and finalization, and all existing Flyway migrations remain unchanged.
- Score-preview and sample-results average endpoints are **not** imported from the abandoned total-score update.

## Installation

Copy the directories `backend/` and `frontend/` from `changed_files` over the same directories of your *feature/connect-form-endpoint* project, **merging** folders and **replacing only matching files**. Do not delete your existing directories. Or use the full updated project ZIP directly.

No additional Flyway migration is required. Authentication with cookies and CSRF is required for editing via the inventory API.

## Recommended local verification

1. Log in, visit `/inventory`, add a sample. Confirm it appears on Home and in session setup's saved-sample selector.
2. Edit and delete an unused sample. Confirm the changes persist in MySQL.
3. Create a session with a new inline coffee sample. After successful creation, revisit Inventory and confirm the sample appears there.
4. Create a session using an existing inventory sample; confirm its session usage count increments and its edit/delete buttons disappear. Direct PUT/DELETE calls must return HTTP 409.
5. Log in as another user and confirm this user's private inventory cannot be edited or viewed as that user's own inventory.
6. Open the cupping Review screen; confirm no `— / 100` card appears. Confirm saved evaluations and backend score calculation still work.
7. Run Angular build and backend Maven tests locally; these full checks could not run in the current offline environment (Angular dependencies/required Node version unavailable).
