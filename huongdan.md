# Hướng dẫn thuyết trình demo TalentFlow ATS

> Tài liệu hướng dẫn demo hai vai trò **Admin** và **Interviewer**. Thời lượng gợi ý: **7–10 phút**.

## 1. Chuẩn bị trước khi thuyết trình

### Khởi động ứng dụng

1. Đảm bảo MongoDB đang chạy trên máy.
2. Mở terminal tại thư mục `TalentFlow-Project`.
3. Chạy backend trong terminal thứ nhất:

   ```powershell
   npm run backend:dev
   ```

4. Chạy frontend trong terminal thứ hai:

   ```powershell
   npm run frontend
   ```

5. Mở trình duyệt tại <http://localhost:5173>.

Backend cần được khởi động lại nếu vừa tạo hoặc thay đổi `backend/.env`, vì backend chỉ đọc cấu hình khi khởi động. Dự án hiện dùng JWT để tạo phiên đăng nhập.

### Tài khoản demo

| Vai trò | Email | Mật khẩu |
| --- | --- | --- |
| Admin | `admin@talentflow.com` | `123456` |
| Interviewer | `hr@talentflow.com` | `123456` |

Màn hình đăng nhập có nút điền sẵn thông tin cho Admin và Interviewer. Đây là tài khoản phục vụ demo.

### Kiểm tra nhanh

- Đăng nhập thử từng tài khoản trước buổi thuyết trình.
- Đảm bảo Dashboard hiển thị số liệu.
- Trong tài khoản Interviewer, mở **Lịch phỏng vấn** và tìm một lịch có kết quả **Chờ phỏng vấn**.
- Chọn trước một hồ sơ mẫu để đánh giá. Lưu kết quả sẽ cập nhật database thật.

## 2. Mở đầu — khoảng 30 giây

**Lời dẫn gợi ý:**

> “TalentFlow ATS là ứng dụng quản lý quy trình tuyển dụng. Ứng dụng hỗ trợ theo dõi ứng viên, vị trí tuyển dụng, hồ sơ ứng tuyển, lịch phỏng vấn, kết quả đánh giá và báo cáo. Hệ thống phân quyền để Admin quản lý quy trình, còn Interviewer tập trung vào lịch và đánh giá ứng viên.”

## 3. Demo Admin — khoảng 4–5 phút

Đăng nhập bằng tài khoản Admin.

### Bước 1: Dashboard

**Thao tác:** Mở **Dashboard**.

**Giới thiệu:**

- Các thẻ thống kê: tổng ứng viên, vị trí đang tuyển, phỏng vấn đang chờ và số ứng viên đã tuyển.
- Biểu đồ thể hiện số hồ sơ theo từng trạng thái.
- Các khu vực hồ sơ mới và lịch phỏng vấn sắp tới.

**Lời dẫn:**

> “Dashboard giúp nhà tuyển dụng xem nhanh tình hình tuyển dụng và nhận biết hồ sơ đang ở giai đoạn nào.”

### Bước 2: Hồ sơ ứng viên

**Thao tác:** Mở **Hồ sơ ứng viên**, tìm một ứng viên và mở thông tin chi tiết.

**Giới thiệu:** Thông tin ứng viên như email, kỹ năng, kinh nghiệm và trạng thái trong quy trình tuyển dụng.

**Lời dẫn:**

> “Thông tin ứng viên được lưu tập trung để HR tra cứu và theo dõi hồ sơ trong quá trình tuyển dụng.”

### Bước 3: Vị trí tuyển dụng

**Thao tác:** Mở **Vị trí tuyển dụng**.

**Giới thiệu:** Chức danh, phòng ban, số lượng cần tuyển và trạng thái mở hoặc đóng.

**Lời dẫn:**

> “Mỗi hồ sơ ứng tuyển được gắn với một vị trí tuyển dụng, giúp quản lý ứng viên theo nhu cầu của từng phòng ban.”

### Bước 4: Kanban ứng tuyển

**Thao tác:** Mở **Kanban ứng tuyển**.

**Giới thiệu các cột:**

`Mới nộp → Sơ loại hồ sơ → Phỏng vấn → Gửi đề nghị → Đã tuyển`

Hồ sơ không phù hợp được chuyển sang trạng thái **Không phù hợp**. Ứng dụng kiểm tra điều kiện trước khi chuyển một số giai đoạn; ví dụ hồ sơ có lịch phỏng vấn đang chờ thì cần xử lý lịch đó trước.

**Lời dẫn:**

> “Kanban cho phép HR nhìn tổng thể phễu tuyển dụng. Các điều kiện nghiệp vụ giúp hạn chế chuyển hồ sơ sai quy trình.”

### Bước 5: Lịch phỏng vấn

**Thao tác:** Mở **Lịch phỏng vấn** và xem lịch theo tuần hoặc danh sách.

**Giới thiệu:** Admin/HR có thể tạo và cập nhật lịch, gồm ứng viên, vòng phỏng vấn, người phỏng vấn, thời gian và địa điểm.

**Lời dẫn:**

> “Admin hoặc HR điều phối lịch; Interviewer đăng nhập bằng tài khoản riêng để xem lịch và nhập kết quả đánh giá.”

### Bước 6: Báo cáo và nhân sự

**Thao tác:** Mở **Báo cáo & Phân tích**, giới thiệu tỷ lệ tuyển dụng và phễu chuyển đổi. Nếu còn thời gian, chọn **Xuất Excel**. Có thể mở **Nhân viên & Phòng ban** để giới thiệu việc quản lý tài khoản và vai trò.

**Lời dẫn:**

> “Báo cáo được tổng hợp từ dữ liệu tuyển dụng và có thể xuất để theo dõi bên ngoài ứng dụng.”

## 4. Demo Interviewer — khoảng 2–3 phút

Đăng xuất Admin và đăng nhập bằng tài khoản Interviewer.

### Bước 1: Giới thiệu phân quyền

**Thao tác:** Cho xem menu bên trái.

Interviewer có thể mở **Dashboard** và **Lịch phỏng vấn**. Các màn hình quản lý ứng viên, vị trí, Kanban, nhân viên và báo cáo không nằm trong menu của vai trò này.

**Lời dẫn:**

> “Mỗi tài khoản chỉ thấy các chức năng phù hợp với trách nhiệm của mình.”

### Bước 2: Xem lịch và thông tin ứng viên

**Thao tác:** Mở **Lịch phỏng vấn**, tìm một buổi đang chờ và mở thông tin chi tiết.

Giới thiệu ứng viên, vị trí, vòng phỏng vấn, thời gian và địa điểm. Có thể chuyển tuần hoặc đổi chế độ xem nếu lịch không nằm trong tuần hiện tại.

### Bước 3: Nhập đánh giá

**Thao tác:** Mở chỉnh sửa lịch đang chờ, nhập điểm từ 0 đến 100, ghi nhận xét, chọn kết quả **Đạt** hoặc **Chưa đạt**, rồi lưu.

Interviewer có thể cập nhật điểm, nhận xét và kết quả. Thông tin điều phối lịch như thời gian, địa điểm và người phỏng vấn được giới hạn quyền chỉnh sửa.

**Lời dẫn:**

> “Interviewer ghi nhận đánh giá trực tiếp trên buổi phỏng vấn. Điểm số phải nằm trong khoảng 0–100.”

## 5. Demo liền mạch hai vai trò — khoảng 1 phút

Để thể hiện quy trình phối hợp:

1. Admin mở một hồ sơ có lịch phỏng vấn đang chờ.
2. Interviewer mở đúng lịch đó, nhập điểm và chọn **Đạt**.
3. Đăng xuất Interviewer, đăng nhập lại Admin và mở Kanban.
4. Cho thấy hồ sơ được chuyển sang **Gửi đề nghị** sau khi kết quả phỏng vấn đạt.

Không cần hoàn tất bước tuyển dụng trong demo ngắn. Nếu lưu kết quả phỏng vấn, dữ liệu sẽ thay đổi thật; hãy dùng hồ sơ mẫu đã chọn trước.

## 6. Giới thiệu kỹ thuật — khoảng 1 phút

**Lời dẫn gợi ý:**

> “Backend dùng Node.js, Express và Mongoose; frontend dùng React. MongoDB lưu dữ liệu theo các collection như ứng viên, vị trí, hồ sơ ứng tuyển, phỏng vấn, nhân viên và phòng ban. Các báo cáo sử dụng aggregation để tổng hợp dữ liệu; quyền API được kiểm tra theo JWT và vai trò tài khoản.”

Nếu được hỏi về cách dữ liệu liên kết, có thể nói các bản ghi tham chiếu lẫn nhau bằng `ObjectId`; báo cáo dùng các bước aggregation như nhóm và nối dữ liệu để tổng hợp.

## 7. Kết thúc — khoảng 20 giây

**Lời dẫn gợi ý:**

> “Qua demo, có thể thấy Admin quản lý toàn bộ quy trình tuyển dụng, còn Interviewer tập trung vào lịch và đánh giá. Kết quả phỏng vấn được phản ánh vào trạng thái hồ sơ để HR tiếp tục xử lý.”

## 8. Gợi ý xử lý lỗi khi demo

- **Không đăng nhập được:** kiểm tra lại email, mật khẩu và database `recruitment_db`; nếu backend vừa được cấu hình, khởi động lại backend.
- **Báo thiếu `JWT_SECRET`:** đảm bảo có `backend/.env`, sau đó dừng backend cũ bằng `Ctrl+C` và chạy lại `npm run backend:dev`.
- **Không thấy lịch cần demo:** kiểm tra các tuần trước/sau hoặc chuyển sang danh sách lịch; chọn lịch đang chờ đánh giá.
- **Dashboard hoặc trang báo lỗi tải dữ liệu:** kiểm tra backend và MongoDB đang chạy, sau đó tải lại trang.
