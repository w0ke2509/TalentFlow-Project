from pathlib import Path
import json

DATA = Path(r"D:\NoSQL\DoAn\SourceDoAN\backend\data")

def oid(n, kind):
    prefix = {
        "dept": "66dd8f1011111111111111",
        "pos": "66dd8f2022222222222222",
        "cand": "66dd8f3033333333333333",
        "app": "66dd8f4044444444444444",
        "intv": "66dd8f5055555555555555",
        "emp": "66dd8f6066666666666666",
    }[kind]
    return {"$oid": f"{prefix}{n:02d}"}

def dt(s):
    return {"$date": s}

departments = [
    (1, "Phòng Công nghệ thông tin", "IT", "Phát triển phần mềm, hạ tầng máy chủ, DevOps và bảo mật dữ liệu", "Nguyễn Văn Hùng", "2024-03-01"),
    (2, "Phòng Nhân sự & Đào tạo", "HR", "Tuyển dụng, onboarding, đãi ngộ và đào tạo nội bộ", "Lê Thị Mai", "2024-03-01"),
    (3, "Phòng Marketing & Truyền thông", "MKT", "Performance marketing, nội dung thương hiệu và growth", "Trần Quốc Toản", "2024-06-01"),
    (4, "Phòng Kinh doanh & Đối tác", "SALES", "Bán hàng B2B, chăm sóc tài khoản và mở rộng thị trường", "Phạm Minh Đức", "2024-06-01"),
    (5, "Phòng Tài chính & Kế toán", "FIN", "Kế toán quản trị, ngân sách tuyển dụng và kiểm soát chi phí nhân sự", "Trần Thị Lan", "2025-01-15"),
    (6, "Phòng Chăm sóc khách hàng", "CS", "Customer success, hỗ trợ onboard khách hàng doanh nghiệp", "Ngô Bảo Châu", "2025-02-01"),
]

positions_raw = [
    (1, "Senior Backend Engineer (Node.js/MongoDB)", 1, "Thiết kế API, tối ưu MongoDB và xây microservices ATS", ["Node.js", "MongoDB", "Express", "Docker", "Redis"], 25000000, 40000000, 3, "open", "Hồ Chí Minh (Hybrid)", "Senior", "2026-08-05"),
    (2, "Frontend Developer (React / Tailwind)", 1, "Phát triển SPA ATS, tối ưu UX form và dashboard thống kê", ["React", "JavaScript", "Tailwind CSS", "TypeScript"], 15000000, 25000000, 4, "open", "Hồ Chí Minh", "Middle", "2026-08-08"),
    (3, "Data Analyst (NoSQL & BI)", 1, "Khai thác aggregation MongoDB và dựng báo cáo funnel tuyển dụng", ["MongoDB", "Python", "PowerBI", "Aggregation Pipeline", "SQL"], 18000000, 30000000, 2, "open", "Hà Nội / Remote", "Middle", "2026-08-10"),
    (4, "Chuyên viên Tuyển dụng IT (IT Recruiter)", 2, "Sourcing ứng viên IT, điều phối phỏng vấn và chăm sóc candidate", ["Kỹ năng giao tiếp", "Sourcing ứng viên", "Headhunting", "Tiếng Anh tốt"], 12000000, 20000000, 2, "open", "Hồ Chí Minh", "Junior", "2026-08-12"),
    (5, "Digital Marketing Specialist", 3, "Chạy ads đa kênh, tối ưu CPA tuyển dụng và employer branding", ["Google Ads", "Facebook Ads", "SEO", "Content Marketing"], 14000000, 22000000, 2, "open", "Đà Nẵng", "Middle", "2026-08-15"),
    (6, "Sales Executive (B2B SaaS)", 4, "Tìm kiếm khách hàng doanh nghiệp, demo ATS và chốt hợp đồng", ["Tư vấn bán hàng", "CRM", "Giao tiếp", "Tiếng Anh B2"], 12000000, 22000000, 3, "open", "Hồ Chí Minh", "Junior", "2026-08-18"),
    (7, "Key Account Manager", 4, "Chăm sóc tài khoản lớn, upsell gói ATS và giữ chân khách hàng", ["Account management", "Negotiation", "B2B Sales", "Excel"], 22000000, 35000000, 1, "open", "Hà Nội", "Senior", "2026-08-20"),
    (8, "HR Business Partner", 2, "Đồng hành manager IT/Sales về headcount, performance và giữ chân", ["HRBP", "Labor law", "Performance review", "Giao tiếp"], 18000000, 28000000, 1, "open", "Hồ Chí Minh", "Middle", "2026-08-22"),
    (9, "Content Creator", 3, "Sản xuất bài viết tuyển dụng, landing page và video thương hiệu", ["Copywriting", "Canva", "SEO", "Content Marketing"], 10000000, 16000000, 1, "paused", "Remote", "Junior", "2026-08-25"),
    (10, "QA Engineer", 1, "Kiểm thử API tuyển dụng, regression web ATS và viết test case", ["Manual Testing", "Postman", "Automation Testing", "SQL"], 16000000, 26000000, 2, "open", "Hồ Chí Minh", "Middle", "2026-08-26"),
    (11, "DevOps Engineer", 1, "CI/CD, giám sát MongoDB, Docker cho staging và production", ["Docker", "CI/CD", "Linux", "MongoDB", "AWS"], 28000000, 42000000, 1, "open", "Hồ Chí Minh (Hybrid)", "Senior", "2026-08-28"),
    (12, "Product Owner", 1, "Quản lý backlog ATS, ưu tiên Kanban và làm việc với dev/QA", ["Agile", "User story", "Figma", "SQL"], 30000000, 45000000, 1, "closed", "Hồ Chí Minh", "Lead", "2026-07-01"),
    (13, "Kế toán viên tổng hợp", 5, "Hạch toán lương, bảo hiểm và chi phí tuyển dụng theo tháng", ["Kế toán", "Excel", "MISA", "Luật thuế"], 12000000, 18000000, 2, "open", "Hồ Chí Minh", "Junior", "2026-09-01"),
    (14, "Customer Success Executive", 6, "Onboard khách hàng dùng ATS, theo dõi health score và tái tục", ["Customer success", "CRM", "Giao tiếp", "Tiếng Anh"], 13000000, 20000000, 2, "open", "Hà Nội", "Middle", "2026-09-02"),
    (15, "Intern Backend Node.js", 1, "Hỗ trợ viết API CRUD, seed MongoDB và test Postman", ["JavaScript", "Node.js", "MongoDB", "Git"], 4000000, 6000000, 2, "open", "Hồ Chí Minh", "Intern", "2026-09-04"),
]

candidates_raw = [
    (1, "Nguyễn Văn An", "nguyenvanan.dev@gmail.com", "0909123456", "male", "1998-05-15", ["Node.js", "Express", "MongoDB", "Redis", "Docker"], 4, "Đại học Bách Khoa", "Quận 1, TP. Hồ Chí Minh", "Optimize query MongoDB tốt, đã nhận việc backend", [("FPT Software", "Backend Developer", "2021-03-01", "2024-12-01", "Xây REST API và tối ưu aggregation ERP"), ("Startup Fintech", "Senior Backend", "2025-01-01", "2026-08-01", "Phụ trách MongoDB sharding và Redis")]),
    (2, "Trần Thị Bích Ngọc", "bichngoc.frontend@gmail.com", "0918765432", "female", "2000-09-22", ["React", "JavaScript", "Tailwind CSS", "TypeScript", "Redux"], 3, "Đại học Khoa học Tự nhiên", "Bình Thạnh, TP. Hồ Chí Minh", "UI chỉn chu, đã nhận offer frontend", [("Tiki", "Frontend Developer", "2023-01-01", "2026-07-01", "Xây design system và tối ưu LCP")]),
    (3, "Lê Hoàng Long", "longle.data@gmail.com", "0987112233", "male", "1997-12-10", ["MongoDB", "Python", "PowerBI", "Aggregation Pipeline", "SQL"], 5, "Đại học Kinh Tế TP.HCM", "Cầu Giấy, Hà Nội", "Mạnh aggregation, đang technical", [("Viettel Digital", "Data Analyst", "2020-06-01", "2026-08-01", "Pipeline báo cáo NoSQL tuyển dụng")]),
    (4, "Phạm Thu Thảo", "thuthao.hr@gmail.com", "0933445566", "female", "2001-03-08", ["Sourcing ứng viên", "Headhunting", "Giao tiếp", "Tiếng Anh tốt"], 2, "Đại học Luật TP.HCM", "Tân Bình, TP. Hồ Chí Minh", "Network IT khá tốt, đang screening", [("Navigos", "IT Recruiter", "2024-04-01", "2026-08-01", "Sourcing backend/frontend")]),
    (5, "Đỗ Minh Tuấn", "minhtuan.fullstack@gmail.com", "0944556677", "male", "1999-07-19", ["Node.js", "React", "MongoDB", "JavaScript"], 3, "Đại học CNTT - ĐHQG", "Thủ Đức, TP. Hồ Chí Minh", "Fullstack nhanh, đang phỏng vấn backend", [("KMS Technology", "Fullstack Developer", "2023-02-01", "2026-08-15", "MERN stack portal nhân sự")]),
    (6, "Võ Thị Quỳnh Hương", "quynhhuong.mkt@gmail.com", "0977889900", "female", "2001-11-03", ["Google Ads", "Facebook Ads", "SEO", "Content Marketing"], 2, "Đại học Ngoại Thương", "Hải Châu, Đà Nẵng", "Đã ký HĐ thử việc marketing", [("Haravan", "Performance Marketer", "2024-01-01", "2026-08-20", "Tối ưu CPA ads tuyển dụng")]),
    (7, "Hoàng Quốc Bảo", "bao.hq@gmail.com", "0903322114", "male", "2002-01-20", ["React", "Tailwind CSS", "JavaScript"], 1, "Đại học Sư phạm Kỹ thuật", "Quận 9, TP. Hồ Chí Minh", "Fresher frontend, hồ sơ mới nộp", [("Freelance", "Frontend Intern", "2025-06-01", "2026-08-01", "Landing page tuyển dụng React")]),
    (8, "Bùi Mai Phương", "maiphuong.qa@gmail.com", "0912344321", "female", "1996-04-30", ["Manual Testing", "Postman", "Automation Testing", "SQL"], 6, "Đại học Mở TP.HCM", "Quận 3, TP. Hồ Chí Minh", "QA senior, từng bị reject vì apply nhầm backend", [("FPT IS", "QA Lead", "2019-01-01", "2026-07-01", "Test API và regression web")]),
    (9, "Cao Minh Khôi", "khoi.devops@gmail.com", "0901888777", "male", "1995-02-11", ["Docker", "CI/CD", "Linux", "MongoDB", "AWS"], 6, "Đại học Bách Khoa Hà Nội", "Cầu Giấy, Hà Nội", "DevOps giàu kinh nghiệm, đang technical", [("VNG", "DevOps Engineer", "2019-08-01", "2026-08-01", "MongoDB replica set và CI")]),
    (10, "Nguyễn Thị Hồng Nhung", "nhung.qa@gmail.com", "0932111222", "female", "1998-08-09", ["Manual Testing", "Postman", "Cypress", "SQL"], 4, "Đại học Khoa học Tự nhiên", "Phú Nhuận, TP. Hồ Chí Minh", "Đã hired QA", [("Shopee", "QA Engineer", "2022-03-01", "2026-08-15", "Cypress e2e và test API")]),
    (11, "Phạm Đức Thành", "thanh.sales@gmail.com", "0903555666", "male", "1999-10-02", ["Tư vấn bán hàng", "CRM", "Giao tiếp", "Excel"], 3, "Đại học Kinh tế Quốc dân", "Hai Bà Trưng, Hà Nội", "Chốt sales tốt, đã nhận việc", [("Base.vn", "Sales Executive", "2023-05-01", "2026-08-20", "Bán HRM cho SME")]),
    (12, "Lê Thị Kim Anh", "kimanh.cs@gmail.com", "0977000111", "female", "2000-06-18", ["Customer success", "CRM", "Giao tiếp", "Tiếng Anh"], 2, "Đại học Ngoại thương", "Đống Đa, Hà Nội", "CS đang culture fit", [("Panda", "CS Executive", "2024-02-01", "2026-08-30", "Onboard 40+ khách SaaS")]),
    (13, "Vũ Hoàng Nam", "nam.po@gmail.com", "0915000444", "male", "1994-01-25", ["Agile", "User story", "Figma", "SQL"], 7, "Đại học FPT", "Quận 7, TP. Hồ Chí Minh", "PO mạnh nhưng vị trí đã đóng", [("MoMo", "Product Owner", "2019-01-01", "2026-06-01", "Quản lý backlog ví điện tử")]),
    (14, "Đinh Thu Hà", "ha.finance@gmail.com", "0933666888", "female", "1998-12-05", ["Kế toán", "Excel", "MISA", "Luật thuế"], 3, "Học viện Tài chính", "Tân Phú, TP. Hồ Chí Minh", "Hồ sơ kế toán đang screening", [("KPMG", "Junior Accountant", "2023-01-01", "2026-08-01", "Hạch toán lương và bảo hiểm")]),
    (15, "Trịnh Văn Khoa", "khoa.intern@gmail.com", "0902777888", "male", "2003-04-14", ["JavaScript", "Node.js", "MongoDB", "Git"], 0, "Đại học CNTT - ĐHQG", "Thủ Đức, TP. Hồ Chí Minh", "Intern backend mới nộp", []),
    (16, "Mai Phương Thảo", "thaocontent@gmail.com", "0968123456", "female", "2001-07-07", ["Copywriting", "Canva", "SEO", "Content Marketing"], 2, "Đại học KHXH&NV", "Quận 10, TP. Hồ Chí Minh", "Apply content khi JD đang paused", [("Yeah1", "Content Creator", "2024-03-01", "2026-08-01", "Series tuyển dụng và script video")]),
    (17, "Nguyễn Quốc Việt", "viet.kam@gmail.com", "0909444555", "male", "1993-09-12", ["Account management", "Negotiation", "B2B Sales", "Excel"], 8, "Đại học Ngoại thương", "Ba Đình, Hà Nội", "KAM senior, đang vòng final", [("SAP", "Account Manager", "2018-01-01", "2026-08-01", "Quản lý 12 tài khoản enterprise")]),
    (18, "Trần Gia Hân", "han.hrbp@gmail.com", "0918333444", "female", "1996-11-21", ["HRBP", "Labor law", "Performance review", "Giao tiếp"], 5, "Đại học Luật Hà Nội", "Hoàn Kiếm, Hà Nội", "Đã gửi offer HRBP", [("VinGroup", "HRBP", "2021-04-01", "2026-08-20", "Partner khối công nghệ 120 người")]),
    (19, "Hồ Anh Tuấn", "tuan.data@gmail.com", "0988000112", "male", "2000-03-03", ["Python", "SQL", "PowerBI", "MongoDB"], 1, "Đại học Bách Khoa TP.HCM", "Gò Vấp, TP. Hồ Chí Minh", "Data junior đang screening", [("Capstone", "Data Intern", "2025-01-01", "2026-06-01", "Dashboard PowerBI từ MongoDB")]),
    (20, "Lý Minh Châu", "chau.fe@gmail.com", "0901666777", "female", "2002-05-19", ["React", "Tailwind CSS", "TypeScript", "JavaScript"], 1, "Đại học FPT", "Quận 4, TP. Hồ Chí Minh", "Frontend fresher, hồ sơ mới", [("Personal project", "Frontend Developer", "2025-09-01", None, "Clone ATS board React + Tailwind")]),
]

apps_raw = [
    (1, 1, 1, "2026-08-28T09:00:00.000Z", "hired", "TopCV", 95, "Pass hết vòng, đã onboard backend"),
    (2, 2, 2, "2026-08-29T10:30:00.000Z", "hired", "LinkedIn", 91, "Nhận offer frontend và đi làm"),
    (3, 3, 3, "2026-08-30T14:15:00.000Z", "interview", "Website", 85, "Đang technical vòng 2"),
    (4, 4, 4, "2026-09-01T08:45:00.000Z", "screening", "VietnamWorks", 75, "HR đang rà CV recruiter"),
    (5, 5, 1, "2026-09-02T16:20:00.000Z", "interview", "TopCV", 80, "Test coding ổn, chờ phỏng vấn"),
    (6, 6, 5, "2026-09-03T11:00:00.000Z", "hired", "Facebook", 90, "Đã ký HĐ thử việc marketing"),
    (7, 7, 2, "2026-09-04T13:40:00.000Z", "applied", "Website", 70, "Fresher mới nộp frontend"),
    (8, 8, 1, "2026-09-05T15:00:00.000Z", "rejected", "TopCV", 50, "QA apply nhầm backend"),
    (9, 10, 10, "2026-09-06T09:10:00.000Z", "hired", "LinkedIn", 89, "Hired QA, đã onboard"),
    (10, 11, 6, "2026-09-06T11:20:00.000Z", "hired", "Website", 87, "Hired Sales Executive"),
    (11, 9, 11, "2026-09-07T08:00:00.000Z", "interview", "LinkedIn", 92, "DevOps đang technical"),
    (12, 12, 14, "2026-09-07T13:30:00.000Z", "interview", "VietnamWorks", 82, "CS đang culture fit"),
    (13, 13, 12, "2026-09-08T10:00:00.000Z", "rejected", "LinkedIn", 84, "JD Product Owner đã đóng"),
    (14, 14, 13, "2026-09-08T15:45:00.000Z", "screening", "Website", 73, "Kế toán chờ kiểm tra bằng cấp"),
    (15, 15, 15, "2026-09-09T09:00:00.000Z", "applied", "Website", 68, "Intern backend mới nộp"),
    (16, 16, 9, "2026-09-09T14:20:00.000Z", "applied", "Facebook", 71, "Content apply khi JD paused"),
    (17, 17, 7, "2026-09-10T08:30:00.000Z", "interview", "TopCV", 93, "KAM đang vòng final"),
    (18, 18, 8, "2026-09-10T11:10:00.000Z", "accepted", "LinkedIn", 90, "Đã gửi offer HRBP"),
    (19, 19, 3, "2026-09-11T09:40:00.000Z", "screening", "Website", 74, "Data junior đang test SQL"),
    (20, 20, 2, "2026-09-11T16:00:00.000Z", "applied", "TopCV", 69, "Frontend fresher chờ HR xem"),
    (21, 8, 10, "2026-09-12T10:15:00.000Z", "accepted", "LinkedIn", 88, "Apply lại đúng JD QA, đã offer"),
    (22, 5, 10, "2026-09-12T13:50:00.000Z", "screening", "Website", 77, "Fullstack apply thêm QA"),
]

intv_raw = [
    (1, 1, "Nguyễn Văn Hùng (Trưởng phòng IT)", "2026-08-30T07:00:00.000Z", "Phỏng vấn kỹ thuật", "technical", "Phòng họp A1", 95, "pass", "Nắm sharding, index và aggregation rất chắc"),
    (2, 1, "Lê Thị Mai (Trưởng phòng HR)", "2026-08-31T02:00:00.000Z", "Sơ vấn nhân sự", "hr", "Google Meet", 90, "pass", "Văn hóa phù hợp, chốt 32tr"),
    (3, 2, "Nguyễn Văn Hùng (Trưởng phòng IT)", "2026-09-01T03:00:00.000Z", "Phỏng vấn kỹ thuật", "technical", "Google Meet", 92, "pass", "React/Tailwind chắc, UI sense tốt"),
    (4, 2, "Lê Thị Mai (Trưởng phòng HR)", "2026-09-02T02:00:00.000Z", "Sơ vấn nhân sự", "hr", "Google Meet", 88, "pass", "Thái độ chuyên nghiệp, nhận offer"),
    (5, 3, "Nguyễn Văn Hùng (Trưởng phòng IT)", "2026-09-30T02:30:00.000Z", "Phỏng vấn kỹ thuật", "technical", "Phòng họp B2", 0, "pending", "Chuẩn bị câu hỏi aggregation"),
    (6, 5, "Nguyễn Văn Hùng (Trưởng phòng IT)", "2026-10-05T07:30:00.000Z", "Phỏng vấn kỹ thuật", "technical", "Google Meet", 0, "pending", "Live coding REST + MongoDB"),
    (7, 6, "Trần Quốc Toản (Trưởng phòng Marketing)", "2026-09-08T08:00:00.000Z", "Phỏng vấn chuyên môn", "technical", "Phòng họp A2", 90, "pass", "Case ads rõ, tối ưu CPA tốt"),
    (8, 8, "Nguyễn Văn Hùng (Trưởng phòng IT)", "2026-09-16T07:30:00.000Z", "Phỏng vấn kỹ thuật", "technical", "Google Meet", 52, "fail", "Không đủ kiến trúc backend/NoSQL"),
    (9, 4, "Lê Thị Mai (Trưởng phòng HR)", "2026-10-12T03:00:00.000Z", "Sơ vấn nhân sự", "hr", "Google Meet", 0, "pending", "Gọi điện screening Recruiter"),
    (10, 9, "Nguyễn Văn Hùng (Trưởng phòng IT)", "2026-09-10T04:00:00.000Z", "Phỏng vấn kỹ thuật", "technical", "Phòng họp B1", 89, "pass", "Test case và Postman bài bản"),
    (11, 10, "Phạm Minh Đức (GĐ Kinh doanh)", "2026-09-11T06:00:00.000Z", "Phỏng vấn bán hàng", "culture", "Google Meet", 87, "pass", "Pitch SaaS tự tin"),
    (12, 11, "Nguyễn Văn Hùng (Trưởng phòng IT)", "2026-10-20T07:00:00.000Z", "Phỏng vấn kỹ thuật", "technical", "Phòng họp A1", 0, "pending", "Hỏi CI/CD và backup MongoDB"),
    (13, 12, "Ngô Bảo Châu (Trưởng phòng CS)", "2026-10-29T03:30:00.000Z", "Culture fit", "culture", "Google Meet", 0, "pending", "Case khách hàng khó tính"),
    (14, 13, "Nguyễn Văn Hùng (Trưởng phòng IT)", "2026-09-12T02:00:00.000Z", "Phỏng vấn sản phẩm", "final", "Google Meet", 80, "fail", "Ứng viên tốt nhưng JD đã đóng"),
    (15, 17, "Phạm Minh Đức (GĐ Kinh doanh)", "2026-11-05T08:00:00.000Z", "Phỏng vấn Giám đốc", "final", "Phòng họp VIP", 0, "pending", "Final KAM, chốt package lương"),
    (16, 18, "Lê Thị Mai (Trưởng phòng HR)", "2026-09-14T02:30:00.000Z", "Sơ vấn nhân sự", "hr", "Google Meet", 91, "pass", "HRBP giàu case, đã offer"),
    (17, 18, "Nguyễn Văn Hùng (Trưởng phòng IT)", "2026-09-15T07:00:00.000Z", "Culture fit với IT", "culture", "Phòng họp A1", 88, "pass", "Hiểu headcount tech"),
    (18, 21, "Nguyễn Văn Hùng (Trưởng phòng IT)", "2026-09-18T04:00:00.000Z", "Phỏng vấn QA", "technical", "Google Meet", 88, "pass", "Apply đúng JD QA, pass"),
    (19, 14, "Trần Thị Lan (Trưởng phòng Tài chính)", "2026-11-17T03:00:00.000Z", "Sơ vấn chuyên môn", "hr", "Google Meet", 0, "pending", "Kiểm tra chứng chỉ kế toán"),
    (20, 19, "Lê Thị Mai (Trưởng phòng HR)", "2026-11-26T02:00:00.000Z", "Screening", "hr", "Google Meet", 0, "pending", "Test SQL take-home"),
]

emps_raw = [
    (1, 1, "Nguyễn Văn An", "nguyenvanan.dev@gmail.com", "employee", 1, 1, "2026-09-01", "probation", 32000000),
    (2, 6, "Võ Thị Quỳnh Hương", "quynhhuong.mkt@gmail.com", "employee", 3, 5, "2026-09-05", "probation", 18000000),
    (3, None, "Lê Thị Mai", "lethimai.hr@gmail.com", "admin", 2, 4, "2025-01-10", "active", 28000000),
    (4, None, "Nguyễn Văn Hùng", "hung.manager@gmail.com", "interviewer", 1, 1, "2024-03-01", "active", 45000000),
    (5, None, "Trần Quốc Toản", "toan.mkt@gmail.com", "interviewer", 3, 5, "2024-06-01", "active", 30000000),
    (6, None, "Phạm Minh Đức", "duc.sales@gmail.com", "interviewer", 4, 7, "2024-06-01", "active", 38000000),
    (7, None, "Trần Thị Lan", "lan.finance@gmail.com", "employee", 5, 13, "2025-01-15", "active", 22000000),
    (8, None, "Ngô Bảo Châu", "chau.cs@gmail.com", "employee", 6, 14, "2025-02-01", "active", 24000000),
    (9, 2, "Trần Thị Bích Ngọc", "bichngoc.frontend@gmail.com", "employee", 1, 2, "2026-09-08", "probation", 22000000),
    (10, 10, "Nguyễn Thị Hồng Nhung", "nhung.qa@gmail.com", "employee", 1, 10, "2026-09-12", "probation", 20000000),
    (11, 11, "Phạm Đức Thành", "thanh.sales@gmail.com", "employee", 4, 6, "2026-09-14", "probation", 16000000),
    (12, None, "Nguyễn Thị Hoa", "hoa.hr@gmail.com", "hr", 2, 4, "2025-05-01", "active", 15000000),
]

departments = [{
    "_id": oid(i, "dept"), "name": name, "code": code, "description": desc, "manager": mgr,
    "createdAt": dt(f"{created}T00:00:00.000Z")
} for i, name, code, desc, mgr, created in departments]

positions = [{
    "_id": oid(i, "pos"), "title": title, "departmentId": oid(dept, "dept"), "description": desc,
    "requirements": req, "salary": {"min": mn, "max": mx}, "quantity": qty, "status": status,
    "location": loc, "level": level, "createdAt": dt(f"{created}T00:00:00.000Z")
} for i, title, dept, desc, req, mn, mx, qty, status, loc, level, created in positions_raw]

candidates = []
for i, name, email, phone, gender, dob, skills, years, edu, addr, notes, exps in candidates_raw:
    experience = []
    for company, position, start, end, description in exps:
        item = {"company": company, "position": position, "startDate": dt(f"{start}T00:00:00.000Z"), "description": description}
        if end:
            item["endDate"] = dt(f"{end}T00:00:00.000Z")
        experience.append(item)
    slug = email.split("@")[0]
    candidates.append({
        "_id": oid(i, "cand"), "fullName": name, "email": email, "phone": phone, "gender": gender,
        "dateOfBirth": dt(f"{dob}T00:00:00.000Z"), "skills": skills, "experienceYears": years,
        "education": edu, "address": addr, "cvUrl": f"https://cv.talentflow.local/{slug}.pdf",
        "notes": notes, "experience": experience, "createdAt": dt("2026-08-20T00:00:00.000Z")
    })

applications = [{
    "_id": oid(i, "app"), "candidateId": oid(cand, "cand"), "positionId": oid(pos, "pos"),
    "appliedAt": dt(applied), "status": status, "source": source, "score": score, "note": note
} for i, cand, pos, applied, status, source, score, note in apps_raw]

interviews = [{
    "_id": oid(i, "intv"), "applicationId": oid(app, "app"), "interviewer": interviewer,
    "scheduledAt": dt(when), "round": round_, "type": type_, "location": loc,
    "score": score, "result": result, "feedback": feedback
} for i, app, interviewer, when, round_, type_, loc, score, result, feedback in intv_raw]

employees = []
for i, cand, name, email, role, dept, pos, start, status, salary in emps_raw:
    rec = {
        "_id": oid(i, "emp"), "fullName": name, "email": email, "password": "123456", "role": role,
        "departmentId": oid(dept, "dept"), "positionId": oid(pos, "pos"),
        "startDate": dt(f"{start}T00:00:00.000Z"), "status": status, "officialSalary": salary
    }
    if cand:
        rec["candidateId"] = oid(cand, "cand")
    employees.append(rec)

files = {
    "departments.json": departments,
    "positions.json": positions,
    "candidates.json": candidates,
    "applications.json": applications,
    "interviews.json": interviews,
    "employees.json": employees,
}
for name, payload in files.items():
    (DATA / name).write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(name, len(payload))
