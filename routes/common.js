const express = require('express');
const db = require('../config/database');
const AuthMiddleware = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(AuthMiddleware.verifyToken);

/**
 * @route   GET /api/departments
 * @desc    Get all departments
 * @access  Private
 */
router.get('/departments', async (req, res) => {
    try {
        const [departments] = await db.query(
            `SELECT d.*, 
                    e.full_name as manager_name,
                    COUNT(emp.id) as employee_count
             FROM departments d
             LEFT JOIN employees e ON d.manager_id = e.id
             LEFT JOIN employees emp ON d.id = emp.department_id AND emp.status = 'active'
             GROUP BY d.id
             ORDER BY d.department_name ASC`
        );

        res.json({
            success: true,
            data: departments
        });

    } catch (error) {
        console.error('Get departments error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi lấy danh sách phòng ban / 获取部门列表错误',
            error: error.message
        });
    }
});

/**
 * @route   POST /api/departments
 * @desc    Create new department
 * @access  Private
 */
router.post('/departments', async (req, res) => {
    try {
        const { department_name, department_code, description, manager_id } = req.body;

        if (!department_name) {
            return res.status(400).json({
                success: false,
                message: 'Tên phòng ban là bắt buộc / 部门名称为必填项'
            });
        }

        // Generate code if not provided
        let code = department_code;
        if (!code) {
             const acronym = department_name.match(/\b(\w)/g).join('').toUpperCase();
             code = `DEPT-${acronym}-${Math.floor(Math.random() * 1000)}`;
        }

        const [result] = await db.query(
            `INSERT INTO departments (department_code, department_name, manager_id) 
             VALUES (?, ?, ?)`,
            [code, department_name, manager_id || null]
        );

        res.status(201).json({
            success: true,
            message: 'Tạo phòng ban thành công',
            data: {
                id: result.insertId,
                department_name
            }
        });

    } catch (error) {
        console.error('Create department error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi tạo phòng ban',
            error: error.message
        });
    }
});

/**
 * @route   GET /api/positions
 * @desc    Get all positions
 * @access  Private
 */
router.get('/positions', async (req, res) => {
    try {
        const [positions] = await db.query(
            `SELECT p.*,
                    COUNT(e.id) as employee_count
             FROM positions p
             LEFT JOIN employees e ON p.id = e.position_id AND e.status = 'active'
             GROUP BY p.id
             ORDER BY p.level DESC, p.position_name ASC`
        );

        res.json({
            success: true,
            data: positions
        });

    } catch (error) {
        console.error('Get positions error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi lấy danh sách chức vụ / 获取职位列表错误',
            error: error.message
        });
    }
});

/**
 * @route   GET /api/salary-components
 * @desc    Get all salary components
 * @access  Private
 */
router.get('/salary-components', async (req, res) => {
    try {
        const [components] = await db.query(
            'SELECT * FROM salary_components WHERE is_active = TRUE ORDER BY component_type, component_name'
        );

        res.json({
            success: true,
            data: components
        });

    } catch (error) {
        console.error('Get salary components error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi lấy danh sách thành phần lương / 获取工资组成错误',
            error: error.message
        });
    }
});

/**
 * @route   GET /api/system-settings
 * @desc    Get system settings
 * @access  Private
 */
router.get('/system-settings', async (req, res) => {
    try {
        const [settings] = await db.query(
            'SELECT * FROM system_settings WHERE is_public = TRUE OR ? IN (SELECT role_name FROM roles JOIN users ON roles.id = users.role_id WHERE users.id = ?)',
            ['boss', req.user.id]
        );

        const settingsMap = {};
        settings.forEach(s => {
            settingsMap[s.setting_key] = {
                value: s.setting_value,
                type: s.setting_type,
                description_vi: s.description_vi,
                description_zh: s.description_zh
            };
        });

        res.json({
            success: true,
            data: settingsMap
        });

    } catch (error) {
        console.error('Get system settings error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi lấy cấu hình hệ thống / 获取系统配置错误',
            error: error.message
        });
    }
});

module.exports = router;
