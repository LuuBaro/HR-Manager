const express = require('express');
const db = require('../config/database');
const AuthMiddleware = require('../middleware/auth');
const moment = require('moment');

const router = express.Router();

// All routes require authentication
router.use(AuthMiddleware.verifyToken);

/**
 * @route   GET /api/dashboard/stats
 * @desc    Get dashboard statistics
 * @access  Private (admin.view)
 */
router.get('/stats', async (req, res) => {
    try {
        // 1. Total Employees
        const [totalRes] = await db.query("SELECT COUNT(*) as total FROM employees WHERE status = 'active'");
        const totalEmployees = totalRes[0].total;

        // 2. Pending Requests (Leave Requests)
        const [pendingRes] = await db.query("SELECT COUNT(*) as total FROM leave_requests WHERE status = 'pending'");
        const pendingRequests = pendingRes[0].total;

        // 3. Latest Payroll Budget
        const [payrollRes] = await db.query("SELECT total_net, period_month, period_year FROM payroll_periods WHERE status != 'draft' ORDER BY period_year DESC, period_month DESC LIMIT 1");
        const latestPayroll = payrollRes.length > 0 ? payrollRes[0] : { total_net: 0, period_month: '-', period_year: '-' };

        // 4. Leave Today
        const today = moment().format('YYYY-MM-DD');
        const [leaveTodayRes] = await db.query("SELECT COUNT(*) as total FROM attendance_records WHERE attendance_date = ? AND status IN ('absent', 'leave')", [today]);
        const leaveToday = leaveTodayRes[0].total;

        // 5. Recent Activities
        const [recentRes] = await db.query(`
            SELECT al.*, u.full_name, u.full_name_zh 
            FROM audit_logs al 
            LEFT JOIN users u ON al.user_id = u.id 
            ORDER BY al.created_at DESC 
            LIMIT 5
        `);

        res.json({
            success: true,
            data: {
                totalEmployees,
                pendingRequests,
                latestPayroll,
                leaveToday,
                recentActivities: recentRes
            }
        });

    } catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi lấy thống kê bảng điều khiển / 获取仪表板统计数据错误',
            error: error.message
        });
    }
});

module.exports = router;
