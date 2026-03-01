# 🗺️ UI TO BACKEND MAPPING

## Mapping các thư mục UI với Routes Backend

| # | Thư mục UI | File HTML đích | Backend Route | API Endpoints |
|---|-----------|---------------|---------------|---------------|
| 1 | `hr_admin_dashboard_overview_(bilingual)` | `admin-dashboard.html` | `/` | `/api/employees/stats/dashboard`, `/api/employees` |
| 2 | `employee_payroll_portal_dashboard` | `login.html` | `/login.html` | `/api/auth/login`, `/api/auth/me` |
| 3 | `attendance_calendar_management` | `attendance.html` | `/attendance.html` | `/api/attendance`, `/api/attendance/monthly/:id`, `/api/attendance/bulk` |
| 4 | `cấu_hình_bảo_mật_&_truy_cập` | `security.html` | `/security.html` | `/api/auth/sessions`, `/api/auth/logout-all` |
| 5 | `quản_lý_phân_quyền_chi_tiết_(rbac)` | `rbac.html` | `/rbac.html` | `/api/roles`, `/api/permissions`, `/api/roles/:id/permissions` |
| 6 | `nhật_ký_hệ_thống_chi_tiết` | `logs.html` | `/logs.html` | `/api/audit-logs` |
| 7 | `cấu_hình_công_thức_lương_&_phụ_cấp` | `salary-config.html` | `/salary-config.html` | `/api/salary-components` (CRUD) |
| 8 | `quy_trình_phê_duyệt_bảng_lương` | `payroll-approval.html` | `/payroll-approval.html` | `/api/payroll/periods`, `/api/payroll/periods/:id/approve` |
| 9 | `hồ_sơ_nhân_sự_chi_tiết_(vn` | `employees.html` | `/employees.html` | `/api/employees` (CRUD) |
| 10 | `quản_lý_&_phê_duyệt_nghỉ_phép_(vn` | `leave-management.html` | `/leave-management.html` | `/api/leave-requests` (cần tạo) |
| 11 | `cổng_thông_tin_nhân_viên_(portal)` | `employee-portal.html` | `/employee-portal.html` | `/api/auth/me`, `/api/payroll/employee/:id` |
| 12 | `báo_cáo_chi_phí_&_nhân_sự_cho_sếp` | `reports.html` | `/reports.html` | `/api/reports` (cần tạo) |
| 13 | `cài_đặt_hệ_thống_&_bảo_mật_công_ty` | `system-settings.html` | `/system-settings.html` | `/api/system-settings` |
| 14 | `cài_đặt_lịch_làm_việc_&_ngày_lễ` | `work-calendar.html` | `/work-calendar.html` | `/api/holidays` (cần tạo) |
| 15 | `quản_lý_thưởng_&_phạt_ngoài_lương` | `bonus-penalty.html` | `/bonus-penalty.html` | `/api/bonus-penalty` (cần tạo) |
| 16 | `nhập_dữ_liệu_&_kiểm_tra_lỗi_excel` | `import-data.html` | `/import-data.html` | `/api/import/validate`, `/api/import/execute` |

---

## 🎯 PRIORITY ORDER (Ưu tiên)

### Phase 1: Core Features (Đã có API) ✅
1. ✅ **Login** - `employee_payroll_portal_dashboard`
2. ✅ **Dashboard** - `hr_admin_dashboard_overview_(bilingual)`
3. 🔄 **Attendance** - `attendance_calendar_management`
4. 🔄 **Employees** - `hồ_sơ_nhân_sự_chi_tiết_(vn`
5. 🔄 **Payroll Approval** - `quy_trình_phê_duyệt_bảng_lương`
6. 🔄 **Salary Config** - `cấu_hình_công_thức_lương_&_phụ_cấp`

### Phase 2: Security & Management (Cần API mới)
7. ⚠️ **Security** - `cấu_hình_bảo_mật_&_truy_cập` (cần API sessions)
8. ⚠️ **RBAC** - `quản_lý_phân_quyền_chi_tiết_(rbac)` (cần API roles)
9. ⚠️ **Logs** - `nhật_ký_hệ_thống_chi_tiết` (cần API audit-logs)

### Phase 3: Extended Features (Cần API mới)
10. ⚠️ **Leave Management** - `quản_lý_&_phê_duyệt_nghỉ_phép_(vn` (cần API leave)
11. ⚠️ **Employee Portal** - `cổng_thông_tin_nhân_viên_(portal)`
12. ⚠️ **Reports** - `báo_cáo_chi_phí_&_nhân_sự_cho_sếp` (cần API reports)
13. ⚠️ **System Settings** - `cài_đặt_hệ_thống_&_bảo_mật_công_ty`
14. ⚠️ **Work Calendar** - `cài_đặt_lịch_làm_việc_&_ngày_lễ` (cần API holidays)
15. ⚠️ **Bonus/Penalty** - `quản_lý_thưởng_&_phạt_ngoài_lương` (cần API)
16. ⚠️ **Import Data** - `nhập_dữ_liệu_&_kiểm_tra_lỗi_excel` (cần API import)

---

## 📊 DATABASE MAPPING

### Existing Tables (Đã có)
- ✅ `users` → Login, Security, RBAC
- ✅ `employees` → Employees, Dashboard, Reports
- ✅ `departments` → Employees, Reports
- ✅ `positions` → Employees
- ✅ `attendance_records` → Attendance
- ✅ `salary_components` → Salary Config
- ✅ `payroll_periods` → Payroll Approval
- ✅ `payroll_records` → Payroll Approval, Employee Portal
- ✅ `audit_logs` → Logs
- ✅ `user_sessions` → Security
- ✅ `roles` → RBAC
- ✅ `permissions` → RBAC
- ✅ `role_permissions` → RBAC

### Tables cần thêm
- ⚠️ `leave_requests` → Leave Management (đã có trong schema!)
- ⚠️ `leave_types` → Leave Management (đã có trong schema!)
- ⚠️ `employee_leave_balance` → Leave Management (đã có trong schema!)
- ⚠️ `holidays` → Work Calendar (cần tạo)
- ⚠️ `bonus_penalty` → Bonus/Penalty (cần tạo)

---

## 🔧 BACKEND ROUTES CẦN TẠO

### 1. Leave Management (`routes/leave.js`)
```javascript
GET    /api/leave-requests              // List all leave requests
GET    /api/leave-requests/:id          // Get leave request detail
POST   /api/leave-requests              // Create leave request
PUT    /api/leave-requests/:id/approve  // Approve leave request
PUT    /api/leave-requests/:id/reject   // Reject leave request
GET    /api/leave-types                 // Get leave types
GET    /api/leave-balance/:employee_id  // Get employee leave balance
```

### 2. Audit Logs (`routes/audit.js`)
```javascript
GET    /api/audit-logs                  // Get audit logs with filters
```

### 3. RBAC (`routes/rbac.js`)
```javascript
GET    /api/roles                       // Get all roles
GET    /api/permissions                 // Get all permissions
PUT    /api/roles/:id/permissions       // Update role permissions
```

### 4. Sessions (thêm vào `routes/auth.js`)
```javascript
GET    /api/auth/sessions               // Get active sessions
POST   /api/auth/logout-all             // Logout all sessions
```

### 5. Reports (`routes/reports.js`)
```javascript
GET    /api/reports/payroll-summary     // Payroll summary report
GET    /api/reports/attendance-summary  // Attendance summary
GET    /api/reports/employee-cost       // Employee cost analysis
```

### 6. Holidays (`routes/holidays.js`)
```javascript
GET    /api/holidays                    // Get holidays
POST   /api/holidays                    // Create holiday
PUT    /api/holidays/:id                // Update holiday
DELETE /api/holidays/:id                // Delete holiday
```

### 7. Bonus/Penalty (`routes/bonus-penalty.js`)
```javascript
GET    /api/bonus-penalty               // List bonus/penalty
POST   /api/bonus-penalty               // Create bonus/penalty
PUT    /api/bonus-penalty/:id           // Update bonus/penalty
DELETE /api/bonus-penalty/:id           // Delete bonus/penalty
```

### 8. Import Data (`routes/import.js`)
```javascript
POST   /api/import/validate             // Validate Excel data
POST   /api/import/execute              // Execute import
```

---

## 🚀 EXECUTION PLAN

### Step 1: Copy HTML files to public/
```bash
# Tạo cấu trúc mới
mkdir -p public/pages
```

### Step 2: Integrate Phase 1 (Core Features)
- [ ] Attendance page
- [ ] Employees page
- [ ] Payroll Approval page
- [ ] Salary Config page

### Step 3: Create missing backend routes
- [ ] Leave management routes
- [ ] Audit logs routes
- [ ] RBAC routes
- [ ] Sessions routes

### Step 4: Integrate Phase 2 (Security & Management)
- [ ] Security page
- [ ] RBAC page
- [ ] Logs page

### Step 5: Integrate Phase 3 (Extended Features)
- [ ] Leave Management page
- [ ] Employee Portal page
- [ ] Reports page
- [ ] System Settings page
- [ ] Work Calendar page
- [ ] Bonus/Penalty page
- [ ] Import Data page

---

## 📝 NOTES

1. **Authentication**: Tất cả pages đều cần check token
2. **Permission**: Mỗi page cần check quyền phù hợp
3. **Bilingual**: Giữ nguyên VI/ZH trong UI
4. **Responsive**: Đảm bảo mobile-friendly
5. **Error Handling**: Xử lý lỗi API đầy đủ
6. **Loading States**: Hiển thị loading khi fetch data

---

**Bạn muốn tôi bắt đầu từ đâu?**
- A. Tạo tất cả Phase 1 pages (4 pages)
- B. Tạo backend routes trước
- C. Từng page một, test kỹ
