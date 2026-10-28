# TalentFlow — Hệ thống quản lý tuyển dụng

Đồ án môn Cơ sở dữ liệu NoSQL, xây dựng ứng dụng tuyển dụng với MongoDB. Frontend dùng React, Vite và Tailwind CSS; backend dùng Node.js, Express và Mongoose. Mingo hoặc MongoDB Compass được dùng riêng để quản trị và thực nghiệm dữ liệu; không cần cài hai công cụ này để chạy web.

## Chức năng chính

- Dashboard thống kê tuyển dụng.
- Quản lý ứng viên, vị trí tuyển dụng, nhân viên và phòng ban.
- Theo dõi hồ sơ qua Kanban, đặt lịch và đánh giá phỏng vấn.
- Lập, sửa đề nghị làm việc và tiếp nhận ứng viên trúng tuyển.
- Báo cáo bằng MongoDB Aggregation, xuất dữ liệu nhân viên ra Excel.
- Đăng nhập bằng JWT, phân quyền theo vai trò.
- Backup và restore bằng script, có snapshot trước khi phục hồi và thử rollback khi có lỗi.

Luồng hồ sơ chính:

```text
Mới nộp → Sơ loại hồ sơ → Phỏng vấn → Gửi đề nghị → Đã tuyển
applied      screening    interview     accepted      hired
                         ↘ Không phù hợp (rejected)
```

Hồ sơ mới luôn bắt đầu ở `applied`. API kiểm tra việc chuyển bước dựa trên lịch phỏng vấn, kết quả đánh giá và thông tin đề nghị. Đóng vị trí sẽ chặn nhận hồ sơ mới; hồ sơ đã có tiếp tục được xử lý theo điều kiện nghiệp vụ. Khi tuyển đủ chỉ tiêu, vị trí tự đóng.

## Cấu trúc dự án

```text
TalentFlow-Project/
├── package.json                 # Các lệnh chạy chung từ thư mục gốc
├── backend/
│   ├── .env.example             # Mẫu cấu hình, cần bổ sung JWT_SECRET
│   ├── data/                    # 6 tệp JSON mẫu dùng cho seed
│   ├── scripts/
│   │   ├── seed.js              # Xóa dữ liệu cũ trong 6 collection và nạp mẫu
│   │   ├── backup.js            # Xuất JSON và manifest
│   │   ├── restore.js           # Tiền kiểm, snapshot, phục hồi và hậu kiểm
│   │   ├── verify_project.js    # Kiểm thử dữ liệu, API và backup/restore
│   │   └── migrate_passwords.js # Tiện ích bảo trì mật khẩu
│   └── src/
│       ├── server.js            # Nạp cấu hình, kết nối DB, mở HTTP server
│       ├── app.js               # Khởi tạo Express và gắn API
│       ├── config/              # Kết nối database
│       ├── routes/              # Endpoint và quyền truy cập
│       ├── controllers/         # API và nghiệp vụ tuyển dụng
│       ├── middleware/          # Xác thực JWT, kiểm tra vai trò
│       ├── models/              # 6 schema Mongoose
│       └── utils/               # Mật khẩu và thông tin kết nối
├── frontend/
│   ├── vite.config.js           # Dev server và proxy /api
│   └── src/
│       ├── App.jsx              # Điều hướng các màn hình
│       ├── pages/               # Dashboard, ứng viên, Kanban, phỏng vấn…
│       ├── components/          # Sidebar, header, thành phần giao diện
│       ├── context/             # Trạng thái đăng nhập và thông báo
│       ├── services/api.js      # Gọi API, gắn token, xử lý hết phiên
│       ├── hooks/               # Hook dùng chung
│       └── utils/               # Tiện ích xuất dữ liệu
└── docs/
    ├── BAO_CAO_DO_AN_NOSQL.md    # Tài liệu báo cáo trong source
    ├── aggregation_queries.js   # Truy vấn tổng hợp mẫu
    └── report_images/           # Ảnh minh họa tài liệu
```

Request từ giao diện đi qua `services/api.js` → `/api` → middleware xác thực/phân quyền → controller → model Mongoose → MongoDB. Khi sửa nghiệp vụ, bắt đầu từ `backend/src/controllers/index.js`; khi sửa quyền, xem thêm `backend/src/routes/api.js` và `backend/src/middleware/auth.js`.

### Cơ sở dữ liệu

| Collection | Nội dung và quan hệ chính |
| --- | --- |
| `departments` | Phòng ban |
| `positions` | Vị trí tuyển dụng, tham chiếu phòng ban |
| `candidates` | Thông tin cá nhân, kỹ năng, kinh nghiệm ứng viên |
| `applications` | Nối ứng viên với vị trí; lưu trạng thái và đề nghị |
| `interviews` | Lịch, kết quả phỏng vấn; tham chiếu hồ sơ ứng tuyển |
| `employees` | Nhân viên và tài khoản; tham chiếu phòng ban, vị trí và ứng viên nếu có |

## Cài đặt và chạy trên máy mới

### 1. Chuẩn bị và cấu hình

Cần Node.js **22.12 trở lên**, npm, Git và MongoDB đang chạy, mặc định cổng `27017`.

```powershell
git clone https://github.com/w0ke2509/TalentFlow-Project.git
cd TalentFlow-Project
npm run install:all
Copy-Item backend/.env.example backend/.env
```

Nếu đã có `backend/.env`, giữ cấu hình hiện có. Mở tệp này và đặt cấu hình của máy bạn:

```dotenv
MONGODB_URI=mongodb://localhost:27017/recruitment_db
PORT=5000
JWT_SECRET=thay-bang-chuoi-bi-mat-rieng-cua-ban
```

Thay giá trị ví dụ của `JWT_SECRET` bằng chuỗi bí mật riêng. Có thể thêm `JWT_EXPIRES_IN` để đổi thời hạn token, mặc định `24h`. Không đưa `.env` lên Git.

### 2. Chuẩn bị dữ liệu — chọn một cách

**Dùng dữ liệu mẫu:** nếu database được chọn là database mới hoặc có thể xóa dữ liệu, chạy từ thư mục gốc:

```powershell
npm run seed
```

**Lưu ý:** seed xóa toàn bộ bản ghi của 6 collection rồi nạp lại từ `backend/data/`. Không chạy khi có dữ liệu cần giữ. Dữ liệu mẫu không phải bản dữ liệu mới nhất của máy bàn giao.

**Dùng dữ liệu bàn giao:** nhận riêng thư mục backup, đặt vào `backend/backup/` và làm theo phần restore bên dưới. Không cần seed trước hoặc sau restore. Không chép backup đè lên `backend/data/`.

**Máy đã có dữ liệu:** bỏ qua cả seed và restore.

### 3. Chạy ứng dụng

Mở hai terminal tại thư mục gốc:

```powershell
# Terminal 1 — API
npm run backend
```

```powershell
# Terminal 2 — giao diện
npm run frontend
```

- Giao diện: <http://localhost:5173>
- API/health check: <http://localhost:5000/>
- API nghiệp vụ bắt đầu bằng `/api`.

Vite chuyển `/api` tới `http://localhost:5000`. Nếu đổi cổng backend, sửa cả `PORT` trong `backend/.env` và proxy trong `frontend/vite.config.js`.

### Tài khoản demo và quyền truy cập

Sau khi **seed bộ dữ liệu mẫu**, đăng nhập quản trị bằng email `lethimai.hr@gmail.com`, mật khẩu `123456`. Với database restore, dùng tài khoản có trong bản backup đó. Mật khẩu demo phục vụ học tập nội bộ.

| Vai trò | Phạm vi chính |
| --- | --- |
| `admin` | Quản lý các phân hệ, có các quyền xóa dành riêng cho quản trị |
| `hr` | Quản lý quy trình tuyển dụng, phỏng vấn và nhân sự theo quyền API |
| `interviewer` | Dashboard, lịch phỏng vấn và chấm điểm; không tự đổi lịch |
| `employee` | Không có quyền dùng các API quản trị tuyển dụng |

Quyền chi tiết nằm tại `backend/src/routes/api.js`.

## Các lệnh thường dùng

Chạy từ thư mục gốc:

| Lệnh | Công dụng |
| --- | --- |
| `npm run install:all` | Cài dependency cho backend và frontend |
| `npm run backend` | Chạy API |
| `npm run backend:dev` | Chạy API, tự khởi động lại khi sửa source |
| `npm run frontend` | Chạy giao diện bằng Vite |
| `npm run build` | Build giao diện vào `frontend/dist/` |
| `npm test` | Kiểm thử dữ liệu, API, phân quyền, nghiệp vụ và backup/restore |
| `npm --prefix frontend run lint` | Kiểm tra source frontend |
| `npm run backup` | Sao lưu database đang cấu hình |
| `npm run restore` | Restore bản backup được script tự chọn |

`npm test` cần MongoDB tại `localhost:27017`, dùng database tạm có tiền tố `talentflow_test_` rồi dọn dẹp. Build frontend trước khi test vì bộ kiểm định có kiểm tra gói build.

`npm run build` chỉ tạo gói frontend. Khi triển khai lên máy chủ, cần cấu hình web server phục vụ `frontend/dist/` và chuyển `/api` tới backend.

## Backup và restore

### Sao lưu

Kiểm tra `MONGODB_URI` trong `backend/.env`, rồi chạy:

```powershell
npm run backup
```

Kết quả nằm trong `backend/backup/backup_<thời_gian>_<mã_ngẫu_nhiên>/`, gồm 6 tệp JSON và `manifest.json`. Đây là bản sao dữ liệu 6 collection ứng dụng, không phải bản dump toàn bộ cấu hình, user và index MongoDB.

`backend/backup/` và `backend/snapshots/` không được đưa lên Git. Khi bàn giao dữ liệu hiện tại, gửi riêng thư mục backup dưới dạng ZIP.

### Phục hồi bản bàn giao

1. Giải nén để thư mục backup chứa trực tiếp 6 tệp JSON và `manifest.json`.
2. Trỏ `MONGODB_URI` tới đúng database cần phục hồi, ưu tiên database mới trên máy nhận.
3. Nếu database đích có dữ liệu cần giữ, sao lưu trước; tạm dừng ứng dụng trong lúc phục hồi.
4. Từ thư mục gốc, thay tên thư mục ví dụ bằng đường dẫn thật và chạy:

```powershell
node --input-type=module -e "import { performRestore } from './backend/scripts/restore.js'; await performRestore({ backupDir: './backend/backup/backup_YYYYMMDDHHmmss_xxxxx' });"
```

Lệnh trên chỉ định rõ bản backup. `npm run restore` không nhận tham số chọn thư mục từ CLI: nó ưu tiên `latest.json` nếu đường dẫn còn tồn tại, rồi tìm thư mục `backup_*` mới nhất. Khi chuyển máy, nên chỉ định rõ bản cần restore bằng lệnh trên.

Restore **thay thế dữ liệu cả 6 collection** trong database đích. Script kiểm tra tệp đầu vào, tạo snapshot trước khi ghi, hậu kiểm và thử rollback nếu ghi hoặc hậu kiểm lỗi. Snapshot được giữ tại `backend/snapshots/` để kiểm tra hoặc phục hồi thủ công khi cần.

## Tài liệu và xử lý lỗi thường gặp

- [Báo cáo Markdown](docs/BAO_CAO_DO_AN_NOSQL.md).
- [Truy vấn Aggregation mẫu](docs/aggregation_queries.js), dùng `$group`, `$cond`, `$project`, `$lookup` và các toán tử khác.
- Mục **Khai thác Mingo** đã bỏ khỏi menu web; thực nghiệm Mingo/Compass thực hiện bằng công cụ riêng.
- Không kết nối được database: kiểm tra dịch vụ MongoDB và `MONGODB_URI`.
- Đăng nhập báo thiếu `JWT_SECRET`: bổ sung vào `backend/.env`, khởi động lại backend.
- Giao diện không gọi được API: kiểm tra backend cổng `5000` và proxy Vite.
- Không đăng nhập được trên máy mới: kiểm tra đã seed hoặc restore đúng database và đúng tài khoản.
- Nhận `401` do token hết hạn: đăng nhập lại. Nhận `403`: kiểm tra vai trò tài khoản.
