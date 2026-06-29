FROM eclipse-temurin:21-jdk-alpine AS build
WORKDIR /app

COPY . .
RUN chmod +x ./mvnw && ./mvnw clean package -DskipTests

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

RUN mkdir -p /app/uploads

COPY --from=build /app/target/mobilidadeUniversitaria-0.0.1-SNAPSHOT.jar app.jar

EXPOSE 8081

ENV SERVER_PORT=8081

ENTRYPOINT ["java", "-jar", "app.jar"]
