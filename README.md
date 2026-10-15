# Hệ thống quản lý tuyển dụng nhân viên

Đồ án môn Cơ sở dữ liệu NoSQL: xây dựng ứng dụng tuyển dụng dùng MongoDB và tìm hiểu công cụ Mingo để quản trị, khai thác dữ liệu. Giao diện được viết bằng React; API dùng Node.js, Express và Mongoose.

## Chức năng chính

- Quản lý phòng ban, vị trí tuyển dụng, ứng viên và nhân viên.
- Theo dõi hồ sơ ứng tuyển qua Kanban, đặt lịch và đánh giá phỏng vấn, lập đề nghị làm việc.
- Xem dashboard, báo cáo và 6 truy vấn tổng hợp MongoDB.
- Sao lưu và phục hồi 6 collection bằng các script trong `backend/scripts/`.

Sáu collection là `departments`, `positions`, `candidates`, `applications`, `interviews` và `employees`.

## Chạy trên máy cá nhân

**Cần có:** Node.js, npm và MongoDB đang chạy. Cấu hình mặc định kết nối `mongodb://localhost:27017/recruitment_db`.

Tại thư mục gốc của dự án:

```bash
npm run install:all
```

Nếu chưa có `backend/.env`, tạo từ `backend/.env.example`, sau đó thêm `JWT_SECRET` với một chuỗi bí mật riêng. Có thể sửa `MONGODB_URI` và `PORT` trong cùng tệp. Ví dụ nội dung:

```dotenv
MONGODB_URI=mongodb://localhost:27017/recruitment_db
PORT=5000
JWT_SECRET=thay-bang-chuoi-bi-mat-rieng-cua-ban
```

Mở hai cửa sổ terminal tại thư mục gốc:

```bash
# Cửa sổ 1: API tại http://localhost:5000
npm run backend
```

```bash
# Cửa sổ 2: giao diện tại http://localhost:5173
npm run frontend
```

Giao diện gọi API qua proxy `/api` của Vite. Nếu đổi cổng backend, hãy cập nhật địa chỉ proxy trong `frontend/vite.config.js`.

### Dữ liệu mẫu

Các tệp mẫu nằm trong `backend/data/`. **Không chạy `npm run seed` trên database đang có dữ liệu cần giữ:** script này xóa toàn bộ bản ghi trong cả 6 collection rồi nạp lại dữ liệu mẫu. Chỉ chạy khi đã trỏ `MONGODB_URI` trong `backend/.env` tới một database thử nghiệm mới và kiểm tra đúng tên database:

```bash
npm run seed
```

Nếu bạn đã có dữ liệu trong `recruitment_db`, bỏ qua bước seed. Tài khoản trong bộ dữ liệu mẫu dùng mật khẩu demo `123456`; chỉ sử dụng trong môi trường học tập nội bộ.

## Kiểm tra và sao lưu

```bash
npm run build
npm test
```

`npm run build` tạo gói frontend. `npm test` kiểm tra cấu trúc dữ liệu, hành vi API và quy trình backup/restore trên các database kiểm thử tạm; máy cần có MongoDB hoạt động.

```bash
npm run backup
```

Lệnh backup đọc database được chỉ định bởi `MONGODB_URI` và tạo một thư mục mới trong `backend/backup/`. Lệnh `npm run restore` **ghi thay thế dữ liệu của cả 6 collection** trong database đang kết nối, mặc định lấy bản backup gần nhất. Chỉ chạy restore sau khi đã kiểm tra `MONGODB_URI`, thư mục backup và tạo bản sao lưu dữ liệu hiện tại. Script restore tạo snapshot trước khi ghi và thử rollback nếu ghi hoặc hậu kiểm thất bại; snapshot nằm trong `backend/snapshots/`.

`backend/backup/` bị loại khỏi Git vì chứa dữ liệu ứng viên và tài khoản. Nếu đồng đội cần dữ liệu MongoDB hiện tại, gửi riêng folder backup mới nhất qua file ZIP.

## Mingo và tài liệu

Có thể kết nối Mingo hoặc MongoDB Compass tới cùng MongoDB để xem dữ liệu và thử truy vấn. Các truy vấn tổng hợp mẫu nằm tại [docs/aggregation_queries.js](./docs/aggregation_queries.js); trên giao diện có trang **Thực nghiệm & Khai thác công cụ Mingo**. Bản Word nhóm đang chỉnh là `WordDoAnNoSQL.docx`, nằm ngoài repository nên cần gửi riêng. Xem [danh sách công việc còn lại](./README_CONG_VIEC_CON_LAI.md) trước khi nộp.

## Cấu trúc dự án

| Thư mục | Nội dung |
| --- | --- |
| `backend/src/` | API, middleware, model và logic nghiệp vụ |
| `backend/data/` | Dữ liệu JSON mẫu cho 6 collection |
| `backend/scripts/` | Seed, kiểm thử, backup và restore |
| `frontend/src/` | Giao diện React |
| `docs/` | Truy vấn mẫu, báo cáo và ảnh minh chứng |
