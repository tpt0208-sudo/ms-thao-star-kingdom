# Ms. Thao's Star Kingdom – Vương quốc ngôi sao (v2.6.1)

<div align="center">
  <img src="public/assets/kingdom/hero_banner.png" alt="Star Kingdom Banner" width="800" style="border-radius: 12px; margin-bottom: 16px;" />
  <p><strong>Hệ thống Quản lý Lớp học Tiểu học, Thi đua Ngôi sao & Sổ liên lạc Điện tử Song ngữ Việt – Anh</strong></p>
  <p><em>Classroom Management, Star Gamification & Simultaneous Bilingual Student Portal</em></p>
</div>

---

## 🌟 Giới thiệu tổng quan (Overview)

**Ms. Thao's Star Kingdom – Vương quốc ngôi sao** là nền tảng quản lý lớp học tiểu học thông minh, thi đua khen thưởng ngôi sao và sổ liên lạc điện tử song ngữ **Việt – Anh hiển thị đồng thời 100%** dành riêng cho cô chủ nhiệm **Nguyễn Thị Thảo** và các em học sinh khối Tiểu học (Trường Tiểu học và THCS Thư Lâm).

Ứng dụng kết hợp giữa mô hình quản lý sư phạm hiện đại và cơ chế tích điểm sao (Gamification) vui nhộn, tạo động lực học tập tích cực, rèn luyện nề nếp và gắn kết chặt chẽ giữa Nhà trường – Phụ huynh – Học sinh.

---

## 🎯 8 Phân hệ & Tính năng cốt lõi (Core Features)

1. **Giao diện Song ngữ Việt – Anh cố định (Simultaneous Bilingual UI):** Tiếng Việt ở trên (nổi bật, rõ nét), Tiếng Anh ở dưới đồng bộ trên toàn bộ 11 phân hệ, nút bấm, biểu mẫu, thông báo; giữ nguyên nội dung do giáo viên nhập.
2. **Bảng Điều Khiển Tổng Quan (Kingdom Dashboard):** Sĩ số 28 học sinh Lớp 2A5, 4 tổ thi đua, tổng sao toàn lớp, top ngôi sao xuất sắc, sinh nhật trong tháng và hộp thư thông báo cá nhân hóa theo từng tài khoản.
3. **Bảng Tin Lớp & Tự Động Đồng Bộ Sinh Nhật (Class News & Birthday Sync):** Tự động rà soát sinh nhật trong tháng hiện tại, tạo bản tin chúc mừng rực rỡ không trùng lặp, ghim tin quan trọng và thông báo tự động.
4. **Quản Lý Tổ, Điểm Danh & Sơ Đồ Lớp (Teams, Attendance & Seating):** Quản lý 4 tổ thi đua, chuyển tổ tức thì, điểm danh chuyên cần hàng ngày và sơ đồ bàn học trực quan.
5. **Hồ Sơ Măng Non (Student Profiles):** Quản lý 28 hồ sơ học sinh, cấp mã học sinh và mã PIN bảo mật, xuất/nhập danh sách Excel/CSV/JSON.
6. **Thưởng/Trừ Sao, Hoàn Tác & Tiệm Tạp Hóa Sao (Star Rewards, Undo & Shop):** Cộng/trừ sao cá nhân, tổ hoặc toàn lớp kèm âm thanh chúc mừng; hoàn tác giao dịch vừa thực hiện; quản lý kho quà tặng và duyệt đổi quà.
7. **Bảng Vinh Danh Tự Động 36 Tuần Học (36-Week Hall of Fame):** Tự động tính toán tuần học theo múi giờ Việt Nam (`Asia/Ho_Chi_Minh`), tự động nhảy tuần mới vào Thứ Hai và tháng mới vào đầu tháng; bảo toàn dữ liệu lịch sử và giới hạn chuẩn 36 tuần (sau `16/05/2027` dừng ở Tuần 36).
8. **Vòng Quay Ngẫu Nhiên (Magic Random Picker):** Gọi tên ngẫu nhiên học sinh hoặc tổ lên bảng kèm chế độ loại trừ lặp lại và thưởng sao trực tiếp.
9. **Góc Học Tập (Learning Library):** Kho bài giảng video, hình ảnh hoạt động, sách truyện song ngữ và trò chơi toán học tương tác.
10. **Bảo Mật & Phân Quyền 3 Vai Trò (RBAC Security):**
    - **Giáo viên (`Teacher`):** Toàn quyền quản trị lớp học, bảo vệ bởi xác thực Backend HMAC-SHA256 và Google OAuth.
    - **Học sinh (`Student`):** Đăng nhập bằng Mã học sinh + Mã PIN, tra cứu sao, huy hiệu, nhật ký rèn luyện và đổi quà cho chính mình.
    - **Khách (`Guest`):** Chế độ Chỉ xem (`Read-only`), tự động ẩn mã PIN, ngày sinh đầy đủ và ghi chú riêng tư của học sinh.
    - **Chống Brute-force:** Tự động khóa 15 phút nếu nhập sai mã PIN hoặc mật khẩu quá 5 lần liên tiếp.

---

## 🛠️ Công nghệ sử dụng (Tech Stack)

- **Frontend:** React 19, TypeScript, Vite 8, Tailwind CSS v4, Motion, Lucide Icons, Canvas Confetti.
- **Backend API:** Node.js, Express 4 (`server.ts` biên dịch thành `server.js` độc lập).
- **Cơ sở dữ liệu:**
  - Local & Demo: Lưu trữ JSON bền vững với hàng đợi ghi tuần tự chống xung đột (`data/db.json` & `data/demo_db.json`).
  - Production Cloud: Sẵn sàng kết nối Firebase Cloud Firestore (`firestore.rules` đã kiểm toán bảo mật).
- **Bảo mật:** Stateless HMAC-SHA256 Token, Server-side RBAC, File Upload Validation (`PNG/JPG/WEBP` ≤ 2MB, chặn SVG/XSS).

---

## 🚀 Khởi chạy dự án (Getting Started)

### 1. Cài đặt Dependencies
```bash
npm install
```

### 2. Thiết lập Biến môi trường
Sao chép tập tin mẫu và cấu hình:
```bash
cp .env.example .env
```
*(Chỉnh sửa các khóa bảo mật trong `.env`, tuyệt đối không commit `.env` lên GitHub).*

### 3. Chạy ở môi trường Development
```bash
npm run dev
```
Truy cập tại: `http://localhost:3000`

### 4. Kiểm tra kiểu dữ liệu (Typecheck) & Đóng gói Production
```bash
# Kiểm tra TypeScript
npm run lint

# Biên dịch gói Production (dist/ + server.js)
npm run build

# Khởi chạy bản Production
npm start
```

---

## 📁 Cấu trúc thư mục (Project Structure)

```text
├── data/
│   ├── demo_db.json         # Cơ sở dữ liệu mẫu an toàn (28 học sinh thử nghiệm)
│   ├── db.json              # Dữ liệu thật (đã được .gitignore bảo vệ PII)
│   └── backups/             # Thư mục lưu snapshot sao lưu hệ thống
├── dist/                    # Bundle giao diện tĩnh sau khi build
├── public/                  # Tài nguyên âm thanh, hình ảnh vương quốc
├── src/
│   ├── components/          # 11 phân hệ giao diện người dùng song ngữ
│   ├── services/            # API client (api.ts) và Firebase config (firebase.ts)
│   ├── utils/               # timePeriodService.ts (Lịch 36 tuần), formatters...
│   ├── types.ts             # Định nghĩa TypeScript toàn hệ thống
│   └── App.tsx              # Điều phối phân quyền và layout chính
├── server.ts                # Express Backend API, RBAC, Rate-limit & Static Server
├── server.js                # Bản build Node.js production của server.ts
├── firestore.rules          # Quy tắc bảo mật Cloud Firestore
├── DEPLOYMENT_GUIDE.md      # Hướng dẫn chi tiết triển khai Cloud miễn phí
├── RELEASE_PACKAGE_GUIDE.md # Sổ tay giáo viên & Tài liệu bàn giao đóng gói
└── FINAL_QA_REPORT.md       # Báo cáo kiểm định an ninh & chất lượng sản phẩm
```

---

## 🔒 Bản quyền & Quyền riêng tư (Privacy & License)

- Dự án phục vụ mục đích giáo dục cho Lớp 2A5 – Cô Nguyễn Thị Thảo (Trường TH & THCS Thư Lâm).
- Mọi dữ liệu thông tin học sinh trong kho lưu trữ công khai đều sử dụng tập dữ liệu thử nghiệm `data/demo_db.json`.
