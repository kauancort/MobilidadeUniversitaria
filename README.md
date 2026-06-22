# Mobilidade Universitária

Sistema de gestão para mobilidade universitária. O projeto cobre:
- Cadastro e gestão de alunos, motoristas, gestores, veículos, rotas e viagens
- Reserva e confirmação de presença por QR Code
- Dashboard do gestor com indicadores, gráficos e relatórios
- Notificações, documentos e áreas específicas por perfil

## Visão Geral

O repositório está dividido em dois blocos principais:
- `backend/`: API Java com Spring Boot
- `frontend/`: aplicação Angular

O projeto já possui dados iniciais de desenvolvimento via Flyway, então é possível subir a aplicação localmente e entrar com contas de teste sem criar tudo do zero.

## Stack

- Backend: Java 21, Spring Boot, Spring Security, JPA/Hibernate, Flyway
- Frontend: Angular 21, TypeScript
- Banco local padrão: H2 file-based
- Banco alternativo para produção: PostgreSQL
- Infra local opcional: Docker e Docker Compose

## Pré-requisitos

### Obrigatórios
- Java 21 ou superior
- Node.js 22 ou superior
- npm

### Recomendados
- Docker e Docker Compose, para usar o fluxo automatizado de inicialização
- Git

## Estrutura do repositório

- `backend/start.sh`: compila o backend e sobe o container da API
- `backend/docker-compose.yml`: define o backend e um PostgreSQL auxiliar
- `backend/mobilidadeUniversitaria/`: código-fonte Spring Boot
- `frontend/`: aplicação Angular
- `start.sh`: script da raiz que sobe backend + frontend

## Como executar localmente

Existem dois jeitos de rodar o projeto.

### Opção 1: fluxo recomendado

Use o script da raiz. Ele sobe o backend e depois inicia o frontend:

```bash
chmod +x start.sh backend/start.sh
./start.sh
```

Neste fluxo:
- O backend fica disponível em `http://localhost:8082`
- O frontend fica disponível em `http://localhost:4200`

Esse é o caminho mais simples porque o frontend já aponta para `http://localhost:8082/api`.

### Opção 2: execução manual

Se você não quiser usar Docker, pode subir cada parte separadamente.

#### Backend

```bash
cd backend/mobilidadeUniversitaria
chmod +x mvnw
./mvnw spring-boot:run
```

Por padrão, o backend sobe em `http://localhost:8081`.

Se for usar o frontend sem Docker, você tem duas opções:
- Alterar `frontend/src/environments/environment.ts` para apontar para a porta do backend
- Ou iniciar o backend com `SERVER_PORT=8082`

Exemplo:

```bash
cd backend/mobilidadeUniversitaria
SERVER_PORT=8082 ./mvnw spring-boot:run
```

#### Frontend

```bash
cd frontend
npm ci
npm start
```

O frontend fica em `http://localhost:4200`.

## Portas padrão

- Frontend: `4200`
- Backend em modo Docker: `8082`
- Backend em execução manual: `8081` por padrão
- H2 Console: depende da porta do backend em execução

## Banco de dados

### Padrão local

O backend usa H2 file-based por padrão, com persistência em:

```text
backend/mobilidadeUniversitaria/data/gocampusdb
```

Isso significa que os dados permanecem entre reinicializações, a menos que o arquivo seja removido.

### Produção / PostgreSQL

Ao ativar o profile `prod`, o backend usa PostgreSQL. As variáveis esperadas são:

- `DB_HOST`
- `DB_PORT`
- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`

Exemplo:

```bash
cd backend/mobilidadeUniversitaria
SPRING_PROFILES_ACTIVE=prod \
DB_HOST=localhost \
DB_PORT=5432 \
DB_NAME=gocampus \
DB_USER=gocampus \
DB_PASSWORD=gocampus123 \
./mvnw spring-boot:run
```

## Docker

### Backend containerizado

O script `backend/start.sh`:
- Compila o backend
- Sobe o container `gocampus-backend`
- Expõe a API na porta `8082`

Execute:

```bash
chmod +x backend/start.sh
./backend/start.sh
```

### Compose local

O arquivo `backend/docker-compose.yml` também define um serviço PostgreSQL para cenários em que você queira evoluir a infraestrutura local. No estado atual do projeto, o backend containerizado usa H2 file-based por padrão, com persistência em volume.

## Credenciais de teste

O seed inicial cria contas de exemplo com a senha `password`.

### Gestor
- Email: `admin@gocampus.com`
- Senha: `password`

### Motorista
- Email: `motorista@gocampus.com`
- Senha: `password`

### Aluno
- Email: `aluno@gocampus.com`
- Senha: `password`

## Principais módulos da aplicação

### Área do gestor
- Dashboard com KPIs
- Gestão de usuários
- Gestão de rotas
- Gestão de veículos
- Gestão de viagens
- Relatórios
- Documentos
- Notificações
- Configurações

### Área do motorista
- Dashboard
- Viagens do dia
- Scanner QR Code
- Confirmação de presença
- Perfil e notificações

### Área do aluno
- Dashboard
- Reserva de presença
- QR Code
- Rastreamento
- Perfil e notificações

## API e configuração importante

### CORS

As origens liberadas ficam em `backend/mobilidadeUniversitaria/src/main/resources/application.properties`:

- `http://localhost:3000`
- `http://localhost:5173`
- `http://localhost:4200`
- `http://localhost:8081`

### JWT

O backend usa JWT para autenticação. Em ambiente local, o segredo padrão está em:

```properties
app.jwt.secret=mobilidade-universitaria-jwt-secret-dev-fixed
```

### Uploads

Os arquivos enviados pela aplicação ficam em:

```text
backend/mobilidadeUniversitaria/uploads
```

## Dados iniciais

O banco local é populado por migrations Flyway. Entre os dados seedados, normalmente você encontra:
- Usuários de teste
- Faculdade de exemplo
- Rota e veículo iniciais
- Viagem de demonstração

Se você quiser resetar o banco local, o jeito mais simples é remover o arquivo H2 em:

```text
backend/mobilidadeUniversitaria/data/
```

Depois disso, ao subir a aplicação novamente, as migrations recriam o schema e os seeds são reaplicados.

## Comandos úteis

### Backend

```bash
cd backend/mobilidadeUniversitaria
./mvnw clean package -DskipTests
./mvnw spring-boot:run
```

### Frontend

```bash
cd frontend
npm ci
npm start
npm run build
```

### Iniciar tudo

```bash
./start.sh
```

## Troubleshooting

### O frontend não consegue falar com o backend

Verifique se a URL no frontend bate com a porta usada pelo backend:
- `frontend/src/environments/environment.ts`
- `backend/mobilidadeUniversitaria/src/main/resources/application.properties`

Se o backend estiver em `8081`, o frontend precisa apontar para `http://localhost:8081/api`.
Se o backend estiver em `8082`, mantenha a configuração atual.

### O backend sobe, mas não aparecem dados

Possíveis causas:
- O banco H2 local foi recriado sem os seeds
- O usuário logado não tem o perfil esperado
- Há conflito entre a porta local e o endereço usado pelo frontend

### Docker não está disponível

Use a execução manual:
- Backend com `./mvnw spring-boot:run`
- Frontend com `npm start`

E ajuste a porta do backend para combinar com `frontend/src/environments/environment.ts`.

### A build do frontend acusa warning de tamanho

O build pode mostrar warning de budget excedido. Isso não impede a geração do bundle, mas indica que o pacote principal está acima do limite configurado no Angular.

## Observações finais

- O projeto já contém autenticação, permissões e rotas protegidas.
- O dashboard do gestor depende de dados reais no banco para preencher gráficos e KPIs.
- As telas específicas de gestor, aluno e motorista usam o mesmo backend, mas com permissões diferentes.

Se você for continuar o projeto, vale manter a URL da API e a porta do backend alinhadas entre frontend, scripts e Docker Compose.
