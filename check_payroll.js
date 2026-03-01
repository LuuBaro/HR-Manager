
const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkPeriods() {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        const [rows] = await connection.execute('SELECT id, status, period_month, period_year FROM payroll_periods ORDER BY id DESC LIMIT 5');
        console.log('Current Periods:', rows);
        await connection.end();
    } catch (error) {
        console.error('Error checking periods:', error);
    }
}

checkPeriods();
