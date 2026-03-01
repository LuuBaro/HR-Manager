const express = require('express');
const db = require('../config/database');
const AuthMiddleware = require('../middleware/auth');
const moment = require('moment');

const router = express.Router();

// All routes require authentication
router.use(AuthMiddleware.verifyToken);

/**
 * @route   GET /api/audit
 * @desc    Get audit logs with filters
 * @access  Private
 */
router.get('/', async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 20, 
            search = '', 
            action = '', 
            module = '',
            start_date = '',
            end_date = ''
        } = req.query;

        const offset = (page - 1) * limit;

        let whereConditions = [];
        let queryParams = [];

        if (search) {
            whereConditions.push('(u.full_name LIKE ? OR al.details LIKE ?)');
            const searchPattern = `%${search}%`;
            queryParams.push(searchPattern, searchPattern);
        }

        if (action) {
            whereConditions.push('al.action = ?');
            queryParams.push(action);
        }

        if (module) {
            whereConditions.push('al.module = ?');
            queryParams.push(module);
        }

        if (start_date && end_date) {
            whereConditions.push('al.created_at BETWEEN ? AND ?');
            queryParams.push(start_date, end_date);
        }

        const whereClause = whereConditions.length > 0 
            ? 'WHERE ' + whereConditions.join(' AND ') 
            : '';

        // Get total count
        const [countResult] = await db.query(
            `SELECT COUNT(*) as total FROM audit_logs al 
             LEFT JOIN users u ON al.user_id = u.id 
             ${whereClause}`,
            queryParams
        );
        const total = countResult[0].total;

        // Get logs
        const [logs] = await db.query(
            `SELECT al.*, u.full_name, u.email, r.role_name
             FROM audit_logs al
             LEFT JOIN users u ON al.user_id = u.id
             LEFT JOIN roles r ON u.role_id = r.id
             ${whereClause}
             ORDER BY al.created_at DESC
             LIMIT ? OFFSET ?`,
            [...queryParams, parseInt(limit), parseInt(offset)]
        );

        res.json({
            success: true,
            data: {
                logs,
                pagination: {
                    current_page: parseInt(page),
                    total_items: total,
                    total_pages: Math.ceil(total / limit)
                }
            }
        });

    } catch (error) {
        console.error('Get audit logs error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi lấy nhật ký hệ thống / 获取系统日志错误',
            error: error.message
        });
    }
});

module.exports = router;
