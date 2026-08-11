# AI Experiment Project

Local AI research chat app using NextJS, NestJS, and Ollama.

## Prerequisites

- Node.js 22+
- Ollama running locally
- At least one Ollama model pulled, for example:

```bash
ollama pull llama3.2
```

## Run

```bash
npm install
npm run dev
```

- Frontend: http://localhost:3000
- Backend: http://localhost:3001
- Ollama: http://localhost:11434

## Configure Backend

Copy `apps/api/.env.example` to `apps/api/.env` and adjust values when needed:

```bash
PORT=3001
WEB_ORIGIN=http://localhost:3000
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2
```
