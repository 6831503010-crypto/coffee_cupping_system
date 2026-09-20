# Publish This Repository to GitHub

This project folder is already initialized as a local Git repository with a `main` branch and an initial commit.

## 1. Create an empty GitHub repository

On GitHub, create a new repository.

Recommended name:

```text
coffee-cupping-system
```

When creating it, leave README, `.gitignore`, and license unchecked because this project already contains its own files.

## 2. Connect this local repository

From the project folder:

```bash
git remote add origin https://github.com/YOUR-USERNAME/coffee-cupping-system.git
git push -u origin main
```

Replace `YOUR-USERNAME` with the GitHub account or organization that owns the repository.

## 3. Invite teammates

In the GitHub repository settings, add your teammates as collaborators.

## 4. Team workflow

Each teammate should clone the repository:

```bash
git clone https://github.com/YOUR-USERNAME/coffee-cupping-system.git
cd coffee-cupping-system
```

Then create a branch for their task:

```bash
git checkout -b feature/landing-page
```

For the landing page, your teammate should mainly work on:

```text
index.html
css/pages/landing.css
```

They should keep this import in `index.html`:

```html
<link rel="stylesheet" href="css/theme.css">
```

That is what keeps the landing page visually consistent with the cupping form.
