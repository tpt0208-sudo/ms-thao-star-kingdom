# HƯỚNG DẪN TRIỂN KHAI PRODUCTION & ĐÁM MÂY (DEPLOYMENT GUIDE)
## Dự án: Vương quốc ngôi sao – Ms. Thao's Star Kingdom (v2.6.1)

---

## 1. PHÂN TÍCH BẢN CHẤT KIẾN TRÚC & HỆ THỐNG LƯU TRỮ

### 1.1. Kiến trúc thực tế của ứng dụng
- **Loại hình:** **Full-stack Monolithic Web Application** (React 19 Frontend + Express 4 Backend).
- **Cơ chế vận hành:**
  - Trong môi trường Production, máy chủ Node.js (`server.js`) lắng nghe trực tiếp trên cổng `process.env.PORT || 3000`.
  - Toàn bộ các yêu cầu `/api/*` được xử lý bởi Express Router kèm lớp bảo vệ phân quyền RBAC, chữ ký HMAC-SHA256 và cơ chế chống brute-force.
  - Các yêu cầu giao diện (SPA routes) được phục vụ trực tiếp từ thư mục tĩnh `dist/` kèm cơ chế fallback `dist/index.html` (đảm bảo không bị lỗi 404 khi người dùng tải lại trang trên các URL con).
  - Điểm kiểm tra tình trạng dịch vụ (Health Check): `GET /health` và `GET /api/health` trả về `200 OK`.

### 1.2. Đánh giá hệ thống lưu trữ trên Render Free (Ephemeral Filesystem)
- **Đặc điểm Render Free:** Gói miễn phí của Render sử dụng container không có ổ đĩa gắn ngoài (Ephemeral Disk). Mỗi khi container chuyển sang chế độ ngủ (sau ~15 phút không có truy cập) hoặc khởi động lại (restart/redeploy), toàn bộ tệp tin phát sinh tại chỗ (như `data/db.json`) sẽ bị đưa về trạng thái gốc của bản build.
- **Hệ quả đối với dữ liệu:**
  - **Mục đích Demo / Trình chiếu:** **Hoàn toàn an toàn và phù hợp**. Khi cấu hình `USE_DEMO_DATA=true`, mỗi lần container restart sẽ tự động làm mới về tập dữ liệu 28 học sinh thử nghiệm trong `data/demo_db.json`, không lo bị rác dữ liệu sau khi người ngoài thao tác thử.
  - **Mục đích Vận hành Thực tế lâu dài:** **Không nên lưu dữ liệu học sinh thật trực tiếp trên Render Free mà không có cơ sở dữ liệu ngoài**.

---

## 2. CÁC PHƯƠNG ÁN LƯU TRỮ BỀN VỮNG CHO PRODUCTION MIỄN PHÍ

| Phương án | Chi phí | Cơ chế lưu trữ | Độ bền vững | Ưu điểm & Đánh giá phù hợp |
| :--- | :---: | :--- | :---: | :--- |
| **Phương án 1 (Khuyến nghị số 1): Firebase Cloud Firestore** | **Miễn phí 100%** (Gói Spark) | NoSQL Cloud Database của Google Firebase | **Vĩnh viễn** | Dự án đã có sẵn cấu hình `firebase-applet-config.json`, bộ thư viện Firebase SDK và tập tin quy tắc `firestore.rules` đã kiểm toán bảo mật. Cung cấp 50.000 lượt đọc và 20.000 lượt ghi miễn phí mỗi ngày. |
| **Phương án 2: Render Free + Xuất/Nhập Bản sao lưu JSON** | **Miễn phí 100%** | Lưu file cục bộ + File JSON trên máy tính Giáo viên | **Rất cao** | Sử dụng tính năng **Xuất file sao lưu (`Export JSON`)** sẵn có trong menu *Cài đặt & Sao lưu* của website. Cuối tuần giáo viên tải 1 file `.json` về máy tính. Khi máy chủ Render ngủ dậy chỉ cần nhấn **Khôi phục (`Import JSON`)** trong 3 giây. |
| **Phương án 3: Render Web Service + Supabase / MongoDB Atlas Free** | **Miễn phí 100%** | PostgreSQL (Supabase 500MB) hoặc MongoDB (Atlas 512MB) | **Vĩnh viễn** | Lưu trữ toàn bộ bảng trạng thái lên Database đám mây qua chuỗi kết nối URI, tách rời hoàn toàn vòng đời của container máy chủ web. |
| **Phương án 4: Máy chủ có ổ đĩa gắn ngoài (Persistent Volume)** | Có phí nhỏ (~$1–$5/tháng) | Fly.io hoặc Railway có gắn Volume vào thư mục `/data` | **Vĩnh viễn** | Giữ nguyên 100% mã nguồn và cơ chế file `data/db.json` mà không cần cấu hình thêm bất kỳ dịch vụ đám mây nào khác. |

---

## 3. CHUẨN BỊ TRƯỚC KHI TRIỂN KHAI (PRE-DEPLOYMENT CHECKLIST)

1. [x] **Kiểm tra TypeScript:** `npm run lint` (`tsc --noEmit`) đạt mã thoát `0`.
2. [x] **Kiểm tra Đóng gói:** `npm run build` tạo thành công `dist/` và `server.js` độc lập.
3. [x] **Kiểm tra Cổng mạng:** `server.ts` lắng nghe đúng `process.env.PORT || 3000`.
4. [x] **Điểm giám sát (Health Check):** `GET /health` và `GET /api/health` hoạt động ổn định.
5. [x] **Chống Brute-force:** Tự động khóa 15 phút nếu đăng nhập sai quá 5 lần liên tiếp.
6. [x] **Bảo vệ quyền riêng tư học sinh:** Tập tin `.gitignore` đã chặn toàn bộ `data/db.json` và `data/backups/`.
7. [x] **Dữ liệu Demo mẫu:** `data/demo_db.json` chứa 28 học sinh thử nghiệm đã được chuẩn bị sẵn sàng.
8. [ ] **Chưa công khai mã nguồn:** Đảm bảo kho lưu trữ GitHub được đặt ở chế độ **Private** (Riêng tư).

---

## 4. HƯỚNG DẪN TRIỂN KHAI TỪNG BƯỚC LÊN RENDER.COM

### Bước 1: Đẩy mã nguồn lên GitHub (Private Repository)
1. Mở Terminal và kiểm tra trạng thái Git:
   ```bash
   git status
   ```
2. Thêm và xác nhận các thay đổi:
   ```bash
   git add .
   git commit -m "feat: release v2.6.1 production ready with security hardening"
   ```
3. Tạo một Repository mới trên GitHub cá nhân ở chế độ **Private** (tuyệt đối không chọn Public khi chưa được phê duyệt).
4. Đẩy mã nguồn lên:
   ```bash
   git remote add origin https://github.com/<tai-khoan>/ms-thao-star-kingdom.git
   git push -u origin main
   ```

### Bước 2: Tạo dịch vụ Web Service trên Render
1. Truy cập [https://render.com](https://render.com) và đăng nhập bằng tài khoản GitHub.
2. Tại bảng điều khiển Render, nhấn **New +** -> Chọn **Web Service**.
3. Chọn kết nối với kho lưu trữ GitHub vừa tạo (`ms-thao-star-kingdom`).
4. Thiết lập các thông số cơ bản:
   - **Name:** `ms-thao-star-kingdom`
   - **Region:** `Singapore` (để có độ trễ nhanh nhất về Việt Nam)
   - **Branch:** `main`
   - **Runtime:** `Node`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
   - **Instance Type:** `Free`

### Bước 3: Cấu hình Biến môi trường (Environment Variables)
Tại mục **Environment Variables** trên Render, thêm các biến:

| Tên biến (Key) | Giá trị khuyến nghị (Value) | Ghi chú |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | Kích hoạt chế độ Production |
| `SESSION_SECRET` | *(Chuỗi ngẫu nhiên dài ít nhất 32 ký tự)* | Dùng ký phiên HMAC bảo mật |
| `TEACHER_EMAILS` | `thaonguyen.gv@thulam.edu.vn,cothao@gmail.com` | Email giáo viên được phép đăng nhập |
| `TEACHER_PASSWORD` | *(Mật khẩu an toàn do cô Thảo đặt)* | Mật khẩu tài khoản giáo viên |
| `USE_DEMO_DATA` | `true` *(nếu làm trang demo)* hoặc `false` | Khuyến nghị đặt `true` cho bản demo |

### Bước 4: Thiết lập Health Check Path
- Mở mục **Advanced** trên Render.
- Điền vào ô **Health Check Path**: `/health`
- Nhấn **Create Web Service**.

---

## 5. KIỂM THỬ VÀ NGHIỆM THU SAU KHI TRIỂN KHAI

Sau khi Render báo **Deploy Succeeded** (địa chỉ dạng `https://ms-thao-star-kingdom.onrender.com`):

1. **Kiểm tra Health Check:** Mở `https://<dia-chi>/health`, phản hồi phải có dạng:
   ```json
   {
     "status": "healthy",
     "uptime": 12,
     "version": "2.6.1",
     "environment": "production"
   }
   ```
2. **Kiểm tra SPA Routing:** Điều hướng qua các menu (Bảng vinh danh, Góc học tập, Hồ sơ măng non) và nhấn phím **F5 (Tải lại trang)**. Giao diện phải tải bình thường, không xuất hiện lỗi `Cannot GET /...`.
3. **Kiểm tra Đăng nhập Giáo viên:** Nhập Email và Mật khẩu giáo viên đã thiết lập trong biến môi trường để truy cập quyền quản trị.
4. **Kiểm tra Chống Brute-force:** Thử nhập sai mật khẩu 5 lần; hệ thống phải hiển thị thông báo tạm khóa 15 phút kèm mã trạng thái HTTP 429.
5. **Kiểm tra Chức năng Sao lưu:** Vào menu **Cài đặt & Sao lưu**, nhấn **Tạo bản chụp nhanh** và **Tải file sao lưu (.json)** về máy tính để kiểm tra tính toàn vẹn của tệp JSON.
