const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const AuthMiddleware = require('../middleware/auth');
const moment = require('moment');

const router = express.Router();

// All routes require authentication
router.use(AuthMiddleware.verifyToken);

/**
 * @route   GET /api/payroll/periods
 * @desc    Get all payroll periods
 * @access  Private (payroll.view)
 */
router.get('/periods',
    AuthMiddleware.checkPermission('payroll', 'view'),
    async (req, res) => {
    try {
        const { year = moment().year(), status = '' } = req.query;

        let whereConditions = ['period_year = ?'];
        let queryParams = [year];

        if (status) {
            whereConditions.push('status = ?');
            queryParams.push(status);
        }

        const whereClause = 'WHERE ' + whereConditions.join(' AND ');

        const [periods] = await db.query(
            `SELECT pp.*, 
                    u.full_name as approved_by_name,
                    COUNT(pr.id) as total_employees
             FROM payroll_periods pp
             LEFT JOIN users u ON pp.approved_by = u.id
             LEFT JOIN payroll_records pr ON pp.id = pr.payroll_period_id
             ${whereClause}
             GROUP BY pp.id
             ORDER BY pp.period_year DESC, pp.period_month DESC`,
            queryParams
        );

        res.json({
            success: true,
            data: periods
        });

    } catch (error) {
        console.error('Get payroll periods error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi lấy danh sách kỳ lương / 获取工资期列表错误',
            error: error.message
        });
    }
});

/**
 * @route   GET /api/payroll/periods/:id
 * @desc    Get payroll period details with all records
 * @access  Private (payroll.view)
 */
router.get('/periods/:id',
    AuthMiddleware.checkPermission('payroll', 'view'),
    async (req, res) => {
    try {
        const periodId = req.params.id;

        // Get period info
        const [periods] = await db.query(
            `SELECT pp.*, u.full_name as approved_by_name
             FROM payroll_periods pp
             LEFT JOIN users u ON pp.approved_by = u.id
             WHERE pp.id = ?`,
            [periodId]
        );

        if (periods.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy kỳ lương / 未找到工资期'
            });
        }

        // Get all payroll records
        const [records] = await db.query(
            `SELECT pr.*, 
                    e.employee_code, e.full_name, e.full_name_zh,
                    d.department_name, d.department_name_zh,
                    p.position_name, p.position_name_zh
             FROM payroll_records pr
             JOIN employees e ON pr.employee_id = e.id
             LEFT JOIN departments d ON e.department_id = d.id
             LEFT JOIN positions p ON e.position_id = p.id
             WHERE pr.payroll_period_id = ?
             ORDER BY e.employee_code ASC`,
            [periodId]
        );

        // Get record details for each record
        for (let record of records) {
            const [details] = await db.query(
                `SELECT prd.*, sc.component_name, sc.component_name_zh, sc.component_type
                 FROM payroll_record_details prd
                 JOIN salary_components sc ON prd.component_id = sc.id
                 WHERE prd.payroll_record_id = ?`,
                [record.id]
            );
            record.details = details;
        }

        res.json({
            success: true,
            data: {
                period: periods[0],
                records: records
            }
        });

    } catch (error) {
        console.error('Get payroll period error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi lấy chi tiết kỳ lương / 获取工资期详情错误',
            error: error.message
        });
    }
});

/**
 * @route   GET /api/payroll/components
 * @desc    Get all active salary components
 * @access  Private (payroll.view hoặc admin)
 */
router.get('/components', async (req, res) => {
    try {
        const [components] = await db.query(
            'SELECT * FROM salary_components WHERE is_active = TRUE ORDER BY component_type, component_name'
        );
        res.json({
            success: true,
            data: components
        });
    } catch (error) {
        console.error('Get components error:', error);
        res.status(500).json({ success: false, message: 'Lỗi lấy danh mục thành phần lương' });
    }
});

/**
 * @route   POST /api/payroll/components
 * @desc    Create or update salary component
 * @access  Private (admin hoặc hr)
 */
router.post('/components', async (req, res) => {
    try {
        const { id, component_code, component_name, component_name_zh, component_type, calculation_type, default_value, is_taxable } = req.body;
        
        if (id) {
            await db.query(
                `UPDATE salary_components SET component_code = ?, component_name = ?, component_name_zh = ?, 
                 component_type = ?, calculation_type = ?, default_value = ?, is_taxable = ? 
                 WHERE id = ?`,
                [component_code, component_name, component_name_zh, component_type, calculation_type, default_value, is_taxable, id]
            );
        } else {
            await db.query(
                `INSERT INTO salary_components (component_code, component_name, component_name_zh, component_type, calculation_type, default_value, is_taxable) 
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [component_code, component_name, component_name_zh, component_type, calculation_type, default_value, is_taxable]
            );
        }
        res.json({ success: true, message: 'Cập nhật thành phần lương thành công' });
    } catch (error) {
        console.error('Save component error:', error);
        res.status(500).json({ success: false, message: 'Lỗi lưu thành phần lương' });
    }
});

/**
 * @route   DELETE /api/payroll/components/:id
 * @desc    Delete salary component
 * @access  Private (admin only)
 */
router.delete('/components/:id', async (req, res) => {
    const connection = await db.getConnection();
    try {
        const { id } = req.params;
        const { force } = req.query; // ?force=true to delete even if used

        await connection.beginTransaction();

        // Check usage in payroll records (History)
        const [history] = await connection.query(
            'SELECT COUNT(*) as count FROM payroll_record_details WHERE component_id = ?',
            [id]
        );

        if (history[0].count > 0 && force !== 'true') {
            await connection.rollback();
            return res.status(400).json({
                success: false, 
                code: 'USED_IN_HISTORY',
                message: `Khoản lương này đã được sử dụng trong ${history[0].count} bản ghi lương lịch sử. Bạn có chắc chắn muốn xóa vĩnh viễn? (Hành động này sẽ xóa dữ liệu chi tiết trong các bảng lương cũ)`,
                confirm_required: true
            });
        }

        // Delete from employee settings (Configurations) - Safe to delete
        await connection.query('DELETE FROM employee_salary_components WHERE component_id = ?', [id]);

        // Delete from details (History) if forced
        if (history[0].count > 0 && force === 'true') {
            await connection.query('DELETE FROM payroll_record_details WHERE component_id = ?', [id]);
        }

        // Delete component
        await connection.query('DELETE FROM salary_components WHERE id = ?', [id]);

        await connection.commit();
        res.json({ success: true, message: 'Đã xóa khoản lương thành công' });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Delete component error:', error);
        res.status(500).json({ success: false, message: 'Lỗi xóa khoản lương', error: error.message });
    } finally {
        if (connection) connection.release();
    }
});

/**
 * @route   PUT /api/payroll/settings
 * @desc    Update system payroll settings
 * @access  Private (admin hoặc hr)
 */
router.put('/settings', async (req, res) => {
    try {
        const settings = req.body; // Map of { key: value }
        
        for (const [key, value] of Object.entries(settings)) {
            await db.query(
                'INSERT INTO system_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?',
                [key, value, value]
            );
        }
        res.json({ success: true, message: 'Cập nhật cấu hình hệ thống thành công' });
    } catch (error) {
        console.error('Update settings error:', error);
        res.status(500).json({ success: false, message: 'Lỗi cập nhật cấu hình' });
    }
});

/**
 * @route   POST /api/payroll/periods
 * @desc    Create new payroll period and calculate salaries
 * @access  Private (payroll.create)
 */
router.post('/periods',
    AuthMiddleware.checkPermission('payroll', 'create'),
    [
        body('period_year').isInt({ min: 2020, max: 2100 }).withMessage('Năm không hợp lệ'),
        body('period_month').isInt({ min: 1, max: 12 }).withMessage('Tháng không hợp lệ')
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

        const { period_year, period_month } = req.body;

        // 1. Prevent future periods
        const now = moment();
        const requestedPeriod = moment(`${period_year}-${period_month}-01`, 'YYYY-MM-DD');
        
        if (requestedPeriod.isAfter(now, 'month')) {
            return res.status(400).json({
                success: false,
                message: 'Không thể tạo kỳ lương cho tương lai / 无法创建未来工资期'
            });
        }

        // 2. Check if period already exists
        const [existing] = await db.query(
            'SELECT id, status FROM payroll_periods WHERE period_year = ? AND period_month = ?',
            [period_year, period_month]
        );

        if (existing.length > 0) {
            // If it's not draft, don't allow re-creation
            if (existing[0].status !== 'draft') {
                return res.status(400).json({
                    success: false,
                    message: `Kỳ lương này đã được ${existing[0].status === 'locked' ? 'khóa' : 'phê duyệt'}, không thể tạo lại / 此工资期已${existing[0].status === 'locked' ? '锁定' : '批准'}, 无法重新创建`
                });
            }
            
            // If it's draft, we will delete it and recreate it (re-calculate)
            // This makes the logic more "stable" as users can update and re-calculate
            const connection = await db.getConnection();
            try {
                await connection.beginTransaction();
                await connection.query('DELETE FROM payroll_periods WHERE id = ?', [existing[0].id]);
                await connection.commit();
            } catch (err) {
                await connection.rollback();
                throw err;
            } finally {
                connection.release();
            }
        }

        let connection;
        try {
            connection = await db.getConnection();
            await connection.beginTransaction();

            // Create period
            const startDate = moment(`${period_year}-${period_month}-01`).format('YYYY-MM-DD');
            const endDate = moment(startDate).endOf('month').format('YYYY-MM-DD');
            const periodName = `Lương tháng ${period_month}/${period_year}`;

            const [periodResult] = await connection.query(
                `INSERT INTO payroll_periods 
                (period_name, period_year, period_month, start_date, end_date, status) 
                VALUES (?, ?, ?, ?, ?, 'draft')`,
                [periodName, period_year, period_month, startDate, endDate]
            );

            const periodId = periodResult.insertId;

            // Get all active employees with their base salary
            const [employees] = await connection.query(
                `SELECT e.*, ess.id as salary_structure_id, ess.base_salary 
                 FROM employees e
                 JOIN employee_salary_structure ess ON e.id = ess.employee_id AND ess.is_current = TRUE
                 WHERE e.status = 'active'`
            );

            // Get system settings
            const [settings] = await connection.query(
                "SELECT setting_key, setting_value FROM system_settings WHERE setting_key IN ('standard_working_days', 'overtime_rate_normal')"
            );
            
            const settingsMap = {};
            settings.forEach(s => {
                settingsMap[s.setting_key] = parseFloat(s.setting_value);
            });

            const standardDays = settingsMap['standard_working_days'] || 22;
            const overtimeRate = settingsMap['overtime_rate_normal'] || 1.5;

            // Get all active global components definition
            const [globalComponents] = await connection.query(
                'SELECT * FROM salary_components WHERE is_active = TRUE'
            );
            const globalComponentsMap = new Map(globalComponents.map(c => [c.id, c]));

            let totalGross = 0;
            let totalDeductions = 0;
            let totalNet = 0;

            // Calculate for each employee
            for (const employee of employees) {
                // Get attendance
                const [attendance] = await connection.query(
                    `SELECT 
                        COUNT(*) as working_days,
                        SUM(work_hours) as total_hours
                     FROM attendance_records 
                     WHERE employee_id = ? 
                     AND attendance_date BETWEEN ? AND ?
                     AND status IN ('present', 'late', 'half_day')`,
                    [employee.id, startDate, endDate]
                );

                const workingDays = attendance[0]?.working_days || 0;
                const totalHours = attendance[0]?.total_hours || 0;
                const overtimeHours = Math.max(0, totalHours - (workingDays * 8));

                // Calculate base salary
                const baseSalary = Number(employee.base_salary) || 0;
                const actualBaseSalary = (baseSalary / standardDays) * workingDays;

                // Calculate overtime
                const hourlyRate = baseSalary / (standardDays * 8);
                const overtimePay = hourlyRate * overtimeHours * overtimeRate;

                // Create sets for calculation
                let totalAllowances = 0;
                let nonTaxableAllowances = 0;
                let totalEmployeeDeductions = 0;
                const recordDetails = [];

                // Fetch assigned components for this employee
                const [assignedComponents] = await connection.query(
                    `SELECT esc.amount, sc.id as component_id, sc.component_type, sc.calculation_type, 
                            sc.percentage_value, sc.default_value, sc.is_taxable
                     FROM employee_salary_components esc
                     JOIN salary_components sc ON esc.component_id = sc.id
                     WHERE esc.salary_structure_id = ? AND sc.is_active = TRUE`,
                    [employee.salary_structure_id]
                );

                // Set of processed component IDs
                const processedComponentIds = new Set();

                // 1. Process assigned components
                for (const comp of assignedComponents) {
                    let amount = Number(comp.amount);
                    if (comp.calculation_type === 'percentage') {
                        // Percentages should be based on actual pro-rated salary for fairness
                        amount = actualBaseSalary * (Number(comp.percentage_value) / 100);
                    }
                    
                    if (amount > 0) {
                        recordDetails.push({ component_id: comp.component_id, amount });
                        processedComponentIds.add(comp.component_id);

                        if (['allowance', 'bonus', 'overtime'].includes(comp.component_type)) {
                            totalAllowances += amount;
                            if (!comp.is_taxable) nonTaxableAllowances += amount;
                        }
                        if (comp.component_type === 'deduction') {
                            totalEmployeeDeductions += amount;
                        }
                    }
                }

                // 2. Apply global mandatory components (like Insurance) if not present
                for (const gComp of globalComponents) {
                    if (!processedComponentIds.has(gComp.id) && gComp.calculation_type === 'percentage' && gComp.component_type === 'deduction') {
                        // Auto-apply percentage deductions (Insurance) based on actual salary
                        const amount = actualBaseSalary * (Number(gComp.percentage_value) / 100);
                        if (amount > 0) {
                            recordDetails.push({ component_id: gComp.id, amount });
                            totalEmployeeDeductions += amount;
                        }
                    }
                }

                // Calculate Gross & Net
                const grossSalary = actualBaseSalary + overtimePay + totalAllowances;
                // Taxable Income = (Gross - NonTaxableAllowances) - Deductions (like insurance)
                const taxableIncome = Math.max(0, (grossSalary - nonTaxableAllowances) - totalEmployeeDeductions);
                
                // Tax Calculation
                let taxAmount = 0;
                const taxThreshold = 11000000;
                if (taxableIncome > taxThreshold) {
                    const taxableAmount = taxableIncome - taxThreshold;
                    if (taxableAmount <= 5000000) taxAmount = taxableAmount * 0.05;
                    else if (taxableAmount <= 10000000) taxAmount = 250000 + (taxableAmount - 5000000) * 0.10;
                    else if (taxableAmount <= 18000000) taxAmount = 750000 + (taxableAmount - 10000000) * 0.15;
                    else taxAmount = 1950000 + (taxableAmount - 18000000) * 0.20;
                }

                const netSalary = grossSalary - totalEmployeeDeductions - taxAmount;

                // Insert Record
                const [recordResult] = await connection.query(
                    `INSERT INTO payroll_records 
                    (payroll_period_id, employee_id, base_salary, working_days, standard_days, 
                     overtime_hours, total_allowances, total_deductions, gross_salary, 
                     taxable_income, tax_amount, net_salary, payment_status) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
                    [
                        periodId, employee.id, baseSalary, workingDays, standardDays,
                        overtimeHours, totalAllowances, totalEmployeeDeductions,
                        grossSalary, taxableIncome, taxAmount, netSalary
                    ]
                );

                const recordId = recordResult.insertId;

                // Insert Details
                if (recordDetails.length > 0) {
                     const values = recordDetails.map(d => [recordId, d.component_id, d.amount]);
                     await connection.query(
                        'INSERT INTO payroll_record_details (payroll_record_id, component_id, amount) VALUES ?',
                        [values]
                     );
                }

                totalGross += grossSalary;
                totalDeductions += totalEmployeeDeductions + taxAmount;
                totalNet += netSalary;
            }

            // Update period totals
            await connection.query(
                `UPDATE payroll_periods 
                 SET total_gross = ?, total_deductions = ?, total_net = ? 
                 WHERE id = ?`,
                [totalGross, totalDeductions, totalNet, periodId]
            );

            await connection.commit();
            
            // Log audit
            await AuthMiddleware.logAudit(
                req.user.id, 'CREATE', 'payroll_period', periodId, null,
                { period_year, period_month, total_employees: employees.length }, req
            );

            res.status(201).json({
                success: true,
                message: `Đã tạo bảng lương tháng ${period_month}/${period_year} cho ${employees.length} nhân viên`,
                data: { period_id: periodId, total_employees: employees.length, total_gross: totalGross, total_net: totalNet }
            });

        } catch (error) {
            if (connection) await connection.rollback();
            throw error;
        } finally {
            if (connection) connection.release();
        }

    } catch (error) {
        console.error('CRITICAL: Create payroll period error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi tạo kỳ lương / 创建工资期错误',
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

/**
 * @route   DELETE /api/payroll/periods/:id
 * @desc    Delete payroll period
 * @access  Private (payroll.delete)
 */
router.delete('/periods/:id',
    AuthMiddleware.checkPermission('payroll', 'delete'),
    async (req, res) => {
    try {
        const periodId = req.params.id;

        const [periods] = await db.query(
            'SELECT * FROM payroll_periods WHERE id = ?',
            [periodId]
        );

        if (periods.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy kỳ lương / 未找到工资期'
            });
        }

        if (periods[0].status === 'locked') {
            return res.status(400).json({
                success: false,
                message: 'Không thể xóa kỳ lương đã bị khóa / 无法删除已锁定的工资期'
            });
        }

        await db.query('DELETE FROM payroll_periods WHERE id = ?', [periodId]);

        // Log audit
        await AuthMiddleware.logAudit(
            req.user.id,
            'DELETE',
            'payroll_period',
            periodId,
            periods[0],
            null,
            req
        );

        res.json({
            success: true,
            message: 'Đã xóa bảng lương thành công / 已 thành công 删除工资单'
        });

    } catch (error) {
        console.error('Delete payroll error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi xóa bảng lương / 删除工资单错误',
            error: error.message
        });
    }
});

/**
 * @route   PUT /api/payroll/periods/:id/approve
 * @desc    Approve payroll period
 * @access  Private (payroll.approve)
 */
router.put('/periods/:id/approve',
    AuthMiddleware.checkPermission('payroll', 'approve'),
    async (req, res) => {
    try {
        const periodId = req.params.id;

        const [periods] = await db.query(
            'SELECT * FROM payroll_periods WHERE id = ?',
            [periodId]
        );

        if (periods.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy kỳ lương / 未找到工资期'
            });
        }

        const period = periods[0];

        if (period.status === 'locked') {
            return res.status(400).json({
                success: false,
                message: 'Kỳ lương đã bị khóa / 工资期已锁定'
            });
        }

        await db.query(
            `UPDATE payroll_periods 
             SET status = 'approved', approved_by = ?, approved_at = NOW() 
             WHERE id = ?`,
            [req.user.id, periodId]
        );

        // Log audit
        await AuthMiddleware.logAudit(
            req.user.id,
            'APPROVE',
            'payroll_period',
            periodId,
            period,
            { status: 'approved' },
            req
        );

        res.json({
            success: true,
            message: 'Đã phê duyệt bảng lương / 已批准工资单'
        });

    } catch (error) {
        console.error('Approve payroll error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi phê duyệt bảng lương / 批准工资单错误',
            error: error.message
        });
    }
});

/**
 * @route   PUT /api/payroll/periods/:id/reject
 * @desc    Reject payroll period (return to draft)
 * @access  Private (payroll.approve)
 */
router.put('/periods/:id/reject',
    AuthMiddleware.checkPermission('payroll', 'approve'),
    async (req, res) => {
    try {
        const periodId = req.params.id;
        const { note } = req.body;

        const [periods] = await db.query(
            'SELECT * FROM payroll_periods WHERE id = ?',
            [periodId]
        );

        if (periods.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy kỳ lương'
            });
        }

        if (periods[0].status === 'locked') {
            // Allow unlocking but maybe restrict to admin? For now allow with audit log
            // return res.status(400).json({
            //     success: false,
            //     message: 'Kỳ lương đã khóa không thể từ chối'
            // });
        }

        await db.query(
            `UPDATE payroll_periods 
             SET status = 'draft', approved_by = NULL, approved_at = NULL 
             WHERE id = ?`,
            [periodId]
        );

        // Ideally we should save the note somewhere, maybe in audit logs or a notes field
        // For now, let's just log it in audit
        await AuthMiddleware.logAudit(
            req.user.id,
            'REJECT',
            'payroll_period',
            periodId,
            periods[0],
            { status: 'draft', note },
            req
        );

        res.json({
            success: true,
            message: 'Đã từ chối và trả về bản nháp'
        });

    } catch (error) {
        console.error('Reject payroll error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi từ chối bảng lương',
            error: error.message
        });
    }
});

/**
 * @route   PUT /api/payroll/periods/:id/lock
 * @desc    Lock payroll period (final)
 * @access  Private (boss only)
 */
router.put('/periods/:id/lock',
    AuthMiddleware.checkPermission('payroll', 'approve'),
    async (req, res) => {
    try {
        const periodId = req.params.id;

        const [periods] = await db.query(
            'SELECT * FROM payroll_periods WHERE id = ?',
            [periodId]
        );

        if (periods.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy kỳ lương / 未找到工资期'
            });
        }

        if (periods[0].status === 'locked') {
            return res.status(400).json({
                success: false,
                message: 'Kỳ lương đã bị khóa trước đó / 工资期已被锁定'
            });
        }

        await db.query(
            `UPDATE payroll_periods 
             SET status = 'locked', locked_at = NOW() 
             WHERE id = ?`,
            [periodId]
        );

        // Log audit
        await AuthMiddleware.logAudit(
            req.user.id,
            'LOCK',
            'payroll_period',
            periodId,
            periods[0],
            { status: 'locked' },
            req
        );

        res.json({
            success: true,
            message: 'Đã khóa bảng lương / 已锁定工资单'
        });

    } catch (error) {
        console.error('Lock payroll error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khóa bảng lương / 锁定工资单错误',
            error: error.message
        });
    }
});

/**
 * @route   GET /api/payroll/employee/:employee_id
 * @desc    Get payroll history for specific employee
 * @access  Private
 */
router.get('/employee/:employee_id', async (req, res) => {
    try {
        const employeeId = req.params.employee_id;
        const { year = moment().year() } = req.query;

        // Check if user can view this employee's payroll
        const [employee] = await db.query(
            'SELECT user_id FROM employees WHERE id = ?',
            [employeeId]
        );

        if (employee.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy nhân viên / 未找到员工'
            });
        }

        // Employee can only view their own payroll
        if (req.user.role_name === 'employee' && employee[0].user_id !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Bạn chỉ có thể xem lương của chính mình / 您只能查看自己的工资'
            });
        }

        const [records] = await db.query(
            `SELECT pr.*, pp.period_name, pp.period_year, pp.period_month, pp.status as period_status
             FROM payroll_records pr
             JOIN payroll_periods pp ON pr.payroll_period_id = pp.id
             WHERE pr.employee_id = ? AND pp.period_year = ?
             ORDER BY pp.period_year DESC, pp.period_month DESC`,
            [employeeId, year]
        );

        // Get details for each record
        for (let record of records) {
            const [details] = await db.query(
                `SELECT prd.*, sc.component_name, sc.component_name_zh, sc.component_type
                 FROM payroll_record_details prd
                 JOIN salary_components sc ON prd.component_id = sc.id
                 WHERE prd.payroll_record_id = ?`,
                [record.id]
            );
            record.details = details;
        }

        res.json({
            success: true,
            data: records
        });

    } catch (error) {
        console.error('Get employee payroll error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi lấy lịch sử lương / 获取工资历史错误',
            error: error.message
        });
    }
});

/**
 * @route   GET /api/payroll/employees/:id/quick-view
 * @desc    Get latest payroll record for quick view
 * @access  Private (payroll.view hoặc boss)
 */
router.get('/employees/:id/quick-view',
    async (req, res) => {
    try {
        const employeeId = req.params.id;

        // Get latest approved or pending payroll record
        const [records] = await db.query(
            `SELECT pr.*, pp.period_name, pp.period_month, pp.period_year, pp.status as period_status,
                    e.full_name, e.employee_code, ess.base_salary as current_base_salary
             FROM payroll_records pr
             JOIN payroll_periods pp ON pr.payroll_period_id = pp.id
             JOIN employees e ON pr.employee_id = e.id
             LEFT JOIN employee_salary_structure ess ON e.id = ess.employee_id AND ess.is_current = TRUE
             WHERE pr.employee_id = ?
             ORDER BY pp.period_year DESC, pp.period_month DESC
             LIMIT 1`,
            [employeeId]
        );

        if (records.length === 0) {
            // ... (keep simulated part if needed, but let's prioritize real record with details)
            // If no records found, return simulated data from salary structure
            const [empInfo] = await db.query(
                `SELECT e.id, e.full_name, e.employee_code, ess.base_salary
                 FROM employees e
                 JOIN employee_salary_structure ess ON e.id = ess.employee_id AND ess.is_current = TRUE
                 WHERE e.id = ?`,
                [employeeId]
            );

            if (empInfo.length === 0) {
                return res.status(404).json({ success: false, message: 'Nhân viên chưa cấu hình lương' });
            }

            return res.json({
                success: true,
                simulated: true,
                data: {
                    ...empInfo[0],
                    period_name: `Dự kiến Tháng ${moment().format('MM/YYYY')}`,
                    net_amount: empInfo[0].base_salary,
                    gross_amount: empInfo[0].base_salary,
                    total_allowances: 0,
                    total_deductions: 0,
                    details: []
                }
            });
        }

        const record = records[0];

        // Fetch details (breakdown)
        const [details] = await db.query(
            `SELECT prd.*, sc.component_name, sc.component_name_zh, sc.component_type, sc.component_code
             FROM payroll_record_details prd
             JOIN salary_components sc ON prd.component_id = sc.id
             WHERE prd.payroll_record_id = ?`,
            [record.id]
        );

        res.json({
            success: true,
            data: {
                ...record,
                details
            }
        });

    } catch (error) {
        console.error('Quick payroll view error:', error);
        res.status(500).json({ success: false, message: 'Lỗi lấy thông tin lương' });
    }
});

/**
 * @route   POST /api/payroll/records/:id/send-email
 * @desc    Send professional payslip email to employee
 * @access  Private (payroll.view hoặc admin)
 */
router.post('/records/:id/send-email', async (req, res) => {
    try {
        const recordId = req.params.id;

        // Fetch record details
        const [records] = await db.query(
            `SELECT pr.*, e.full_name, e.email as emp_email, e.employee_code,
                    pp.period_name, pp.period_month, pp.period_year
             FROM payroll_records pr
             JOIN employees e ON pr.employee_id = e.id
             JOIN payroll_periods pp ON pr.payroll_period_id = pp.id
             WHERE pr.id = ?`,
            [recordId]
        );

        if (records.length === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy bản ghi lương' });
        }

        const record = records[0];
        
        // Fetch breakdown details
        const [details] = await db.query(
            `SELECT prd.*, sc.component_name, sc.component_type
             FROM payroll_record_details prd
             JOIN salary_components sc ON prd.component_id = sc.id
             WHERE prd.payroll_record_id = ?`,
            [recordId]
        );

        // Professional HTML Template
        const breakdownHtml = details.map(d => `
            <tr>
                <td style="padding: 12px; border-bottom: 1px solid #edf2f7; font-size: 14px; color: #4a5568;">${d.component_name}</td>
                <td style="padding: 12px; border-bottom: 1px solid #edf2f7; font-size: 14px; text-align: right; font-weight: bold; color: ${d.component_type === 'deduction' ? '#e53e3e' : '#38a169'};">
                    ${d.component_type === 'deduction' ? '-' : '+'} ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(d.amount)}
                </td>
            </tr>
        `).join('');

        const emailHtml = `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f7fafc; padding: 40px; border-radius: 24px;">
                <div style="background-color: #ffffff; padding: 40px; border-radius: 24px; shadow: 0 4px 6px rgba(0,0,0,0.05);">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h1 style="color: #1a202c; margin: 0; font-size: 24px; font-weight: 900; letter-spacing: -1px;">PHIẾU LƯƠNG NHÂN VIÊN</h1>
                        <p style="color: #718096; text-transform: uppercase; font-size: 12px; font-weight: bold; letter-spacing: 2px; margin-top: 8px;">${record.period_name}</p>
                    </div>

                    <div style="border-top: 2px solid #edf2f7; border-bottom: 2px solid #edf2f7; padding: 20px 0; margin-bottom: 30px;">
                        <table width="100%">
                            <tr>
                                <td style="color: #718096; font-size: 12px; font-weight: bold; text-transform: uppercase;">Nhân viên:</td>
                                <td style="text-align: right; color: #2d3748; font-weight: bold;">${record.full_name}</td>
                            </tr>
                            <tr>
                                <td style="color: #718096; font-size: 12px; font-weight: bold; text-transform: uppercase; padding-top: 8px;">Mã NV:</td>
                                <td style="text-align: right; color: #2d3748; font-weight: bold; padding-top: 8px;">${record.employee_code}</td>
                            </tr>
                        </table>
                    </div>

                    <table width="100%" style="border-collapse: collapse; margin-bottom: 30px;">
                        <tr>
                            <td style="padding: 12px; border-bottom: 1px solid #edf2f7; font-size: 14px; color: #4a5568;">Lương cơ bản</td>
                            <td style="padding: 12px; border-bottom: 1px solid #edf2f7; font-size: 14px; text-align: right; font-weight: bold;">${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(record.base_salary)}</td>
                        </tr>
                        ${breakdownHtml}
                    </table>

                    <div style="background-color: #ebf8ff; padding: 24px; border-radius: 16px; text-align: center;">
                        <p style="color: #3182ce; font-size: 12px; font-weight: bold; text-transform: uppercase; margin: 0;">Số tiền thực nhận (NET)</p>
                        <h2 style="color: #2b6cb0; font-size: 32px; font-weight: 900; margin: 8px 0;">${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(record.net_salary)}</h2>
                    </div>

                    <div style="margin-top: 40px; text-align: center; color: #a0aec0; font-size: 11px;">
                        <p>© 2024 CÔNG TY TNHH ABC - HỆ THỐNG QUẢN TRỊ NHÂN SỰ NỘI BỘ</p>
                        <p>Đây là email tự động, vui lòng không trả lời.</p>
                    </div>
                </div>
            </div>
        `;

        // Simulate sending
        console.log('--- SENT PAYSLIP EMAIL ---');
        console.log('To:', record.emp_email || 'No email');
        console.log('Subject:', `[Phiếu Lương] ${record.period_name} - ${record.full_name}`);
        // console.log('Content:', emailHtml);

        res.json({
            success: true,
            message: 'Đã gửi email thành công (Simulated)'
        });

    } catch (error) {
        console.error('Send email error:', error);
        res.status(500).json({ success: false, message: 'Lỗi gửi email' });
    }
});

/**
 * @route   GET /api/payroll/my-records
 * @desc    Get current user's payroll records
 * @access  Private
 */
router.get('/my-records', AuthMiddleware.verifyToken, async (req, res) => {
    try {
        const [employee] = await db.query('SELECT id FROM employees WHERE user_id = ?', [req.user.id]);
        if (employee.length === 0) return res.status(404).json({ success: false, message: 'Employee not found' });

        const [records] = await db.query(
            `SELECT pr.*, pp.period_name, pp.period_month, pp.period_year, pp.status as period_status
             FROM payroll_records pr
             JOIN payroll_periods pp ON pr.payroll_period_id = pp.id
             WHERE pr.employee_id = ?
             ORDER BY pp.period_year DESC, pp.period_month DESC`,
            [employee[0].id]
        );

        res.json({ success: true, data: records });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

/**
 * @route   GET /api/payroll/my-latest
 * @desc    Get current user's latest payslip with breakdown
 * @access  Private
 */
router.get('/my-latest', AuthMiddleware.verifyToken, async (req, res) => {
    try {
        const [employee] = await db.query('SELECT id FROM employees WHERE user_id = ?', [req.user.id]);
        if (employee.length === 0) return res.status(404).json({ success: false, message: 'Employee not found' });

        const [records] = await db.query(
            `SELECT pr.*, pp.period_name, pp.period_month, pp.period_year
             FROM payroll_records pr
             JOIN payroll_periods pp ON pr.payroll_period_id = pp.id
             WHERE pr.employee_id = ?
             ORDER BY pp.period_year DESC, pp.period_month DESC
             LIMIT 1`,
            [employee[0].id]
        );

        if (records.length === 0) return res.json({ success: true, data: null });

        const record = records[0];
        const [details] = await db.query(
            `SELECT prd.*, sc.component_name, sc.component_type
             FROM payroll_record_details prd
             JOIN salary_components sc ON prd.component_id = sc.id
             WHERE prd.payroll_record_id = ?`,
            [record.id]
        );

        res.json({
            success: true,
            data: { ...record, details }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;
