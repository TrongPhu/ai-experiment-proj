# AI Experiment Project

A local AI chat application built with:

- Frontend: NextJS
- Backend: NestJS
- AI runtime: Ollama
- Database: MySQL

The app stores chat history in MySQL so previous conversations can be reopened later, similar to ChatGPT or Copilot.

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
OLLAMA_TIMEOUT_MS=300000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=ai-experiment-proj
DB_CONNECTION_LIMIT=10
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

This file creates the `ai-experiment-proj` database and two tables:

- `chat_conversations`: stores one row per chat thread
- `chat_messages`: stores user and assistant messages for each conversation

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

### Option 2: Create The Database First, Let Backend Create Tables

The backend runs `CREATE TABLE IF NOT EXISTS`, so you can create only the database first:

```bash
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS \`ai-experiment-proj\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

Then run the app. When NestJS starts, the backend will create missing tables automatically.

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

Check the conversation list:

```bash
curl http://localhost:3001/conversations
```

If there is no chat history yet, the result is:

```json
[]
```

Open a conversation directly by slug:

```text
http://localhost:3000/conversations/<conversation-id>
```

Example:

```text
http://localhost:3000/conversations/303b10ad-9d52-42b9-9727-d12fba9d80df
```

## 7. How Chat History Works

When you send the first message in a new chat:

1. FE calls `POST /chat` without `conversationId`
2. BE creates a new row in `chat_conversations`
3. BE stores the user message in `chat_messages`
4. BE calls Ollama
5. BE stores the assistant response in `chat_messages`
6. BE returns `conversationId` to FE
7. FE shows the new conversation in the `History` sidebar

When you continue an existing conversation:

1. FE sends `conversationId`
2. BE stores the new message in the same conversation
3. BE updates `updated_at`
4. The sidebar sorts the latest updated conversation first

When you delete a conversation:

- BE does not physically delete it immediately
- BE sets `deleted_at`
- `GET /conversations` hides deleted conversations

## 8. Manage Data In MySQL

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

Show conversations:

```sql
SELECT id, title, model, created_at, updated_at, deleted_at
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

## 9. Backend API

Health:

```http
GET /health
```

List conversations:

```http
GET /conversations
```

Open one conversation:

```http
GET /conversations/:id
```

Soft-delete one conversation:

```http
DELETE /conversations/:id
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

## 10. Verify Before Commit

```bash
npm run lint
npm run build
npm run test
```

## 11. Common Issues

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
