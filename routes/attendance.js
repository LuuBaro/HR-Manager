const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const AuthMiddleware = require('../middleware/auth');
const moment = require('moment');

const router = express.Router();

// All routes require authentication
router.use(AuthMiddleware.verifyToken);

/**
 * @route   GET /api/attendance
 * @desc    Get attendance records with filters
 * @access  Private (attendance.view)
 */
router.get('/',
    AuthMiddleware.checkPermission('attendance', 'view'),
    async (req, res) => {
    try {
        const {
            month = moment().format('YYYY-MM'),
            department_id = '',
            employee_id = '',
            status = ''
        } = req.query;

        const [year, monthNum] = month.split('-');
        const startDate = `${year}-${monthNum}-01`;
        const endDate = moment(startDate).endOf('month').format('YYYY-MM-DD');

        let whereConditions = ['a.attendance_date BETWEEN ? AND ?'];
        let queryParams = [startDate, endDate];

        if (department_id) {
            whereConditions.push('e.department_id = ?');
            queryParams.push(department_id);
        }

        if (employee_id) {
            whereConditions.push('a.employee_id = ?');
            queryParams.push(employee_id);
        }

        if (status) {
            whereConditions.push('a.status = ?');
            queryParams.push(status);
        }

        const whereClause = 'WHERE ' + whereConditions.join(' AND ');

        const [records] = await db.query(
            `SELECT a.*, 
                    e.employee_code, e.full_name, e.full_name_zh,
                    d.department_name, d.department_name_zh
             FROM attendance_records a
             JOIN employees e ON a.employee_id = e.id
             LEFT JOIN departments d ON e.department_id = d.id
             ${whereClause}
             ORDER BY a.attendance_date DESC, e.employee_code ASC`,
            queryParams
        );

        res.json({
            success: true,
            data: {
                records,
                period: {
                    month: monthNum,
                    year: year,
                    start_date: startDate,
                    end_date: endDate
                }
            }
        });

    } catch (error) {
        console.error('Get attendance error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi lấy dữ liệu chấm công / 获取考勤数据错误',
            error: error.message
        });
    }
});

/**
 * @route   GET /api/attendance/monthly/:employee_id
 * @desc    Get monthly attendance for specific employee
 * @access  Private
 */
router.get('/monthly/:employee_id', async (req, res) => {
    try {
        const { month = moment().format('YYYY-MM') } = req.query;
        const employeeId = req.params.employee_id;

        // Check if user can view this employee's attendance
        if (req.user.role_name === 'employee' && req.user.id !== employeeId) {
            return res.status(403).json({
                success: false,
                message: 'Bạn chỉ có thể xem chấm công của chính mình / 您只能查看自己的考勤'
            });
        }

        const [year, monthNum] = month.split('-');
        const startDate = `${year}-${monthNum}-01`;
        const endDate = moment(startDate).endOf('month').format('YYYY-MM-DD');
        const daysInMonth = moment(startDate).daysInMonth();

        // Get all attendance records for the month
        const [records] = await db.query(
            `SELECT * FROM attendance_records 
             WHERE employee_id = ? 
             AND attendance_date BETWEEN ? AND ?
             ORDER BY attendance_date ASC`,
            [employeeId, startDate, endDate]
        );

        // Create a map of all days in month
        const attendanceMap = {};
        for (let day = 1; day <= daysInMonth; day++) {
            const date = moment(startDate).date(day).format('YYYY-MM-DD');
            const dayOfWeek = moment(date).day(); // 0 = Sunday, 6 = Saturday
            
            attendanceMap[day] = {
                date: date,
                day_of_week: dayOfWeek,
                is_weekend: dayOfWeek === 0 || dayOfWeek === 6,
                status: null,
                work_hours: 0,
                check_in_time: null,
                check_out_time: null,
                notes: null
            };
        }

        // Fill in actual attendance data
        records.forEach(record => {
            const day = moment(record.attendance_date).date();
            attendanceMap[day] = {
                ...attendanceMap[day],
                status: record.status,
                work_hours: parseFloat(record.work_hours) || 0,
                check_in_time: record.check_in_time,
                check_out_time: record.check_out_time,
                notes: record.notes
            };
        });

        // Calculate statistics
        const stats = {
            total_days: daysInMonth,
            working_days: 0,
            present_days: 0,
            absent_days: 0,
            late_days: 0,
            leave_days: 0,
            total_hours: 0
        };

        Object.values(attendanceMap).forEach(day => {
            if (!day.is_weekend) {
                stats.working_days++;
                
                if (day.status === 'present') stats.present_days++;
                else if (day.status === 'absent') stats.absent_days++;
                else if (day.status === 'late') stats.late_days++;
                else if (day.status === 'leave') stats.leave_days++;
                
                stats.total_hours += day.work_hours;
            }
        });

        res.json({
            success: true,
            data: {
                employee_id: employeeId,
                period: { year, month: monthNum },
                attendance: Object.values(attendanceMap),
                statistics: stats
            }
        });

    } catch (error) {
        console.error('Get monthly attendance error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi lấy bảng công tháng / 获取月度考勤错误',
            error: error.message
        });
    }
});

/**
 * @route   POST /api/attendance
 * @desc    Create or update attendance record
 * @access  Private (attendance.create or attendance.update)
 */
router.post('/',
    [
        body('employee_id').isInt().withMessage('Employee ID không hợp lệ'),
        body('attendance_date').isDate().withMessage('Ngày chấm công không hợp lệ'),
        body('status').isIn(['present', 'absent', 'late', 'half_day', 'leave']).withMessage('Trạng thái không hợp lệ')
    ],
    async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const {
            employee_id,
            attendance_date,
            check_in_time,
            check_out_time,
            work_hours,
            status,
            notes
        } = req.body;

        // Check if record exists
        const [existing] = await db.query(
            'SELECT * FROM attendance_records WHERE employee_id = ? AND attendance_date = ?',
            [employee_id, attendance_date]
        );

        if (existing.length > 0) {
            // Update existing record
            await db.query(
                `UPDATE attendance_records 
                 SET check_in_time = ?, check_out_time = ?, work_hours = ?, status = ?, notes = ?
                 WHERE employee_id = ? AND attendance_date = ?`,
                [check_in_time, check_out_time, work_hours, status, notes, employee_id, attendance_date]
            );

            await AuthMiddleware.logAudit(
                req.user.id,
                'UPDATE',
                'attendance',
                existing[0].id,
                existing[0],
                req.body,
                req
            );

            res.json({
                success: true,
                message: 'Cập nhật chấm công thành công / 更新考勤成功'
            });
        } else {
            // Create new record
            const [result] = await db.query(
                `INSERT INTO attendance_records 
                (employee_id, attendance_date, check_in_time, check_out_time, work_hours, status, notes) 
                VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [employee_id, attendance_date, check_in_time, check_out_time, work_hours, status, notes]
            );

            await AuthMiddleware.logAudit(
                req.user.id,
                'CREATE',
                'attendance',
                result.insertId,
                null,
                req.body,
                req
            );

            res.status(201).json({
                success: true,
                message: 'Tạo chấm công thành công / 创建考勤成功',
                data: { id: result.insertId }
            });
        }

    } catch (error) {
        console.error('Create/Update attendance error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi lưu chấm công / 保存考勤错误',
            error: error.message
        });
    }
});

/**
 * @route   POST /api/attendance/bulk
 * @desc    Bulk create/update attendance records
 * @access  Private (attendance.create)
 */
router.post('/bulk',
    AuthMiddleware.checkPermission('attendance', 'create'),
    async (req, res) => {
    try {
        const { records } = req.body;

        if (!Array.isArray(records) || records.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Dữ liệu không hợp lệ / 数据无效'
            });
        }

        const connection = await db.getConnection();
        await connection.beginTransaction();

        try {
            for (const record of records) {
                const { employee_id, attendance_date, check_in_time, check_out_time, work_hours, status, notes } = record;

                await connection.query(
                    `INSERT INTO attendance_records 
                    (employee_id, attendance_date, check_in_time, check_out_time, work_hours, status, notes) 
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE 
                    check_in_time = VALUES(check_in_time),
                    check_out_time = VALUES(check_out_time),
                    work_hours = VALUES(work_hours),
                    status = VALUES(status),
                    notes = VALUES(notes)`,
                    [employee_id, attendance_date, check_in_time, check_out_time, work_hours, status, notes]
                );
            }

            await connection.commit();
            connection.release();

            await AuthMiddleware.logAudit(
                req.user.id,
                'BULK_CREATE',
                'attendance',
                null,
                null,
                { count: records.length },
                req
            );

            res.json({
                success: true,
                message: `Đã lưu ${records.length} bản ghi chấm công / 已保存 ${records.length} 条考勤记录`
            });

        } catch (error) {
            await connection.rollback();
            connection.release();
            throw error;
        }

    } catch (error) {
        console.error('Bulk attendance error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi lưu hàng loạt / 批量保存错误',
            error: error.message
        });
    }
});

/**
 * @route   GET /api/attendance/stats/dashboard
 * @desc    Get attendance statistics for dashboard
 * @access  Private
 */
router.get('/stats/dashboard', async (req, res) => {
    try {
        const today = moment().format('YYYY-MM-DD');
        const thisMonth = moment().format('YYYY-MM');

        // Today's attendance
        const [todayStats] = await db.query(
            `SELECT status, COUNT(*) as count 
             FROM attendance_records 
             WHERE attendance_date = ? 
             GROUP BY status`,
            [today]
        );

        // This month average
        const [monthStats] = await db.query(
            `SELECT 
                COUNT(DISTINCT employee_id) as total_employees,
                AVG(work_hours) as avg_hours,
                SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present_count,
                SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent_count
             FROM attendance_records 
             WHERE DATE_FORMAT(attendance_date, '%Y-%m') = ?`,
            [thisMonth]
        );

        // Pending leave requests
        const [pendingLeave] = await db.query(
            "SELECT COUNT(*) as count FROM leave_requests WHERE status = 'pending'"
        );

        res.json({
            success: true,
            data: {
                today: todayStats,
                this_month: monthStats[0],
                pending_leave_requests: pendingLeave[0].count
            }
        });

    } catch (error) {
        console.error('Get attendance stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi lấy thống kê chấm công / 获取考勤统计错误',
            error: error.message
        });
    }
});

/**
 * @route   GET /api/attendance/monthly/stats
 * @desc    Get monthly attendance grid for all employees
 * @access  Private
 */
router.get('/monthly/stats', async (req, res) => {
    try {
        const { month = moment().format('MM'), year = moment().format('YYYY') } = req.query;
        const startDate = `${year}-${month.padStart(2, '0')}-01`;
        const endDate = moment(startDate).endOf('month').format('YYYY-MM-DD');
        const daysInMonth = moment(startDate).daysInMonth();

        // Get all active employees
        const [employees] = await db.query(
            'SELECT id, employee_code, full_name, department_id FROM employees WHERE status = "active" ORDER BY employee_code ASC'
        );

        // Get all attendance records for the month
        const [records] = await db.query(
            'SELECT * FROM attendance_records WHERE attendance_date BETWEEN ? AND ?',
            [startDate, endDate]
        );

        // Map records to employees
        const grid = employees.map(emp => {
            const empRecords = Array(daysInMonth).fill(null);
            records.filter(r => r.employee_id === emp.id).forEach(r => {
                const day = moment(r.attendance_date).date();
                empRecords[day - 1] = {
                    status: r.status,
                    work_hours: r.work_hours
                };
            });
            return {
                ...emp,
                records: empRecords
            };
        });

        res.json({
            success: true,
            data: grid
        });

    } catch (error) {
        console.error('Get monthly grid error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi lấy bảng công tháng / 获取月度考勤错误',
            error: error.message
        });
    }
});

module.exports = router;
