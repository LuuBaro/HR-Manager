# HR & Payroll Management System
## Hệ thống Quản lý Nhân sự & Lương / 人力资源与薪资管理系统

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D14.0.0-green.svg)
![License](https://img.shields.io/badge/license-MIT-orange.svg)

A comprehensive, production-ready HR and Payroll management system with bilingual support (Vietnamese/Chinese). Replaces Google Sheets with a secure, scalable solution.

---

## 🌟 Features / Tính năng / 功能

### Core Modules
- ✅ **Employee Management** - Quản lý nhân viên / 员工管理
- ✅ **Attendance Tracking** - Chấm công / 考勤管理
- ✅ **Leave Management** - Quản lý nghỉ phép / 休假管理
- ✅ **Payroll Calculation** - Tính lương / 薪资计算
- ✅ **Role-Based Access Control (RBAC)** - Phân quyền / 权限管理
- ✅ **Audit Logging** - Nhật ký hệ thống / 系统日志
- ✅ **Bilingual Support** - Song ngữ VI/ZH / 双语支持

### Security Features
- 🔐 JWT Authentication
- 🛡️ Email Whitelist
- 📝 Comprehensive Audit Trails
- 🔒 Session Management
- 🚫 Rate Limiting
- 🔑 RBAC with Granular Permissions

---

## 🏗️ Technology Stack

### Backend
- **Runtime**: Node.js 14+
- **Framework**: Express.js
- **Database**: MySQL 8.0+
- **Authentication**: JWT (jsonwebtoken)
- **Security**: Helmet, bcryptjs, CORS
- **Validation**: express-validator

### Frontend
- **UI Framework**: Tailwind CSS
- **Icons**: Material Icons
- **Language**: Vanilla JavaScript (ES6+)

---

## 📋 Prerequisites / Yêu cầu / 先决条件

Before installation, ensure you have:

- **Node.js** >= 14.0.0 ([Download](https://nodejs.org/))
- **MySQL** >= 8.0 ([Download](https://dev.mysql.com/downloads/))
- **npm** or **yarn**

---

## 🚀 Installation / Cài đặt / 安装

### 1. Clone Repository

\`\`\`bash
git clone <repository-url>
cd SYSHRYUEMEI
\`\`\`

### 2. Install Dependencies

\`\`\`bash
npm install
\`\`\`

### 3. Configure Environment

Copy `.env.example` to `.env` and update with your settings:

\`\`\`bash
cp .env.example .env
\`\`\`

Edit `.env`:
\`\`\`env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=hr_payroll_system
JWT_SECRET=your-super-secret-key
\`\`\`

### 4. Initialize Database

\`\`\`bash
npm run init-db
\`\`\`

This will:
- Create database and tables
- Insert seed data
- Create default users

### 5. Start Server

**Development:**
\`\`\`bash
npm run dev
\`\`\`

**Production:**
\`\`\`bash
npm start
\`\`\`

Server will run on: `http://localhost:3000`

---

## 👥 Default Users / Tài khoản mặc định / 默认用户

All default passwords are: **123456**

| Email | Role | Vietnamese | Chinese |
|-------|------|------------|---------|
| boss@company.com | Boss | Giám đốc | 老板 |
| admin@company.com | Admin | Quản trị viên | 超级管理员 |
| hr.manager@company.com | HR Manager | Trưởng phòng Nhân sự | 人事经理 |
| payroll@company.com | Payroll Specialist | Chuyên viên Lương | 薪资管理员 |

⚠️ **IMPORTANT**: Change these passwords immediately in production!

---

## 📁 Project Structure

\`\`\`
SYSHRYUEMEI/
├── config/
│   └── database.js          # Database connection
├── database/
│   ├── schema.sql           # Database schema
│   └── seed.sql             # Seed data
├── middleware/
│   └── auth.js              # Authentication & RBAC
├── routes/
│   ├── auth.js              # Authentication routes
│   ├── employees.js         # Employee management
│   ├── attendance.js        # Attendance tracking
│   └── payroll.js           # Payroll management
├── public/
│   ├── login.html           # Login page
│   ├── admin-dashboard.html # Admin dashboard
│   ├── attendance.html      # Attendance calendar
│   ├── payroll.html         # Payroll management
│   ├── security.html        # Security settings
│   ├── rbac.html            # RBAC management
│   ├── logs.html            # System logs
│   └── salary-config.html   # Salary configuration
├── scripts/
│   └── init-database.js     # Database initialization
├── .env                     # Environment variables
├── .env.example             # Environment template
├── server.js                # Main server file
└── package.json             # Dependencies
\`\`\`

---

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user
- `GET /api/auth/permissions` - Get user permissions

### Employees
- `GET /api/employees` - List all employees
- `GET /api/employees/:id` - Get employee details
- `POST /api/employees` - Create employee
- `PUT /api/employees/:id` - Update employee
- `GET /api/employees/stats/dashboard` - Employee statistics

### Attendance
- `GET /api/attendance` - Get attendance records
- `GET /api/attendance/monthly/:employee_id` - Monthly attendance
- `POST /api/attendance` - Create/update attendance
- `POST /api/attendance/bulk` - Bulk attendance update
- `GET /api/attendance/stats/dashboard` - Attendance statistics

### Payroll
- `GET /api/payroll/periods` - List payroll periods
- `GET /api/payroll/periods/:id` - Period details
- `POST /api/payroll/periods` - Create payroll period
- `PUT /api/payroll/periods/:id/approve` - Approve payroll
- `PUT /api/payroll/periods/:id/lock` - Lock payroll
- `GET /api/payroll/employee/:employee_id` - Employee payroll history

---

## 🔐 RBAC Permissions

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

### Role Matrix

| Permission | Boss | Admin | HR Manager | Payroll | Employee |
|------------|------|-------|------------|---------|----------|
| employee.* | ✅ | ✅ | ✅ | 👁️ | ❌ |
| attendance.* | ✅ | ✅ | ✅ | 👁️ | 👁️ |
| leave.approve | ✅ | ✅ | ✅ | ❌ | ❌ |
| payroll.* | ✅ | ✅ | 👁️ | ✅ | 👁️ |
| system.* | ✅ | ⚠️ | ❌ | ❌ | ❌ |

✅ Full Access | 👁️ View Only | ⚠️ Limited | ❌ No Access

---

## 💰 Payroll Calculation Logic

### Formula
\`\`\`
Gross Salary = (Base Salary / Standard Days) × Working Days 
             + Overtime Pay 
             + Total Allowances

Net Salary = Gross Salary 
           - Insurance Deductions 
           - Tax Amount
\`\`\`

### Components
- **Base Salary**: Monthly base salary
- **Working Days**: Actual attendance days
- **Overtime**: Hours × Hourly Rate × Overtime Rate
- **Allowances**: Meal, Travel, Phone, Housing, Position
- **Deductions**: Social Insurance, Health Insurance, Unemployment Insurance
- **Tax**: Vietnam Personal Income Tax (progressive)

### Tax Brackets (Vietnam PIT)
| Taxable Income (VND) | Rate |
|----------------------|------|
| 0 - 5M | 5% |
| 5M - 10M | 10% |
| 10M - 18M | 15% |
| 18M+ | 20% |

---

## 🛠️ Development

### Run in Development Mode
\`\`\`bash
npm run dev
\`\`\`

### Database Reset
\`\`\`bash
npm run init-db
\`\`\`

### Code Structure Guidelines
- Follow RESTful API conventions
- Use async/await for database operations
- Implement proper error handling
- Add audit logging for sensitive operations
- Validate all inputs
- Use transactions for multi-step operations

---

## 🔒 Security Best Practices

### Production Checklist
- [ ] Change all default passwords
- [ ] Update JWT_SECRET to a strong random value
- [ ] Configure proper CORS origins
- [ ] Enable HTTPS
- [ ] Set up database backups
- [ ] Configure firewall rules
- [ ] Enable rate limiting
- [ ] Review and update email whitelist
- [ ] Set up monitoring and alerts
- [ ] Regular security audits

### Environment Variables
Never commit `.env` to version control. Always use `.env.example` as template.

---

## 📊 Database Schema

### Key Tables
- **users** - User accounts and authentication
- **roles** - User roles
- **permissions** - System permissions
- **role_permissions** - RBAC mapping
- **employees** - Employee profiles
- **departments** - Organizational structure
- **positions** - Job positions
- **attendance_records** - Daily attendance
- **leave_requests** - Leave applications
- **payroll_periods** - Monthly payroll cycles
- **payroll_records** - Individual salary records
- **audit_logs** - System audit trail

---

## 🌐 Frontend Pages

### Public
- `/` - Login page

### Authenticated
- `/admin` - Admin dashboard
- `/attendance` - Attendance management
- `/payroll` - Payroll management
- `/security` - Security settings
- `/rbac` - Role & permission management
- `/logs` - System audit logs
- `/salary-config` - Salary formula configuration
- `/approval` - Approval workflow

---

## 🐛 Troubleshooting

### Database Connection Failed
\`\`\`
Error: ER_ACCESS_DENIED_ERROR
\`\`\`
**Solution**: Check DB_USER and DB_PASSWORD in `.env`

### Port Already in Use
\`\`\`
Error: EADDRINUSE
\`\`\`
**Solution**: Change PORT in `.env` or kill process using port 3000

### JWT Token Expired
**Solution**: Login again to get new token

---

## 📝 License

MIT License - See LICENSE file for details

---

## 👨‍💻 Support / Hỗ trợ / 支持

For issues and questions:
- Create an issue on GitHub
- Contact: support@company.com

---

## 🎯 Roadmap

### Version 1.1 (Planned)
- [ ] Email notifications
- [ ] PDF payslip generation
- [ ] Advanced reporting
- [ ] Mobile app
- [ ] Multi-company support
- [ ] Integration with accounting systems

---

**Built with ❤️ for modern HR management**

**Được xây dựng với ❤️ cho quản lý nhân sự hiện đại**

**用 ❤️ 构建的现代人力资源管理系统**
"# HR-Manager" 
