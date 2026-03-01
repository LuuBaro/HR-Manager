require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

// Import routes
const authRoutes = require('./routes/auth');
const employeeRoutes = require('./routes/employees');
const attendanceRoutes = require('./routes/attendance');
const payrollRoutes = require('./routes/payroll');
const commonRoutes = require('./routes/common');
const auditRoutes = require('./routes/audit');
const dashboardRoutes = require('./routes/dashboard');
const leaveRoutes = require('./routes/leave');

const app = express();
const PORT = process.env.PORT || 3000;

// =============================================
// MIDDLEWARE
// =============================================

// Security headers
app.use(helmet({
    contentSecurityPolicy: false, // Disable for development
    crossOriginEmbedderPolicy: false
}));

// CORS
app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true
}));

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    message: {
        success: false,
        message: 'Quá nhiều yêu cầu, vui lòng thử lại sau / 请求过多，请稍后再试'
    }
});

app.use('/api/', limiter);

// Serve static files (frontend)
app.use(express.static(path.join(__dirname, 'public')));

// =============================================
// API ROUTES
// =============================================

app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/leave', leaveRoutes);
app.use('/api', commonRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'HR & Payroll System API is running',
        version: '1.0.0',
        timestamp: new Date().toISOString()
    });
});

// =============================================
// FRONTEND ROUTES (Serve HTML files)
// =============================================

// Admin Dashboard
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin-dashboard.html'));
});

// Attendance Management
app.get('/attendance', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'attendance.html'));
});

// Payroll Management
app.get('/payroll', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'payroll.html'));
});

// Security Settings
app.get('/security', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'security.html'));
});

// RBAC Management
app.get('/rbac', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'rbac.html'));
});

// System Logs
app.get('/logs', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'logs.html'));
});

// Salary Configuration
app.get('/salary-config', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'salary-config.html'));
});

// Approval Workflow
app.get('/approval', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'approval.html'));
});

// Login page (default)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// =============================================
// ERROR HANDLING
// =============================================

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Không tìm thấy trang / 页面未找到',
        path: req.path
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Lỗi máy chủ / 服务器错误',
        error: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
});

// =============================================
// START SERVER
// =============================================

app.listen(PORT, () => {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║                                                            ║');
    console.log('║        HR & PAYROLL MANAGEMENT SYSTEM                      ║');
    console.log('║        Hệ thống Quản lý Nhân sự & Lương                   ║');
    console.log('║        人力资源与薪资管理系统                                 ║');
    console.log('║                                                            ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('');
    console.log(`🚀 Server running on: http://localhost:${PORT}`);
    console.log(`📊 Admin Dashboard: http://localhost:${PORT}/admin`);
    console.log(`🔐 Login Page: http://localhost:${PORT}/`);
    console.log(`📡 API Health: http://localhost:${PORT}/api/health`);
    console.log('');
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`Database: ${process.env.DB_NAME || 'hr_payroll_system'}`);
    console.log('');
    console.log('Press Ctrl+C to stop the server');
    console.log('════════════════════════════════════════════════════════════');
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
    });
});

module.exports = app;
