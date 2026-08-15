# AI Experiment Project

A local AI chat application built with:

- Frontend: NextJS
- Backend: NestJS
- AI runtime: Ollama
- Database: MySQL

The app stores chat history per authenticated user in MySQL so each user can reopen only their own conversations, similar to ChatGPT or Copilot.

## 1. Get The Source Code

Clone the project:

```bash
git clone https://github.com/TrongPhu/ai-experiment-proj.git
cd ai-experiment-proj
```

If you already have the source code, update it:

```bash
git pull origin main
```

## 2. Install Required Tools

Check Node.js and npm:

```bash
node -v
npm -v
```

Node.js 22+ is recommended.

Install project dependencies:

```bash
npm install
```

Check Ollama:

```bash
ollama --version
```

Pull the default configured model:

```bash
ollama pull gemma3:1b
```

Pull the default embedding model used for private data/RAG:

```bash
ollama pull bge-m3
```

Check MySQL:

```bash
mysql --version
```

MySQL must be running on host `localhost`, port `3306`.

Note: MySQL is not an HTTP service. Use `localhost:3306`, not `http://localhost:3306`.

## 3. Configure The Backend

Create the backend env file from the example.

Windows PowerShell:

```powershell
Copy-Item apps/api/.env.example apps/api/.env
```

macOS/Linux/Git Bash:

```bash
cp apps/api/.env.example apps/api/.env
```

Default config:

```env
PORT=3001
WEB_ORIGIN=http://localhost:3000
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=gemma3:1b
OLLAMA_EMBEDDING_MODEL=bge-m3
OLLAMA_TIMEOUT_MS=300000
OLLAMA_NUM_GPU=0
KNOWLEDGE_CHUNK_SIZE=1200
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=ai-experiment-proj
DB_CONNECTION_LIMIT=10
JWT_SECRET=change-this-local-secret
JWT_EXPIRES_IN=7d
REFRESH_TOKEN_EXPIRES_DAYS=30
BOOTSTRAP_ADMIN_EMAIL=admin@example.com
BOOTSTRAP_ADMIN_PASSWORD=admin123456
BOOTSTRAP_ADMIN_NAME=Admin
GOOGLE_CLIENT_ID=
```

Frontend env is optional unless you want Google login. Create `apps/web/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_GOOGLE_CLIENT_ID=
```

If your MySQL user has a password, update:

```env
DB_USER=root
DB_PASSWORD=your_mysql_password
```

If you want to use another Ollama model, pull it first:

```bash
ollama pull llama3.2
```

Then update:

```env
OLLAMA_MODEL=llama3.2
```

## 4. Change The Open-Source AI Model

The backend is not locked to `gemma3:1b`. The app calls Ollama through this env variable:

```env
OLLAMA_MODEL=gemma3:1b
```

To use another open-source model:

1. Find a model in the Ollama Library: https://ollama.com/library
2. Pull the model to your machine
3. Update `OLLAMA_MODEL` in `apps/api/.env`
4. Restart `npm run dev`

Example: switch to Llama:

```bash
ollama pull llama3.2
```

Update `apps/api/.env`:

```env
OLLAMA_MODEL=llama3.2
```

Restart the app:

```bash
npm run dev
```

Check locally installed models:

```bash
ollama list
```

Test a model directly in the terminal:

```bash
ollama run llama3.2
```

### Suggested Models To Try

Model names and tags in Ollama can change over time, so check the Ollama Library before pulling.

| Use case | Suggested model | Pull command | Notes |
| --- | --- | --- | --- |
| Weak machine, quick tests | `gemma3:1b` | `ollama pull gemma3:1b` | Lightweight, fast, basic chat |
| General chat | `llama3.2` | `ollama pull llama3.2` | Good for general chatbot usage |
| Lightweight chat/coding | `qwen2.5-coder:1.5b` | `ollama pull qwen2.5-coder:1.5b` | Small coding model; natural chat may be weaker than instruct models |
| Better coding | `qwen2.5-coder:7b` | `ollama pull qwen2.5-coder:7b` | Requires a stronger machine than 1.5B |
| Reasoning | `deepseek-r1:8b` | `ollama pull deepseek-r1:8b` | Better reasoning, slower responses |
| Heavy chat/coding | `qwen3:30b` | `ollama pull qwen3:30b` | Requires large RAM/VRAM; can be very slow on CPU |

### Choose A Model By Machine Size

Quick guide:

- 8GB RAM: try `gemma3:1b` or a 1B-3B model
- 16GB RAM: try 7B-8B models such as `llama3.2`, `qwen2.5-coder:7b`, or `deepseek-r1:8b`
- 32GB+ RAM: you can try 14B-30B models, but speed depends heavily on GPU/CPU
- No GPU: prefer smaller models to avoid timeouts

If the model takes too long and the frontend shows `502`, increase the timeout in `apps/api/.env`:

```env
OLLAMA_TIMEOUT_MS=600000
```

Or switch to a smaller model.

If Ollama returns a CUDA/PTX error such as `unsupported toolchain`, force CPU execution:

```env
OLLAMA_NUM_GPU=0
```

Then restart the backend with `npm run dev`. This is slower than GPU mode, but it avoids crashes caused by an incompatible NVIDIA driver/CUDA/Ollama build.

### Use A Model Not Listed In The Ollama Library

Ollama can create custom models from a `Modelfile`. Example:

```bash
ollama create my-local-model -f ./Modelfile
```

Then update the backend:

```env
OLLAMA_MODEL=my-local-model
```

### Important: Use Chat/Instruct Models

For chatbot usage, prefer models with instruct/chat behavior or models optimized by Ollama for chat. `base` models are usually not suitable for direct Q&A and can produce off-topic answers.

## 5. Create The Database And Tables

The schema file is located at:

```text
apps/api/database/schema.sql
```

This file creates the `ai-experiment-proj` database and these tables:

- `schema_migrations`: tracks backend migrations already applied
- `users`: stores authenticated users and their roles
- `auth_refresh_tokens`: stores hashed refresh tokens for login sessions
- `chat_conversations`: stores one row per chat thread and links it to `users.id`
- `chat_messages`: stores user and assistant messages for each conversation
- `knowledge_documents`: stores private documents you add to the app
- `knowledge_chunks`: stores document chunks and embeddings for retrieval

### Option 1: Run The SQL File

If your MySQL user has a password:

```bash
mysql -u root -p < apps/api/database/schema.sql
```

If your MySQL user has no password:

```bash
mysql -u root < apps/api/database/schema.sql
```

If you use another MySQL user:

```bash
mysql -u your_user -p < apps/api/database/schema.sql
```

Then update `apps/api/.env` with the correct user/password.

### Option 2: Create The Database First, Let Backend Run Migrations

The backend has a versioned migration runner. You can create only the database first:

```bash
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS \`ai-experiment-proj\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

Then run the app. When NestJS starts, `MigrationService` applies any migration not yet listed in `schema_migrations`.

Current backend modules:

- `DatabaseModule`: MySQL pool and versioned migrations
- `AuthModule`: login, register, Google login, refresh tokens, logout, password changes, role guard
- `ChatModule`: user-owned chat conversations and messages
- `KnowledgeModule`: private documents, chunks, embeddings, retrieval

## 6. Run The App

Make sure these are ready:

- MySQL is running
- Ollama is running
- The model in `OLLAMA_MODEL` has been pulled locally

Check Ollama:

```bash
ollama list
```

Run both frontend and backend:

```bash
npm run dev
```

This command starts:

- Frontend NextJS: http://localhost:3000
- Backend NestJS: http://localhost:3001

Open the app:

```text
http://localhost:3000
```

Check the backend:

```bash
curl http://localhost:3001/health
```

### Deployment Checklist

For a fresh machine or a new clone:

1. Copy env examples:

```bash
copy apps\api\.env.example apps\api\.env
copy apps\web\.env.example apps\web\.env.local
```

2. Update `apps/api/.env` with MySQL, Ollama, JWT, bootstrap admin, and optional `GOOGLE_CLIENT_ID`.
3. Update `apps/web/.env.local` with `NEXT_PUBLIC_API_URL` and optional `NEXT_PUBLIC_GOOGLE_CLIENT_ID`.
4. Create the MySQL database and tables with `apps/api/database/schema.sql`, or create only the database and let NestJS create missing tables on startup.
5. Pull the Ollama chat model and embedding model from the env file.
6. Run `npm run dev`.
7. Open `http://localhost:3000`.

Do not commit `.env` or `.env.local`; only `.env.example` files belong in git.

The chat page can be used as a guest. Guest chats are not saved to MySQL.

To save and reopen chat history, open the compact profile menu at the bottom of the sidebar and log in. Use the bootstrap admin account first, then create more users from `/admin/users`.

Sidebar behavior:

- `New chat` starts a fresh conversation.
- `History` shows only the logged-in user's conversations.
- Long conversation titles, topic descriptions, and sample questions are truncated to keep the sidebar compact.
- Hover truncated sidebar text to see the full value in a tooltip.
- The bottom profile row opens the account menu.
- Admin-only links such as `Knowledge admin` and `User management` appear only for users with role `admin`.

Open a conversation directly by slug:

```text
http://localhost:3000/conversations/<conversation-id>
```

Example:

```text
http://localhost:3000/conversations/303b10ad-9d52-42b9-9727-d12fba9d80df
```

## 7. How Chat History Works

When a guest sends a message:

1. FE calls `POST /chat` without a JWT token
2. BE calls Ollama without private knowledge context
3. BE returns the assistant response without creating a conversation row
4. FE keeps the current chat only in browser memory

When a logged-in user sends the first message in a new chat:

1. FE sends the logged-in user's JWT token
2. FE calls `POST /chat` without `conversationId`
3. BE creates a new row in `chat_conversations` with `user_id`
4. BE stores the user message in `chat_messages`
5. BE calls Ollama with private knowledge context when relevant
6. BE stores the assistant response in `chat_messages`
7. BE returns `conversationId` to FE
8. FE shows the new conversation in the `History` sidebar

When you continue an existing conversation:

1. FE sends `conversationId`
2. BE checks that the conversation belongs to the logged-in user
3. BE stores the new message in the same conversation
3. BE updates `updated_at`
4. The sidebar sorts the latest updated conversation first

When you delete a conversation:

- BE does not physically delete it immediately
- BE checks that the conversation belongs to the logged-in user
- BE sets `deleted_at`
- `GET /conversations` hides deleted conversations and only returns the current user's history

## 8. Authentication And Admin Roles

The main chat page supports guest usage, but saved history and admin pages are protected.

Public frontend page:

```text
http://localhost:3000
```

Protected frontend pages:

```text
http://localhost:3000/conversations/<conversation-id>
http://localhost:3000/knowledge
http://localhost:3000/admin/users
```

Public or optional-auth backend API:

```http
POST /chat
```

Protected backend APIs:

```http
GET /conversations
GET /conversations/:id
DELETE /conversations/:id
GET /knowledge/documents
POST /knowledge/documents
DELETE /knowledge/documents/:id
GET /knowledge/search?q=your-question
GET /users
POST /users
```

The backend uses JWT Bearer tokens. The frontend stores the token in browser `localStorage`.

`POST /chat` works without a token for guest chat. If a valid token is sent, the backend saves the chat under that user and can use private knowledge context. Without a token, the backend does not save history and does not use private knowledge context.

Users can create their own account from the profile menu at the bottom of the chat sidebar. Self-registration always creates role `user`; only admins can create role `admin` from `/admin/users`.

### Bootstrap Admin User

On backend startup, the app creates the first admin user from env variables if that email does not exist yet:

```env
BOOTSTRAP_ADMIN_EMAIL=admin@example.com
BOOTSTRAP_ADMIN_PASSWORD=admin123456
BOOTSTRAP_ADMIN_NAME=Admin
```

Use this account to log in at:

```text
http://localhost:3000/knowledge
http://localhost:3000/admin/users
```

After logging in as admin, you can:

- Use `/` to chat and store chat history under your own user
- Use `/knowledge` to add private company knowledge
- Use `/knowledge` to delete private documents
- Use `/admin/users` to create users
- Use `/admin/users` to assign `user` or `admin` role when creating an account

For real usage, change the bootstrap password and `JWT_SECRET` before sharing the app.

### Auth API

Login:

```http
POST /auth/login
```

Body:

```json
{
  "email": "admin@example.com",
  "password": "admin123456"
}
```

Self-register as a normal user:

```http
POST /auth/register
```

Body:

```json
{
  "name": "Company User",
  "email": "user@example.com",
  "password": "password123"
}
```

This always creates role `user`.

Google login:

```http
POST /auth/google
```

Body:

```json
{
  "credential": "google-id-token-from-browser"
}
```

To enable the Google button locally:

1. Create an OAuth 2.0 Client ID in Google Cloud Console.
2. Use application type `Web application`.
3. Add `http://localhost:3000` to authorized JavaScript origins.
4. Put the same client ID in both env files:

```env
# apps/api/.env
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com

# apps/web/.env.local
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

Restart `npm run dev` after changing env files.

Response:

```json
{
  "accessToken": "jwt-token",
  "refreshToken": "refresh-token",
  "user": {
    "id": "user-id",
    "email": "admin@example.com",
    "name": "Admin",
    "role": "admin"
  }
}
```

Refresh an expired access token:

```http
POST /auth/refresh
```

Body:

```json
{
  "refreshToken": "refresh-token"
}
```

Logout revokes refresh tokens:

```http
POST /auth/logout
Authorization: Bearer <token>
```

Body with one refresh token:

```json
{
  "refreshToken": "refresh-token"
}
```

If no `refreshToken` is sent, the backend revokes all active refresh tokens for that user.

Change password:

```http
POST /auth/change-password
Authorization: Bearer <token>
```

Body:

```json
{
  "currentPassword": "old-password",
  "newPassword": "new-password-123"
}
```

Changing password revokes all active refresh tokens for that user.

Get current user:

```http
GET /auth/me
Authorization: Bearer <token>
```

Create user, admin only:

```http
POST /users
Authorization: Bearer <token>
```

Body:

```json
{
  "name": "Company User",
  "email": "user@example.com",
  "password": "password123",
  "role": "user"
}
```

## 9. Add Private Data With RAG

This project uses a simple RAG flow for private data:

1. Paste a private document into the `/knowledge` admin view
2. Backend splits the document into chunks
3. Backend calls Ollama embedding API with `OLLAMA_EMBEDDING_MODEL`
4. Chunks and embeddings are stored in MySQL
5. When you ask a question, backend embeds the question
6. Backend finds the most similar chunks
7. Backend injects those chunks into the chat prompt before calling the chat model

Default embedding model:

```env
OLLAMA_EMBEDDING_MODEL=bge-m3
```

Pull it before adding private data:

```bash
ollama pull bge-m3
```

Why `bge-m3`: it is multilingual and supports long-document retrieval use cases, which makes it a better fit for Vietnamese/private documents than a small English-only embedding model.

### Add Private Data From The UI

1. Open http://localhost:3000/knowledge
2. Log in with an admin account
3. Use the `Knowledge admin` view
4. Enter `Document title`
5. Paste text/markdown/notes/policies/docs into the textarea
6. Click `Add to knowledge`
7. Ask questions in chat

The chat sidebar links to this view from the bottom profile menu, but only when the current user has role `admin`.

Current supported input is plain text/markdown pasted into the UI. PDF/DOCX upload is not implemented yet; convert those files to text first.

### Add Private Data From API

These endpoints require an admin bearer token. First log in:

```bash
curl -X POST http://localhost:3001/auth/login ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"admin@example.com\",\"password\":\"admin123456\"}"
```

Copy the returned `accessToken`, then call admin APIs with:

```http
Authorization: Bearer <accessToken>
```

```bash
curl -X POST http://localhost:3001/knowledge/documents ^
  -H "Content-Type: application/json" ^
  -H "Authorization: Bearer <accessToken>" ^
  -d "{\"title\":\"Company policy\",\"content\":\"Paste private text here\"}"
```

macOS/Linux/Git Bash:

```bash
curl -X POST http://localhost:3001/knowledge/documents \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <accessToken>" \
  -d '{"title":"Company policy","content":"Paste private text here"}'
```

List private documents:

```bash
curl http://localhost:3001/knowledge/documents ^
  -H "Authorization: Bearer <accessToken>"
```

Search private data directly:

```bash
curl "http://localhost:3001/knowledge/search?q=your%20question" ^
  -H "Authorization: Bearer <accessToken>"
```

Delete a private document:

```bash
curl -X DELETE http://localhost:3001/knowledge/documents/<document-id> ^
  -H "Authorization: Bearer <accessToken>"
```

### Recommended Models For This Project

For this codebase there are two model types:

- Chat model: answers the user
- Embedding model: converts private data and questions into vectors for search

Recommended setup for a strong local machine:

```env
OLLAMA_MODEL=qwen3:30b
OLLAMA_EMBEDDING_MODEL=bge-m3
```

Recommended setup for a normal laptop / quick testing:

```env
OLLAMA_MODEL=gemma3:1b
OLLAMA_EMBEDDING_MODEL=bge-m3
```

Best quality option to try if your machine can run it:

```bash
ollama pull gpt-oss:20b
```

```env
OLLAMA_MODEL=gpt-oss:20b
OLLAMA_EMBEDDING_MODEL=bge-m3
```

`gpt-oss:20b` is a strong open-weight local chat model, but it needs more RAM/VRAM than `gemma3:1b`. If it is too slow, use `qwen3:30b` if already installed on your machine, or keep `gemma3:1b` for pipeline testing.

## 10. Manage Data In MySQL

Open MySQL:

```bash
mysql -u root -p
```

Select the database:

```sql
USE `ai-experiment-proj`;
```

Show tables:

```sql
SHOW TABLES;
```

Show users:

```sql
SELECT id, email, name, role, created_at, updated_at
FROM users
ORDER BY created_at DESC;
```

Show private documents:

```sql
SELECT id, title, source, chunk_count, created_at, updated_at
FROM knowledge_documents
ORDER BY updated_at DESC;
```

Show chunks for one private document:

```sql
SELECT chunk_index, content, embedding_model, created_at
FROM knowledge_chunks
WHERE document_id = 'document-id-here'
ORDER BY chunk_index ASC;
```

Show conversations:

```sql
SELECT id, user_id, title, model, created_at, updated_at, deleted_at
FROM chat_conversations
ORDER BY updated_at DESC;
```

Show messages for one conversation:

```sql
SELECT role, content, model, total_duration, created_at
FROM chat_messages
WHERE conversation_id = 'conversation-id-here'
ORDER BY created_at ASC;
```

Restore a soft-deleted conversation:

```sql
UPDATE chat_conversations
SET deleted_at = NULL
WHERE id = 'conversation-id-here';
```

Permanently delete a conversation and all of its messages:

```sql
DELETE FROM chat_conversations
WHERE id = 'conversation-id-here';
```

Because `chat_messages` has a foreign key with `ON DELETE CASCADE`, deleting a conversation also deletes its related messages.

Delete all chat history:

```sql
DELETE FROM chat_conversations;
```

Delete chat history for one user:

```sql
DELETE FROM chat_conversations
WHERE user_id = 'user-id-here';
```

Delete all private knowledge:

```sql
DELETE FROM knowledge_documents;
```

Because `knowledge_chunks` has a foreign key with `ON DELETE CASCADE`, deleting a document also deletes its chunks.

## 11. Backend API

Health:

```http
GET /health
```

Login:

```http
POST /auth/login
```

Self-register, role `user` only:

```http
POST /auth/register
```

Google login:

```http
POST /auth/google
```

Refresh access token:

```http
POST /auth/refresh
```

Logout and revoke refresh tokens:

```http
POST /auth/logout
Authorization: Bearer <token>
```

Change password and revoke existing refresh tokens:

```http
POST /auth/change-password
Authorization: Bearer <token>
```

Chat as guest or logged-in user:

```http
POST /chat
Authorization: Bearer <token> # optional
```

Without a token, the response is not saved. With a token, the response is saved to that user's history.

Current user:

```http
GET /auth/me
Authorization: Bearer <token>
```

List users, admin only:

```http
GET /users
Authorization: Bearer <token>
```

Create users, admin only:

```http
POST /users
Authorization: Bearer <token>
```

List conversations:

```http
GET /conversations
Authorization: Bearer <token>
```

Open one conversation:

```http
GET /conversations/:id
Authorization: Bearer <token>
```

Soft-delete one conversation:

```http
DELETE /conversations/:id
Authorization: Bearer <token>
```

List private documents:

```http
GET /knowledge/documents
```

Create a private document:

```http
POST /knowledge/documents
```

Delete a private document:

```http
DELETE /knowledge/documents/:id
```

Search private knowledge:

```http
GET /knowledge/search?q=your-question
```

Send chat:

```http
POST /chat
```

Body for a new chat:

```json
{
  "messages": [
    {
      "role": "user",
      "content": "What is RAG?"
    }
  ]
}
```

Body for continuing an existing chat:

```json
{
  "conversationId": "conversation-id-here",
  "messages": [
    {
      "role": "user",
      "content": "What is RAG?"
    },
    {
      "role": "assistant",
      "content": "RAG means Retrieval-Augmented Generation..."
    },
    {
      "role": "user",
      "content": "Show me an example in NestJS"
    }
  ]
}
```

## 12. Verify Before Commit

```bash
npm run lint
npm run build
npm run test
```

## 13. Common Issues

### Cannot GET /conversations

The backend is running an old version or was not restarted after routes were added.

Restart the app:

```powershell
Get-NetTCPConnection -LocalPort 3000,3001 -State Listen | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { Stop-Process -Id $_ -Force }
npm run dev
```

### 502 When Chatting

This usually means Ollama is not running, the model does not exist locally, or the model takes too long to respond.

Check:

```bash
ollama list
curl http://localhost:11434/api/tags
```

The model in `apps/api/.env` must exist in `ollama list`.

### Cannot Add Private Data

First check that you are logged in as an admin. Then check the embedding model:

```bash
ollama list
ollama pull bge-m3
```

Then verify:

```env
OLLAMA_EMBEDDING_MODEL=bge-m3
```

### Backend Cannot Start Because Of MySQL

Check MySQL:

```bash
mysql -u root -p -e "SHOW DATABASES;"
```

Check the database:

```bash
mysql -u root -p -e "SHOW DATABASES LIKE 'ai-experiment-proj';"
```

If the database does not exist:

```bash
mysql -u root -p < apps/api/database/schema.sql
```

Then verify `DB_USER`, `DB_PASSWORD`, and `DB_NAME` in `apps/api/.env`.

### Port 3000 Or 3001 Is Already In Use

Windows PowerShell:

```powershell
Get-NetTCPConnection -LocalPort 3000,3001 -State Listen
```

Stop the process holding the port:

```powershell
Get-NetTCPConnection -LocalPort 3000,3001 -State Listen | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { Stop-Process -Id $_ -Force }
```
