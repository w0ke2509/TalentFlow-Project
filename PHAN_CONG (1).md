# BẢNG PHÂN CÔNG NHIỆM VỤ VÀ ĐỀ CƯƠNG BÁO CÁO ĐỒ ÁN NoSQL
## ĐỀ TÀI: TÌM HIỂU CÔNG CỤ MINGO ĐỂ QUẢN TRỊ VÀ KHAI THÁC CSDL TÀI LIỆU “QUẢN LÝ TUYỂN DỤNG NHÂN VIÊN” VÀ XÂY DỰNG ỨNG DỤNG MINH HỌA (TALENTFLOW ATS)

---

## PHẦN 1. BẢNG PHÂN CÔNG NHIỆM VỤ THỰC HIỆN

| Thành viên & Vai trò | Nhánh Git | Chi tiết Công việc Phụ trách (Kỹ thuật, Mã nguồn & Báo cáo) |
| :--- | :--- | :--- |
| **1. Quý** | `feat/database-mingo` | **1. Phần việc Kỹ thuật & Mã nguồn:**<br>• Cài đặt 6 Mongoose Schemas dựa trên dữ liệu mẫu đã có: `Department.js`, `Position.js`, `Candidate.js`, `Application.js`, `Interview.js`, `Employee.js`<br>• Thiết lập chỉ mục hiệu năng cao: Unique Index (email, mã vị trí), Compound Index (bảng Kanban), Text Index (tìm kiếm ứng viên).<br>• Lập trình kịch bản tự động nạp dữ liệu mẫu vào MongoDB: `backend/scripts/seed.js`<br>• Hiện thực 6 đường ống MongoDB Aggregation Pipelines chuyên sâu cho báo cáo phân tích tuyển dụng ở chương 4.<br><br>**2. Phần việc Báo cáo & Nghiên cứu:**<br>• **Lời nói đầu**: Đặt vấn đề và bố cục đồ án.<br>• **Chương 1**: Tổng quan đề tài & Lý thuyết CSDL NoSQL (Định lý CAP, BASE, Document Store, Kiến trúc MongoDB).<br>• **Chương 2**: Nghiên cứu chuyên sâu công cụ Mingo, so sánh đối chuẩn với MongoDB Compass, định vị 4 bài toán/CSDL phù hợp. |
| **2. Quốc**| `feat/backend-api` | **1. Phần việc Kỹ thuật & Mã nguồn:**<br>• Hoàn thiện cấu hình Express Server kết nối MongoDB: `backend/src/server.js`<br>• Xây dựng toàn bộ hệ thống RESTful API Endpoints: `backend/src/routes/api.js`<br>• Lập trình các bộ điều khiển xử lý nghiệp vụ: `backend/src/controllers/` (CRUD, Kanban, RBAC, thống kê).<br>• Lập trình tính năng tự động Sao lưu & Phục hồi CSDL: `backend/scripts/backup.js`, `backend/scripts/restore.js`<br>• Viết bộ kiểm thử tự động kiểm định 32 tiêu chí: `backend/tests/verify_project.js`<br><br>**2. Phần việc Báo cáo & Nghiên cứu:**<br>• **Chương 4 (Phần Backend)**: Kiến trúc 3 tầng, đặc tả chi tiết danh mục RESTful API, cơ chế sao lưu/phục hồi dữ liệu.<br>• **Chương 5 (Phần Thực nghiệm)**: Kịch bản thực nghiệm trên Mingo, số liệu đối chuẩn định lượng (RAM 135MB vs 780MB, độ trễ truy vấn Explain Plan). |
| **3. Kiệt (Trưởng nhóm)** | `main` | **1. Phần việc Kỹ thuật & Mã nguồn:**<br>• Khởi tạo nền tảng Monorepo, cấu hình môi trường, `.gitignore`, `README.md`, khung starter Backend.<br>• Chuẩn bị sẵn tập dữ liệu mẫu chuẩn hóa 6 thực thể: `backend/data/*.json`<br>• Xây dựng toàn bộ hệ thống giao diện Web ATS: `frontend/` (Vite, React 19, Tailwind CSS, Lucide Icons).<br>• Triển khai 8 phân hệ màn hình ATS: Dashboard, Ứng viên, Vị trí tuyển dụng, Kanban kéo thả, Phỏng vấn, Nhân sự, Báo cáo BI, Mingo Guide Live.<br>• Động cơ xuất báo cáo Microsoft Excel (.xlsx) đa định dạng.<br>• Quản trị kho lưu trữ GitHub, kiểm định chất lượng mã nguồn và merge Pull Requests.<br><br>**2. Phần việc Báo cáo & Nghiên cứu:**<br>• **Chương 3**: Phân tích & Đặc tả cấu trúc CSDL 6 Collections, luận chứng kỹ thuật Nhúng (Embedding) vs Tham chiếu (Referencing qua ObjectId), chiến lược chỉ mục.<br>• **Chương 4 (Phần Frontend)**: Thiết kế hệ thống giao diện ATS, sơ đồ tương tác người dùng, quy trình Kanban, biểu đồ dữ liệu.<br>• **Kết luận & Hướng phát triển**: Đánh giá kết quả đạt được, hạn chế và đề xuất mở rộng. |

---

## PHẦN 2. HƯỚNG DẪN QUY TRÌNH PHỐI HỢP GIT & MÔI TRƯỜNG

1. **Khởi tạo nhánh làm việc độc lập**:
   - Quý: `git checkout -b feat/database-mingo`
   - Quốc: `git checkout -b feat/backend-api`
2. **Quy tắc làm việc trên nhánh cá nhân**:
   - Mỗi thành viên chỉ thêm mới và cập nhật các tệp tin thuộc phạm vi kỹ thuật của mình theo bảng trên.
   - Thường xuyên commit với thông điệp rõ ràng theo chuẩn Conventional Commits (ví dụ: `feat(db): implement candidate schema and indexes`, `feat(api): implement candidate controller and routes`).
3. **Quy trình tích hợp (Merge)**:
   - Khi hoàn thành module, thành viên đẩy nhánh cá nhân lên GitHub: `git push origin <ten-nhanh>`.
   - Tạo Pull Request (PR) về nhánh `main` để Kiệt (Trưởng nhóm) kiểm định chất lượng mã nguồn trước khi tích hợp vào nhánh chính.

---

## PHẦN 3. KHUNG ĐỀ CƯƠNG BÁO CÁO MICROSOFT WORD (WORD SKELETON)

Khung báo cáo được chuẩn hóa theo cấu trúc luận văn kỹ thuật chính quy, phân định rõ ràng người phụ trách từng mục để phục vụ công tác ghép nối tài liệu cuối kỳ.

```text
TRANG BÌA CHÍNH (Theo mẫu trường/khoa)
TRANG BÌA PHỤ
LỜI CAM ĐOAN
LỜI CẢM ƠN
MỤC LỤC
DANH MỤC TỪ VIẾT TẮT
DANH MỤC BẢNG BIỂU
DANH MỤC HÌNH VẼ VÀ ĐỒ THỊ
```

### LỜI NÓI ĐẦU
- Lý do chọn đề tài nghiên cứu.
- Phạm vi ứng dụng và đóng góp của công trình.
- Bố cục tổng thể của báo cáo.
*(Phụ trách: Kiệt - Trưởng nhóm)*

---

### CHƯƠNG 1. TỔNG QUAN VỀ ĐỀ TÀI VÀ CƠ SỞ DỮ LIỆU NOSQL
*(Phụ trách: Quý)*

- **1.1. Đặt vấn đề và Tính cấp thiết của đề tài**
  - Thực trạng quản trị tuyển dụng nhân sự trong các doanh nghiệp hiện đại.
  - Sự quá tải của các bảng tính truyền thống (Excel) và yêu cầu xây dựng hệ thống ATS tập trung.
- **1.2. Mục tiêu, Đối tượng và Phạm vi nghiên cứu**
  - 1.2.1. Mục tiêu nghiên cứu (Nghiên cứu công cụ Mingo, xây dựng hệ thống TalentFlow ATS).
  - 1.2.2. Đối tượng nghiên cứu (Cơ sở dữ liệu hướng tài liệu MongoDB, công cụ Mingo).
  - 1.2.3. Phạm vi nghiên cứu (Quy trình tuyển dụng nội bộ từ tiếp nhận hồ sơ đến chuyển đổi nhân sự chính thức).
- **1.3. Tổng quan về Cơ sở dữ liệu NoSQL**
  - 1.3.1. Sự ra đời và giới hạn của cơ sở dữ liệu quan hệ (RDBMS) trước bài toán Big Data.
  - 1.3.2. Định lý CAP và nguyên lý BASE trong phân tán dữ liệu.
  - 1.3.3. Bốn mô hình NoSQL cốt lõi: Document Store, Key-Value, Column-Family, Graph Database.
- **1.4. Tổng quan về Hệ quản trị CSDL MongoDB**
  - 1.4.1. Kiến trúc lưu trữ tài liệu (Document-Oriented Architecture).
  - 1.4.2. Định dạng JSON và BSON (Binary JSON).
  - 1.4.3. Các thành phần dữ liệu: Database, Collection, Document, Field.
  - 1.4.4. Cấu trúc và nguyên lý sinh khóa ObjectId (12 bytes: Timestamp, Process ID, Counter).
  - 1.4.5. Cơ chế lược đồ linh hoạt (Flexible Schema) và khả năng mở rộng ngang (Horizontal Sharding).
  - 1.4.6. Cơ chế chỉ mục (Indexing Mechanisms) và tối ưu truy vấn.
  - 1.4.7. Khung tổng hợp dữ liệu (Aggregation Pipeline Framework).

---

### CHƯƠNG 2. NGHIÊN CỨU CÔNG CỤ MINGO VÀ SO SÁNH ĐỐI CHUẨN
*(Phụ trách: Quý)*

- **2.1. Tổng quan về công cụ Mingo**
  - 2.1.1. Khái niệm, kiến trúc phần mềm và triết lý thiết kế (Node.js/C++ Native UI Engine).
  - 2.1.2. Vị trí của Mingo trong hệ sinh thái quản trị CSDL MongoDB.
  - 2.1.3. Cài đặt và thiết lập kết nối an toàn (Connection String URI, SSH Tunneling, Replica Set).
- **2.2. Các tính năng quản trị dữ liệu cốt lõi của Mingo**
  - 2.2.1. Quản lý đa cơ sở dữ liệu và Collections.
  - 2.2.2. Duyệt tài liệu trực quan đa chế độ: Tree View, Table View, JSON View.
  - 2.2.3. Thao tác CRUD tốc độ cao và trình chỉnh sửa trực tiếp Inline Cell Editing.
  - 2.2.4. Trình phân tích cấu trúc lược đồ Schema Analyzer và cảnh báo dị thường kiểu dữ liệu.
  - 2.2.5. Cơ chế Smart Relations: Nhận diện liên kết tham chiếu ObjectId giữa các Collection.
  - 2.2.6. Quản trị chỉ mục (Index Management) và trực quan hóa phân bổ dung lượng lưu trữ.
  - 2.2.7. Công cụ nạp và xuất dữ liệu (Import/Export Engine) hỗ trợ JSON, CSV, BSON.
- **2.3. Các tính năng khai thác dữ liệu chuyên sâu**
  - 2.3.1. Trình soạn thảo truy vấn Query Editor với khả năng tự động hoàn thành cú pháp thông minh.
  - 2.3.2. Công cụ dựng đường ống tổng hợp trực quan Aggregation Builder.
  - 2.3.3. Cơ chế kiểm tra kết quả trung gian theo từng Stage ($match, $lookup, $unwind, $group).
  - 2.3.4. Công cụ giải thích kế hoạch thực thi Explain Plan (Visual Execution Plan).
- **2.4. Đánh giá đối chuẩn toàn diện: Mingo so với MongoDB Compass**
  - 2.4.1. Kiến trúc nền tảng và tối ưu hóa tài nguyên phần cứng.
  - 2.4.2. Khả năng làm việc đa nhiệm: Multi-tabs và Multi-windows.
  - 2.4.3. Hiệu năng hiển thị tập dữ liệu lớn và độ nhạy phản hồi giao diện.
  - 2.4.4. Tính năng điều hướng tham chiếu quan hệ (Smart Relations).
  - 2.4.5. Bảng tổng hợp so sánh định lượng và định tính giữa hai công cụ.
- **2.5. Định vị 4 nhóm Cơ sở dữ liệu và Bài toán phù hợp với Mingo**
  - Nhóm 1: Doanh nghiệp thương mại điện tử và chuỗi cung ứng (E-Commerce Catalog).
  - Nhóm 2: Hệ thống quản trị nội dung và tin tức đa phương tiện (Headless CMS).
  - Nhóm 3: Nền tảng phân tích nhật ký và giám sát hệ thống (Audit Logs & Telemetry).
  - Nhóm 4: Hệ thống quản trị nguồn nhân lực và tuyển dụng nhân tài (ATS & HR Management).

---

### CHƯƠNG 3. PHÂN TÍCH VÀ ĐẶC TẢ CƠ SỞ DỮ LIỆU QUẢN LÝ TUYỂN DỤNG
*(Phụ trách: Kiệt)*

- **3.1. Phân tích nghiệp vụ bài toán Quản lý tuyển dụng nhân sự**
  - 3.1.1. Chu trình tuyển dụng khép kín: Nhu cầu -> Tuyển mộ -> Đánh giá -> Tiếp nhận.
  - 3.1.2. Mô hình máy trạng thái hồ sơ ứng viên (Candidate Application State Machine).
- **3.2. Phân tích yêu cầu hệ thống**
  - 3.2.1. Yêu cầu chức năng (Functional Requirements).
  - 3.2.2. Yêu cầu phi chức năng (Non-Functional Requirements: Tính toàn vẹn, độ trễ, an toàn).
  - 3.2.3. Sơ đồ Use Case tổng quát và kịch bản chi tiết.
- **3.3. Chiến lược thiết kế CSDL MongoDB: Nhúng (Embedding) vs Tham chiếu (Referencing)**
  - 3.3.1. Cơ sở lý thuyết lựa chọn giữa kỹ thuật Nhúng và Tham chiếu.
  - 3.3.2. Đánh giá tỷ lệ Đọc/Ghi (Read/Write Ratio) và kích thước tài liệu tối đa 16MB của BSON.
  - 3.3.3. Cấu trúc 6 Collections: `departments`, `positions`, `candidates`, `applications`, `interviews`, `employees`.
- **3.4. Đặc tả chi tiết cấu trúc dữ liệu 6 Collections**
  - 3.4.1. Bảng đặc tả trường, kiểu dữ liệu BSON, ràng buộc của từng Collection (dựa trên tập dữ liệu chuẩn hóa `backend/data/*.json`).
  - 3.4.2. Cài đặt các tệp Mongoose Schema tương ứng.
- **3.5. Cơ chế đảm bảo toàn vẹn dữ liệu ứng dụng**
  - 3.5.1. Ràng buộc an toàn khi thao tác xóa vị trí tuyển dụng (Safe Deletion Constraint).
  - 3.5.2. Đồng bộ trạng thái hiện thời giữa hồ sơ ứng tuyển và ứng viên (`currentStatus`).
  - 3.5.3. Tự động hóa hạn mức tuyển dụng (Headcount Auto-Close Trigger).
- **3.6. Thiết kế chiến lược chỉ mục (Indexing Strategy)**
  - 3.6.1. Thiết kế Unique Index bảo toàn tính duy nhất (Email, Mã định danh).
  - 3.6.2. Thiết kế Compound Index tối ưu hóa truy vấn bảng Kanban (`positionId` + `status`).
  - 3.6.3. Thiết kế Text Index hỗ trợ tìm kiếm kỹ năng và hồ sơ toàn văn.

---

### CHƯƠNG 4. XÂY DỰNG ỨNG DỤNG MINH HỌA (TALENTFLOW ATS)
*(Phụ trách: Phối hợp giữa Quốc và Kiệt)*

- **4.1. Kiến trúc hệ thống tổng thể** *(Quốc phụ trách)*
  - 4.1.1. Mô hình phân tầng kiến trúc 3 lớp (Presentation - Application - Data Tier).
  - 4.1.2. Sơ đồ luồng giao tiếp dữ liệu giữa Frontend, Express API, MongoDB và Mingo.
- **4.2. Lựa chọn công nghệ và môi trường phát triển** *(Quốc và Kiệt phụ trách)*
  - 4.2.1. Nền tảng Backend: Node.js, Express.js, Mongoose ODM.
  - 4.2.2. Nền tảng Frontend: React 19, Vite, Tailwind CSS, Lucide Icons, Recharts.
  - 4.2.3. Môi trường CSDL: MongoDB Server Community v7.0.
- **4.3. Xây dựng dịch vụ Backend và danh mục RESTful API** *(Quốc phụ trách)*
  - 4.3.1. Dịch vụ xác thực người dùng và kiểm soát truy cập dựa trên vai trò (RBAC).
  - 4.3.2. Danh mục đặc tả kỹ thuật các API Endpoints (Candidates, Positions, Applications, Interviews, Employees, Dashboard).
  - 4.3.3. Lập trình cơ chế Sao lưu và Phục hồi CSDL tự động hóa (`backup.js`, `restore.js`).
  - 4.3.4. Bộ kiểm thử tự động xác minh toàn diện hệ thống 32 tiêu chí (`verify_project.js`).
- **4.4. Hiện thực hóa 6 đường ống tổng hợp dữ liệu nâng cao (Aggregation Pipelines)** *(Quốc phụ trách)*
  - 4.4.1. Pipeline 1: Thống kê phân bổ ứng viên theo vị trí tuyển dụng ($group, $lookup, $unwind).
  - 4.4.2. Pipeline 2: Đo lường tỷ lệ chuyển đổi phễu tuyển dụng tổng thể (Hiring Funnel qua $group + $cond + $project).
  - 4.4.3. Pipeline 3: Xếp hạng tần suất kỹ năng chuyên môn ứng viên ($unwind mảng skills).
  - 4.4.4. Pipeline 4: Phân nhóm ứng viên theo dải thâm niên kinh nghiệm ($bucket).
  - 4.4.5. Pipeline 5: Phân tích hiệu quả kênh tuyển dụng và chi phí thu hút ($group theo source).
  - 4.4.6. Pipeline 6: Tính toán thời gian tuyển dụng trung bình (Time-to-Hire qua phép toán $subtract ngày).
- **4.5. Hiện thực hóa các phân hệ giao diện người dùng Web ATS** *(Kiệt phụ trách)*
  - 4.5.1. Thiết kế hệ thống bố cục (Responsive Layout, Sticky Sidebar, Notification Toast).
  - 4.5.2. Màn hình Bảng điều khiển trung tâm (Executive Dashboard).
  - 4.5.3. Màn hình Quản lý hồ sơ ứng viên (Candidates Directory).
  - 4.5.4. Màn hình Vị trí tuyển dụng và Kiểm soát hạn mức (Job Positions).
  - 4.5.5. Màn hình Bảng quy trình tuyển dụng trực quan (Kanban Application Board).
  - 4.5.6. Màn hình Lịch và Đánh giá phỏng vấn đa vòng (Interview Scheduler).
  - 4.5.7. Màn hình Quản lý Nhân sự & Phòng ban nội bộ (Employees & Directory).
  - 4.5.8. Màn hình Báo cáo phân tích chuyên sâu (BI Analytics & Reports).
  - 4.5.9. Màn hình Khai thác Mingo & Đo lường Explain Plan thời gian thực (Mingo Guide Live).
  - 4.5.10. Động cơ trích xuất báo cáo bảng tính Microsoft Excel (.xlsx) đa định dạng.

---

### CHƯƠNG 5. THỰC NGHIỆM KHAI THÁC CSDL BẰNG MINGO VÀ ĐÁNH GIÁ ĐỊNH LƯỢNG
*(Phụ trách: Quốc)*

- **5.1. Thiết lập môi trường và kịch bản thực nghiệm**
  - Cấu hình phần cứng máy trạm thử nghiệm.
  - Quy mô tập dữ liệu kiểm thử (Số lượng Document trong 6 Collections).
- **5.2. Các bài thực nghiệm quản trị dữ liệu trên Mingo**
  - Thực nghiệm 1: Kết nối, giám sát trạng thái máy chủ và khảo sát không gian bộ nhớ.
  - Thực nghiệm 2: Duyệt tài liệu đa giao diện và chỉnh sửa dữ liệu nội dòng (Inline Edit).
  - Thực nghiệm 3: Kiểm chứng các thao tác CRUD và kiểm soát lỗi toàn vẹn.
- **5.3. Các bài thực nghiệm khai thác dữ liệu chuyên sâu**
  - Thực nghiệm 4: Thiết lập và thực thi truy vấn lọc ứng viên theo điều kiện phức hợp ($and, $or, $regex).
  - Thực nghiệm 5: Dựng Aggregation Pipeline trực quan phân tích tỷ lệ trúng tuyển qua từng Stage.
  - Thực nghiệm 6: Thực thi $lookup kết hợp 3 Collections (Candidate - Application - Position).
  - Thực nghiệm 7: Ứng dụng $unwind phân tích nhu cầu kỹ năng thị trường.
- **5.4. Thực nghiệm phân tích cấu trúc lược đồ và tối ưu chỉ mục**
  - Thực nghiệm 8: Đánh giá chất lượng dữ liệu bằng Schema Analyzer và phát hiện lỗi cố ý.
  - Thực nghiệm 9: Đo lường và đánh giá định lượng hiệu năng truy vấn có Index vs không Index qua Explain Plan (IXSCAN vs COLLSCAN, thời gian thực thi ms).
- **5.5. Thực nghiệm sao lưu, nạp dữ liệu và kiểm chứng đồng bộ hai chiều**
  - Thực nghiệm 10: Import dữ liệu hàng loạt từ JSON mẫu và Export danh sách sang CSV.
  - Thực nghiệm 11: Kiểm chứng đồng bộ tương tác hai chiều thời gian thực giữa Web App và Mingo.
- **5.6. Bảng tổng hợp đối chuẩn hiệu năng phần cứng định lượng (Mingo vs MongoDB Compass)**
  - Đo lường mức chiếm dụng bộ nhớ RAM khi mở 1 tab và 5 tabs (Mingo: ~135 MB vs Compass: ~780 MB).
  - Đo lường thời gian khởi động nguội (Cold Start) và tốc độ mở tập dữ liệu 50.000 dòng.
  - Nhận xét và đánh giá khách quan về hiệu quả vận hành thực tế.

---

### KẾT LUẬN VÀ HƯỚNG PHÁT TRIỂN
*(Phụ trách: Kiệt - Trưởng nhóm)*

- **1. Các kết quả chính đạt được của đề tài**
  - Mức độ hoàn thành các mục tiêu nghiên cứu lý thuyết công cụ Mingo.
  - Mức độ hoàn thiện của sản phẩm ứng dụng TalentFlow ATS và CSDL MongoDB.
- **2. Những hạn chế còn tồn tại**
- **3. Định hướng nghiên cứu và phát triển tiếp theo**

---

### TÀI LIỆU THAM KHẢO
*(Phụ trách: Cả nhóm đóng góp theo chuẩn IEEE/APA)*

- Tài liệu hướng dẫn chính thức từ MongoDB Documentation.
- Tài liệu kỹ thuật công cụ Mingo (Mingo.io Documentation).
- Các giáo trình, tài liệu Cơ sở dữ liệu NoSQL trong và ngoài nước.

---

### PHỤ LỤC BÁO CÁO
*(Phụ trách: Quý và Quốc trích xuất mã nguồn)*

- Phụ lục 1: Toàn văn mã nguồn định nghĩa 6 Schemas Mongoose.
- Phụ lục 2: Toàn bộ tập dữ liệu mẫu JSON (Seed Data).
- Phụ lục 3: Kịch bản 6 đường ống MongoDB Aggregation Pipelines hoàn chỉnh.
- Phụ lục 4: Danh mục bảng đặc tả kỹ thuật chi tiết các RESTful API Endpoints.

---

## PHẦN 4. QUY CHUẨN ĐỊNH DẠNG TÀI LIỆU MICROSOFT WORD KHI NỘP BÀI

Để đảm bảo tài liệu báo cáo có tính học thuật cao và đạt điểm hình thức tối đa, các thành viên khi viết Word cần tuân thủ nghiêm ngặt các quy định sau:

1. **Khổ giấy & Căn lề trang**:
   - Khổ giấy: **A4** (210 mm x 297 mm).
   - Lề trên (Top): **2.0 cm**; Lề dưới (Bottom): **2.0 cm**.
   - Lề trái (Left - gáy đóng cuốn): **3.0 cm**; Lề phải (Right): **2.0 cm**.
2. **Quy cách Font chữ & Giãn cách dòng**:
   - Font chữ chuẩn: **Times New Roman**.
   - Kích thước văn bản thường (Body text): **13 pt**.
   - Căn chỉnh đoạn văn: **Justified** (Căn đều hai bên).
   - Thụt đầu dòng đoạn văn (First line indent): **1.0 cm**.
   - Giãn dòng (Line spacing): **1.3 lines** (hoặc **1.5 lines** tùy quy định khoa).
   - Giãn cách đoạn (Paragraph spacing): Before: **3 pt**, After: **3 pt**.
3. **Quy cách Tiêu đề (Headings)**:
   - **TÊN CHƯƠNG (Heading 1)**: Chữ in hoa, In đậm, 16 pt, căn giữa trang.
   - **Mục cấp 2 (Heading 2 - ví dụ: 1.1)**: Chữ thường, In đậm, 14 pt, căn lề trái.
   - **Mục cấp 3 (Heading 3 - ví dụ: 1.1.1)**: Chữ thường, In nghiêng đậm, 13 pt, căn lề trái.
   - Tối đa phân cấp đến mục cấp 3 (không dùng mục cấp 4 sâu hơn).
4. **Quy chuẩn Đánh số và Chú thích Hình vẽ, Bảng biểu**:
   - **Hình vẽ**: Đặt căn giữa, chú thích hình đặt **phía dưới hình**, căn giữa, in nghiêng, cỡ chữ 11 pt hoặc 12 pt. Định dạng: *Hình [Số chương].[Thứ tự hình]: Tên mô tả hình*. Ví dụ: *Hình 2.3: Giao diện trực quan hóa kế hoạch Explain Plan trên Mingo*.
   - **Bảng biểu**: Đặt căn giữa, tiêu đề bảng đặt **phía trên bảng**, căn giữa, in đậm, cỡ chữ 11 pt hoặc 12 pt. Định dạng: **Bảng [Số chương].[Thứ tự bảng]: Tên mô tả bảng**. Ví dụ: **Bảng 5.2: Bảng đo lường đối chuẩn mức tiêu thụ RAM giữa Mingo và Compass**.
   - Mọi hình vẽ và bảng biểu xuất hiện trong báo cáo đều phải được viện dẫn bằng lời văn trong đoạn văn liền kề trước đó.
5. **Quy chuẩn Trích dẫn mã nguồn (Code Snippets)**:
   - Dùng font đơn cách (Monospaced font): **Consolas** hoặc **Courier New**, cỡ chữ **10 pt** hoặc **10.5 pt**.
   - Đặt trong khung viền (Table 1 ô hoặc Border shading) với nền xám nhạt (`#F5F5F5`).
6. **Văn phong khoa học**:
   - Sử dụng ngôn từ khách quan, trung tính, chính xác về mặt kỹ thuật.
   - Tuyệt đối không sử dụng đại từ nhân xưng cảm tính ("tôi", "chúng em", "mình") hoặc các ký hiệu biểu cảm (emoji).
