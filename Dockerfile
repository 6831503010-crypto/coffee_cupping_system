# Build the Angular frontend
FROM node:24.18.1-bookworm-slim AS frontend-build
WORKDIR /app/frontend

COPY frontend/package.json frontend/package-lock.json ./
RUN npm install -g npm@11.16.0
RUN npm ci

COPY frontend/ ./
RUN npm run build


# Build Spring Boot and include the Angular files
FROM eclipse-temurin:21-jdk-jammy AS backend-build
WORKDIR /app/backend

COPY backend/ ./
RUN chmod +x mvnw

COPY --from=frontend-build /app/frontend/dist/frontend/browser/ ./src/main/resources/static/

RUN ./mvnw -B package -DskipTests


# Run the combined application
FROM eclipse-temurin:21-jre-jammy
WORKDIR /app

COPY --from=backend-build /app/backend/target/coffee-cupping-api-0.0.1-SNAPSHOT.jar ./app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "/app/app.jar"]
