require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

async function initDatabase() {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║     DATABASE INITIALIZATION / 数据库初始化                   ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('');

    try {
        // Connect without database first
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 3306,
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            multipleStatements: true
        });

        console.log('✅ Connected to MySQL server');

        // Read and execute schema
        console.log('📄 Reading schema.sql...');
        const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');

        console.log('🔨 Creating database and tables...');
        await connection.query(schema);
        console.log('✅ Database schema created successfully');

        // Read and execute seed data
        console.log('📄 Reading seed.sql...');
        const seedPath = path.join(__dirname, '..', 'database', 'seed.sql');
        let seedData = fs.readFileSync(seedPath, 'utf8');

        // Generate proper password hashes for seed data
        console.log('🔐 Generating password hashes...');
        const passwordHash = await bcrypt.hash('123456', 10);
        
        // Replace placeholder password hashes with real ones
        seedData = seedData.replace(/\$2a\$10\$rKZvVEhqZ8YqKqKqKqKqKOqKqKqKqKqKqKqKqKqKqKqKqKqKq/g, passwordHash);

        console.log('🌱 Seeding initial data...');
        await connection.query(seedData);
        console.log('✅ Seed data inserted successfully');

        await connection.end();

        console.log('');
        console.log('╔════════════════════════════════════════════════════════════╗');
        console.log('║              DATABASE READY / 数据库已准备就绪                ║');
        console.log('╚════════════════════════════════════════════════════════════╝');
        console.log('');
        console.log('📊 Database: hr_payroll_system');
        console.log('👥 Default Users (Password: 123456):');
        console.log('   • boss@company.com (Boss / 老板)');
        console.log('   • admin@company.com (Admin / 管理员)');
        console.log('   • hr.manager@company.com (HR Manager / 人事经理)');
        console.log('   • payroll@company.com (Payroll Specialist / 薪资管理员)');
        console.log('');
        console.log('✨ You can now start the server with: npm start');
        console.log('');

    } catch (error) {
        console.error('❌ Database initialization failed:');
        console.error('Error:', error.message);
        console.error('');
        console.error('Full error details:');
        console.error(error);
        console.error('');
        console.error('💡 Common solutions:');
        console.error('   1. Make sure MySQL is running');
        console.error('   2. Check DB_USER and DB_PASSWORD in .env file');
        console.error('   3. Verify MySQL user has CREATE DATABASE permission');
        console.error('');
        process.exit(1);
    }
}

// Run initialization
initDatabase();
