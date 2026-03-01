const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const AuthMiddleware = require('../middleware/auth');

const router = express.Router();

/**
 * @route   POST /api/auth/login
 * @desc    User login
 * @access  Public
 */
router.post('/login', [
    body('email').isEmail().withMessage('Email không hợp lệ / 邮箱无效'),
    body('password').notEmpty().withMessage('Mật khẩu không được để trống / 密码不能为空')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const { email, password } = req.body;

        // Check if email is in whitelist
        const [whitelist] = await db.query(
            'SELECT * FROM email_whitelist WHERE email = ? AND is_active = TRUE',
            [email]
        );

        if (whitelist.length === 0) {
            return res.status(403).json({
                success: false,
                message: 'Email không có trong danh sách cho phép / 邮箱不在白名单中',
                message_vi: 'Email không có trong danh sách cho phép. Vui lòng liên hệ quản trị viên.',
                message_zh: '邮箱不在白名单中。请联系管理员。'
            });
        }

        // Get user
        const [users] = await db.query(
            `SELECT u.*, r.role_name, r.role_name_vi, r.role_name_zh 
             FROM users u 
             JOIN roles r ON u.role_id = r.id 
             WHERE u.email = ? AND u.is_active = TRUE`,
            [email]
        );

        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Email hoặc mật khẩu không đúng / 邮箱或密码错误',
                message_vi: 'Email hoặc mật khẩu không đúng',
                message_zh: '邮箱或密码错误'
            });
        }

        const user = users[0];

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                message: 'Email hoặc mật khẩu không đúng / 邮箱或密码错误'
            });
        }

        // Generate JWT token
        const token = jwt.sign(
            { 
                userId: user.id,
                email: user.email,
                role: user.role_name
            },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRE || '24h' }
        );

        // Update last login
        await db.query(
            'UPDATE users SET last_login = NOW() WHERE id = ?',
            [user.id]
        );

        // Create session
        const tokenHash = await bcrypt.hash(token, 5);
        await db.query(
            `INSERT INTO user_sessions (user_id, token_hash, ip_address, user_agent, expires_at) 
             VALUES (?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 24 HOUR))`,
            [
                user.id,
                tokenHash,
                req.ip || req.connection.remoteAddress,
                req.headers['user-agent']
            ]
        );

        // Log audit
        await AuthMiddleware.logAudit(user.id, 'LOGIN', 'auth', user.id, null, { email }, req);

        // Remove sensitive data
        delete user.password_hash;

        res.json({
            success: true,
            message: 'Đăng nhập thành công / 登录成功',
            data: {
                token,
                user: {
                    id: user.id,
                    email: user.email,
                    full_name: user.full_name,
                    full_name_zh: user.full_name_zh,
                    role: user.role_name,
                    role_vi: user.role_name_vi,
                    role_zh: user.role_name_zh
                }
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi đăng nhập / 登录错误',
            error: error.message
        });
    }
});

/**
 * @route   POST /api/auth/logout
 * @desc    User logout
 * @access  Private
 */
router.post('/logout', AuthMiddleware.verifyToken, async (req, res) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        const tokenHash = await bcrypt.hash(token, 5);

        // Delete session
        await db.query(
            'DELETE FROM user_sessions WHERE user_id = ? AND token_hash = ?',
            [req.user.id, tokenHash]
        );

        // Log audit
        await AuthMiddleware.logAudit(req.user.id, 'LOGOUT', 'auth', req.user.id, null, null, req);

        res.json({
            success: true,
            message: 'Đăng xuất thành công / 登出成功'
        });

    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi đăng xuất / 登出错误'
        });
    }
});

/**
 * @route   GET /api/auth/me
 * @desc    Get current user info
 * @access  Private
 */
router.get('/me', AuthMiddleware.verifyToken, async (req, res) => {
    try {
        const [users] = await db.query(
            `SELECT u.id, u.email, u.full_name, u.full_name_zh, u.last_login, u.role_id,
                    r.role_name, r.role_name_vi, r.role_name_zh,
                    e.employee_code, e.avatar_url, e.phone,
                    d.department_name, d.department_name_zh,
                    p.position_name, p.position_name_zh
             FROM users u
             JOIN roles r ON u.role_id = r.id
             LEFT JOIN employees e ON u.id = e.user_id
             LEFT JOIN departments d ON e.department_id = d.id
             LEFT JOIN positions p ON e.position_id = p.id
             WHERE u.id = ?`,
            [req.user.id]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Người dùng không tồn tại / 用户不存在'
            });
        }

        const user = users[0];

        // Get permissions
        let permissions = [];
        if (user.role_name === 'admin') {
            const [all] = await db.query('SELECT permission_name FROM permissions');
            permissions = all.map(p => p.permission_name);
        } else {
            const [perms] = await db.query(
                `SELECT p.permission_name FROM permissions p
                 JOIN role_permissions rp ON p.id = rp.permission_id
                 WHERE rp.role_id = ?`,
                [user.role_id]
            );
            permissions = perms.map(p => p.permission_name);
        }

        res.json({
            success: true,
            data: {
                ...user,
                permissions
            }
        });

    } catch (error) {
        console.error('Get user info error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi lấy thông tin người dùng / 获取用户信息错误'
        });
    }
});

/**
 * @route   GET /api/auth/permissions
 * @desc    Get current user permissions
 * @access  Private
 */
router.get('/permissions', AuthMiddleware.verifyToken, async (req, res) => {
    try {
        // Admin has all permissions
        if (req.user.role_name === 'admin') {
            const [allPermissions] = await db.query('SELECT * FROM permissions');
            return res.json({
                success: true,
                data: allPermissions
            });
        }

        const [permissions] = await db.query(
            `SELECT p.* FROM permissions p
             JOIN role_permissions rp ON p.id = rp.permission_id
             WHERE rp.role_id = ?`,
            [req.user.role_id]
        );

        res.json({
            success: true,
            data: permissions
        });

    } catch (error) {
        console.error('Get permissions error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi lấy danh sách quyền / 获取权限列表错误'
        });
    }
});

/**
 * @route   GET /api/auth/sessions
 * @desc    Get all active sessions for current user (or all if admin)
 * @access  Private
 */
router.get('/sessions', AuthMiddleware.verifyToken, async (req, res) => {
    try {
        let query = `SELECT us.*, u.full_name, u.email 
                     FROM user_sessions us 
                     JOIN users u ON us.user_id = u.id`;
        let params = [];

        if (req.user.role !== 'boss' && req.user.role !== 'admin') {
            query += ' WHERE us.user_id = ?';
            params.push(req.user.userId);
        }

        const [sessions] = await db.query(query, params);

        res.json({
            success: true,
            data: sessions
        });
    } catch (error) {
        console.error('Get sessions error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

/**
 * @route   DELETE /api/auth/sessions/:id
 * @desc    Logout specific session
 * @access  Private
 */
router.delete('/sessions/:id', AuthMiddleware.verifyToken, async (req, res) => {
    try {
        const sessionId = req.params.id;
        
        // Check if admin or owner
        const [session] = await db.query('SELECT user_id FROM user_sessions WHERE id = ?', [sessionId]);
        if (session.length === 0) {
            return res.status(404).json({ success: false, message: 'Session not found' });
        }

        if (req.user.role !== 'boss' && req.user.role !== 'admin' && session[0].user_id !== req.user.userId) {
            return res.status(403).json({ success: false, message: 'Forbidden' });
        }

        await db.query('DELETE FROM user_sessions WHERE id = ?', [sessionId]);

        res.json({
            success: true,
            message: 'Session terminated'
        });
    } catch (error) {
        console.error('Delete session error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

/**
 * @route   GET /api/auth/whitelist
 * @desc    Get email whitelist
 * @access  Private (boss/admin only)
 */
router.get('/whitelist', AuthMiddleware.verifyToken, async (req, res) => {
    if (req.user.role !== 'boss' && req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    const [whitelist] = await db.query('SELECT * FROM email_whitelist ORDER BY created_at DESC');
    res.json({ success: true, data: whitelist });
});

/**
 * @route   GET /api/auth/roles
 * @desc    Get all roles
 * @access  Private
 */
router.get('/roles', AuthMiddleware.verifyToken, async (req, res) => {
    try {
        const [roles] = await db.query('SELECT * FROM roles');
        res.json({ success: true, data: roles });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

/**
 * @route   GET /api/auth/roles/:id/permissions
 * @desc    Get permissions for a role
 * @access  Private
 */
router.get('/roles/:id/permissions', AuthMiddleware.verifyToken, async (req, res) => {
    try {
        const [permissions] = await db.query(
            `SELECT p.* FROM permissions p 
             JOIN role_permissions rp ON p.id = rp.permission_id 
             WHERE rp.role_id = ?`,
            [req.params.id]
        );
        res.json({ success: true, data: permissions });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

/**
 * @route   POST /api/auth/roles/:id/permissions
 * @desc    Update permissions for a role
 * @access  Private (boss/admin only)
 */
router.post('/roles/:id/permissions', AuthMiddleware.verifyToken, async (req, res) => {
    if (req.user.role !== 'boss' && req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    
    const connection = await db.getConnection();
    await connection.beginTransaction();
    
    try {
        const roleId = req.params.id;
        const { permissions } = req.body; // Array of permission IDs

        // Clear existing
        await connection.query('DELETE FROM role_permissions WHERE role_id = ?', [roleId]);

        // Add new
        if (permissions && permissions.length > 0) {
            const values = permissions.map(pId => [roleId, pId]);
            await connection.query('INSERT INTO role_permissions (role_id, permission_id) VALUES ?', [values]);
        }

        await connection.commit();
        res.json({ success: true, message: 'Permissions updated' });
    } catch (error) {
        await connection.rollback();
        res.status(500).json({ success: false, message: 'Server error' });
    } finally {
        connection.release();
    }
});

module.exports = router;
