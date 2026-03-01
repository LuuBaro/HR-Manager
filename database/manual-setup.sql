-- =============================================
-- MANUAL DATABASE SETUP SCRIPT
-- Chạy script này nếu npm run init-db không hoạt động
-- =============================================

-- Bước 1: Tạo database
CREATE DATABASE IF NOT EXISTS hr_payroll_system 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

-- Bước 2: Sử dụng database
USE hr_payroll_system;

-- Bước 3: Import schema
-- Trong MySQL command line:
-- SOURCE d:/SYSHRYUEMEI/database/schema.sql;

-- Bước 4: Import seed data
-- SOURCE d:/SYSHRYUEMEI/database/seed.sql;

-- Bước 5: Cập nhật password (nếu cần)
-- Password hash cho '123456' (bcrypt, 10 rounds)
-- Bạn cần generate hash mới nếu muốn đổi password

-- Kiểm tra kết quả:
SELECT 'Database created successfully!' as status;
SHOW TABLES;
SELECT COUNT(*) as total_users FROM users;
SELECT COUNT(*) as total_employees FROM employees;

-- =============================================
-- HOẶC CHẠY TẤT CẢ TRONG MỘT LỆNH:
-- =============================================
-- mysql -u root -p < d:/SYSHRYUEMEI/database/manual-setup.sql
