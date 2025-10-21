const mysql = require("mysql2/promise"); // ← Use promise version!

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "Kings-Commerce",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// With mysql2/promise, we don't need the wrapper - it's already promise-based
const db = pool;

// Test connection
db.getConnection()
  .then((connection) => {
    console.log("✅ Raw MySQL connection established (Promise version)");
    connection.release();
  })
  .catch((err) => {
    console.error("❌ Raw MySQL connection failed:", err.message);
  });

module.exports = db;
