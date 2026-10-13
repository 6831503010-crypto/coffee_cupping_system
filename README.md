# Coffee Cupping System

A full-stack coffee cupping application developed using Angular, Spring Boot, MySQL, and Flyway.

## 1. Technology Stack

| Technology  | Version          | Purpose                      |
| ----------- | ---------------- | ---------------------------- |
| Node.js     | 24.18.1          | Frontend runtime             |
| npm         | 11.16.0          | Package manager              |
| Angular     | 22.x             | Frontend                     |
| Java        | 21               | Backend development standard |
| Spring Boot | 4.1.1            | REST API                     |
| MySQL       | 8.4.x            | Database                     |
| Flyway      | Managed by Maven | Database migrations          |

**Important:** Use the specified Node.js and npm versions to avoid dependency issues. The backend targets Java 21, even if a newer JDK works locally.

## 2. Project Structure

```text
coffee_cupping_system/
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── guards/       # Authentication and route guards
│   │   │   ├── models/       # TypeScript interfaces
│   │   │   ├── pages/        # Home, Login, Register, Cupping, History
│   │   │   ├── services/     # API communication
│   │   │   └── app.routes.ts # Angular routes
│   │   └── styles.css        # Shared UI theme
│   ├── public/               # Images and static assets
│   ├── package.json
│   └── package-lock.json
│
├── backend/
│   ├── src/main/
│   │   ├── java/th/mfu/cupping/
│   │   │   ├── config/       # Security and application configuration
│   │   │   ├── controller/   # REST endpoints
│   │   │   ├── dto/          # Request/response objects
│   │   │   ├── model/        # JPA entities
│   │   │   ├── repository/   # Database queries
│   │   │   └── service/      # Business logic
│   │   └── resources/
│   │       ├── db/migration/ # Flyway SQL migrations
│   │       └── application.properties
│   ├── pom.xml
│   └── mvnw.cmd
│
├── index.html                # Legacy prototype landing page
├── cupping-form.html         # Legacy prototype cupping form
├── history.html              # Legacy prototype history page
├── css/                      # Legacy prototype styles
├── js/                       # Legacy prototype scripts
├── templates/                # Legacy prototype templates
├── assets/
├── images/
├── docs/
├── README.md
├── CONTRIBUTING.md
└── .gitignore
```

The original HTML/CSS/JavaScript prototype remains the visual and behavioral reference. New development should take place in `frontend/` and `backend/`.

## 3. First-Time Setup

### Step 1 — Clone the repository

```bash
git clone https://github.com/6831503010-crypto/coffee_cupping_system.git
cd coffee_cupping_system
```

### Step 2 — Verify required versions

Open a terminal and run:

```powershell
node -v
npm -v
java --version
```

Expected versions:

```text
Node.js: v24.18.1
npm:     11.16.0
Java:    21
```

If using NVM on Windows:

```powershell
nvm install 24.18.1
nvm use 24.18.1
```

Check `npm -v` afterward. If npm is not `11.16.0`, install the required version:

```powershell
npm install -g npm@11.16.0
```

Use Java 21 for backend development.

### Step 3 — Configure MySQL

Start MySQL Server and create the database:

```sql
CREATE DATABASE IF NOT EXISTS coffee_cupping_db;
```

Then create this local configuration file:

```text
backend/src/main/resources/application-local.properties
```

Add your own local MySQL credentials:

```properties
spring.datasource.username=root
spring.datasource.password=YOUR_MYSQL_PASSWORD
```

The main `application.properties` already contains the database URL, Hibernate validation, Flyway configuration, and server port.

`application-local.properties` is ignored by Git, so each teammate can use their own local MySQL username and password without committing secrets.

**Do not commit `application-local.properties`.**

**Do not manually create application tables. Flyway handles that automatically.**

## 4. Running the Application

Start services in this order:

1. MySQL
2. Spring Boot backend
3. Angular frontend

### Backend

Open a terminal from the project root:

```powershell
cd backend
.\mvnw.cmd spring-boot:run
```

For macOS/Linux:

```bash
cd backend
./mvnw spring-boot:run
```

Backend URL:

`http://localhost:8080`

Health check:

`http://localhost:8080/api/health`

Expected response:

```json
{
  "status": "OK",
  "message": "Coffee Cupping API is running"
}
```

### Frontend

Open a **second terminal** from the project root:

```powershell
cd frontend
npm ci
npm start
```

Frontend URL:

`http://localhost:4200`

Use `npm ci` for the initial installation and after pulling dependency changes. It installs dependencies according to the committed `package-lock.json`.

Keep both terminals running during development.

## 5. Database Migrations — Flyway

Flyway manages the database schema automatically when Spring Boot starts.

Migration files are stored in:

```text
backend/src/main/resources/db/migration/
```

Current migration:

```text
V1__create_users_table.sql
```

### How it works

```text
Start Spring Boot
      ↓
Flyway connects to MySQL
      ↓
Checks flyway_schema_history
      ↓
Executes pending SQL migrations
      ↓
Hibernate validates the schema
      ↓
Backend starts
```

Flyway tracks completed migrations in the `flyway_schema_history` table. A successfully applied migration is not executed again on subsequent startups.

### Adding a new migration

Use the format:

```text
V<version>__<description>.sql
```

Example:

```text
V1__create_users_table.sql
V2__create_coffee_samples_table.sql
V3__create_cupping_sessions_table.sql
```

**Team rules:**

- Never modify a migration that has already been applied and shared.
- Create a new migration for every database schema change.
- Keep migration version numbers unique across branches.
- Coordinate migration numbering before merging pull requests.
- Do not manually modify application tables or use Hibernate `ddl-auto=update`.
- Never delete existing database tables just to rerun migrations.

For example, adding a column requires a new migration:

```sql
ALTER TABLE users
ADD COLUMN role VARCHAR(30) NOT NULL DEFAULT 'USER';
```

The filename should use the next available migration version.

## 6. Authentication

The application supports user registration, login, logout, and authenticated sessions.

Passwords are securely hashed using BCrypt.

Spring Security manages sessions using the `JSESSIONID` cookie.

| Route       | Access         |
| ----------- | -------------- |
| `/login`    | Public         |
| `/register` | Public         |
| `/`         | Login required |
| `/cupping`  | Login required |
| `/history`  | Login required |

The Angular auth guard checks the current session through the Spring Boot API.

**Current development status:** Authentication is connected to MySQL. The cupping evaluation and history workflow still uses browser localStorage until the corresponding REST APIs and database persistence are implemented.

## 7. UI Development Rules

Maintain the visual design established by the original prototype.

Global styles:

```text
frontend/src/styles.css
```

Page-specific styles:

```text
frontend/src/app/pages/<page-name>/
```

Use shared CSS variables for colors, typography, buttons, cards, and form controls.

Avoid duplicating global styles in individual components.

## 8. Git Workflow

1. Pull the latest `main` before starting.
2. Create a separate branch for your task.
3. Make and test your changes.
4. Commit with a meaningful message.
5. Push your branch.
6. Open a pull request.
7. Request review before merging into `main`.

Example:

```bash
git checkout main
git pull origin main
git checkout -b feature/session-api
```

After development:

```bash
git add .
git commit -m "Add session API"
git push -u origin feature/session-api
```

See `CONTRIBUTING.md` for additional collaboration guidelines.

## 9. Troubleshooting

| Problem                          | What to check                                            |
| -------------------------------- | -------------------------------------------------------- |
| `npm ci` fails                   | Node/npm versions and `package-lock.json`                |
| Angular command not found        | Run `npm ci` inside `frontend/`, then `npm start`        |
| Backend fails to start           | Java version, MySQL service, datasource configuration    |
| MySQL connection refused         | MySQL is running on port 3306                            |
| Flyway migration fails           | Migration filename, SQL syntax, migration history        |
| Hibernate reports missing tables | Check whether Flyway successfully ran                    |
| Login fails                      | Backend running, account registered, correct credentials |
| Frontend cannot reach backend    | Both servers running on ports 4200 and 8080              |

## 10. Before Pushing

Make sure:

- The frontend starts successfully.
- The backend starts successfully.
- Database migrations complete without errors.
- Existing authentication and cupping features still work.
- No passwords or other secrets are committed.

Check files before pushing:

```bash
git status
```

Do not commit `node_modules/`, build output, or local credentials.

---

**Team reminder:** Follow this README for environment setup. Keep database changes in Flyway migrations and application development inside `frontend/` and `backend/`.
