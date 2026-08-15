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

Neu muon bat dang nhap Google, tao file:

```text
apps/web/.env.local
```

Noi dung:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_GOOGLE_CLIENT_ID=
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

- `schema_migrations`: luu cac migration backend da chay
- `users`: luu user va quyen `user`/`admin`
- `auth_refresh_tokens`: luu refresh token da hash de quan ly phien dang nhap
- `chat_conversations`: luu danh sach hoi thoai, moi hoi thoai gan voi mot `users.id`
- `chat_messages`: luu tung tin nhan trong hoi thoai
- `knowledge_documents`: luu tai lieu rieng
- `knowledge_chunks`: luu cac doan tai lieu va embedding de tim kiem

Luu y: MySQL chay o `localhost:3306`, khong phai `http://localhost:3306`.

Backend hien da tach thanh cac module ro rang:

- `DatabaseModule`: ket noi MySQL va chay migration co version
- `AuthModule`: login, register, Google login, refresh token, logout, doi mat khau, guard phan quyen
- `ChatModule`: lich su hoi thoai theo user
- `KnowledgeModule`: tai lieu rieng, chunk, embedding, search RAG

Khi NestJS start, `MigrationService` se tu chay cac migration chua co trong bang `schema_migrations`.

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

### Checklist Trien Khai Tren May Moi

Khi clone repo ve may moi:

1. Cai NodeJS, MySQL, Ollama
2. Chay `npm install`
3. Tao file env tu file mau:

```bash
copy apps\api\.env.example apps\api\.env
copy apps\web\.env.example apps\web\.env.local
```

4. Sua `apps/api/.env` cho dung MySQL, Ollama, JWT, admin mac dinh, va `GOOGLE_CLIENT_ID` neu dung Google login
5. Sua `apps/web/.env.local` voi `NEXT_PUBLIC_API_URL` va `NEXT_PUBLIC_GOOGLE_CLIENT_ID` neu dung Google login
6. Tao database `ai-experiment-proj` va chay SQL trong `apps/api/database/schema.sql`
7. Pull model Ollama theo `.env`
8. Chay `npm run dev`
9. Mo `http://localhost:3000`

Khong commit `.env` hoac `.env.local` len git. Chi commit cac file `.env.example`.

## 8. Cach Chat

Mo:

```text
http://localhost:3000
```

Sau do:

1. Neu chua dang nhap, van co the hoi dap ngay nhu guest
2. Bam `Chat moi` de tao hoi thoai moi
3. Nhap cau hoi vao o chat
4. Bam nut gui
5. Neu muon luu lich su, bam profile o day sidebar va dang nhap
6. Sau khi dang nhap, lich su chat se hien ben trai

Tai menu profile o day sidebar, user co the:

- Dang nhap bang email/password
- Bam tab `Register` de tu tao tai khoan nhanh voi ten, email, mat khau
- Tai khoan tu tao luon co quyen `user`, khong the tu tao `admin`
- Dang nhap bang Google neu da cau hinh Google Client ID
- Dang xuat khoi tai khoan hien tai

Sidebar duoc lam gon giong Copilot:

- `Chat moi` nam tren cung de tao luong hoi thoai moi
- `Lich su` chi hien cac hoi thoai cua user dang dang nhap
- `Chu de` va `Cau hoi theo chu de` nam trong vung scroll
- Profile nam co dinh o day sidebar
- Neu text bi cat thanh dau `...`, dua chuot len text do de xem tooltip day du noi dung
- Link `Knowledge admin` va `User management` chi hien trong menu profile khi user co quyen `admin`

Lich su chat duoc gan theo user dang nhap:

- Guest chat khong luu vao MySQL va khong hien trong lich su
- User A chi thay lich su cua User A
- User B chi thay lich su cua User B
- Admin cung co lich su chat rieng cua admin
- Khi mo URL `/conversations/<conversation-id>`, backend van kiem tra conversation do co thuoc user dang nhap hay khong
- Guest chat khong duoc dua private knowledge vao prompt de tranh lo du lieu rieng

Co the mo lai mot hoi thoai bang URL:

```text
http://localhost:3000/conversations/<conversation-id>
```

Vi du:

```text
http://localhost:3000/conversations/303b10ad-9d52-42b9-9727-d12fba9d80df
```

## 9. Dang Nhap Admin Va Phan Quyen User

Trang nhap du lieu rieng la trang admin:

```text
http://localhost:3000/knowledge
```

Trang quan ly user va gan quyen nam rieng o:

```text
http://localhost:3000/admin/users
```

Hai trang nay deu yeu cau dang nhap bang user co quyen `admin`.

Mac dinh backend se tu tao admin dau tien khi start neu email nay chua ton tai:

```env
BOOTSTRAP_ADMIN_EMAIL=admin@example.com
BOOTSTRAP_ADMIN_PASSWORD=admin123456
BOOTSTRAP_ADMIN_NAME=Admin
```

Tai man hinh login `/knowledge` hoac `/admin/users`, dang nhap bang:

```text
Email: admin@example.com
Password: admin123456
```

Sau khi dang nhap admin, co the:

- Vao `/knowledge` de nhap du lieu rieng cua cong ty
- Vao `/knowledge` de xoa tai lieu rieng
- Vao `/admin/users` de tao user moi
- Vao `/admin/users` de gan quyen `user` hoac `admin` khi tao tai khoan

### Cau Hinh Google Login

De bat nut dang nhap Google:

1. Vao Google Cloud Console
2. Tao OAuth 2.0 Client ID
3. Chon application type la `Web application`
4. Them authorized JavaScript origin:

```text
http://localhost:3000
```

5. Copy client ID vao `apps/api/.env`:

```env
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

6. Copy client ID vao `apps/web/.env.local`:

```env
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

7. Restart app:

```bash
npm run dev
```

Quyen hien tai:

- `guest`: hoi dap duoc, khong luu lich su, khong dung private knowledge
- `user`: dang nhap chat duoc, co lich su chat rieng, nhung khong duoc vao Knowledge Admin
- `admin`: duoc vao Knowledge Admin, nhap data, xoa data, tao user

Auth hien co cac API chinh:

- `POST /auth/login`: dang nhap email/password, tra ve `accessToken` va `refreshToken`
- `POST /auth/register`: user tu dang ky, role luon la `user`
- `POST /auth/google`: dang nhap Google bang Google ID token
- `POST /auth/refresh`: doi `refreshToken` lay access token moi
- `POST /auth/logout`: revoke refresh token
- `POST /auth/change-password`: doi mat khau va revoke cac refresh token cu
- `GET /auth/me`: lay user hien tai

Frontend se tu luu `accessToken` va `refreshToken` trong localStorage. Khi access token het han, FE se goi `/auth/refresh` de lay token moi.

Khi dung that, nen doi:

```env
JWT_SECRET=chuoi_bi_mat_manh_hon
BOOTSTRAP_ADMIN_PASSWORD=mat_khau_manh_hon
```

Sau khi doi `.env`, restart app:

```bash
npm run dev
```

## 10. Cach Dua Du Lieu Rieng Vao App

Mo trang quan tri du lieu rieng:

```text
http://localhost:3000/knowledge
```

Sau do:

1. Dang nhap bang admin
2. Nhap ten tai lieu vao `Document title`
3. Paste noi dung rieng cua cong ty vao o `Private content`
4. Bam `Add to knowledge`
5. Quay lai trang chat
6. Hoi cau hoi lien quan toi du lieu vua nhap

Hien tai app ho tro nhap:

- Text
- Markdown
- Note noi bo
- FAQ
- Policy
- Documentation copy/paste

Chua ho tro upload PDF/DOCX truc tiep. Neu co PDF/DOCX, hay copy text trong file roi paste vao trang `/knowledge`.

## 11. Du Lieu Rieng Hoat Dong Nhu The Nao?

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

## 12. Loi Thuong Gap

### Khong Vao Duoc Trang Knowledge Admin

Kiem tra da dang nhap bang admin chua.

Neu chua co admin, kiem tra file:

```text
apps/api/.env
```

Can co:

```env
BOOTSTRAP_ADMIN_EMAIL=admin@example.com
BOOTSTRAP_ADMIN_PASSWORD=admin123456
BOOTSTRAP_ADMIN_NAME=Admin
```

Sau do restart app:

```bash
npm run dev
```

Dang nhap lai tai:

```text
http://localhost:3000/knowledge
```

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

### Loi CUDA Hoac Unsupported PTX Toolchain

Neu thay loi giong:

```text
CUDA error: the provided PTX was compiled with an unsupported toolchain
```

Day la loi Ollama/GPU driver, khong phai loi frontend. Cach xu ly nhanh la ep Ollama chay CPU trong `apps/api/.env`:

```env
OLLAMA_NUM_GPU=0
```

Sau do restart app:

```bash
npm run dev
```

Chay CPU se cham hon GPU, nhung tranh crash do CUDA/NVIDIA driver khong tuong thich.

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

## 13. Kiem Tra App Truoc Khi Commit

Neu la developer, chay:

```bash
npm run lint
npm run build
npm run test
```

Neu 3 lenh nay pass thi code dang on.
