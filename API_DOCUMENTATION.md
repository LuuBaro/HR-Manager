# API Documentation
## HR & Payroll System API / 人力资源与薪资系统 API

Base URL: `http://localhost:3000/api`

---

## 🔐 Authentication

All API endpoints (except login) require JWT token in Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

### POST /auth/login
Login to system

**Request Body:**
```json
{
  "email": "boss@company.com",
  "password": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Đăng nhập thành công / 登录成功",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "email": "boss@company.com",
      "full_name": "Nguyễn Văn Sếp",
      "full_name_zh": "阮文老板",
      "role": "boss",
      "role_vi": "Giám đốc",
      "role_zh": "老板"
    }
  }
}
```

### POST /auth/logout
Logout from system

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "message": "Đăng xuất thành công / 登出成功"
}
```

### GET /auth/me
Get current user information

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "email": "boss@company.com",
    "full_name": "Nguyễn Văn Sếp",
    "role_name": "boss",
    "employee_code": "NV-001",
    "department_name": "Ban Giám Đốc",
    "position_name": "Giám Đốc"
  }
}
```

### GET /auth/permissions
Get current user permissions

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "permission_name": "employee.view",
      "resource": "employee",
      "action": "view",
      "description_vi": "Xem thông tin nhân viên",
      "description_zh": "查看员工信息"
    }
  ]
}
```

---

## 👥 Employees

### GET /employees
Get list of employees with pagination and filters

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `page` (number, default: 1)
- `limit` (number, default: 15)
- `search` (string) - Search by name, code, email
- `department_id` (number)
- `status` (string: active, on_leave, resigned, terminated)
- `sort_by` (string, default: employee_code)
- `sort_order` (string: ASC, DESC)

**Example:** `/api/employees?page=1&limit=10&search=nguyen&department_id=2&status=active`

**Response:**
```json
{
  "success": true,
  "data": {
    "employees": [
      {
        "id": 5,
        "employee_code": "NV-005",
        "full_name": "Nguyễn Văn An",
        "full_name_zh": "阮文安",
        "email": "nva@company.com",
        "phone": "0901234571",
        "department_id": 2,
        "department_name": "Phòng Công Nghệ Thông Tin",
        "position_name": "Chuyên Viên Chính",
        "hire_date": "2021-01-15",
        "status": "active"
      }
    ],
    "pagination": {
      "current_page": 1,
      "per_page": 10,
      "total_items": 15,
      "total_pages": 2
    }
  }
}
```

### GET /employees/:id
Get employee details by ID

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 5,
    "employee_code": "NV-005",
    "full_name": "Nguyễn Văn An",
    "salary_structure": {
      "base_salary": 15000000,
      "effective_from": "2021-01-15",
      "is_current": true
    },
    "leave_balance": [
      {
        "leave_name": "Nghỉ phép năm",
        "total_days": 12,
        "used_days": 3,
        "remaining_days": 9
      }
    ]
  }
}
```

### POST /employees
Create new employee

**Headers:** `Authorization: Bearer <token>`

**Permission Required:** `employee.create`

**Request Body:**
```json
{
  "employee_code": "NV-016",
  "full_name": "Trần Văn B",
  "full_name_zh": "陈文B",
  "email": "tvb@company.com",
  "phone": "0901234582",
  "department_id": 2,
  "position_id": 4,
  "hire_date": "2024-01-01",
  "contract_type": "full_time",
  "base_salary": 12000000
}
```

**Response:**
```json
{
  "success": true,
  "message": "Tạo nhân viên thành công / 创建员工成功",
  "data": {
    "id": 16
  }
}
```

### PUT /employees/:id
Update employee information

**Headers:** `Authorization: Bearer <token>`

**Permission Required:** `employee.update`

**Request Body:**
```json
{
  "full_name": "Trần Văn B Updated",
  "email": "tvb.new@company.com",
  "phone": "0901234999",
  "department_id": 3,
  "position_id": 5,
  "status": "active"
}
```

### GET /employees/stats/dashboard
Get employee statistics for dashboard

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "data": {
    "total_employees": 15,
    "new_this_month": 2,
    "by_department": [
      {
        "department_name": "Phòng IT",
        "count": 5
      }
    ],
    "by_status": [
      {
        "status": "active",
        "count": 14
      }
    ]
  }
}
```

---

## 📅 Attendance

### GET /attendance
Get attendance records with filters

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `month` (string, format: YYYY-MM, default: current month)
- `department_id` (number)
- `employee_id` (number)
- `status` (string: present, absent, late, half_day, leave)

**Example:** `/api/attendance?month=2024-01&department_id=2`

**Response:**
```json
{
  "success": true,
  "data": {
    "records": [
      {
        "id": 1,
        "employee_id": 5,
        "employee_code": "NV-005",
        "full_name": "Nguyễn Văn An",
        "attendance_date": "2024-01-15",
        "check_in_time": "2024-01-15 08:00:00",
        "check_out_time": "2024-01-15 17:30:00",
        "work_hours": 8.5,
        "status": "present"
      }
    ],
    "period": {
      "month": "01",
      "year": "2024",
      "start_date": "2024-01-01",
      "end_date": "2024-01-31"
    }
  }
}
```

### GET /attendance/monthly/:employee_id
Get monthly attendance calendar for specific employee

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `month` (string, format: YYYY-MM)

**Response:**
```json
{
  "success": true,
  "data": {
    "employee_id": 5,
    "period": {
      "year": "2024",
      "month": "01"
    },
    "attendance": [
      {
        "date": "2024-01-01",
        "day_of_week": 1,
        "is_weekend": false,
        "status": "present",
        "work_hours": 8,
        "check_in_time": "2024-01-01 08:00:00",
        "check_out_time": "2024-01-01 17:00:00"
      }
    ],
    "statistics": {
      "total_days": 31,
      "working_days": 22,
      "present_days": 20,
      "absent_days": 1,
      "late_days": 1,
      "total_hours": 176
    }
  }
}
```

### POST /attendance
Create or update attendance record

**Headers:** `Authorization: Bearer <token>`

**Permission Required:** `attendance.create` or `attendance.update`

**Request Body:**
```json
{
  "employee_id": 5,
  "attendance_date": "2024-01-15",
  "check_in_time": "2024-01-15 08:00:00",
  "check_out_time": "2024-01-15 17:30:00",
  "work_hours": 8.5,
  "status": "present",
  "notes": ""
}
```

### POST /attendance/bulk
Bulk create/update attendance records

**Headers:** `Authorization: Bearer <token>`

**Permission Required:** `attendance.create`

**Request Body:**
```json
{
  "records": [
    {
      "employee_id": 5,
      "attendance_date": "2024-01-15",
      "work_hours": 8,
      "status": "present"
    },
    {
      "employee_id": 6,
      "attendance_date": "2024-01-15",
      "work_hours": 8,
      "status": "present"
    }
  ]
}
```

---

## 💰 Payroll

### GET /payroll/periods
Get all payroll periods

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `year` (number, default: current year)
- `status` (string: draft, pending_approval, approved, locked)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "period_name": "Lương tháng 1/2024",
      "period_year": 2024,
      "period_month": 1,
      "start_date": "2024-01-01",
      "end_date": "2024-01-31",
      "status": "approved",
      "total_gross": 225000000,
      "total_deductions": 25000000,
      "total_net": 200000000,
      "total_employees": 15,
      "approved_by_name": "Nguyễn Văn Sếp"
    }
  ]
}
```

### GET /payroll/periods/:id
Get payroll period details with all records

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "data": {
    "period": {
      "id": 1,
      "period_name": "Lương tháng 1/2024",
      "status": "approved"
    },
    "records": [
      {
        "id": 1,
        "employee_code": "NV-005",
        "full_name": "Nguyễn Văn An",
        "base_salary": 15000000,
        "working_days": 22,
        "overtime_hours": 10,
        "gross_salary": 17500000,
        "net_salary": 15200000,
        "details": [
          {
            "component_name": "Phụ cấp ăn trưa",
            "component_type": "allowance",
            "amount": 730000
          }
        ]
      }
    ]
  }
}
```

### POST /payroll/periods
Create new payroll period and auto-calculate salaries

**Headers:** `Authorization: Bearer <token>`

**Permission Required:** `payroll.create`

**Request Body:**
```json
{
  "period_year": 2024,
  "period_month": 2
}
```

**Response:**
```json
{
  "success": true,
  "message": "Đã tạo bảng lương tháng 2/2024 cho 15 nhân viên",
  "data": {
    "period_id": 2,
    "total_employees": 15,
    "total_gross": 230000000,
    "total_net": 205000000
  }
}
```

### PUT /payroll/periods/:id/approve
Approve payroll period

**Headers:** `Authorization: Bearer <token>`

**Permission Required:** `payroll.approve`

**Response:**
```json
{
  "success": true,
  "message": "Đã phê duyệt bảng lương / 已批准工资单"
}
```

### PUT /payroll/periods/:id/lock
Lock payroll period (Boss only)

**Headers:** `Authorization: Bearer <token>`

**Role Required:** `boss`

**Response:**
```json
{
  "success": true,
  "message": "Đã khóa bảng lương / 已锁定工资单"
}
```

### GET /payroll/employee/:employee_id
Get payroll history for specific employee

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `year` (number, default: current year)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "period_name": "Lương tháng 1/2024",
      "period_month": 1,
      "period_year": 2024,
      "base_salary": 15000000,
      "gross_salary": 17500000,
      "net_salary": 15200000,
      "payment_status": "paid",
      "details": []
    }
  ]
}
```

---

## 🗂️ Master Data

### GET /departments
Get all departments

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 2,
      "department_name": "Phòng Công Nghệ Thông Tin",
      "department_name_zh": "IT部门",
      "department_code": "IT",
      "manager_name": "Nguyễn Văn An",
      "employee_count": 5
    }
  ]
}
```

### GET /positions
Get all positions

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 4,
      "position_name": "Chuyên Viên",
      "position_name_zh": "专员",
      "position_code": "SPECIALIST",
      "level": 4,
      "employee_count": 8
    }
  ]
}
```

### GET /salary-components
Get all active salary components

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "component_code": "MEAL_ALLOW",
      "component_name": "Phụ cấp ăn trưa",
      "component_name_zh": "午餐补贴",
      "component_type": "allowance",
      "calculation_type": "fixed",
      "default_value": 730000,
      "is_taxable": false
    }
  ]
}
```

### GET /system-settings
Get system settings

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "data": {
    "company_name": {
      "value": "Công ty TNHH ABC",
      "type": "string",
      "description_vi": "Tên công ty"
    },
    "standard_working_days": {
      "value": "22",
      "type": "number",
      "description_vi": "Số ngày công chuẩn/tháng"
    }
  }
}
```

---

## ❌ Error Responses

All error responses follow this format:

```json
{
  "success": false,
  "message": "Error message in Vietnamese / 中文错误信息",
  "error": "Detailed error (only in development mode)"
}
```

### Common HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (invalid/missing token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `500` - Internal Server Error

---

## 🔒 RBAC Permissions

### Permission Format
`{resource}.{action}`

### Resources
- `employee` - Employee management
- `attendance` - Attendance tracking
- `leave` - Leave requests
- `payroll` - Payroll management
- `system` - System settings

### Actions
- `view` - Read access
- `create` - Create new records
- `update` - Modify existing records
- `delete` - Remove records
- `approve` - Approval authority
- `manage` - Full management access

---

**API Version:** 1.0.0  
**Last Updated:** 2024-01-15
