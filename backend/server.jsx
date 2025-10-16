// server.js
require("dotenv").config();

const express = require("express");
const mysql = require("mysql2/promise");
const cors = require("cors");
const helmet = require("helmet");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();
const PORT = process.env.PORT || 3005;

// >>>>>>> MySQL Database Connection <<<<<<
const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "Bougainvillea112",
  database: process.env.DB_NAME || "Kings-Commerce",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Test database connection
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log("✅ MySQL connection successful - Kings-Commerce");
    connection.release();
  } catch (error) {
    console.error("❌ MySQL connection failed:", error.message);
    process.exit(1);
  }
}
testConnection();

// >>>>>>>>> Middleware <<<<<<<
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(
  cors({
    origin: ["http://localhost:3000", "http://localhost:5173"],
    credentials: true,
  })
);
app.use(helmet());

// Make pool available to routes
app.locals.pool = pool;

// >>>>>>> API Routes for E-Commerce <<<<<<<<<
// Authentication routes
// app.use("/api/auth", require("./routes/auth"));
// app.use("/api/users", require("./routes/users"));

// // Product routes
// app.use("/api/products", require("./routes/products"));
// app.use("/api/categories", require("./routes/categories"));

// // Order & Cart routes
// app.use("/api/orders", require("./routes/orders"));
// app.use("/api/cart", require("./routes/cart"));

// // Admin routes
// app.use("/api/admin", require("./routes/admin"));

// >>>>>>> Basic Routes <<<<<<<<<
app.get("/", (req, res) => {
  res.json({
    message: "Kings Collections E-Commerce API",
    version: "1.0.0",
    database: "Kings-Commerce",
  });
});

app.get("/api/health", async (req, res) => {
  try {
    const [rows] = await pool.execute("SELECT 1 + 1 AS result");
    res.json({
      status: "healthy",
      database: "Kings-Commerce connected",
      result: rows[0].result,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// >>>>>>> Error Handling <<<<<<<<
app.use((req, res) => {
  res.status(404).json({ error: "API endpoint not found" });
});

app.listen(PORT, () => {
  console.log(`🏪 Kings Collections E-Commerce API`);
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Database: Kings-Commerce`);
});
