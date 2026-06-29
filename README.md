# Mobilidade Universitaria

Sistema de gestao para mobilidade universitaria. O projeto cobre:
- Cadastro e gestao de alunos, motoristas, gestores, veiculos, rotas e viagens
- Reserva e confirmacao de presenca por QR Code
- Dashboard do gestor com indicadores, graficos e relatorios
- Notificacoes, documentos e areas especificas por perfil

## Stack

- Backend: Java 21, Spring Boot, Spring Security, JPA/Hibernate, Flyway
- Frontend: Angular 21, TypeScript
- Banco padrao: PostgreSQL
- Infra local: Docker e Docker Compose

## Estrutura

- `backend/`: API Spring Boot e `docker-compose.yml`
- `backend/mobilidadeUniversitaria/`: codigo-fonte do backend
- `frontend/`: aplicacao Angular
- `backend/start.sh`: sobe PostgreSQL + backend via Docker Compose
- `start.sh`: sobe backend e frontend em ambientes Unix/Git Bash

## Pre-requisitos

### Windows

- Docker Desktop aberto e rodando
- Node.js 22 ou superior
- npm
- Git, recomendado

### Linux/macOS

- Docker e Docker Compose
- Node.js 22 ou superior
- npm
- Git, recomendado

Java e Maven nao sao obrigatorios para o fluxo principal, porque o backend compila dentro do Docker.

## Como Executar No Windows

Abra o Docker Desktop antes de rodar os comandos.

### 1. Subir backend + PostgreSQL

No PowerShell, a partir da raiz do projeto:

```powershell
cd backend
docker compose up -d --build
```

O backend ficara em:

```text
http://localhost:8082
```

O PostgreSQL ficara em:

```text
localhost:5432
```

### 2. Subir frontend

Abra outro PowerShell, a partir da raiz do projeto:

```powershell
cd frontend
npm ci
npm start
```

O frontend ficara em:

```text
http://localhost:4200
```

## Como Executar No Linux/macOS

### Opcao 1: tudo pelo script

```bash
chmod +x start.sh backend/start.sh
./start.sh
```

### Opcao 2: comandos separados

Terminal 1, backend + PostgreSQL:

```bash
cd backend
docker compose up -d --build
```

Terminal 2, frontend:

```bash
cd frontend
npm ci
npm start
```

## Portas

- Frontend: `4200`
- Backend: `8082`
- PostgreSQL: `5432`

O frontend ja aponta para:

```text
http://localhost:8082/api
```

## Banco De Dados

O projeto usa PostgreSQL por padrao. Em ambiente local, o banco roda no Docker.

Dados de conexao local:

```text
Host: localhost
Port: 5432
Database: gocampus
User: gocampus
Password: gocampus123
```

Voce pode consultar com DataGrip, DBeaver, pgAdmin ou pelo terminal:

```bash
cd backend
docker compose exec postgres psql -U gocampus -d gocampus
```

Comandos uteis dentro do `psql`:

```sql
\dt
SELECT * FROM usuario;
SELECT * FROM viagem;
SELECT * FROM flyway_schema_history;
\q
```

Os dados ficam no volume Docker `backend_postgres_data`, nao em arquivos dentro do backend.

Para parar sem apagar o banco:

```bash
cd backend
docker compose down
```

Para apagar containers e resetar o banco local:

```bash
cd backend
docker compose down -v
docker compose up -d --build
```

## Dados Iniciais

O banco local e populado automaticamente pelo Flyway. O seed cria contas de teste com senha `password`.

### Gestor

```text
Email: admin@gocampus.com
Senha: password
```

### Motorista

```text
Email: motorista@gocampus.com
Senha: password
```

### Aluno

```text
Email: aluno@gocampus.com
Senha: password
```

## Comandos Uteis

Ver containers:

```bash
cd backend
docker compose ps
```

Ver logs do backend:

```bash
cd backend
docker compose logs -f backend
```

Ver logs do PostgreSQL:

```bash
cd backend
docker compose logs -f postgres
```

Rebuildar backend:

```bash
cd backend
docker compose up -d --build backend
```

Build do frontend:

```bash
cd frontend
npm run build
```

## Variaveis De Ambiente

Localmente, nao precisa criar `.env`; o `backend/docker-compose.yml` ja define as variaveis do banco.

Para producao, configure variaveis no provedor de deploy, por exemplo Render:

```env
SPRING_DATASOURCE_URL=jdbc:postgresql://HOST:PORT/DATABASE
SPRING_DATASOURCE_USERNAME=USUARIO
SPRING_DATASOURCE_PASSWORD=SENHA
APP_JWT_SECRET=troque-este-segredo
APP_QRCODE_SECRET=troque-este-segredo
APP_CORS_ALLOWED_ORIGINS=https://seu-frontend.com
```

Nao use os segredos locais em producao.

## Troubleshooting

### O backend nao sobe

Verifique se o Docker Desktop esta aberto. Depois rode:

```bash
cd backend
docker compose ps
docker compose logs backend
```

### O frontend nao consegue acessar a API

Confirme se o backend esta em `http://localhost:8082` e se o arquivo `frontend/src/environments/environment.ts` aponta para:

```text
http://localhost:8082/api
```

### A porta 5432 ja esta em uso

Outro PostgreSQL local pode estar rodando. Pare esse servico ou altere a porta exposta no `backend/docker-compose.yml`.

### Quero limpar tudo e recriar o banco

```bash
cd backend
docker compose down -v
docker compose up -d --build
```

## Observacoes

- O backend usa Flyway para criar e atualizar o schema do banco.
- O Hibernate esta configurado com `ddl-auto=validate`, entao ele valida o schema em vez de cria-lo automaticamente.
- O Docker Compose local e para desenvolvimento. Em producao, configure o banco e os segredos no ambiente do provedor.
