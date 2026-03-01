# 🚀 HƯỚNG DẪN KHỞI ĐỘNG NHANH
## Quick Start Guide / 快速启动指南

---

## ⚡ Các bước cơ bản

### 1️⃣ Cài đặt Dependencies (Đã hoàn thành ✅)
```bash
npm install
```

### 2️⃣ Khởi tạo Database
```bash
npm run init-db
```

**Lưu ý**: Đảm bảo MySQL đang chạy và cấu hình trong `.env` đúng!

### 3️⃣ Khởi động Server
```bash
# Development mode (auto-reload)
npm run dev

# Production mode
npm start
```

### 4️⃣ Truy cập hệ thống
- **Login**: http://localhost:3000/
- **Admin Dashboard**: http://localhost:3000/admin
- **API Health**: http://localhost:3000/api/health

---

## 👤 Tài khoản Demo

| Email | Password | Role |
|-------|----------|------|
| boss@company.com | 123456 | Boss (Full Access) |
| admin@company.com | 123456 | Admin |
| hr.manager@company.com | 123456 | HR Manager |
| payroll@company.com | 123456 | Payroll Specialist |

---

## 📋 Checklist Trước Khi Chạy

- [ ] MySQL đã cài đặt và đang chạy
- [ ] File `.env` đã được tạo và cấu hình đúng
- [ ] Dependencies đã được cài đặt (`npm install`)
- [ ] Database đã được khởi tạo (`npm run init-db`)

---

## 🔧 Cấu hình Database

Mở file `.env` và cập nhật:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=hr_payroll_system
```

---

## 🐛 Xử lý Lỗi Thường Gặp

### Lỗi: "Cannot connect to database"
**Nguyên nhân**: MySQL chưa chạy hoặc thông tin đăng nhập sai
**Giải pháp**: 
1. Kiểm tra MySQL đang chạy: `mysql -u root -p`
2. Kiểm tra lại DB_USER và DB_PASSWORD trong `.env`

### Lỗi: "Port 3000 already in use"
**Giải pháp**: 
1. Thay đổi PORT trong `.env` thành 3001 hoặc port khác
2. Hoặc kill process đang dùng port 3000

### Lỗi: "ER_ACCESS_DENIED_ERROR"
**Giải pháp**: 
1. Kiểm tra lại DB_PASSWORD trong `.env`
2. Tạo user MySQL mới nếu cần:
```sql
CREATE USER 'hruser'@'localhost' IDENTIFIED BY 'password123';
GRANT ALL PRIVILEGES ON hr_payroll_system.* TO 'hruser'@'localhost';
FLUSH PRIVILEGES;
```

---

## 📊 Cấu trúc API

### Authentication
- POST `/api/auth/login` - Đăng nhập
- POST `/api/auth/logout` - Đăng xuất
- GET `/api/auth/me` - Thông tin user hiện tại

### Employees
- GET `/api/employees` - Danh sách nhân viên
- GET `/api/employees/:id` - Chi tiết nhân viên
- POST `/api/employees` - Tạo nhân viên mới
- PUT `/api/employees/:id` - Cập nhật nhân viên

### Attendance
- GET `/api/attendance` - Dữ liệu chấm công
- GET `/api/attendance/monthly/:employee_id` - Bảng công tháng
- POST `/api/attendance` - Tạo/cập nhật chấm công
- POST `/api/attendance/bulk` - Cập nhật hàng loạt

### Payroll
- GET `/api/payroll/periods` - Danh sách kỳ lương
- POST `/api/payroll/periods` - Tạo kỳ lương mới
- PUT `/api/payroll/periods/:id/approve` - Phê duyệt
- PUT `/api/payroll/periods/:id/lock` - Khóa bảng lương

---

## 🎯 Các tính năng chính

✅ Quản lý nhân viên (Employee Management)
✅ Chấm công tháng (Monthly Attendance)
✅ Nghỉ phép (Leave Management)
✅ Tính lương tự động (Auto Payroll Calculation)
✅ Phân quyền RBAC (Role-Based Access Control)
✅ Nhật ký hệ thống (Audit Logs)
✅ Song ngữ VI/ZH (Bilingual Support)

---

## 📞 Hỗ trợ

Nếu gặp vấn đề, vui lòng:
1. Kiểm tra file README.md để biết thêm chi tiết
2. Xem logs trong terminal
3. Kiểm tra database có được tạo đúng không

---

**Chúc bạn triển khai thành công! 🎉**
**祝您部署成功！🎉**
