# Coffee Cupping System

A shared repository for the Coffee Cupping System prototype.

The current cupping form is the **visual source of truth** for the project.  
The landing page and future pages should reuse the same shared theme so the system looks like one product.

## Current pages

- `index.html` — starter landing page. The team can redesign its content.
- `cupping-form.html` — current multi-step coffee cupping form.
- `templates/page-template.html` — starting point for future pages.

The **Create Session** button in `index.html` links to `cupping-form.html`.

## Shared theme

Every page must load:

```html
<link rel="stylesheet" href="css/theme.css">
```

For files inside subfolders, adjust the relative path, for example:

```html
<link rel="stylesheet" href="../css/theme.css">
```

`css/theme.css` is the shared source of truth for:

- coffee color palette
- typography
- buttons
- cards and panels
- form controls
- borders, shadows, and radii
- validation states
- cupping controls
- shared landing-page helpers

### Team rule

**Do not copy the theme into a separate `<style>` block.**

If a page needs styling that is unique to that page, create a file under:

```text
css/pages/
```

and load it **after** `theme.css`.

Example:

```html
<link rel="stylesheet" href="css/theme.css">
<link rel="stylesheet" href="css/pages/landing.css">
```

Use the shared CSS variables instead of hard-coded brand colors.

## Folder structure

```text
coffee-cupping-system/
├── index.html
├── cupping-form.html
├── README.md
├── CONTRIBUTING.md
├── .editorconfig
├── .gitignore
├── .github/
│   └── pull_request_template.md
├── assets/
├── css/
│   ├── theme.css
│   └── pages/
├── docs/
│   └── UI_STYLE_GUIDE.md
├── js/
│   ├── cupping-form.js
│   └── pages/
└── templates/
    └── page-template.html
```

## Running locally

There is no build step.

### Easiest option

Open the project folder in VS Code and run it with **Live Server**.

Start from:

```text
index.html
```

You can also open the HTML files directly in a browser.

## Git workflow

Recommended team workflow:

1. Keep `main` stable.
2. Create one branch per task.
3. Pull the latest `main` before starting.
4. Open a pull request when the task is ready.
5. Check the UI against `docs/UI_STYLE_GUIDE.md`.
6. Merge only after another teammate reviews it.

Example branch names:

```text
feature/landing-page
feature/session-history
feature/event-dashboard
fix/form-validation
```

See `CONTRIBUTING.md` for the collaboration rules.

## Important

Before changing `css/theme.css`, check with the team. A theme change affects every page that imports it.

## Publishing to GitHub

See `docs/GITHUB_SETUP.md` for the exact push and collaborator setup steps.
