# AI Experiment Project

Ung dung chat AI local dung:

- Frontend: NextJS
- Backend: NestJS
- AI runtime: Ollama
- Database: MySQL

App luu lich su chat vao MySQL de mo lai cac hoi thoai cu giong ChatGPT/Copilot.

## 1. Lay Source Code Tu Git

Clone project:

```bash
git clone https://github.com/TrongPhu/ai-experiment-proj.git
cd ai-experiment-proj
```

Neu da co source roi thi cap nhat code moi nhat:

```bash
git pull origin main
```

## 2. Cai Cong Cu Can Thiet

Kiem tra Node.js va npm:

```bash
node -v
npm -v
```

Khuyen nghi dung Node.js 22+.

Cai dependencies:

```bash
npm install
```

Kiem tra Ollama:

```bash
ollama --version
```

Pull model dang cau hinh mac dinh:

```bash
ollama pull gemma3:1b
```

Kiem tra MySQL:

```bash
mysql --version
```

MySQL phai dang chay tren host `localhost`, port `3306`.

Luu y: MySQL khong phai HTTP service. Dung `localhost:3306`, khong dung `http://localhost:3306`.

## 3. Cau Hinh Backend

Tao file env cho backend tu file mau.

Windows PowerShell:

```powershell
Copy-Item apps/api/.env.example apps/api/.env
```

macOS/Linux/Git Bash:

```bash
cp apps/api/.env.example apps/api/.env
```

Noi dung mac dinh:

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

Neu MySQL cua may co password, sua:

```env
DB_USER=root
DB_PASSWORD=mat_khau_mysql_cua_may
```

Neu muon dung model Ollama khac, pull model truoc:

```bash
ollama pull llama3.2
```

Sau do sua:

```env
OLLAMA_MODEL=llama3.2
```

## 4. Doi Open Source AI Model

Backend khong bi khoa vao `gemma3:1b`. App goi Ollama qua bien:

```env
OLLAMA_MODEL=gemma3:1b
```

Muon dung model open-source khac thi lam 4 buoc:

1. Tim model tren Ollama Library: https://ollama.com/library
2. Pull model ve may
3. Sua `OLLAMA_MODEL` trong `apps/api/.env`
4. Restart `npm run dev`

Vi du doi sang Llama:

```bash
ollama pull llama3.2
```

Sua `apps/api/.env`:

```env
OLLAMA_MODEL=llama3.2
```

Restart app:

```bash
npm run dev
```

Kiem tra model da co tren may:

```bash
ollama list
```

Kiem tra model chay truc tiep trong terminal:

```bash
ollama run llama3.2
```

### Mot So Model Nen Thu

Ten model/tag tren Ollama co the thay doi theo thoi gian, nen hay check lai tren Ollama Library truoc khi pull.

| Muc dich | Model goi y | Lenh pull | Ghi chu |
| --- | --- | --- | --- |
| May yeu, test nhanh | `gemma3:1b` | `ollama pull gemma3:1b` | Nhe, nhanh, chat co ban |
| Chat tong quat | `llama3.2` | `ollama pull llama3.2` | Phu hop chatbot pho thong |
| Chat/coding nhe | `qwen2.5-coder:1.5b` | `ollama pull qwen2.5-coder:1.5b` | Nhe, tap trung code, chat tu nhien co the kem hon model instruct |
| Coding tot hon | `qwen2.5-coder:7b` | `ollama pull qwen2.5-coder:7b` | Can may khoe hon 1.5B |
| Reasoning | `deepseek-r1:8b` | `ollama pull deepseek-r1:8b` | Suy luan tot hon, cham hon |
| Chat/coding nang | `qwen3:30b` | `ollama pull qwen3:30b` | Can RAM/VRAM lon, co the rat cham tren CPU |

### Chon Model Theo May

Huong dan nhanh:

- RAM 8GB: thu `gemma3:1b` hoac model 1B-3B
- RAM 16GB: thu model 7B-8B nhu `llama3.2`, `qwen2.5-coder:7b`, `deepseek-r1:8b`
- RAM 32GB+: co the thu 14B-30B, nhung toc do phu thuoc GPU/CPU
- Neu khong co GPU: uu tien model nho de tranh timeout

Neu model tra loi qua lau va FE bao `502`, tang timeout trong `apps/api/.env`:

```env
OLLAMA_TIMEOUT_MS=600000
```

Hoac chuyen sang model nho hon.

### Dung Model Khong Co Trong Ollama Library

Ollama co the tao model custom tu `Modelfile`. Vi du:

```bash
ollama create my-local-model -f ./Modelfile
```

Sau do sua backend:

```env
OLLAMA_MODEL=my-local-model
```

### Quan Trong: Dung Chat/Instruct Model

De lam chatbot, uu tien model co tag/chat behavior dang `instruct` hoac model duoc Ollama toi uu cho chat. Cac model `base` thuong khong phu hop hoi dap truc tiep, de bi tra loi lac de.

## 5. Tao Database Va Bang

Schema nam o:

```text
apps/api/database/schema.sql
```

File nay tao database `ai-experiment-proj` va 2 bang:

- `chat_conversations`: luu moi hoi thoai/chat thread
- `chat_messages`: luu tung message cua user va assistant trong hoi thoai

### Cach 1: Chay File SQL

Neu user MySQL co password:

```bash
mysql -u root -p < apps/api/database/schema.sql
```

Neu user MySQL khong co password:

```bash
mysql -u root < apps/api/database/schema.sql
```

Neu dung user khac:

```bash
mysql -u your_user -p < apps/api/database/schema.sql
```

Sau do cap nhat `apps/api/.env` cho dung user/password.

### Cach 2: Tao Database Truoc, Backend Tu Tao Bang

Backend co code `CREATE TABLE IF NOT EXISTS`, nen co the chi tao database truoc:

```bash
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS \`ai-experiment-proj\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

Sau do chay app. Khi NestJS start, backend se tu tao cac bang neu chua co.

## 6. Chay App

Dam bao 3 thu sau dang san sang:

- MySQL dang chay
- Ollama dang chay
- Model trong `OLLAMA_MODEL` da duoc pull

Kiem tra Ollama:

```bash
ollama list
```

Chay ca frontend va backend:

```bash
npm run dev
```

Lenh nay start dong thoi:

- Frontend NextJS: http://localhost:3000
- Backend NestJS: http://localhost:3001

Mo app:

```text
http://localhost:3000
```

Kiem tra backend:

```bash
curl http://localhost:3001/health
```

Kiem tra danh sach hoi thoai:

```bash
curl http://localhost:3001/conversations
```

Lan dau chua chat thi ket qua la:

```json
[]
```

## 7. Cach App Luu Lich Su Chat

Khi gui message dau tien trong chat moi:

1. FE goi `POST /chat` va khong gui `conversationId`
2. BE tao row moi trong `chat_conversations`
3. BE luu message user vao `chat_messages`
4. BE goi Ollama
5. BE luu cau tra loi assistant vao `chat_messages`
6. BE tra ve `conversationId` cho FE
7. FE hien hoi thoai moi trong sidebar `Lich su`

Khi tiep tuc chat trong hoi thoai cu:

1. FE gui kem `conversationId`
2. BE luu message moi vao cung hoi thoai
3. BE cap nhat `updated_at`
4. Sidebar sap xep hoi thoai moi cap nhat len dau

Khi bam xoa hoi thoai:

- BE khong xoa vat ly ngay
- BE set `deleted_at`
- API `GET /conversations` se an hoi thoai da xoa

## 8. Quan Ly Data Trong MySQL

Mo MySQL:

```bash
mysql -u root -p
```

Chon database:

```sql
USE `ai-experiment-proj`;
```

Xem cac bang:

```sql
SHOW TABLES;
```

Xem danh sach hoi thoai:

```sql
SELECT id, title, model, created_at, updated_at, deleted_at
FROM chat_conversations
ORDER BY updated_at DESC;
```

Xem messages cua mot hoi thoai:

```sql
SELECT role, content, model, total_duration, created_at
FROM chat_messages
WHERE conversation_id = 'conversation-id-o-day'
ORDER BY created_at ASC;
```

Khoi phuc hoi thoai da xoa mem:

```sql
UPDATE chat_conversations
SET deleted_at = NULL
WHERE id = 'conversation-id-o-day';
```

Xoa that mot hoi thoai va toan bo messages cua no:

```sql
DELETE FROM chat_conversations
WHERE id = 'conversation-id-o-day';
```

Do `chat_messages` co foreign key `ON DELETE CASCADE`, xoa conversation se xoa luon messages lien quan.

Xoa sach toan bo lich su chat:

```sql
DELETE FROM chat_conversations;
```

## 9. API Backend

Health:

```http
GET /health
```

Lay danh sach hoi thoai:

```http
GET /conversations
```

Mo mot hoi thoai:

```http
GET /conversations/:id
```

Xoa mem mot hoi thoai:

```http
DELETE /conversations/:id
```

Gui chat:

```http
POST /chat
```

Body tao chat moi:

```json
{
  "messages": [
    {
      "role": "user",
      "content": "RAG la gi?"
    }
  ]
}
```

Body tiep tuc chat cu:

```json
{
  "conversationId": "conversation-id-o-day",
  "messages": [
    {
      "role": "user",
      "content": "RAG la gi?"
    },
    {
      "role": "assistant",
      "content": "RAG la Retrieval-Augmented Generation..."
    },
    {
      "role": "user",
      "content": "Cho vi du trong NestJS"
    }
  ]
}
```

## 10. Kiem Tra Truoc Khi Commit

```bash
npm run lint
npm run build
npm run test
```

## 11. Loi Thuong Gap

### Cannot GET /conversations

Backend dang chay ban cu hoac chua restart sau khi them route.

Restart lai app:

```powershell
Get-NetTCPConnection -LocalPort 3000,3001 -State Listen | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { Stop-Process -Id $_ -Force }
npm run dev
```

### 502 Khi Chat

Thuong do Ollama khong chay, model khong ton tai, hoac model tra loi qua lau.

Kiem tra:

```bash
ollama list
curl http://localhost:11434/api/tags
```

Model trong `apps/api/.env` phai co trong `ollama list`.

### Backend Khong Start Vi MySQL

Kiem tra MySQL:

```bash
mysql -u root -p -e "SHOW DATABASES;"
```

Kiem tra database:

```bash
mysql -u root -p -e "SHOW DATABASES LIKE 'ai-experiment-proj';"
```

Neu database chua co:

```bash
mysql -u root -p < apps/api/database/schema.sql
```

Sau do kiem tra lai `DB_USER`, `DB_PASSWORD`, `DB_NAME` trong `apps/api/.env`.

### Port 3000 Hoac 3001 Bi Chiem

Windows PowerShell:

```powershell
Get-NetTCPConnection -LocalPort 3000,3001 -State Listen
```

Tat process dang giu port:

```powershell
Get-NetTCPConnection -LocalPort 3000,3001 -State Listen | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { Stop-Process -Id $_ -Force }
```
