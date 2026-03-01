const express = require('express');
const db = require('../config/database');
const AuthMiddleware = require('../middleware/auth');
const moment = require('moment');

const router = express.Router();

// All routes require authentication
router.use(AuthMiddleware.verifyToken);

/**
 * @route   GET /api/leave/types
 * @desc    Get all leave types
 * @access  Private
 */
router.get('/types', async (req, res) => {
    try {
        const [types] = await db.query('SELECT * FROM leave_types ORDER BY id ASC');
        res.json({ success: true, data: types });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi lấy danh mục nghỉ phép' });
    }
});

/**
 * @route   GET /api/leave/requests
 * @desc    Get all leave requests (for Admin/HR)
 * @access  Private (leave.view)
 */
router.get('/requests', AuthMiddleware.checkPermission('leave', 'view'), async (req, res) => {
    try {
        const { status } = req.query;
        let query = `
            SELECT lr.*, e.full_name, e.full_name_zh, e.employee_code, 
                   d.department_name, d.department_name_zh,
                   lt.leave_name, lt.leave_name_zh
            FROM leave_requests lr
            JOIN employees e ON lr.employee_id = e.id
            LEFT JOIN departments d ON e.department_id = d.id
            JOIN leave_types lt ON lr.leave_type_id = lt.id
        `;
        let params = [];

        if (status) {
            query += ' WHERE lr.status = ?';
            params.push(status);
        }

        query += ' ORDER BY lr.created_at DESC';

        const [requests] = await db.query(query, params);
        res.json({ success: true, data: requests });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Lỗi lấy danh sách nghỉ phép' });
    }
});

/**
 * @route   GET /api/leave/requests/my
 * @desc    Get current user's leave requests
 * @access  Private
 */
router.get('/requests/my', async (req, res) => {
    try {
        const [employee] = await db.query('SELECT id FROM employees WHERE user_id = ?', [req.user.id]);
        if (employee.length === 0) return res.status(404).json({ success: false, message: 'Không tìm thấy hồ sơ nhân viên' });

        const [requests] = await db.query(
            `SELECT lr.*, lt.leave_name, lt.leave_name_zh
             FROM leave_requests lr
             JOIN leave_types lt ON lr.leave_type_id = lt.id
             WHERE lr.employee_id = ?
             ORDER BY lr.created_at DESC`,
            [employee[0].id]
        );
        res.json({ success: true, data: requests });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi lấy đơn nghỉ cá nhân' });
    }
});

/**
 * @route   POST /api/leave/requests
 * @desc    Submit a new leave request
 * @access  Private
 */
router.post('/requests', async (req, res) => {
    try {
        const { leave_type_id, start_date, end_date, reason } = req.body;
        
        const [employee] = await db.query('SELECT id FROM employees WHERE user_id = ?', [req.user.id]);
        if (employee.length === 0) return res.status(404).json({ success: false, message: 'Không tìm thấy hồ sơ nhân viên' });

        const employeeId = employee[0].id;
        
        // Calculate total days
        const start = moment(start_date);
        const end = moment(end_date);
        const total_days = end.diff(start, 'days') + 1;

        if (total_days <= 0) {
            return res.status(400).json({ success: false, message: 'Ngày kết thúc phải sau ngày bắt đầu' });
        }

        // Check balance (optional but recommended)
        const year = start.year();
        const [balance] = await db.query(
            'SELECT remaining_days FROM employee_leave_balance WHERE employee_id = ? AND leave_type_id = ? AND year = ?',
            [employeeId, leave_type_id, year]
        );

        // If it's annual leave and we have balance tracking
        if (balance.length > 0 && balance[0].remaining_days < total_days) {
            return res.status(400).json({ success: false, message: 'Không đủ số dư ngày nghỉ' });
        }

        await db.query(
            `INSERT INTO leave_requests (employee_id, leave_type_id, start_date, end_date, total_days, reason, status)
             VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
            [employeeId, leave_type_id, start_date, end_date, total_days, reason]
        );

        res.json({ success: true, message: 'Đã gửi đơn nghỉ phép thành công / 申请已成功提交' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Lỗi gửi đơn nghỉ phép' });
    }
});

/**
 * @route   PUT /api/leave/requests/:id/approve
 * @desc    Approve a leave request
 * @access  Private (leave.approve)
 */
router.put('/requests/:id/approve', AuthMiddleware.checkPermission('leave', 'approve'), async (req, res) => {
    const connection = await db.getConnection();
    await connection.beginTransaction();
    try {
        const requestId = req.params.id;
        const [request] = await connection.query('SELECT * FROM leave_requests WHERE id = ?', [requestId]);
        
        if (request.length === 0) return res.status(404).json({ success: false, message: 'Không tìm thấy đơn' });
        if (request[0].status !== 'pending') return res.status(400).json({ success: false, message: 'Đơn đã được xử lý trước đó' });

        const { employee_id, leave_type_id, total_days, start_date } = request[0];
        const year = moment(start_date).year();

        // Update status
        await connection.query(
            `UPDATE leave_requests 
             SET status = 'approved', approved_by = ?, approved_at = NOW() 
             WHERE id = ?`,
            [req.user.id, requestId]
        );

        // Update balance if exists
        await connection.query(
            `UPDATE employee_leave_balance 
             SET used_days = used_days + ?, remaining_days = remaining_days - ?
             WHERE employee_id = ? AND leave_type_id = ? AND year = ?`,
            [total_days, total_days, employee_id, leave_type_id, year]
        );

        // Mark as 'leave' in attendance records for the period
        const start = moment(request[0].start_date);
        const end = moment(request[0].end_date);
        
        for (let m = moment(start); m.isSameOrBefore(end); m.add(1, 'days')) {
            const dateStr = m.format('YYYY-MM-DD');
            await connection.query(
                `INSERT INTO attendance_records (employee_id, attendance_date, status, notes)
                 VALUES (?, ?, 'leave', ?)
                 ON DUPLICATE KEY UPDATE status = 'leave', notes = ?`,
                [employee_id, dateStr, `Nghỉ phép: ${request[0].reason || ''}`, `Nghỉ phép: ${request[0].reason || ''}`]
            );
        }

        await connection.commit();
        res.json({ success: true, message: 'Đã phê duyệt đơn nghỉ phép' });
    } catch (error) {
        await connection.rollback();
        console.error(error);
        res.status(500).json({ success: false, message: 'Lỗi phê duyệt đơn' });
    } finally {
        connection.release();
    }
});

/**
 * @route   PUT /api/leave/requests/:id/reject
 * @desc    Reject a leave request
 * @access  Private (leave.reject)
 */
router.put('/requests/:id/reject', AuthMiddleware.checkPermission('leave', 'reject'), async (req, res) => {
    try {
        const requestId = req.params.id;
        const { reason } = req.body;

        await db.query(
            `UPDATE leave_requests 
             SET status = 'rejected', approved_by = ?, approved_at = NOW(), rejection_reason = ? 
             WHERE id = ?`,
            [req.user.id, reason, requestId]
        );

        res.json({ success: true, message: 'Đã từ chối đơn nghỉ phép' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi từ chối đơn' });
    }
});

/**
 * @route   GET /api/leave/balance/my
 * @desc    Get current user's leave balance
 * @access  Private
 */
router.get('/balance/my', async (req, res) => {
    try {
        const [employee] = await db.query('SELECT id FROM employees WHERE user_id = ?', [req.user.id]);
        if (employee.length === 0) return res.status(404).json({ success: false, message: 'Không tìm thấy hồ sơ nhân viên' });

        const year = moment().year();
        const [balance] = await db.query(
            `SELECT elb.*, lt.leave_name, lt.leave_name_zh
             FROM employee_leave_balance elb
             JOIN leave_types lt ON elb.leave_type_id = lt.id
             WHERE elb.employee_id = ? AND elb.year = ?`,
            [employee[0].id, year]
        );
        res.json({ success: true, data: balance });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi lấy số dư ngày phép' });
    }
});

/**
 * @route   GET /api/leave/stats
 * @desc    Get leave statistics (for Admin/HR)
 * @access  Private (leave.view)
 */
router.get('/stats', AuthMiddleware.checkPermission('leave', 'view'), async (req, res) => {
    try {
        const today = moment().format('YYYY-MM-DD');
        const firstDayOfMonth = moment().startOf('month').format('YYYY-MM-DD');
        const lastDayOfMonth = moment().endOf('month').format('YYYY-MM-DD');

        // 1. Pending requests
        const [pending] = await db.query('SELECT COUNT(*) as count FROM leave_requests WHERE status = ?', ['pending']);
        
        // 2. On leave today
        const [todayLeave] = await db.query(
            'SELECT COUNT(*) as count FROM leave_requests WHERE status = ? AND ? BETWEEN start_date AND end_date',
            ['approved', today]
        );

        // 3. Approved this month
        const [monthApproved] = await db.query(
            'SELECT COUNT(*) as count FROM leave_requests WHERE status = ? AND (start_date BETWEEN ? AND ? OR end_date BETWEEN ? AND ?)',
            ['approved', firstDayOfMonth, lastDayOfMonth, firstDayOfMonth, lastDayOfMonth]
        );

        // 4. Absent without permission (approximate from attendance)
        const [absent] = await db.query(
            'SELECT COUNT(*) as count FROM attendance_records WHERE attendance_date = ? AND status = ?',
            [today, 'absent']
        );

        res.json({
            success: true,
            data: {
                pending: pending[0].count,
                todayLeave: todayLeave[0].count,
                monthApproved: monthApproved[0].count,
                absent: absent[0].count
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Lỗi thống kê nghỉ phép' });
    }
});

module.exports = router;
