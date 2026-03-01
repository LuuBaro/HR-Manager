const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('../config/database');

class AuthMiddleware {
    // Verify JWT token
    static async verifyToken(req, res, next) {
        try {
            const token = req.headers.authorization?.replace('Bearer ', '');
            
            if (!token) {
                return res.status(401).json({
                    success: false,
                    message: 'Không tìm thấy token xác thực / 未找到认证令牌',
                    message_vi: 'Không tìm thấy token xác thực',
                    message_zh: '未找到认证令牌'
                });
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            
            // Get user from database
            const [users] = await db.query(
                `SELECT u.*, r.role_name, r.role_name_vi, r.role_name_zh 
                 FROM users u 
                 JOIN roles r ON u.role_id = r.id 
                 WHERE u.id = ? AND u.is_active = TRUE`,
                [decoded.userId]
            );

            if (users.length === 0) {
                return res.status(401).json({
                    success: false,
                    message: 'Người dùng không tồn tại hoặc đã bị vô hiệu hóa / 用户不存在或已被禁用'
                });
            }

            req.user = users[0];
            next();
        } catch (error) {
            console.error('JWT Verification Error:', error.message);
            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({
                    success: false,
                    message: 'Token đã hết hạn / 令牌已过期',
                    expired: true
                });
            }
            
            return res.status(401).json({
                success: false,
                message: 'Token không hợp lệ / 令牌无效'
            });
        }
    }

    // Check if user has required permission
    static checkPermission(resource, action) {
        return async (req, res, next) => {
            try {
                const userId = req.user.id;
                const roleId = req.user.role_id;

                // Admin has all permissions for configuration
                if (req.user.role_name === 'admin') {
                    return next();
                }

                // Check permission
                const [permissions] = await db.query(
                    `SELECT p.* FROM permissions p
                     JOIN role_permissions rp ON p.id = rp.permission_id
                     WHERE rp.role_id = ? 
                     AND p.resource = ? 
                     AND p.action = ?`,
                    [roleId, resource, action]
                );

                if (permissions.length === 0) {
                    return res.status(403).json({
                        success: false,
                        message: 'Bạn không có quyền thực hiện hành động này / 您没有权限执行此操作',
                        message_vi: 'Bạn không có quyền thực hiện hành động này',
                        message_zh: '您没有权限执行此操作',
                        required_permission: `${resource}.${action}`
                    });
                }

                next();
            } catch (error) {
                console.error('Permission check error:', error);
                return res.status(500).json({
                    success: false,
                    message: 'Lỗi kiểm tra quyền / 权限检查错误'
                });
            }
        };
    }

    // Check if user has any of the required roles
    static checkRole(...allowedRoles) {
        return (req, res, next) => {
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    message: 'Chưa xác thực / 未认证'
                });
            }

            if (allowedRoles.includes(req.user.role_name)) {
                return next();
            }

            return res.status(403).json({
                success: false,
                message: 'Bạn không có quyền truy cập / 您没有访问权限',
                required_roles: allowedRoles
            });
        };
    }

    // Log audit trail
    static async logAudit(userId, action, resource, resourceId, oldValue, newValue, req) {
        try {
            await db.query(
                `INSERT INTO audit_logs 
                (user_id, action, resource, resource_id, old_value, new_value, ip_address, user_agent) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    userId,
                    action,
                    resource,
                    resourceId,
                    oldValue ? JSON.stringify(oldValue) : null,
                    newValue ? JSON.stringify(newValue) : null,
                    req.ip || req.connection.remoteAddress,
                    req.headers['user-agent']
                ]
            );
        } catch (error) {
            console.error('Audit log error:', error);
        }
    }
}

module.exports = AuthMiddleware;
