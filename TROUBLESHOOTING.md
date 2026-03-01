# 🔧 HƯỚNG DẪN KHẮC PHỤC LỖI DATABASE
## Database Connection Troubleshooting / 数据库连接故障排除

---

## ❌ LỖI: ECONNREFUSED

Lỗi này có nghĩa là **không thể kết nối đến MySQL server**.

---

## 🔍 NGUYÊN NHÂN & GIẢI PHÁP

### 1️⃣ MySQL chưa được cài đặt

**Kiểm tra:**
```bash
mysql --version
```

**Nếu chưa cài đặt:**
- Download MySQL: https://dev.mysql.com/downloads/mysql/
- Hoặc cài XAMPP: https://www.apachefriends.org/
- Hoặc cài WampServer: https://www.wampserver.com/

---

### 2️⃣ MySQL chưa chạy

**Kiểm tra MySQL đang chạy:**

#### Nếu dùng XAMPP:
1. Mở XAMPP Control Panel
2. Click "Start" ở MySQL
3. Đợi đến khi hiện "Running"

#### Nếu dùng MySQL standalone:
```bash
# Windows - Check service
net start | findstr MySQL

# Start MySQL service
net start MySQL80
```

#### Nếu dùng WampServer:
1. Mở WampServer
2. Click icon màu xanh lá
3. MySQL phải ở trạng thái "Running"

---

### 3️⃣ Port 3306 bị chặn hoặc đã dùng

**Kiểm tra port:**
```bash
netstat -ano | findstr :3306
```

**Nếu port bị dùng:**
- Đổi port trong `.env`:
  ```env
  DB_PORT=3307
  ```
- Hoặc stop service đang dùng port 3306

---

### 4️⃣ Password MySQL sai

**Cập nhật `.env` với password đúng:**

```env
# Nếu không có password (mặc định XAMPP)
DB_PASSWORD=

# Nếu có password
DB_PASSWORD=your_mysql_password
```

**Kiểm tra kết nối MySQL:**
```bash
mysql -u root -p
```

---

### 5️⃣ MySQL user không có quyền

**Tạo user mới với đầy đủ quyền:**

```sql
-- Đăng nhập MySQL
mysql -u root -p

-- Tạo user mới
CREATE USER 'hruser'@'localhost' IDENTIFIED BY 'hrpassword123';

-- Cấp quyền
GRANT ALL PRIVILEGES ON *.* TO 'hruser'@'localhost' WITH GRANT OPTION;

-- Áp dụng
FLUSH PRIVILEGES;

-- Thoát
EXIT;
```

**Cập nhật `.env`:**
```env
DB_USER=hruser
DB_PASSWORD=hrpassword123
```

---

## ✅ GIẢI PHÁP NHANH NHẤT

### Option 1: Dùng XAMPP (Khuyến nghị cho Windows)

1. **Download & Install XAMPP:**
   - https://www.apachefriends.org/download.html
   - Chọn version có MySQL

2. **Start MySQL:**
   - Mở XAMPP Control Panel
   - Click "Start" ở MySQL
   - Đợi đến khi status = "Running"

3. **Cập nhật `.env`:**
   ```env
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=
   ```

4. **Chạy lại:**
   ```bash
   npm run init-db
   ```

---

### Option 2: Dùng MySQL Standalone

1. **Download MySQL:**
   - https://dev.mysql.com/downloads/mysql/
   - Chọn "MySQL Installer for Windows"

2. **Install với các options:**
   - Server only
   - Development Computer
   - Root password: `123456` (hoặc để trống)

3. **Start MySQL Service:**
   ```bash
   net start MySQL80
   ```

4. **Cập nhật `.env`:**
   ```env
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=123456
   ```

5. **Chạy lại:**
   ```bash
   npm run init-db
   ```

---

## 🧪 KIỂM TRA KẾT NỐI

### Test 1: Kết nối MySQL từ command line
```bash
mysql -h localhost -P 3306 -u root -p
```

Nếu thành công, bạn sẽ thấy:
```
Welcome to the MySQL monitor...
mysql>
```

### Test 2: Tạo database thủ công
```sql
CREATE DATABASE hr_payroll_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
SHOW DATABASES;
```

### Test 3: Kiểm tra quyền
```sql
SHOW GRANTS FOR 'root'@'localhost';
```

---

## 📝 CHECKLIST

Trước khi chạy `npm run init-db`, đảm bảo:

- [ ] MySQL đã được cài đặt
- [ ] MySQL service đang chạy
- [ ] Port 3306 available (hoặc đã đổi port trong .env)
- [ ] DB_USER và DB_PASSWORD trong .env đúng
- [ ] MySQL user có quyền CREATE DATABASE
- [ ] Có thể kết nối MySQL từ command line

---

## 🆘 NẾU VẪN LỖI

### Thử phương án thủ công:

1. **Tạo database thủ công:**
   ```bash
   mysql -u root -p
   ```

   ```sql
   CREATE DATABASE hr_payroll_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   USE hr_payroll_system;
   SOURCE d:/SYSHRYUEMEI/database/schema.sql;
   SOURCE d:/SYSHRYUEMEI/database/seed.sql;
   EXIT;
   ```

2. **Cập nhật password hashes:**
   - Mở file `database/seed.sql`
   - Tìm dòng có `$2a$10$...`
   - Thay bằng password hash thật từ bcrypt

3. **Hoặc dùng phpMyAdmin (nếu có XAMPP):**
   - Mở http://localhost/phpmyadmin
   - Tạo database: `hr_payroll_system`
   - Import file: `database/schema.sql`
   - Import file: `database/seed.sql`

---

## 💡 TIPS

### Nếu dùng XAMPP:
- MySQL mặc định không có password
- User: `root`
- Password: `` (để trống)
- Port: `3306`

### Nếu dùng WampServer:
- User: `root`
- Password: `` (để trống)
- Port: `3306`

### Nếu dùng MySQL Workbench:
- Có thể test connection trước
- Tạo connection với thông tin trong `.env`

---

## 📞 HỖ TRỢ THÊM

Nếu vẫn gặp lỗi, vui lòng cung cấp:
1. Output đầy đủ của `npm run init-db`
2. Kết quả của `mysql --version`
3. Kết quả của `mysql -u root -p` (có kết nối được không?)
4. Nội dung file `.env` (ẩn password)

---

**Chúc bạn khắc phục thành công! 🎉**
