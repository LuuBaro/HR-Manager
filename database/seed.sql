-- =============================================
-- Seed Data for HR & Payroll System
-- =============================================

USE hr_payroll_system;

-- =============================================
-- 1. ROLES
-- =============================================

INSERT INTO roles (role_name, role_name_vi, role_name_zh, description) VALUES
('boss', 'Giám đốc', '老板', 'Full system access - Owner'),
('admin', 'Quản trị viên', '超级管理员', 'System administrator with full access'),
('hr_manager', 'Trưởng phòng Nhân sự', '人事经理', 'HR Manager - can manage employees and attendance'),
('payroll_specialist', 'Chuyên viên Lương', '薪资管理员', 'Payroll specialist - can manage salary and payroll'),
('employee', 'Nhân viên', '员工', 'Regular employee - limited access');

-- =============================================
-- 2. PERMISSIONS
-- =============================================

INSERT INTO permissions (permission_name, resource, action, description_vi, description_zh) VALUES
-- Employee permissions
('employee.view', 'employee', 'view', 'Xem thông tin nhân viên', '查看员工信息'),
('employee.create', 'employee', 'create', 'Tạo hồ sơ nhân viên mới', '创建员工档案'),
('employee.update', 'employee', 'update', 'Cập nhật thông tin nhân viên', '更新员工信息'),
('employee.delete', 'employee', 'delete', 'Xóa hồ sơ nhân viên', '删除员工档案'),
('dashboard.view', 'dashboard', 'view', 'Xem bảng điều khiển tổng quát', '查看总仪表板'),

-- Attendance permissions
('attendance.view', 'attendance', 'view', 'Xem bảng chấm công', '查看考勤表'),
('attendance.create', 'attendance', 'create', 'Tạo bản ghi chấm công', '创建考勤记录'),
('attendance.update', 'attendance', 'update', 'Cập nhật chấm công', '更新考勤'),
('attendance.delete', 'attendance', 'delete', 'Xóa bản ghi chấm công', '删除考勤记录'),

-- Leave permissions
('leave.view', 'leave', 'view', 'Xem đơn nghỉ phép', '查看请假申请'),
('leave.create', 'leave', 'create', 'Tạo đơn nghỉ phép', '创建请假申请'),
('leave.approve', 'leave', 'approve', 'Phê duyệt đơn nghỉ phép', '批准请假'),
('leave.reject', 'leave', 'reject', 'Từ chối đơn nghỉ phép', '拒绝请假'),

-- Payroll permissions
('payroll.view', 'payroll', 'view', 'Xem bảng lương', '查看工资单'),
('payroll.create', 'payroll', 'create', 'Tạo bảng lương', '创建工资单'),
('payroll.update', 'payroll', 'update', 'Cập nhật bảng lương', '更新工资单'),
('payroll.approve', 'payroll', 'approve', 'Phê duyệt bảng lương', '批准工资单'),
('payroll.delete', 'payroll', 'delete', 'Xóa bảng lương', '删除工资单'),

-- System permissions
('system.settings', 'system', 'manage', 'Quản lý cấu hình hệ thống', '管理系统设置'),
('system.audit', 'system', 'view', 'Xem nhật ký hệ thống', '查看系统日志'),
('system.users', 'system', 'manage', 'Quản lý người dùng', '管理用户'),
('system.roles', 'system', 'manage', 'Quản lý phân quyền', '管理角色权限');

-- =============================================
-- 3. ROLE PERMISSIONS MAPPING
-- =============================================

-- Admin - Full Access (For configuration)
INSERT INTO role_permissions (role_id, permission_id)
SELECT 2, id FROM permissions;

-- Boss - View Only (Can see everything but cannot edit/add/delete)
INSERT INTO role_permissions (role_id, permission_id)
SELECT 1, id FROM permissions WHERE action = 'view';

-- HR Manager - Full access to employee modules (Decision makers)
INSERT INTO role_permissions (role_id, permission_id)
SELECT 3, id FROM permissions WHERE resource IN ('employee', 'attendance', 'leave', 'payroll', 'dashboard')
OR permission_name = 'system.settings';

-- Payroll Specialist
INSERT INTO role_permissions (role_id, permission_id)
SELECT 4, id FROM permissions WHERE permission_name IN (
    'employee.view',
    'attendance.view',
    'payroll.view', 'payroll.create', 'payroll.update'
);

-- Employee - Self service only
INSERT INTO role_permissions (role_id, permission_id)
SELECT 5, id FROM permissions WHERE permission_name IN (
    'attendance.view',
    'leave.view', 'leave.create',
    'payroll.view'
);

-- =============================================
-- 4. USERS (Password: 123456 for all)
-- =============================================

INSERT INTO users (email, password_hash, full_name, full_name_zh, role_id, is_active) VALUES
('admin@company.com', '$2a$10$rKZvVEhqZ8YqKqKqKqKqKOqKqKqKqKqKqKqKqKqKqKqKqKqKq', 'Quản trị viên', '管理员', 2, TRUE),
('boss@company.com', '$2a$10$rKZvVEhqZ8YqKqKqKqKqKOqKqKqKqKqKqKqKqKqKqKqKqKqKq', 'Giám đốc (Sếp)', '老板', 1, TRUE),
('hr.manager1@company.com', '$2a$10$rKZvVEhqZ8YqKqKqKqKqKOqKqKqKqKqKqKqKqKqKqKqKqKqKq', 'HR Trưởng phòng 01', '人事经理01', 3, TRUE),
('hr.manager2@company.com', '$2a$10$rKZvVEhqZ8YqKqKqKqKqKOqKqKqKqKqKqKqKqKqKqKqKqKqKq', 'HR Trưởng phòng 02', '人事经理02', 3, TRUE),
('hr.manager3@company.com', '$2a$10$rKZvVEhqZ8YqKqKqKqKqKOqKqKqKqKqKqKqKqKqKqKqKqKqKq', 'HR Trưởng phòng 03', '人事经理03', 3, TRUE);

-- =============================================
-- 5. DEPARTMENTS
-- =============================================

INSERT INTO departments (department_name, department_name_zh, department_code) VALUES
('Ban Giám Đốc', '董事会', 'BOD'),
('Phòng Nhân Sự', '人事部', 'HR'),
('Phòng CSKH', '客服部', 'CSKH');

-- =============================================
-- 6. POSITIONS
-- =============================================

INSERT INTO positions (position_name, position_name_zh, position_code, level) VALUES
('Giám Đốc', '总经理', 'CEO', 10),
('Phó Giám Đốc', '副总经理', 'VP', 9),
('Trưởng Phòng', '部门经理', 'MANAGER', 8),
('Phó Phòng', '副经理', 'DEPUTY_MANAGER', 7),
('Trưởng Nhóm', '组长', 'TEAM_LEAD', 6),
('Chuyên Viên Chính', '高级专员', 'SENIOR_SPECIALIST', 5),
('Chuyên Viên', '专员', 'SPECIALIST', 4),
('Nhân Viên', '员工', 'STAFF', 3),
('Thực Tập Sinh', '实习生', 'INTERN', 1);

-- =============================================
-- 7. EMPLOYEES
-- =============================================

INSERT INTO employees (employee_code, user_id, full_name, full_name_zh, email, phone, department_id, position_id, hire_date, contract_type, status) VALUES
('NV-001', 1, 'Nguyễn Văn Sếp', '阮文老板', 'boss@company.com', '0901234567', 1, 1, '2020-01-01', 'full_time', 'active'),
('NV-002', 2, 'Trần Thị Admin', '陈氏管理员', 'admin@company.com', '0901234568', 2, 3, '2020-02-01', 'full_time', 'active'),
('NV-003', 3, 'Phạm Văn Nhân Sự 01', '范文人事01', 'hr.manager1@company.com', '0901234569', 2, 3, '2020-03-01', 'full_time', 'active'),
('NV-004', 4, 'HR Trưởng phòng 02', '人事经理02', 'hr.manager2@company.com', '0901234570', 2, 4, '2020-04-01', 'full_time', 'active'),
('NV-005', 5, 'HR Trưởng phòng 03', '人事经理03', 'hr.manager3@company.com', '0901234571', 2, 6, '2021-01-15', 'full_time', 'active'),
('NV-006', NULL, 'Nguyễn CSKH 01', '阮客服01', 'cskh1@company.com', '0901234572', 3, 4, '2021-02-01', 'full_time', 'active'),
('NV-007', NULL, 'Trần CSKH 02', '陈客服02', 'cskh2@company.com', '0901234573', 3, 4, '2021-03-10', 'full_time', 'active'),
('NV-008', NULL, 'Lê CSKH 03', '黎客服03', 'cskh3@company.com', '0901234574', 3, 5, '2021-04-20', 'full_time', 'active'),
('NV-009', NULL, 'Vũ CSKH 04', '武客服04', 'cskh4@company.com', '0901234575', 3, 4, '2021-05-15', 'full_time', 'active'),
('NV-010', NULL, 'Đặng CSKH 05', '邓客服05', 'cskh5@company.com', '0901234576', 3, 4, '2021-06-01', 'full_time', 'active'),
('NV-011', NULL, 'Hoàng Hải', '黄海', 'hh@company.com', '0901234577', 3, 4, '2021-07-10', 'full_time', 'active'),
('NV-012', NULL, 'Bùi Khánh Linh', '裴庆玲', 'bkl@company.com', '0901234578', 3, 4, '2021-08-01', 'full_time', 'active'),
('NV-013', NULL, 'Ngô Quốc Nam', '吴国南', 'nqn@company.com', '0901234579', 3, 5, '2021-09-15', 'full_time', 'active'),
('NV-014', NULL, 'Đỗ Phương Oanh', '杜芳英', 'dpo@company.com', '0901234580', 3, 4, '2021-10-01', 'full_time', 'active'),
('NV-015', NULL, 'Trương Công Phượng', '张公凤', 'tcp@company.com', '0901234581', 3, 5, '2021-11-20', 'full_time', 'active');

-- =============================================
-- 8. LEAVE TYPES
-- =============================================

INSERT INTO leave_types (leave_name, leave_name_zh, leave_code, max_days_per_year, is_paid, requires_approval) VALUES
('Nghỉ phép năm', '年假', 'ANNUAL', 12, TRUE, TRUE),
('Nghỉ ốm', '病假', 'SICK', 30, TRUE, TRUE),
('Nghỉ không lương', '无薪假', 'UNPAID', 0, FALSE, TRUE),
('Nghỉ thai sản', '产假', 'MATERNITY', 180, TRUE, TRUE),
('Nghỉ việc riêng', '事假', 'PERSONAL', 5, FALSE, TRUE),
('Nghỉ hiếu', '丧假', 'BEREAVEMENT', 3, TRUE, TRUE);

-- =============================================
-- 9. SALARY COMPONENTS
-- =============================================

INSERT INTO salary_components (component_code, component_name, component_name_zh, component_type, calculation_type, default_value, is_taxable, is_active) VALUES
-- Allowances
('MEAL_ALLOW', 'Phụ cấp ăn trưa', '午餐补贴', 'allowance', 'fixed', 730000, FALSE, TRUE),
('TRAVEL_ALLOW', 'Phụ cấp đi lại', '交通补贴', 'allowance', 'fixed', 500000, TRUE, TRUE),
('PHONE_ALLOW', 'Phụ cấp điện thoại', '电话补贴', 'allowance', 'fixed', 200000, TRUE, TRUE),
('HOUSING_ALLOW', 'Phụ cấp nhà ở', '住房补贴', 'allowance', 'fixed', 1000000, TRUE, TRUE),
('POSITION_ALLOW', 'Phụ cấp chức vụ', '职位补贴', 'allowance', 'fixed', 2000000, TRUE, TRUE),
('EXPERTISE_ALLOW', 'Phụ cấp chuyên môn', '专业补贴', 'allowance', 'fixed', 1500000, TRUE, TRUE),
('DILIGENCE_ALLOW', 'Phụ cấp chuyên cần', '全勤奖', 'allowance', 'fixed', 500000, TRUE, TRUE),
('PARKING_ALLOW', 'Phụ cấp gửi xe', '停车费', 'allowance', 'fixed', 150000, FALSE, TRUE),

-- Deductions
('INSURANCE_SI', 'Bảo hiểm xã hội', '社会保险', 'deduction', 'percentage', 0, FALSE, TRUE),
('INSURANCE_HI', 'Bảo hiểm y tế', '医疗保险', 'deduction', 'percentage', 0, FALSE, TRUE),
('INSURANCE_UI', 'Bảo hiểm thất nghiệp', '失业保险', 'deduction', 'percentage', 0, FALSE, TRUE),
('UNION_FEE', 'Phí công đoàn', '工会费', 'deduction', 'percentage', 0, FALSE, TRUE),

-- Overtime
('OT_NORMAL', 'Tăng ca ngày thường', '平时加班', 'overtime', 'formula', 0, TRUE, TRUE),
('OT_WEEKEND', 'Tăng ca cuối tuần', '周末加班', 'overtime', 'formula', 0, TRUE, TRUE),
('OT_HOLIDAY', 'Tăng ca ngày lễ', '节假日加班', 'overtime', 'formula', 0, TRUE, TRUE);

-- Update percentage values for insurance
UPDATE salary_components SET percentage_value = 8.0 WHERE component_code = 'INSURANCE_SI';
UPDATE salary_components SET percentage_value = 1.5 WHERE component_code = 'INSURANCE_HI';
UPDATE salary_components SET percentage_value = 1.0 WHERE component_code = 'INSURANCE_UI';
UPDATE salary_components SET percentage_value = 1.0 WHERE component_code = 'UNION_FEE';

-- =============================================
-- 10. EMPLOYEE SALARY STRUCTURES
-- =============================================

INSERT INTO employee_salary_structure (employee_id, base_salary, effective_from, is_current) VALUES
(1, 50000000, '2020-01-01', TRUE),
(2, 25000000, '2020-02-01', TRUE),
(3, 20000000, '2020-03-01', TRUE),
(4, 18000000, '2020-04-01', TRUE),
(5, 15000000, '2021-01-15', TRUE),
(6, 16000000, '2021-02-01', TRUE),
(7, 14000000, '2021-03-10', TRUE),
(8, 17000000, '2021-04-20', TRUE),
(9, 15500000, '2021-05-15', TRUE),
(10, 13000000, '2021-06-01', TRUE),
(11, 14500000, '2021-07-10', TRUE),
(12, 13500000, '2021-08-01', TRUE),
(13, 16500000, '2021-09-15', TRUE),
(14, 15000000, '2021-10-01', TRUE),
(15, 17500000, '2021-11-20', TRUE);

-- =============================================
-- 11. EMAIL WHITELIST
-- =============================================

INSERT INTO email_whitelist (email, role_id, added_by, is_active) VALUES
('admin@company.com', 2, NULL, TRUE),
('boss@company.com', 1, NULL, TRUE),
('hr.manager1@company.com', 3, NULL, TRUE),
('hr.manager2@company.com', 3, NULL, TRUE),
('hr.manager3@company.com', 3, NULL, TRUE);

-- =============================================
-- 12. SYSTEM SETTINGS
-- =============================================

INSERT INTO system_settings (setting_key, setting_value, setting_type, description_vi, description_zh, is_public) VALUES
('company_name', 'Công ty TNHH ABC', 'string', 'Tên công ty', '公司名称', TRUE),
('company_name_zh', 'ABC有限公司', 'string', 'Tên công ty (tiếng Trung)', '公司中文名', TRUE),
('standard_working_days', '22', 'number', 'Số ngày công chuẩn/tháng', '标准工作日/月', FALSE),
('standard_working_hours', '8', 'number', 'Số giờ làm việc chuẩn/ngày', '标准工作时间/天', FALSE),
('overtime_rate_normal', '1.5', 'number', 'Hệ số tăng ca ngày thường', '平时加班系数', FALSE),
('overtime_rate_weekend', '2.0', 'number', 'Hệ số tăng ca cuối tuần', '周末加班系数', FALSE),
('overtime_rate_holiday', '3.0', 'number', 'Hệ số tăng ca ngày lễ', '节假日加班系数', FALSE),
('tax_threshold', '11000000', 'number', 'Mức giảm trừ thuế TNCN', '个人所得税起征点', FALSE),
('currency', 'VND', 'string', 'Đơn vị tiền tệ', '货币单位', TRUE),
('language_default', 'vi', 'string', 'Ngôn ngữ mặc định', '默认语言', TRUE);
