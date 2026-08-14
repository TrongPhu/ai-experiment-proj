# Huong Dan Chay Du An Cho Nguoi Moi

File nay danh cho nguoi khong biet code nhieu nhung muon lay repo ve va chay app tren may ca nhan.

## 1. Can Cai Nhung Gi?

Can cai 3 phan mem:

- Node.js 22 tro len: https://nodejs.org
- Ollama: https://ollama.com
- MySQL: co the dung MySQL Server hoac XAMPP/MySQL

Sau khi cai xong, mo terminal hoac PowerShell va kiem tra:

```bash
node -v
npm -v
ollama --version
mysql --version
```

Neu cac lenh tren hien version thi da cai dung.

## 2. Lay Source Code Tu Git

Chay lenh:

```bash
git clone https://github.com/TrongPhu/ai-experiment-proj.git
cd ai-experiment-proj
```

Neu da co source tren may va muon cap nhat ban moi nhat:

```bash
git pull origin main
```

## 3. Cai Thu Vien Cho Du An

Trong thu muc `ai-experiment-proj`, chay:

```bash
npm install
```

Lenh nay se cai thu vien cho ca frontend va backend.

## 4. Tai AI Model Cho Ollama

App can 2 model:

- `gemma3:1b`: model chat nhe, de chay tren may ca nhan
- `bge-m3`: model embedding de doc du lieu rieng/RAG

Chay:

```bash
ollama pull gemma3:1b
ollama pull bge-m3
```

Kiem tra model da co chua:

```bash
ollama list
```

Can thay co:

```text
gemma3:1b
bge-m3
```

## 5. Tao File Cau Hinh Backend

Windows PowerShell:

```powershell
Copy-Item apps/api/.env.example apps/api/.env
```

macOS/Linux/Git Bash:

```bash
cp apps/api/.env.example apps/api/.env
```

Mo file:

```text
apps/api/.env
```

Noi dung nen giong nhu sau:

```env
PORT=3001
WEB_ORIGIN=http://localhost:3000
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=gemma3:1b
OLLAMA_EMBEDDING_MODEL=bge-m3
OLLAMA_TIMEOUT_MS=600000
KNOWLEDGE_CHUNK_SIZE=1200
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=ai-experiment-proj
DB_CONNECTION_LIMIT=10
```

Neu MySQL cua may co mat khau thi sua dong nay:

```env
DB_PASSWORD=mat_khau_mysql_cua_ban
```

Neu MySQL dung user khac `root`, sua:

```env
DB_USER=ten_user_mysql
DB_PASSWORD=mat_khau_mysql
```

## 6. Tao Database Va Bang

Dam bao MySQL dang chay.

Neu MySQL user co mat khau:

```bash
mysql -u root -p < apps/api/database/schema.sql
```

Neu MySQL user khong co mat khau:

```bash
mysql -u root < apps/api/database/schema.sql
```

Lenh nay se tao database:

```text
ai-experiment-proj
```

Va tao cac bang can thiet:

- `chat_conversations`: luu danh sach hoi thoai
- `chat_messages`: luu tung tin nhan trong hoi thoai
- `knowledge_documents`: luu tai lieu rieng
- `knowledge_chunks`: luu cac doan tai lieu va embedding de tim kiem

Luu y: MySQL chay o `localhost:3306`, khong phai `http://localhost:3306`.

## 7. Chay Ung Dung

Dam bao 2 thu sau dang chay:

- MySQL
- Ollama

Sau do trong thu muc project, chay:

```bash
npm run dev
```

Lenh nay se chay ca:

- Frontend NextJS: http://localhost:3000
- Backend NestJS: http://localhost:3001

Mo trinh duyet vao:

```text
http://localhost:3000
```

Kiem tra backend:

```bash
curl http://localhost:3001/health
```

Neu thanh cong se thay ket qua gan giong:

```json
{
  "ok": true,
  "ollamaBaseUrl": "http://localhost:11434",
  "defaultModel": "gemma3:1b"
}
```

## 8. Cach Chat

Mo:

```text
http://localhost:3000
```

Sau do:

1. Bam `Chat moi` de tao hoi thoai moi
2. Nhap cau hoi vao o chat
3. Bam nut gui
4. Lich su chat se hien ben trai

Co the mo lai mot hoi thoai bang URL:

```text
http://localhost:3000/conversations/<conversation-id>
```

Vi du:

```text
http://localhost:3000/conversations/303b10ad-9d52-42b9-9727-d12fba9d80df
```

## 9. Cach Dua Du Lieu Rieng Vao App

Mo trang quan tri du lieu rieng:

```text
http://localhost:3000/knowledge
```

Sau do:

1. Nhap ten tai lieu vao `Document title`
2. Paste noi dung rieng cua cong ty vao o `Private content`
3. Bam `Add to knowledge`
4. Quay lai trang chat
5. Hoi cau hoi lien quan toi du lieu vua nhap

Hien tai app ho tro nhap:

- Text
- Markdown
- Note noi bo
- FAQ
- Policy
- Documentation copy/paste

Chua ho tro upload PDF/DOCX truc tiep. Neu co PDF/DOCX, hay copy text trong file roi paste vao trang `/knowledge`.

## 10. Du Lieu Rieng Hoat Dong Nhu The Nao?

Khi them du lieu rieng:

1. Backend nhan noi dung tai lieu
2. Backend chia tai lieu thanh cac doan nho goi la `chunks`
3. Backend goi Ollama model `bge-m3` de tao embedding cho tung chunk
4. Backend luu tai lieu vao MySQL

Khi chat:

1. Backend nhan cau hoi cua user
2. Backend tao embedding cho cau hoi
3. Backend so sanh cau hoi voi cac chunk da luu
4. Backend lay nhung chunk lien quan nhat
5. Backend dua chunk do vao prompt
6. Backend goi model chat `gemma3:1b`
7. Model tra loi dua tren du lieu rieng neu co lien quan

Day la cach tiep can RAG: Retrieval-Augmented Generation.

## 11. Loi Thuong Gap

### Loi Model Khong Ton Tai

Kiem tra:

```bash
ollama list
```

Neu thieu model thi pull lai:

```bash
ollama pull gemma3:1b
ollama pull bge-m3
```

### Loi Model Can Nhieu RAM Hon May Dang Co

Vi du:

```text
model requires more system memory
```

Nghia la model qua nang. Hay dung model nhe hon:

```env
OLLAMA_MODEL=gemma3:1b
```

Sau do restart app:

```bash
npm run dev
```

### Loi Backend Khong Ket Noi MySQL

Kiem tra MySQL:

```bash
mysql -u root -p -e "SHOW DATABASES;"
```

Kiem tra file:

```text
apps/api/.env
```

Dam bao cac dong nay dung:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=ai-experiment-proj
```

### Loi Cannot GET /conversations

Thuong do backend dang chay ban cu hoac chua restart.

Tat process dang giu port tren Windows:

```powershell
Get-NetTCPConnection -LocalPort 3000,3001 -State Listen | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { Stop-Process -Id $_ -Force }
```

Sau do chay lai:

```bash
npm run dev
```

### Loi Port 3000 Hoac 3001 Bi Chiem

Kiem tra:

```powershell
Get-NetTCPConnection -LocalPort 3000,3001 -State Listen
```

Tat process:

```powershell
Get-NetTCPConnection -LocalPort 3000,3001 -State Listen | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { Stop-Process -Id $_ -Force }
```

## 12. Kiem Tra App Truoc Khi Commit

Neu la developer, chay:

```bash
npm run lint
npm run build
npm run test
```

Neu 3 lenh nay pass thi code dang on.
