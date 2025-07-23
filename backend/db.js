const mysql = require('mysql2');
require('dotenv').config();


  console.log("user: ",process.env.DB_USER)
  console.log("password: ",process.env.DB_PASS)


const db = mysql.createConnection({
  host: process.env.HOST || '127.0.0.1',
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: 'lab_inventory'
});

db.connect(err => {
  if (err) {
    console.error('❌ MySQL connection failed:', err.message);
    process.exit(1);
  }
  console.log('✅ Connected to MySQL database.');
});

module.exports = db;