const express = require("express");
const session = require("express-session");
const MySQLStore = require("express-mysql-session")(session);
const passport = require("passport");
const mysql = require("mysql2/promise");
const cors = require("cors");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const app = express();
const server = http.createServer(app);
const io = new Server(server);
app.set("io", io);

// --- Database Configuration ---
const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "Kings-Commerce",
});

const sequelize = require("./config/database");

sequelize
  .authenticate()
  .then(() => {
    console.log("✅ MySQL Database connected successfully with Sequelize");
  })
  .catch((error) => {
    console.error("❌ Database connection failed:", error.message);
  });

app.locals.sequelize = sequelize;
app.locals.pool = pool;

// --- Session Store Configuration ---
const sessionStore = new MySQLStore(
  {
    expiration: 86400000,
    createDatabaseTable: true,
    schema: {
      tableName: "sessions",
      columnNames: {
        session_id: "session_id",
        expires: "expires",
        data: "data",
      },
    },
  },
  pool
);

// --- Middleware Setup ---
app.use(
  session({
    secret:
      process.env.SESSION_SECRET || process.env.JWT_SECRET || "your-secret-key",
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000,
      httpOnly: true,
      sameSite: "lax",
    },
  })
);

app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://localhost:5173",
      "http://localhost:3005",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.use(express.static(path.join(__dirname, "public")));

app.set("view engine", "pug");
app.set("views", path.join(__dirname, "views"));

// --- Passport Setup ---
const configurePassport = require("./config/passport");
const passportInstance = configurePassport(sequelize);
app.use(passportInstance.initialize());
app.use(passportInstance.session());
app.set("passport", passportInstance);

// --- Sequelize Models Definition ---
const { DataTypes, Sequelize } = require("sequelize");

const Product = require("./models/productSchema");
const Category = require("./models/categoryModel");
const User = require("./models/userModel")(sequelize);

const Order = sequelize.define("Order", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  items: { type: DataTypes.JSON, allowNull: false },
  total: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  paymentMethod: { type: DataTypes.STRING, allowNull: false },
  amountReceived: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  userId: { type: DataTypes.INTEGER, allowNull: false },
  status: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: "pending",
    validate: {
      isIn: [
        [
          "pending",
          "processing",
          "approved",
          "shipped",
          "delivered",
          "cancelled",
          "rejected",
        ],
      ],
    },
  },
  orderDate: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  orderId: { type: DataTypes.STRING, allowNull: true },
});

const Message = sequelize.define("Message", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  title: { type: DataTypes.STRING, allowNull: false },
  content: { type: DataTypes.TEXT, allowNull: false },
  type: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: "general",
    validate: {
      isIn: [["general", "order", "promotion", "support"]],
    },
  },
  isUnread: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  timeAgo: { type: DataTypes.STRING, allowNull: false },
  userId: { type: DataTypes.INTEGER, allowNull: false },
});

// --- Database Sync ---
sequelize
  .sync({ force: false })
  .then(() => {
    console.log("✅ Database tables synchronized");
  })
  .catch((error) => {
    console.error("❌ Database sync failed:", error);
  });

// --- Authentication Middleware ---
const ensureAuthenticated = (req, res, next) => {
  console.log("ensureAuthenticated: isAuthenticated:", req.isAuthenticated());
  console.log("ensureAuthenticated: User ID:", req.user?.id);
  if (req.isAuthenticated() && req.user) {
    return next();
  }
  console.log("ensureAuthenticated: Authentication failed");
  res.status(401).json({ message: "Unauthorized. Please log in." });
};

const ensureAdmin = (req, res, next) => {
  if (req.isAuthenticated() && req.user && req.user.role === "admin") {
    return next();
  }
  res
    .status(403)
    .json({ message: "Access denied. Admin privileges required." });
};

// --- Helper Functions ---
function formatTimeAgo(date) {
  const now = new Date();
  const diffInSeconds = Math.floor((now - new Date(date)) / 1000);

  if (diffInSeconds < 60) return "Just now";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} min ago`;
  if (diffInSeconds < 86400)
    return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  return `${Math.floor(diffInSeconds / 86400)} days ago`;
}

// --- Admin Routes ---

/**
 * GET /api/admin/dashboard - Admin dashboard summary data
 */
app.get(
  "/api/admin/dashboard",
  ensureAuthenticated,
  ensureAdmin,
  async (req, res) => {
    try {
      console.log(
        "GET /api/admin/dashboard: Fetching for admin ID:",
        req.user.id
      );

      // Get current month start and end dates
      const currentMonthStart = new Date(
        new Date().getFullYear(),
        new Date().getMonth(),
        1
      );
      const currentMonthEnd = new Date(
        new Date().getFullYear(),
        new Date().getMonth() + 1,
        0
      );

      // Get dashboard metrics using Promise.all for efficiency
      const [
        totalRevenue,
        pendingOrders,
        newCustomers,
        totalProducts,
        activeCustomers,
        recentOrders,
        recentActivities,
      ] = await Promise.all([
        // Total revenue for current month
        Order.sum("total", {
          where: {
            status: ["delivered", "shipped"],
            orderDate: {
              [Sequelize.Op.between]: [currentMonthStart, currentMonthEnd],
            },
          },
        }),
        // Pending orders count
        Order.count({ where: { status: "pending" } }),
        // New customers this month
        User.count({
          where: {
            role: "client",
            createdAt: {
              [Sequelize.Op.between]: [currentMonthStart, currentMonthEnd],
            },
          },
        }),
        // Total products
        // Adjust based on your product model - using raw query for now
        pool
          .execute(
            "SELECT COUNT(*) as count FROM products WHERE isActive = true"
          )
          .then(([rows]) => rows[0].count),
        // Active customers
        User.count({ where: { role: "client", isActive: true } }),
        // Recent orders for activities
        Order.findAll({
          limit: 5,
          order: [["createdAt", "DESC"]],
          include: [
            {
              model: User,
              attributes: ["name", "email"],
            },
          ],
        }),
        // Recent user registrations for activities
        User.findAll({
          where: { role: "client" },
          limit: 5,
          order: [["createdAt", "DESC"]],
          attributes: ["name", "email", "createdAt"],
        }),
      ]);

      // Format activities from both orders and new users
      const orderActivities = recentOrders.map((order) => ({
        id: `order-${order.id}`,
        action: `New order from ${order.User.name}`,
        time: formatTimeAgo(order.createdAt),
        type: "order",
        amount: order.total,
      }));

      const userActivities = recentActivities.map((user) => ({
        id: `user-${user.id}`,
        action: `New customer registered: ${user.name}`,
        time: formatTimeAgo(user.createdAt),
        type: "customer",
      }));

      // Combine and sort activities by time
      const allActivities = [...orderActivities, ...userActivities]
        .sort((a, b) => new Date(b.time) - new Date(a.time))
        .slice(0, 5);

      // Calculate low stock items (assuming threshold of 10)
      const [lowStockResult] = await pool.execute(
        "SELECT COUNT(*) as count FROM products WHERE stockQuantity <= 10 AND isActive = true"
      );
      const lowStockItems = lowStockResult[0].count;

      res.json({
        metrics: {
          totalRevenue: totalRevenue || 0,
          pendingOrders: pendingOrders || 0,
          newCustomers: newCustomers || 0,
          lowStockItems: lowStockItems || 0,
          totalProducts: totalProducts || 0,
          activeCustomers: activeCustomers || 0,
        },
        recentActivities: allActivities,
      });
    } catch (error) {
      console.error("GET /api/admin/dashboard: Error:", error);
      res.status(500).json({
        message: "Server error fetching dashboard data",
        error: error.message,
      });
    }
  }
);

/**
 * GET /api/admin/orders - Get all orders with pagination
 */
app.get(
  "/api/admin/orders",
  ensureAuthenticated,
  ensureAdmin,
  async (req, res) => {
    try {
      const { page = 1, limit = 10, status } = req.query;
      const offset = (page - 1) * limit;

      const whereClause = status ? { status } : {};

      const { count, rows: orders } = await Order.findAndCountAll({
        where: whereClause,
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [["createdAt", "DESC"]],
        include: [
          {
            model: User,
            attributes: ["id", "name", "email"],
          },
        ],
      });

      const formattedOrders = orders.map((order) => ({
        id: order.id,
        orderId: order.orderId || `ORD-${order.id.toString().padStart(6, "0")}`,
        customer: {
          id: order.User.id,
          name: order.User.name,
          email: order.User.email,
        },
        items: order.items,
        total: parseFloat(order.total),
        status: order.status,
        paymentMethod: order.paymentMethod,
        orderDate: order.orderDate,
        createdAt: order.createdAt,
      }));

      res.json({
        orders: formattedOrders,
        totalCount: count,
        totalPages: Math.ceil(count / limit),
        currentPage: parseInt(page),
      });
    } catch (error) {
      console.error("GET /api/admin/orders: Error:", error);
      res.status(500).json({
        message: "Server error fetching orders",
        error: error.message,
      });
    }
  }
);

/**
 * PATCH /api/admin/orders/:id/status - Update order status
 */
app.patch(
  "/api/admin/orders/:id/status",
  ensureAuthenticated,
  ensureAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (
        ![
          "pending",
          "processing",
          "approved",
          "shipped",
          "delivered",
          "cancelled",
          "rejected",
        ].includes(status)
      ) {
        return res.status(400).json({ message: "Invalid status" });
      }

      const order = await Order.findByPk(id);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      await order.update({ status });

      // Emit socket event for real-time updates
      if (app.get("io")) {
        app.get("io").emit("orderUpdated", {
          id: order.id,
          status: order.status,
          updatedAt: order.updatedAt,
        });
      }

      res.json({
        message: `Order status updated to ${status}`,
        order: {
          id: order.id,
          status: order.status,
        },
      });
    } catch (error) {
      console.error("PATCH /api/admin/orders/:id/status: Error:", error);
      res.status(500).json({
        message: "Server error updating order status",
        error: error.message,
      });
    }
  }
);

/**
 * GET /api/admin/customers - Get all customers with pagination
 */
app.get(
  "/api/admin/customers",
  ensureAuthenticated,
  ensureAdmin,
  async (req, res) => {
    try {
      const { page = 1, limit = 10, search } = req.query;
      const offset = (page - 1) * limit;

      let whereClause = { role: "client" };
      if (search) {
        whereClause = {
          ...whereClause,
          [Sequelize.Op.or]: [
            { name: { [Sequelize.Op.like]: `%${search}%` } },
            { email: { [Sequelize.Op.like]: `%${search}%` } },
          ],
        };
      }

      const { count, rows: customers } = await User.findAndCountAll({
        where: whereClause,
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [["createdAt", "DESC"]],
        attributes: { exclude: ["password"] },
      });

      // Get order counts for each customer
      const customersWithStats = await Promise.all(
        customers.map(async (customer) => {
          const orderCount = await Order.count({
            where: { userId: customer.id },
          });
          const totalSpent = await Order.sum("total", {
            where: {
              userId: customer.id,
              status: ["delivered", "shipped"],
            },
          });

          return {
            id: customer.id,
            name: customer.name,
            email: customer.email,
            avatar: customer.avatar,
            isActive: customer.isActive,
            createdAt: customer.createdAt,
            lastLogin: customer.lastLogin,
            stats: {
              orderCount: orderCount || 0,
              totalSpent: totalSpent || 0,
            },
          };
        })
      );

      res.json({
        customers: customersWithStats,
        totalCount: count,
        totalPages: Math.ceil(count / limit),
        currentPage: parseInt(page),
      });
    } catch (error) {
      console.error("GET /api/admin/customers: Error:", error);
      res.status(500).json({
        message: "Server error fetching customers",
        error: error.message,
      });
    }
  }
);

/**
 * GET /api/admin/user - Get admin user data
 */
app.get(
  "/api/admin/user",
  ensureAuthenticated,
  ensureAdmin,
  async (req, res) => {
    try {
      console.log("GET /api/admin/user: Fetching for user ID:", req.user.id);

      const user = await User.findByPk(req.user.id, {
        attributes: { exclude: ["password"] },
      });

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({
        id: user.id,
        name: user.name,
        email: user.email,
        avatar:
          user.avatar ||
          "https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=100",
        role: user.role,
      });
    } catch (error) {
      console.error("GET /api/admin/user: Error:", error);
      res.status(500).json({
        message: "Server error fetching user data",
        error: error.message,
      });
    }
  }
);

// --- Existing Routes (Keep all your existing routes below) ---

/**
 * POST /api/users/signup/email - User registration
 */
app.post("/api/users/signup/email", async (req, res) => {
  const { name, email, password, role, mailingAddress, newsletter } = req.body;
  console.log("POST /api/users/signup/email: Received data:", {
    name,
    email,
    role,
    mailingAddress,
    newsletter,
  });

  try {
    // Validate inputs
    if (!name || name.trim().length < 2) {
      return res
        .status(400)
        .json({ message: "Name must be at least 2 characters" });
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: "Invalid email address" });
    }
    if (!password || password.length < 8) {
      return res
        .status(400)
        .json({ message: "Password must be at least 8 characters" });
    }
    if (!role || !["client", "admin", "salesAgent"].includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }
    if (role === "client" && (!mailingAddress || !mailingAddress.trim())) {
      return res
        .status(400)
        .json({ message: "Mailing address is required for clients" });
    }

    // Check if email already exists
    const existingUser = await User.findOne({
      where: { email: email.toLowerCase() },
    });
    if (existingUser) {
      return res
        .status(400)
        .json({ message: "This email is already registered" });
    }

    // Create user
    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase(),
      password, // Will be hashed by beforeSave hook
      role,
      mailingAddress: role === "client" ? mailingAddress.trim() : null,
      newsletter: !!newsletter,
      isActive: true,
    });

    console.log("POST /api/users/signup/email: User created, ID:", user.id);

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "1d" }
    );

    // Log the user in
    req.login(user, (err) => {
      if (err) {
        console.error("POST /api/users/signup/email: Login error:", err);
        return res
          .status(500)
          .json({ message: "Error logging in after signup" });
      }

      const redirectUrl =
        role === "client"
          ? `/client?token=${token}`
          : role === "salesAgent"
          ? `/sales?token=${token}`
          : `/admin?token=${token}`;

      return res.json({
        message: "Account created successfully",
        redirectUrl,
        user: { id: user.id, email: user.email, role: user.role },
        token,
      });
    });
  } catch (error) {
    console.error("POST /api/users/signup/email: Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// ... (Keep all your other existing routes exactly as they were)

// --- API Route Mounting ---
const authRoutes = require("./routes/auth")(passportInstance);
const userAuthRoutes = require("./routes/userAuth");
const updateProductRoutes = require("./routes/updateProductRoutes");
const productRoutes = require("./routes/productRoutes");
const categoryRoutes = require("./routes/categoryRoutes");

app.use("/api/auth", authRoutes);
app.use("/api/users", userAuthRoutes);
app.use("/api", updateProductRoutes);
app.use("/api/products", productRoutes);
app.use("/api/categories", categoryRoutes);

// --- View Routes ---
app.get("/login", (req, res) => {
  res.render("login", {
    message: req.query.error,
    success: req.query.success,
  });
});

app.get("/signup", (req, res) => {
  res.render("signup", {
    message: req.query.error,
    success: req.query.success,
  });
});

/**
 * GET /health - Server and DB health check
 */
app.get("/health", async (req, res) => {
  try {
    await sequelize.authenticate();
    res.json({
      status: "OK",
      timestamp: new Date().toISOString(),
      database: "Connected",
      orm: "Sequelize",
    });
  } catch (error) {
    console.error("GET /health: Error:", error);
    res.status(500).json({
      status: "ERROR",
      database: "Disconnected",
      error: error.message,
    });
  }
});

/**
 * GET / - Base Route
 */
app.get("/", (req, res) => {
  res.json({
    message: "Kings Collection API",
    version: "2.0.0",
    orm: "Sequelize",
  });
});

// --- Error Handlers ---

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("Global error handler:", err.stack);
  res.status(err.status || 500).json({
    message: "Internal server error",
    error: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

// 404 Not Found Handler
app.use((req, res, next) => {
  console.log("404 handler: Path:", req.path, "Method:", req.method);
  res.status(404).json({
    message: "Route not found",
    path: req.path,
    method: req.method,
  });
});

// --- Start Server ---
const PORT = process.env.PORT || 3005;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
