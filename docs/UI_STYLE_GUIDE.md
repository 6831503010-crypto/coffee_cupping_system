# UI Style Guide

This guide exists so pages built by different team members still look like the same Coffee Cupping System.

## 1. Visual direction

Use:

- white surfaces
- dark coffee-brown primary accents
- subtle neutral borders
- rounded cards and controls
- restrained shadows
- simple, clean spacing
- the same system font stack used by the cupping form

Avoid introducing unrelated colors, gradients, shadows, or button styles.

## 2. Shared color tokens

Use the variables from `css/theme.css`.

```css
var(--espresso)   /* #3b2418 — primary dark coffee */
var(--roast)      /* #5a3825 — secondary dark brown */
var(--mocha)      /* #7a5138 — medium coffee accent */
var(--crema)      /* #c9935a — warm accent */
var(--latte)      /* #ead8c1 — light coffee accent */
var(--sage)       /* #71806d — status/support color */
var(--sage-soft)  /* #e7ece4 — soft status background */
var(--line)       /* #ded6d0 — shared borders */
var(--danger)     /* #9a3f34 — validation/error state */
```

Final shared surfaces are white:

```css
var(--paper)
var(--foam)
```

## 3. Typography

The shared font stack is:

```css
font-family:
  Inter,
  ui-sans-serif,
  system-ui,
  -apple-system,
  BlinkMacSystemFont,
  "Segoe UI",
  sans-serif;
```

Reuse existing heading, label, help-text, and eyebrow styles instead of defining a new typography system.

## 4. Buttons

Primary action:

```html
<button class="btn primary">Continue</button>
```

or for navigation:

```html
<a class="btn primary btn-link" href="...">Create Session →</a>
```

Secondary action:

```html
<button class="btn secondary">Back</button>
```

Tertiary/outline action:

```html
<button class="btn ghost">Edit</button>
```

Do not create new primary button colors per page.

## 5. Cards and page surfaces

Use:

```html
<main class="panel">...</main>
<section class="section">...</section>
```

Use `feature-card` for landing-page feature cards.

## 6. Forms

Reuse the shared form styles:

- `.score-select`
- `.scale5`
- `.choice3`
- `.aroma-quality-grid`
- `.aroma-quality-option`
- `.cupchecks`
- `.coffee-cup-control`
- `.required-mark`
- validation classes already defined in the shared theme

Required fields should use the existing red `*` convention.

## 7. Page-specific CSS

If your page genuinely needs new layout rules, create:

```text
css/pages/<page-name>.css
```

Load it after `theme.css`.

Do **not** redefine shared colors, `.btn`, `.panel`, `.section`, or other existing shared components unless the team intentionally changes the design system.

## 8. New shared components

If multiple pages need the same new component:

1. discuss it with the team,
2. add it to `css/theme.css`,
3. document it here,
4. update existing pages to reuse it when appropriate.

## 9. Consistency checklist

Before opening a pull request, check:

- [ ] `css/theme.css` is imported.
- [ ] No new brand colors were hard-coded.
- [ ] Existing button classes were reused.
- [ ] Existing card/panel styles were reused where possible.
- [ ] Form controls follow the same rounded white-surface style.
- [ ] Required fields use the shared red `*`.
- [ ] Error states use `var(--danger)`.
- [ ] The page works on a narrow/mobile viewport.
- [ ] Navigation links point to the correct project files.
