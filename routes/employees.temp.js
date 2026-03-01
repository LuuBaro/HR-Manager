
/**
 * @route   DELETE /api/employees/:id
 * @desc    Delete employee
 * @access  Private (employee.delete)
 */
router.delete('/:id',
    AuthMiddleware.checkPermission('employee', 'delete'),
    async (req, res) => {
    try {
        const employeeId = req.params.id;

        // Check if employee exists
        const [existing] = await db.query('SELECT id, full_name FROM employees WHERE id = ?', [employeeId]);
        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy nhân viên / 未找到员工'
            });
        }

        // Optional: Check for payroll records to prevent deleting history
        const [payrolls] = await db.query('SELECT id FROM payroll_records WHERE employee_id = ?', [employeeId]);
        if (payrolls.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Không thể xóa nhân viên đã có lịch sử lương. Vui lòng chuyển trạng thái sang "Nghỉ việc".'
            });
        }

        await db.query('DELETE FROM employees WHERE id = ?', [employeeId]);

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
            message: 'Đã xóa nhân viên thành công'
        });

    } catch (error) {
        console.error('Delete employee error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi xóa nhân viên',
            error: error.message
        });
    }
});
