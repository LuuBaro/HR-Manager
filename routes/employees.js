const express = require('express');
const { body, validationResult, query } = require('express-validator');
const db = require('../config/database');
const AuthMiddleware = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(AuthMiddleware.verifyToken);

/**
 * @route   GET /api/employees
 * @desc    Get all employees with filters
 * @access  Private (employee.view)
 */
router.get('/', 
    AuthMiddleware.checkPermission('employee', 'view'),
    async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 15, 
            search = '', 
            department_id = '', 
            status = '',
            sort_by = 'employee_code',
            sort_order = 'ASC'
        } = req.query;

        const offset = (page - 1) * limit;

        // Build WHERE clause
        let whereConditions = [];
        let queryParams = [];

        if (search) {
            whereConditions.push('(e.full_name LIKE ? OR e.full_name_zh LIKE ? OR e.employee_code LIKE ? OR e.email LIKE ?)');
            const searchPattern = `%${search}%`;
            queryParams.push(searchPattern, searchPattern, searchPattern, searchPattern);
        }

        if (department_id) {
            whereConditions.push('e.department_id = ?');
            queryParams.push(department_id);
        }

        if (status) {
            whereConditions.push('e.status = ?');
            queryParams.push(status);
        }

        const whereClause = whereConditions.length > 0 
            ? 'WHERE ' + whereConditions.join(' AND ') 
            : '';

        // Get total count
        const [countResult] = await db.query(
            `SELECT COUNT(*) as total FROM employees e ${whereClause}`,
            queryParams
        );
        const total = countResult[0].total;

        // Get employees
        const [employees] = await db.query(
            `SELECT e.*, 
                    d.department_name, d.department_name_zh, d.department_code,
                    p.position_name, p.position_name_zh, p.position_code,
                    u.email as user_email,
                    ess.base_salary
             FROM employees e
             LEFT JOIN departments d ON e.department_id = d.id
             LEFT JOIN positions p ON e.position_id = p.id
             LEFT JOIN users u ON e.user_id = u.id
             LEFT JOIN employee_salary_structure ess ON e.id = ess.employee_id AND ess.is_current = TRUE
             ${whereClause}
             ORDER BY ${sort_by} ${sort_order}
             LIMIT ? OFFSET ?`,
            [...queryParams, parseInt(limit), parseInt(offset)]
        );

        res.json({
            success: true,
            data: {
                employees,
                pagination: {
                    current_page: parseInt(page),
                    per_page: parseInt(limit),
                    total_items: total,
                    total_pages: Math.ceil(total / limit)
                }
            }
        });

    } catch (error) {
        console.error('Get employees error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi lấy danh sách nhân viên / 获取员工列表错误',
            error: error.message
        });
    }
});

/**
 * @route   GET /api/employees/:id
 * @desc    Get employee by ID
 * @access  Private (employee.view)
 */
router.get('/:id', 
    AuthMiddleware.checkPermission('employee', 'view'),
    async (req, res) => {
    try {
        const [employees] = await db.query(
            `SELECT e.*, 
                    d.department_name, d.department_name_zh, d.department_code,
                    p.position_name, p.position_name_zh, p.position_code, p.level,
                    u.email, u.last_login, u.is_active as user_active,
                    r.role_name, r.role_name_vi, r.role_name_zh
             FROM employees e
             LEFT JOIN departments d ON e.department_id = d.id
             LEFT JOIN positions p ON e.position_id = p.id
             LEFT JOIN users u ON e.user_id = u.id
             LEFT JOIN roles r ON u.role_id = r.id
             WHERE e.id = ?`,
            [req.params.id]
        );

        if (employees.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy nhân viên / 未找到员工'
            });
        }

        // Get current salary structure
        const [salaryStructure] = await db.query(
            `SELECT * FROM employee_salary_structure 
             WHERE employee_id = ? AND is_current = TRUE`,
            [req.params.id]
        );

        // Get leave balance
        const [leaveBalance] = await db.query(
            `SELECT elb.*, lt.leave_name, lt.leave_name_zh, lt.leave_code
             FROM employee_leave_balance elb
             JOIN leave_types lt ON elb.leave_type_id = lt.id
             WHERE elb.employee_id = ? AND elb.year = YEAR(CURDATE())`,
            [req.params.id]
        );

        res.json({
            success: true,
            data: {
                ...employees[0],
                salary_structure: salaryStructure[0] || null,
                leave_balance: leaveBalance
            }
        });

    } catch (error) {
        console.error('Get employee error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi lấy thông tin nhân viên / 获取员工信息错误',
            error: error.message
        });
    }
});

/**
 * @route   GET /api/employees/:id/salary
 * @desc    Get employee salary structure and components
 * @access  Private (employee.view)
 */
router.get('/:id/salary',
    AuthMiddleware.checkPermission('employee', 'view'),
    async (req, res) => {
    try {
        const employeeId = req.params.id;

        // Get base salary structure
        const [salaryStructure] = await db.query(
            `SELECT * FROM employee_salary_structure 
             WHERE employee_id = ? AND is_current = TRUE 
             LIMIT 1`,
            [employeeId]
        );

        if (salaryStructure.length === 0) {
            return res.json({ success: true, data: { base_salary: 0, components: [] } });
        }

        const structure = salaryStructure[0];

        // Get fixed components
        const [components] = await db.query(
            `SELECT esc.*, sc.component_name, sc.component_type, sc.component_code
             FROM employee_salary_components esc
             JOIN salary_components sc ON esc.component_id = sc.id
             WHERE esc.salary_structure_id = ?`,
            [structure.id]
        );

        res.json({
            success: true,
            data: {
                ...structure,
                components
            }
        });

    } catch (error) {
        console.error('Get employee salary error:', error);
        res.status(500).json({ success: false, message: 'Lỗi lấy thông tin lương' });
    }
});

/**
 * @route   POST /api/employees
 * @desc    Create new employee
 * @access  Private (employee.create)
 */
router.post('/',
    AuthMiddleware.checkPermission('employee', 'create'),
    [
        body('employee_code').notEmpty().withMessage('Mã nhân viên không được để trống'),
        body('full_name').notEmpty().withMessage('Họ tên không được để trống'),
        body('hire_date').isDate().withMessage('Ngày vào làm không hợp lệ'),
        body('department_id').optional().isInt(),
        body('position_id').optional().isInt(),
        body('base_salary').optional().isDecimal()
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
            employee_code,
            full_name,
            full_name_zh,
            email,
            phone,
            department_id,
            position_id,
            hire_date,
            contract_type,
            base_salary
        } = req.body;

        // Check if employee code exists
        const [existing] = await db.query(
            'SELECT id FROM employees WHERE employee_code = ?',
            [employee_code]
        );

        if (existing.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Mã nhân viên đã tồn tại / 员工编号已存在'
            });
        }

        // Insert employee
        const [result] = await db.query(
            `INSERT INTO employees 
            (employee_code, full_name, full_name_zh, email, phone, department_id, position_id, hire_date, contract_type, status) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
            [employee_code, full_name, full_name_zh, email, phone, department_id, position_id, hire_date, contract_type || 'full_time']
        );

        const employeeId = result.insertId;

        // Create salary structure if base_salary provided
        if (base_salary) {
            await db.query(
                `INSERT INTO employee_salary_structure 
                (employee_id, base_salary, effective_from, is_current) 
                VALUES (?, ?, ?, TRUE)`,
                [employeeId, base_salary, hire_date]
            );
        }

        // Initialize leave balance for current year
        const [leaveTypes] = await db.query('SELECT * FROM leave_types');
        for (const leaveType of leaveTypes) {
            await db.query(
                `INSERT INTO employee_leave_balance 
                (employee_id, leave_type_id, year, total_days, used_days, remaining_days) 
                VALUES (?, ?, YEAR(CURDATE()), ?, 0, ?)`,
                [employeeId, leaveType.id, leaveType.max_days_per_year, leaveType.max_days_per_year]
            );
        }

        // Log audit
        await AuthMiddleware.logAudit(
            req.user.id, 
            'CREATE', 
            'employee', 
            employeeId, 
            null, 
            { employee_code, full_name }, 
            req
        );

        res.status(201).json({
            success: true,
            message: 'Tạo nhân viên thành công / 创建员工成功',
            data: { id: employeeId }
        });

    } catch (error) {
        console.error('Create employee error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi tạo nhân viên / 创建员工错误',
            error: error.message
        });
    }
});

/**
 * @route   PUT /api/employees/:id
 * @desc    Update employee
 * @access  Private (employee.update)
 */
router.put('/:id',
    AuthMiddleware.checkPermission('employee', 'update'),
    async (req, res) => {
    try {
        const employeeId = req.params.id;

        // Get old values for audit
        const [oldEmployee] = await db.query(
            'SELECT * FROM employees WHERE id = ?',
            [employeeId]
        );

        if (oldEmployee.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy nhân viên / 未找到员工'
            });
        }

const {
            full_name,
            full_name_zh,
            email,
            phone,
            department_id,
            position_id,
            status,
            contract_type,
            base_salary,
            salary_components
        } = req.body;

        const connection = await db.getConnection();
        await connection.beginTransaction();

        // Transaction block
        
            await connection.query(
                `UPDATE employees 
                 SET full_name = ?, full_name_zh = ?, email = ?, phone = ?, 
                     department_id = ?, position_id = ?, status = ?, contract_type = ?
                 WHERE id = ?`,
                [full_name, full_name_zh, email, phone, department_id, position_id, status, contract_type, employeeId]
            );

            if (base_salary !== undefined) {
                const [current] = await connection.query(
                    'SELECT id FROM employee_salary_structure WHERE employee_id = ? AND is_current = TRUE',
                    [employeeId]
                );
                let structureId;
                if (current.length > 0) {
                    structureId = current[0].id;
                    await connection.query('UPDATE employee_salary_structure SET base_salary = ? WHERE id = ?', [base_salary, structureId]);
                } else {
                    const [res] = await connection.query('INSERT INTO employee_salary_structure (employee_id, base_salary, effective_from, is_current) VALUES (?, ?, CURDATE(), TRUE)', [employeeId, base_salary]);
                    structureId = res.insertId;
                }
                if (salary_components && Array.isArray(salary_components)) {
                    await connection.query('DELETE FROM employee_salary_components WHERE salary_structure_id = ?', [structureId]);
                    for (const comp of salary_components) {
                        if (comp.active) {
                            await connection.query('INSERT INTO employee_salary_components (salary_structure_id, component_id, amount) VALUES (?, ?, ?)', [structureId, comp.component_id, comp.amount]);
                        }
                    }
                }
            }
            await connection.commit();
            connection.release();

            // Log audit
            await AuthMiddleware.logAudit(
                req.user.id,
                'UPDATE',
                'employee',
                employeeId,
                oldEmployee[0],
                req.body,
                req
            );

            res.json({
                success: true,
                message: 'Cập nhật nhân viên thành công / 更新员工成功'
            });

        } catch (error) {
            if (connection) {
                await connection.rollback();
                connection.release();
            }
            console.error('Update employee error:', error);
            res.status(500).json({
                success: false,
                message: 'Lỗi cập nhật nhân viên / 更新员工错误',
                error: error.message
            });
        }
});

/**
 * @route   GET /api/employees/stats/dashboard
 * @desc    Get employee statistics for dashboard
 * @access  Private
 */
router.get('/stats/dashboard', async (req, res) => {
    try {
        // Total employees
        const [totalResult] = await db.query(
            "SELECT COUNT(*) as total FROM employees WHERE status = 'active'"
        );

        // Pending leave requests
        const [pendingLeave] = await db.query(
            "SELECT COUNT(*) as count FROM leave_requests WHERE status = 'pending'"
        );

        // Total payroll current month (estimated/draft)
        const [payrollSum] = await db.query(
            `SELECT SUM(net_salary) as total 
             FROM payroll_records 
             WHERE payroll_period_id = (SELECT id FROM payroll_periods ORDER BY start_date DESC LIMIT 1)`
        );

        // New employees this month
        const [newThisMonth] = await db.query(
            `SELECT COUNT(*) as count FROM employees 
             WHERE MONTH(hire_date) = MONTH(CURDATE()) 
             AND YEAR(hire_date) = YEAR(CURDATE())`
        );

        res.json({
            success: true,
            data: {
                total_employees: totalResult[0].total,
                pending_leave_requests: pendingLeave[0].count,
                total_payroll_month: payrollSum[0].total || 0,
                new_this_month: newThisMonth[0].count
            }
        });

    } catch (error) {
        console.error('Get employee stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi lấy thống kê nhân viên / 获取员工统计错误',
            error: error.message
        });
    }
});

router.delete('/:id',
    AuthMiddleware.checkPermission('employee', 'delete'),
    async (req, res) => {
    const connection = await db.getConnection();
    try {
        const employeeId = req.params.id;

        await connection.beginTransaction();

        // Check if employee exists
        const [existing] = await connection.query('SELECT * FROM employees WHERE id = ?', [employeeId]);
        
        if (existing.length === 0) {
            await connection.rollback();
            connection.release();
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy nhân viên / 未找到员工'
            });
        }

        // 1. Delete Salary Components Linked to Structures
        const [structures] = await connection.query('SELECT id FROM employee_salary_structure WHERE employee_id = ?', [employeeId]);
        if (structures.length > 0) {
            const structIds = structures.map(s => s.id);
            // Use IN (?) with array expansion if driver supports it, else loop or join
            // mysql2 supports IN (?)
            await connection.query('DELETE FROM employee_salary_components WHERE salary_structure_id IN (?)', [structIds]);
        }

        // 2. Delete Salary Structures
        await connection.query('DELETE FROM employee_salary_structure WHERE employee_id = ?', [employeeId]);

        // 3. Delete Leave Balances
        await connection.query('DELETE FROM employee_leave_balance WHERE employee_id = ?', [employeeId]);

        // 4. Delete Leave Requests
        // Assuming table 'leave_requests' exists based on stats code
        await connection.query('DELETE FROM leave_requests WHERE employee_id = ?', [employeeId]);
        
        // 5. Delete Payroll Records (The blocking item)
        await connection.query('DELETE FROM payroll_records WHERE employee_id = ?', [employeeId]);

        // 6. Delete User Association (Optional: if we want to keep user account but unlink, or delete user too?)
        // Usually keep user, just unlink. But here we modify employee table, so let's just delete employee.
        
        // 7. Delete Employee
        await connection.query('DELETE FROM employees WHERE id = ?', [employeeId]);

        await connection.commit();
        connection.release();

        // Log audit
        await AuthMiddleware.logAudit(
            req.user.id,
            'DELETE',
            'employee',
            employeeId,
            existing[0],
            null,
            req
        );

        res.json({
            success: true,
            message: 'Đã xóa nhân viên và toàn bộ dữ liệu liên quan thành công'
        });

    } catch (error) {
        if (connection) {
            await connection.rollback();
            connection.release();
        }
        console.error('Delete employee error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi xóa nhân viên',
            error: error.message
        });
    }
});


module.exports = router;
