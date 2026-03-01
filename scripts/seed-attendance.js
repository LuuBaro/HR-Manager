const mysql = require('mysql2/promise');
require('dotenv').config();

async function seedAttendance() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || '127.0.0.1',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'hr_payroll_system'
    });

    try {
        console.log('🌱 Seeding dummy attendance for February 2026...');
        
        const [employees] = await connection.query('SELECT id FROM employees');
        
        const records = [];
        // Seed for Feb 1 to Feb 22, 2026
        for (const emp of employees) {
            for (let day = 1; day <= 22; day++) {
                const date = `2026-02-${day.toString().padStart(2, '0')}`;
                const dayOfWeek = new Date(date).getDay();
                
                if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Skip weekends
                    records.push([
                        emp.id,
                        date,
                        '2026-02-22 08:00:00',
                        '2026-02-22 17:00:00',
                        8.0,
                        'present'
                    ]);
                }
            }
        }

        if (records.length > 0) {
            await connection.query(
                'INSERT IGNORE INTO attendance_records (employee_id, attendance_date, check_in_time, check_out_time, work_hours, status) VALUES ?',
                [records]
            );
            console.log(`✅ Inserted ${records.length} attendance records.`);
        }

    } catch (err) {
        console.error('❌ Error seeding attendance:', err);
    } finally {
        await connection.end();
    }
}

seedAttendance();
