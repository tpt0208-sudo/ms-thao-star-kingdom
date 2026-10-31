# HỒ SƠ ĐÓNG GÓI & HƯỚNG DẪN TRIỂN KHAI SẢN PHẨM
## Vương quốc ngôi sao – Ms. Thao's Star Kingdom (v2.6.1 Production Release)

---

## 1. BẢN MÔ TẢ SẢN PHẨM (Product Overview)
**Vương quốc ngôi sao – Ms. Thao's Star Kingdom** là hệ thống quản lý lớp học tiểu học thông minh, thi đua khen thưởng ngôi sao và sổ liên lạc điện tử song ngữ **Việt – Anh (100% hiển thị đồng thời)** dành riêng cho cô chủ nhiệm **Nguyễn Thị Thảo** và các em học sinh khối Tiểu học (Trường Tiểu học và THCS Thư Lâm).

- **Đối tượng sử dụng:**
  - **Giáo viên chủ nhiệm (`Teacher`):** Quản lý toàn diện lớp học, học sinh, tổ nhóm, điểm danh, sơ đồ chỗ ngồi, cộng/trừ sao, duyệt đổi quà, bảng vinh danh 36 tuần học, bảng tin sinh nhật tự động, góc học tập và sao lưu/khôi phục dữ liệu.
  - **Học sinh (`Student`):** Đăng nhập bằng Mã học sinh (`HS001`–`HS028`) kèm Mã PIN bảo mật cá nhân để xem số sao tích lũy, bộ sưu tập huy hiệu, nhật ký rèn luyện, bảng tin lớp và đổi quà tại Tiệm Tạp Hóa Sao cho chính mình.
  - **Phụ huynh / Khách (`Guest`):** Tra cứu thông tin chung của lớp, bảng vinh danh thi đua, góc học tập ở chế độ **Chỉ xem (`Read-only`)** bảo mật thông tin nhạy cảm của học sinh.

---

## 2. DANH SÁCH CHỨC NĂNG CHÍNH (Core Features)
1. **Hệ thống giao diện Song ngữ Việt – Anh cố định (Simultaneous Bilingual UI):** Tiếng Việt hiển thị phía trên, Tiếng Anh hiển thị phía dưới đồng bộ trên toàn bộ 11 phân hệ, nút bấm, nhãn, hộp thoại và thông báo; giữ nguyên dữ liệu do giáo viên nhập.
2. **Trang Tổng Quan Vương Quốc (`Dashboard`):** Thống kê nhanh sĩ số 28 học sinh, 4 tổ thi đua, tổng sao toàn lớp, học sinh xuất sắc dẫn đầu, sinh nhật trong tháng, hộp thư thông báo cá nhân hóa theo từng tài khoản và chuyển đổi linh hoạt giữa các lớp.
3. **Bảng Tin Lớp & Tự Động Đồng Bộ Sinh Nhật (`Class News & Auto Birthday Sync`):** Tự động rà soát học sinh có sinh nhật trong tháng hiện tại (ví dụ: Tháng 10, Tháng 11), tạo bản tin chúc mừng sinh nhật không trùng lặp, ghim tin quan trọng và gửi thông báo tự động.
4. **Quản Lý Lớp, Tổ, Điểm Danh & Sơ Đồ Lớp (`Class, Teams, Attendance & Seating Map`):** Quản lý 4 tổ thi đua, chuyển tổ tức thì, điểm danh hàng ngày (`Có mặt`, `Vắng có phép`, `Vắng không phép`, `Đi muộn`) và sơ đồ bàn học trực quan.
5. **Hồ Sơ Măng Non (`Student Profiles`):** Quản lý hồ sơ chi tiết của 28 học sinh Lớp 2A5, thêm/sửa/xóa học sinh, đổi ảnh đại diện, cấp mã học sinh & mã PIN, xuất/nhập danh sách CSV/JSON.
6. **Thưởng Sao, Trừ Sao, Hoàn Tác & Tiệm Tạp Hóa Sao (`Star Rewards, Undo & Star Shop`):** Cộng/trừ sao cá nhân, cả tổ hoặc toàn lớp với âm thanh khích lệ; hoàn tác giao dịch vừa thực hiện; quản lý kho quà tặng và duyệt đổi quà bằng sao tích lũy.
7. **Bảng Vinh Danh Tự Động Theo Lịch 36 Tuần Học (`36-Week Hall of Fame`):** Tự động tính toán tuần học hiện tại theo múi giờ Việt Nam (`Asia/Ho_Chi_Minh`, ví dụ **Tuần 8: 26/10/2026 – 01/11/2026**), tự động chuyển sang tuần mới vào mỗi Thứ Hai và tháng mới vào đầu tháng, giữ nguyên toàn bộ lịch sử các tuần/tháng trước và giới hạn chuẩn 36 tuần học (sau `16/05/2027` không sinh Tuần 37).
8. **Vòng Quay Ngẫu Nhiên (`Magic Random Picker`):** Gọi tên ngẫu nhiên học sinh hoặc tổ lên bảng kèm chế độ không lặp lại và thưởng sao trực tiếp.
9. **Góc Học Tập (`Learning Library`):** Kho tài liệu, bài giảng, phiếu bài tập, video theo môn học (Toán, Tiếng Việt, Tiếng Anh, Kỹ năng sống, Đọc sách).
10. **Quản Lý Logo Trường, Ảnh Đại Diện Lớp & Sao Lưu Khôi Phục (`School Branding & Backup/Restore`):** Tải lên và kiểm duyệt an toàn ảnh Logo trường (`PNG/JPG/WEBP` ≤ 2MB), khôi phục logo mặc định, tạo bản sao lưu JSON toàn diện và khôi phục an toàn có bản chụp tự động trước khi ghi đè.
11. **Kiến Trúc Bảo Mật & Phân Quyền 3 Cấp (`Security & Server-Side RBAC`):** Xác thực phiên làm việc bằng chữ ký số HMAC-SHA256 (`Bearer Token`), khóa hoàn toàn quyền ghi dữ liệu đối với Học sinh/Khách trên Backend API, và ẩn thông tin nhạy cảm (`passcode`, ngày sinh đầy đủ `dob`, ghi chú riêng `notes`) khỏi tài khoản Khách. Tích hợp cơ chế tự động tạm khóa 15 phút nếu nhập sai mã PIN hoặc mật khẩu quá 5 lần liên tiếp (chống brute-force). Điểm kiểm tra sức khỏe hệ thống phục vụ Cloud: `GET /health` và `GET /api/health`.

---

## 3. KIẾN TRÚC KỸ THUẬT & KHẢ NĂNG XUẤT BẢN (Architecture & Publishability)
- **Phân loại kiến trúc:** **Full-stack Web Application** gồm:
  - **Frontend:** React 19 + TypeScript + Vite 6 + Tailwind CSS v4 + Lucide Icons + Motion.
  - **Backend API & Static Server:** Node.js + Express 4 (`server.ts` biên dịch ra `server.js`) cung cấp RESTful API (`/api/*`), kiểm soát phân quyền RBAC và phục vụ trực tiếp gói giao diện tĩnh `dist/` trong môi trường Production.
  - **Cơ sở dữ liệu:** Lưu trữ JSON bền vững có cơ chế ghi nguyên tử (`data/db.json` + `data/backups/`) kết hợp cấu hình sẵn sàng cho **Firebase Auth / Cloud Firestore** (`firebase-applet-config.json` & `firestore.rules`).
- **Lệnh kiểm tra kiểu dữ liệu (Typecheck):** `npm run lint` (`tsc --noEmit`)
- **Lệnh đóng gói bản Production (Build Command):** `npm run build`
  - Biên dịch Frontend React sang thư mục tĩnh `dist/`
  - Biên dịch Backend `server.ts` sang tập tin thực thi `server.js`
- **Thư mục xuất bản:** `dist/` (Frontend) + `server.js` (Backend) + `data/db.json` (Database).
- **Lệnh khởi chạy bản Production (Start Command):** `npm start` (`node server.js`)

---

## 4. DANH SÁCH BIẾN MÔI TRƯỜNG CẦN CẤU HÌNH (`.env.example`)
Tạo tập tin `.env` tại thư mục gốc dự án dựa trên mẫu `.env.example` (tuyệt đối không đưa mật khẩu thật lên kho mã nguồn công khai):

```env
# Cổng chạy máy chủ và chế độ môi trường
PORT=3000
NODE_ENV=production

# Khóa bí mật ký phiên đăng nhập HMAC-SHA256 (Thay bằng chuỗi ngẫu nhiên >= 32 ký tự khi lên Production)
AUTH_SECRET=replace-with-a-strong-random-32-char-secret-key

# Cấu hình tài khoản Giáo viên chủ nhiệm (Xác thực phía Backend)
TEACHER_EMAIL=thaonguyen.gv@thulam.edu.vn
TEACHER_PASSWORD=replace-with-strong-teacher-password

# Tùy chọn nâng cao: Tích hợp AI Gemini
GEMINI_API_KEY=
```

---

## 5. HƯỚNG DẪN CÀI ĐẶT VÀ CHẠY ỨNG DỤNG (Installation & Run Guide)

### A. Chạy ở môi trường Phát triển (Local Development)
1. Cài đặt **Node.js v20+** (khuyến nghị Node.js v22 LTS).
2. Mở Terminal tại thư mục gốc của dự án và cài đặt thư viện:
   ```bash
   npm install
   ```
3. Khởi động máy chủ phát triển:
   ```bash
   npm run dev
   ```
4. Truy cập trình duyệt tại địa chỉ: `http://localhost:3000`

### B. Đóng gói và chạy bản Production ổn định
1. Kiểm tra lỗi TypeScript:
   ```bash
   npm run lint
   ```
2. Đóng gói bản Production (`dist/` + `server.js`):
   ```bash
   npm run build
   ```
3. Khởi chạy máy chủ Production:
   ```bash
   npm start
   ```

---

## 6. HƯỚNG DẪN TRIỂN KHAI PRODUCTION MIỄN PHÍ (Free Cloud Deployment Guide)

> **Lưu ý kiến trúc quan trọng:** Vì ứng dụng sử dụng Backend Express (`server.js`) đọc/ghi trực tiếp vào `data/db.json`, nếu triển khai lên các nền tảng **Static Hosting thuần túy** (như GitHub Pages) thì các API `/api/*` sẽ không hoạt động; nếu triển khai lên gói **Serverless / Ephemeral Container không gắn ổ đĩa** thì file `data/db.json` sẽ bị reset sau khi container khởi động lại.
> Do đó, phương án miễn phí tối ưu nhất là **Render.com (Web Service)** hoặc **Railway / Fly.io (kèm Volume lưu trữ `data/`)**, kết hợp tính năng **Xuất/Nhập bản sao lưu JSON** định kỳ trong mục Cài đặt của Giáo viên.

### Các bước triển khai miễn phí lên Render.com:
1. **Bước 1 – Chuẩn bị kho mã nguồn GitHub (Private Repository):**
   - Tạo một kho chứa **Private** trên GitHub để bảo vệ dữ liệu học sinh.
   - Đẩy toàn bộ mã nguồn dự án lên GitHub (`git push`). Đảm bảo không đẩy tập tin `.env` chứa mật khẩu thật.
2. **Bước 2 – Tạo dịch vụ Web Service trên Render.com:**
   - Đăng nhập [https://render.com](https://render.com) bằng tài khoản GitHub.
   - Nhấn **New +** -> Chọn **Web Service** -> Kết nối với kho GitHub của dự án.
3. **Bước 3 – Thiết lập thông số Build & Run:**
   - **Runtime:** `Node`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
   - **Instance Type:** `Free`
4. **Bước 4 – Cấu hình Biến môi trường (Environment Variables):**
   - Trong mục **Environment Variables**, thêm các khóa:
     - `NODE_ENV` = `production`
     - `AUTH_SECRET` = *(Chuỗi ký tự ngẫu nhiên bảo mật)*
     - `TEACHER_EMAIL` = `thaonguyen.gv@thulam.edu.vn`
     - `TEACHER_PASSWORD` = *(Mật khẩu đăng nhập của Cô Thảo)*
5. **Bước 5 – Hoàn tất và Kiểm tra:**
   - Nhấn **Deploy Web Service**. Sau khoảng 2–3 phút, Render sẽ cấp đường dẫn `https://<ten-ung-dung>.onrender.com` có sẵn chứng chỉ bảo mật HTTPS.

---

## 7. HƯỚNG DẪN GIÁO VIÊN SỬ DỤNG & SAO LƯU KHÔI PHỤC (Teacher & Backup Manual)

### A. Đăng nhập theo 3 vai trò
- **Giáo viên chủ nhiệm:** Chọn thẻ **Giáo viên / Teacher Portal**, đăng nhập bằng Google (email giáo viên được cấp quyền) hoặc Email & Mật khẩu giáo viên.
- **Học sinh:** Chọn thẻ **Học sinh / Student Portal**, nhập **Mã học sinh** (ví dụ: `HS001`) và **Mã PIN 4 số** do cô chủ nhiệm cấp.
- **Phụ huynh / Khách:** Chọn nút **Khách tham quan (Chỉ xem) / Guest View (Read-only)** để xem thông tin chung của lớp.

### B. Quy trình Sao lưu & Khôi phục dữ liệu an toàn
1. Đăng nhập quyền **Giáo viên** -> Mở menu **Cài đặt & Sao lưu / Settings & Backup** (hoặc biểu tượng Sao lưu trên thanh tiêu đề).
2. **Tạo bản sao lưu tức thì (`Create Snapshot`):** Lưu trạng thái hiện tại của toàn bộ 28 học sinh, điểm sao, điểm danh, bảng tin vào danh sách bản sao lưu trên máy chủ.
3. **Tải file sao lưu về máy tính (`Export JSON`):** Tải tập tin `.json` về máy tính cá nhân của cô Thảo sau mỗi tuần học để lưu trữ an toàn tuyệt đối.
4. **Khôi phục dữ liệu (`Restore / Import JSON`):** Chọn bản sao lưu trong danh sách hoặc tải lên file `.json` từ máy tính. Hệ thống sẽ **tự động tạo một bản sao lưu dự phòng trước khi khôi phục** để cô Thảo có thể quay lại bất cứ lúc nào.
