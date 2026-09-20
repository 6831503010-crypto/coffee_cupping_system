# Contributing

## Branch workflow

Do not work directly on `main` for feature development.

Create a branch:

```bash
git checkout main
git pull
git checkout -b feature/your-feature-name
```

Commit your work:

```bash
git add .
git commit -m "Add landing page hero"
```

Push your branch:

```bash
git push -u origin feature/your-feature-name
```

Then open a pull request into `main`.

## Before coding a page

1. Read `docs/UI_STYLE_GUIDE.md`.
2. Import `css/theme.css`.
3. Check `templates/page-template.html`.
4. Reuse existing classes before creating new ones.

## Theme changes

`css/theme.css` is shared by the entire system.

Do not change shared colors, buttons, cards, form controls, spacing conventions, or validation styling without team agreement.

If a style is unique to one page, put it under `css/pages/`.

## JavaScript

- Keep page-specific logic in `js/` or `js/pages/`.
- Avoid placing large scripts directly inside HTML.
- Do not rename shared HTML/CSS classes used by other pages without checking their usage.

## Pull request checklist

- Page follows the shared theme.
- Links work.
- No accidental inline theme duplication.
- No unrelated files were changed.
- Tested in a browser.
- Tested at desktop and narrow/mobile width.
