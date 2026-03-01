# 🎨 TÍCH HỢP UI MỚI - HƯỚNG DẪN HOÀN CHỈNH

## ✅ ĐÃ HOÀN THÀNH

### 1. **Login Page** (`login.html`) - ✅ DONE
- ✅ Design mới với security banner
- ✅ Tích hợp API `/api/auth/login`
- ✅ Hiển thị demo accounts
- ✅ Error handling
- ✅ Loading states
- ✅ Redirect sau khi login thành công

### 2. **Admin Dashboard** (`admin-dashboard.html`) - ✅ DONE
- ✅ Sidebar navigation với links
- ✅ Stats cards (Tổng nhân sự, Active, Phòng ban, Chuyên cần)
- ✅ Employee list table với data từ API
- ✅ User info từ `/api/auth/me`
- ✅ Logout function
- ✅ Authentication check

---

## 📋 CẦN LÀM TIẾP (Các trang còn lại)

Bạn đã gửi 7 file HTML. Tôi đã hoàn thành 2 file. Còn lại 5 file cần tích hợp:

### 3. **Attendance Page** (`attendance.html`)
**File HTML gốc:** File thứ 2 trong danh sách của bạn
**API cần dùng:**
- `GET /api/attendance/monthly/:employee_id` - Lấy bảng công tháng
- `POST /api/attendance/bulk` - Cập nhật hàng loạt
- `GET /api/employees` - Danh sách nhân viên

**Cần làm:**
```javascript
// Load monthly attendance
fetch(`/api/attendance/monthly/${employeeId}?month=10&year=2023`)

// Save changes
fetch('/api/attendance/bulk', {
    method: 'POST',
    body: JSON.stringify({ records: [...] })
})
```

### 4. **Security Page** (`security.html`)
**File HTML gốc:** File thứ 4 trong danh sách
**API cần dùng:**
- `GET /api/auth/sessions` (cần tạo mới)
- `GET /api/common/email-whitelist` (cần tạo mới)
- `POST /api/auth/logout-all` (cần tạo mới)

**Lưu ý:** Cần thêm routes mới vào backend

### 5. **RBAC Page** (`rbac.html`)
**File HTML gốc:** File thứ 5 trong danh sách
**API cần dùng:**
- `GET /api/roles` (cần tạo mới)
- `GET /api/permissions` (cần tạo mới)
- `PUT /api/roles/:id/permissions` (cần tạo mới)

**Lưu ý:** Cần tạo routes quản lý roles & permissions

### 6. **Logs Page** (`logs.html`)
**File HTML gốc:** File thứ 6 trong danh sách
**API cần dùng:**
- `GET /api/audit-logs` (cần tạo mới)
- Filters: date, user, action, module

**Lưu ý:** Cần tạo route audit logs với pagination

### 7. **Salary Config Page** (`salary-config.html`)
**File HTML gốc:** File thứ 7 trong danh sách
**API cần dùng:**
- `GET /api/salary-components` - Đã có
- `POST /api/salary-components` (cần tạo mới)
- `PUT /api/salary-components/:id` (cần tạo mới)
- `DELETE /api/salary-components/:id` (cần tạo mới)

### 8. **Payroll/Approval Page** (`approval.html`)
**File HTML gốc:** File thứ 8 trong danh sách (cuối cùng)
**API cần dùng:**
- `GET /api/payroll/periods` - Đã có
- `PUT /api/payroll/periods/:id/approve` - Đã có
- `PUT /api/payroll/periods/:id/lock` - Đã có

---

## 🔧 BACKEND CẦN BỔ SUNG

### Routes mới cần tạo:

#### 1. **Audit Logs** (`routes/audit.js`)
```javascript
router.get('/audit-logs', AuthMiddleware.checkPermission('system', 'view'), async (req, res) => {
    // Get audit logs with filters
    const { start_date, end_date, user_id, action, module } = req.query;
    // Query from audit_logs table
});
```

#### 2. **Roles & Permissions** (`routes/rbac.js`)
```javascript
router.get('/roles', AuthMiddleware.checkPermission('system', 'view'), async (req, res) => {
    // Get all roles
});

router.get('/permissions', AuthMiddleware.checkPermission('system', 'view'), async (req, res) => {
    // Get all permissions
});

router.put('/roles/:id/permissions', AuthMiddleware.checkPermission('system', 'manage'), async (req, res) => {
    // Update role permissions
});
```

#### 3. **Sessions Management** (thêm vào `routes/auth.js`)
```javascript
router.get('/sessions', AuthMiddleware.verifyToken, async (req, res) => {
    // Get active sessions for current user
});

router.post('/logout-all', AuthMiddleware.verifyToken, async (req, res) => {
    // Logout all sessions
});
```

#### 4. **Salary Components CRUD** (thêm vào `routes/common.js`)
```javascript
router.post('/salary-components', AuthMiddleware.checkPermission('payroll', 'create'), async (req, res) => {
    // Create salary component
});

router.put('/salary-components/:id', AuthMiddleware.checkPermission('payroll', 'update'), async (req, res) => {
    // Update salary component
});

router.delete('/salary-components/:id', AuthMiddleware.checkPermission('payroll', 'delete'), async (req, res) => {
    // Delete salary component
});
```

---

## 📝 HƯỚNG DẪN TIẾP TỤC

### Bước 1: Test các trang đã có
```bash
npm run dev
```

Truy cập:
- http://localhost:3000/login.html
- Đăng nhập với: `boss@company.com` / `123456`
- Kiểm tra dashboard

### Bước 2: Tạo các trang còn lại
Tôi có thể tiếp tục tạo 5 trang còn lại nếu bạn muốn. Mỗi trang sẽ:
- Sử dụng design HTML bạn đã gửi
- Tích hợp với API backend
- Có authentication check
- Có error handling
- Có loading states

### Bước 3: Tạo các API routes còn thiếu
Sau khi tạo xong UI, tôi sẽ tạo các routes backend còn thiếu:
- `routes/audit.js` - Audit logs
- `routes/rbac.js` - Roles & permissions management
- Bổ sung vào `routes/auth.js` - Sessions management
- Bổ sung vào `routes/common.js` - Salary components CRUD

---

## 🎯 QUYẾT ĐỊNH TIẾP THEO

Bạn muốn tôi:

**Option A:** Tiếp tục tạo tất cả 5 trang còn lại (attendance, security, rbac, logs, salary-config, approval)

**Option B:** Tạo từng trang một, test từng trang

**Option C:** Tạo backend routes trước, rồi mới tạo UI

**Option D:** Khác (bạn chỉ định)

---

## 📊 TIẾN ĐỘ HIỆN TẠI

```
Frontend UI:
[██████░░░░░░░░░░░░░░] 30% (2/7 pages)

Backend API:
[████████████████░░░░] 80% (Core done, missing: audit, rbac, sessions)

Database:
[████████████████████] 100% (Complete)

Documentation:
[████████████████████] 100% (Complete)
```

---

**Bạn muốn tôi làm gì tiếp theo?**
