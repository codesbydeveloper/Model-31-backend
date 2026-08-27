require("dotenv").config();
const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
});

async function connectDatabase() {
  const connection = await pool.getConnection();
  try {
    await connection.ping();
    console.log("Database connected successfully");
  } finally {
    connection.release();
  }
}

pool.connectDatabase = connectDatabase;

module.exports = pool;
