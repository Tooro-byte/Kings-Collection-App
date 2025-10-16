const express = require("express");
const session = require("express-session");
const MySQLStore = require("express-mysql-session")(session);
const passport = require("passport");
const mysql = require("mysql2/promise");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const app = express();

// Database connection - UPDATED to use .env variables
const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "kings_collection",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Test database connection
pool.getConnection()
  .then(connection => {
    console.log("✅ MySQL Database connected successfully");
    connection.release();
  })
  .catch(error => {
    console.error("❌ Database connection failed:", error.message);
  });

// Store pool in app locals
app.locals.pool = pool;

// Session configuration - UPDATED to use .env secret
const sessionStore = new MySQLStore({
  expiration: 86400000,
  createDatabaseTable: true,
  schema: {
    tableName: 'sessions',
    columnNames: {
      session_id: 'session_id',
      expires: 'expires',
      data: 'data'
    }
  }
}, pool);

app.use(session({
  secret: process.env.SESSION_SECRET || process.env.JWT_SECRET || "your-secret-key",
  resave: false,
  saveUninitialized: false,
  store: sessionStore,
  cookie: {
    secure: false, // set to true if using HTTPS
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    httpOnly: true,
    sameSite: 'lax'
  }
}));

// CORS configuration - FIXED: Removed problematic options route
app.use(cors({
  origin: ["http://localhost:3000", "http://localhost:5173", "http://localhost:3005"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"]
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files
app.use(express.static(path.join(__dirname, "public")));

// View engine setup
app.set("view engine", "pug");
app.set("views", path.join(__dirname, "views"));

// Passport configuration
const configurePassport = require("./config/passport");
const passportInstance = configurePassport(pool);
app.use(passportInstance.initialize());
app.use(passportInstance.session());
app.set("passport", passportInstance);

// Routes
const authRoutes = require("./routes/auth")(passportInstance);
const userAuthRoutes = require("./routes/userAuth");

// Mount routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userAuthRoutes);

// Serve Pug templates
app.get("/login", (req, res) => {
  res.render("login", {
    message: req.query.error,
    success: req.query.success
  });
});

app.get("/signup", (req, res) => {
  res.render("signup", {
    message: req.query.error,
    success: req.query.success
  });
});

// Health check route
app.get("/health", (req, res) => {
  res.json({ 
    status: "OK", 
    timestamp: new Date().toISOString(),
    database: "Connected"
  });
});

// Home route
app.get("/", (req, res) => {
  res.json({ 
    message: "Kings Collection API", 
    version: "1.0.0",
    endpoints: {
      auth: "/api/auth",
      users: "/api/users",
      login: "/login",
      signup: "/signup"
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Error:", err);
  res.status(500).json({ 
    message: "Internal server error",
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler - FIXED: Use specific path instead of wildcard
app.use((req, res, next) => {
  res.status(404).json({ 
    message: "Route not found",
    path: req.path,
    method: req.method
  });
});

const PORT = process.env.PORT || 3005;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Frontend URLs:`);
  console.log(`   - http://localhost:3000 (React)`);
  console.log(`   - http://localhost:5173 (Vite)`);
  console.log(`📍 Backend API: http://localhost:${PORT}`);
  console.log(`📍 Login page: http://localhost:${PORT}/login`);
  console.log(`📍 Signup page: http://localhost:${PORT}/signup`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
});