# Coffee Cupping System

Coffee Cupping System is a web application for recording and managing coffee cupping evaluations. It supports Individual and Organizational sessions, coffee sample management, evaluator invitations and assignments, aroma and flavor scoring, evaluation timers, session history, and published results. Evaluators finalize their own evaluations, while the session creator separately finalizes the session. The application uses Angular, Spring Boot, MySQL, and Flyway to store and manage session and evaluation data.

## GROUP MEMBERS

6831503004 Bhone Myat Paing  
6831503010 Kyaw Min Khant  
6831503013 Myo Satt Kyaw  
6831503121 Shwe Yee Thein

## How to Run the Project

### 1. Install the prerequisites

- Git
- Node.js 24.18.1
- npm 11.16.0
- Java Development Kit (JDK) 21
- MySQL Server 8.4.x

Verify your installed versions:

```bash
git --version
node -v
npm -v
java --version
```

### 2. Clone the repository

```bash
git clone https://github.com/6831503010-crypto/coffee_cupping_system.git
cd coffee_cupping_system
```

### 3. Create the database

Start MySQL Server and execute:

```sql
CREATE DATABASE IF NOT EXISTS coffee_cupping_db;
```

Flyway creates and updates the application tables when the backend starts. Do not create the application tables manually.

### 4. Configure your local database connection

Create this file:

```text
backend/src/main/resources/application-local.properties
```

Add your own database connection settings:

```properties
spring.datasource.url=jdbc:mysql://localhost:3306/coffee_cupping_db
spring.datasource.username=YOUR_MYSQL_USERNAME
spring.datasource.password=YOUR_MYSQL_PASSWORD
```

Replace the placeholders with your local MySQL credentials.

Keep this configuration file local and excluded from Git. Do not commit passwords, API keys, or tokens.

### 5. Start the backend

Open a terminal in the project root.

**Windows PowerShell:**

```powershell
cd backend
.\mvnw.cmd spring-boot:run
```

**macOS/Linux:**

```bash
cd backend
./mvnw spring-boot:run
```

The backend runs at:

```text
http://localhost:8080
```

Keep the terminal running. Check that startup and Flyway migrations complete successfully.

### 6. Start the frontend

Open a second terminal in the project root:

```bash
cd frontend
npm ci
npm start
```

Open the application at:

```text
http://localhost:4200
```

Keep both terminals and MySQL running while using the application.

### 7. Register and use the application

No shared test login is required. Register a new account through the application's registration page, then log in with that account.

To try the main workflow:

1. Select **Start Cupping** and choose a session mode.
2. Enter session details, configure coffee samples, and set evaluator capacity.
3. In Individual Mode, choose whether the creator will also evaluate. In Organizational Mode, the creator acts only as organizer.
4. Invite or assign evaluators as needed.
5. As an evaluator, select **Begin Evaluation**.
6. Complete the aroma stage, confirm the aroma lock, and complete the flavor stage.
7. Review and finalize the evaluation.
8. As the creator, finalize the whole session.
9. Open **Session History** to review the available results.

To test multiple users, register separate accounts and use separate browser profiles or an incognito window.

### Application Ports

| Component           | Default Port | Address               |
| ------------------- | ------------ | --------------------- |
| Angular frontend    | 4200         | http://localhost:4200 |
| Spring Boot backend | 8080         | http://localhost:8080 |
| MySQL               | 3306         | localhost:3306        |

## Member Responsibilities

| Student ID | Full Name        | Feature Responsibilities                                                                                                                                                                                                                                                           |
| ---------- | ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 6831503004 | Bhone Myat Paing | [To be completed]                                                                                                                                                                                                                                                                  |
| 6831503010 | Kyaw Min Khant   | Individual and Organizational session setup and management; evaluator capacity, invitations, assignments, and participation rules; evaluation and session timers; Q Grader credential verification and badges; session history and result-access controls; session sample locking. |
| 6831503013 | Myo Satt Kyaw    | [To be completed]                                                                                                                                                                                                                                                                  |
| 6831503121 | Shwe Yee Thein   | Profile session set up and home page creation at the initial stge.|
