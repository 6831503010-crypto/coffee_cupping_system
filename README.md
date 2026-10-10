# Coffee Cupping System

A shared repository for the Coffee Cupping System.

The project is being developed as a full-stack application using:

- **Angular** — frontend
- **Spring Boot REST API** — backend
- **MySQL** — database
- **Flyway** — database schema migrations

The original HTML/CSS/JavaScript prototype remains a visual and behavioral reference for the application.

---

## Technology Stack

### Frontend

- Angular
- TypeScript
- HTML
- CSS

### Backend

- Spring Boot
- Spring Web
- Spring Data JPA
- Spring Security
- Bean Validation
- BCrypt password hashing
- Maven

### Database

- MySQL
- Flyway migrations

---

## Project Structure

```text
coffee-cupping-system/
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── guards/
│   │   │   │   └── auth.guard.ts
│   │   │   │
│   │   │   ├── models/
│   │   │   │   ├── auth-user.ts
│   │   │   │   ├── aroma-evaluation.ts
│   │   │   │   ├── coffee-sample.ts
│   │   │   │   └── flavor-evaluation.ts
│   │   │   │
│   │   │   ├── pages/
│   │   │   │   ├── home/
│   │   │   │   ├── login/
│   │   │   │   ├── register/
│   │   │   │   ├── cupping/
│   │   │   │   └── history/
│   │   │   │
│   │   │   ├── services/
│   │   │   │   └── auth.service.ts
│   │   │   │
│   │   │   ├── app.config.ts
│   │   │   └── app.routes.ts
│   │   │
│   │   └── styles.css
│   │
│   ├── public/
│   │   └── images/
│   │
│   ├── package.json
│   └── angular.json
│
├── backend/
│   ├── src/
│   │   └── main/
│   │       ├── java/
│   │       │   └── th/
│   │       │       └── mfu/
│   │       │           └── cupping/
│   │       │               ├── config/
│   │       │               ├── controller/
│   │       │               ├── dto/
│   │       │               ├── model/
│   │       │               ├── repository/
│   │       │               └── service/
│   │       │
│   │       └── resources/
│   │           ├── db/
│   │           │   └── migration/
│   │           │       └── V1__create_users_table.sql
│   │           │
│   │           └── application.properties
│   │
│   ├── pom.xml
│   ├── mvnw
│   └── mvnw.cmd
│
├── docs/
├── README.md
├── CONTRIBUTING.md
├── .editorconfig
└── .gitignore
```

### Important Directories

`frontend/` contains the Angular application.

The main Angular pages are located under:

```text
frontend/src/app/pages/
```

Shared application logic such as authentication is located under:

```text
frontend/src/app/services/
```

Route protection is located under:

```text
frontend/src/app/guards/
```

---

`backend/` contains the Spring Boot REST API.

Java source code is located under:

```text
backend/src/main/java/th/mfu/cupping/
```

The backend is organized into packages such as:

```text
controller/   REST API endpoints
service/      business logic
repository/   database access using Spring Data JPA
model/        JPA entities
dto/          request and response objects
config/       Spring configuration and security configuration
```

Database migration files are located under:

```text
backend/src/main/resources/db/migration/
```

---

## Prerequisites

Before running the project, make sure the following are installed:

```text
Node.js
npm
Java 21 or later
MySQL Server
Git
```

The project currently uses the MySQL database:

```text
coffee_cupping_db
```

Create the database before starting the backend:

```sql
CREATE DATABASE coffee_cupping_db;
```

Application tables should normally be created by **Flyway**, not manually.

---

# Running the Project

The frontend and backend must run separately.

The recommended startup order is:

```text
1. Start MySQL
2. Start Spring Boot backend
3. Start Angular frontend
```

---

## Running the Backend

Open a terminal in the project root:

```powershell
cd backend
```

On Windows:

```powershell
.\mvnw.cmd spring-boot:run
```

On macOS/Linux:

```bash
./mvnw spring-boot:run
```

The backend runs by default at:

```text
http://localhost:8080
```

You can verify that it is running using:

```text
http://localhost:8080/api/health
```

Expected response:

```json
{
  "status": "OK",
  "message": "Coffee Cupping API is running"
}
```

---

## Running the Frontend

Open another terminal:

```powershell
cd frontend
```

Install dependencies when running the project for the first time or after dependencies have changed:

```powershell
npm install
```

Start Angular:

```powershell
npm start
```

Alternatively:

```powershell
ng serve
```

The Angular application runs at:

```text
http://localhost:4200
```

Keep both the frontend and backend terminals running while developing the application.

---

# Database Migrations with Flyway

The project uses **Flyway** to manage the MySQL database schema.

Instead of manually creating or modifying tables, database changes are stored as SQL migration files.

Migration files are located in:

```text
backend/src/main/resources/db/migration/
```

For example:

```text
V1__create_users_table.sql
```

The filename follows this format:

```text
V<version>__<description>.sql
```

Examples:

```text
V1__create_users_table.sql
V2__create_coffee_samples_table.sql
V3__create_cupping_sessions_table.sql
V4__create_session_samples_table.sql
```

There must be **two underscores** between the version number and description.

---

## How Flyway Works

When Spring Boot starts:

```text
Spring Boot starts
        ↓
Flyway connects to MySQL
        ↓
Flyway checks flyway_schema_history
        ↓
Flyway finds migrations that have not been executed
        ↓
Missing migrations are executed in version order
        ↓
Migration result is recorded
        ↓
Hibernate validates the resulting database schema
        ↓
Application starts
```

For example, when a new developer runs the backend for the first time:

```text
V1__create_users_table.sql
```

is executed automatically.

Flyway also creates its own table:

```text
flyway_schema_history
```

This table records which migrations have already been executed.

Therefore, Flyway will not run the same migration again every time the application starts.

---

## Migration Rules for the Team

Once a migration has been committed and executed by the team, **do not modify that migration file**.

For example, suppose this already exists:

```text
V1__create_users_table.sql
```

and later we decide to add a new column to `users`.

Do not modify `V1`.

Instead create:

```text
V2__add_role_to_users.sql
```

Example:

```sql
ALTER TABLE users
ADD COLUMN role VARCHAR(30) NOT NULL DEFAULT 'USER';
```

The database history then becomes:

```text
V1 → Create users table
V2 → Add role to users
V3 → Create coffee samples
V4 → Create cupping sessions
...
```

This allows every team member's database to evolve in the same order.

---

## Hibernate and Flyway

Flyway is responsible for changing the database structure.

Hibernate is configured to validate that the JPA entities match the database schema.

```properties
spring.jpa.hibernate.ddl-auto=validate
```

Therefore:

```text
Flyway
→ Creates and modifies tables

Hibernate/JPA
→ Validates the schema

Spring Data JPA
→ Reads and writes application data
```

Do not change Hibernate back to:

```properties
spring.jpa.hibernate.ddl-auto=update
```

without discussing it with the team, because schema changes should now be handled through Flyway migrations.

---

# Authentication

The application currently supports:

```text
Register
Login
Current user session
Protected routes
Logout
```

Passwords are hashed using BCrypt before being stored in MySQL.

Authentication uses a Spring Security server-side session.

After login, Spring Boot creates a session and the browser receives a:

```text
JSESSIONID
```

cookie.

The following Angular routes require authentication:

```text
/
/cupping
/history
```

The following routes are public:

```text
/login
/register
```

The Angular authentication guard verifies the current session through the backend before allowing access to protected pages.

---

# Shared UI Theme

The migrated Angular application should continue following the visual design established by the original prototype.

The shared Angular styles are primarily located in:

```text
frontend/src/styles.css
```

Page-specific styles should remain inside the corresponding Angular component.

For example:

```text
frontend/src/app/pages/cupping/cupping.css
frontend/src/app/pages/history/history.css
frontend/src/app/pages/login/login.css
```

Shared colors, typography, spacing, buttons, cards, form controls, borders, and validation styles should remain consistent across the application.

---

# Git Workflow

Recommended team workflow:

1. Keep `main` stable.
2. Create one branch per task.
3. Pull the latest `main` before starting.
4. Make database changes through new Flyway migrations.
5. Never edit migrations that have already been shared and executed.
6. Open a pull request when the task is ready.
7. Have another teammate review the pull request before merging.

Example branch names:

```text
feature/authentication
feature/cupping-session-api
feature/session-history
feature/event-dashboard
fix/form-validation
```

See `CONTRIBUTING.md` for additional collaboration rules.

---

# Local Configuration and Secrets

Do not commit database passwords, API keys, or other credentials to GitHub.

Developer-specific database credentials should remain in local configuration files that are ignored by Git.

Before pushing changes, always check:

```powershell
git status
```

to make sure local secrets are not being committed.

---

# Current Database Migrations

The current migration history starts with:

```text
V1__create_users_table.sql
```

This creates the `users` table used by the registration and authentication system.

Future database tables from the Coffee Cupping ERD will be added as new Flyway migration versions.
