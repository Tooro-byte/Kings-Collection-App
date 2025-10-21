const express = require("express");
const session = require("express-session");
const MySQLStore = require("express-mysql-session")(session);
const passport = require("passport");
const mysql = require("mysql2/promise");
const cors = require("cors");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");
const fs = require("fs");
require("dotenv").config();

// Import configurations
const databaseConfig = require("./config/database");
const configurePassport = require("./config/passport");

// Import middleware
const {
  ensureAuthenticated,
  ensureAdmin,
} = require("./AuthMiddleWare/checkRole");

// Import route handlers
const authRoutes = require("./routes/auth");
const userAuthRoutes = require("./routes/userAuth");
const updateProductRoutes = require("./routes/updateProductRoutes");
const productRoutes = require("./routes/productRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const ordersRoute = require("./routes/ordersRoutes");

// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Store app-wide dependencies
app.set("io", io);

// ============================================================================
// DATABASE CONFIGURATION
// ============================================================================

// MySQL connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "Kings-Commerce",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Sequelize connection
const sequelize = databaseConfig;

// Import models with associations
const {
  Product,
  Category,
  User,
  Cart,
  Order,
} = require("./models/associations");

// Initialize database connection
const initializeDatabase = async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ MySQL Database connected successfully with Sequelize");

    await sequelize.sync({ force: false });
    console.log("✅ Database tables synchronized");
  } catch (error) {
    console.error("❌ Database connection failed:", error.message);
    process.exit(1);
  }
};

// Store database connections in app locals
app.locals.sequelize = sequelize;
app.locals.pool = pool;

// ============================================================================
// MIDDLEWARE SETUP
// ============================================================================

// Session store configuration
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

// Core middleware
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

// View engine setup
app.set("view engine", "pug");
app.set("views", path.join(__dirname, "views"));

// Passport configuration
const passportInstance = configurePassport(sequelize);
app.use(passportInstance.initialize());
app.use(passportInstance.session());
app.set("passport", passportInstance);

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const formatTimeAgo = (date) => {
  const now = new Date();
  const diffInSeconds = Math.floor((now - new Date(date)) / 1000);

  if (diffInSeconds < 60) return "Just now";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} min ago`;
  if (diffInSeconds < 86400)
    return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  return `${Math.floor(diffInSeconds / 86400)} days ago`;
};

// ============================================================================
// CART ROUTES - COMPLETE IMPLEMENTATION
// ============================================================================

/**
 * GET /api/cart - Get user's cart
 */
app.get("/api/cart", ensureAuthenticated, async (req, res) => {
  try {
    let cart = await Cart.findOne({
      where: { userId: req.user.id },
    });

    if (!cart) {
      // Create a new cart if it doesn't exist
      cart = await Cart.create({
        userId: req.user.id,
        items: [],
        totalProducts: 0,
        totalPrice: 0,
      });
    }

    // Populate product details for each item
    const populatedItems = await Promise.all(
      cart.items.map(async (item) => {
        const product = await Product.findByPk(item.productId);
        return {
          ...item,
          product: product
            ? {
                _id: product.id,
                title: product.title,
                price: parseFloat(product.price),
                images: product.images || [],
                description: product.description,
                size: product.size || [],
                category_id: product.category_id,
              }
            : null,
        };
      })
    );

    res.json({
      success: true,
      items: populatedItems,
      totalProducts: cart.totalProducts,
      totalPrice: parseFloat(cart.totalPrice),
    });
  } catch (error) {
    console.error("Error fetching cart:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching cart",
      error: error.message,
    });
  }
});

/**
 * POST /api/cart - Add item to cart
 */
app.post("/api/cart", ensureAuthenticated, async (req, res) => {
  try {
    const { productId, quantity = 1, size = null } = req.body;

    // Validate input
    if (!productId) {
      return res.status(400).json({
        success: false,
        message: "Product ID is required",
      });
    }

    // Get the product
    const product = await Product.findByPk(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    let cart = await Cart.findOne({
      where: { userId: req.user.id },
    });

    // Create cart if it doesn't exist
    if (!cart) {
      cart = await Cart.create({
        userId: req.user.id,
        items: [],
        totalProducts: 0,
        totalPrice: 0,
      });
    }

    // Check if item already exists in cart
    const existingItemIndex = cart.items.findIndex(
      (item) => item.productId === productId && item.size === size
    );

    let updatedItems;
    if (existingItemIndex > -1) {
      // Update existing item quantity
      updatedItems = [...cart.items];
      updatedItems[existingItemIndex].quantity += quantity;
    } else {
      // Add new item
      const newItem = {
        productId,
        quantity,
        size,
        title: product.title,
        price: parseFloat(product.price),
        image:
          product.images && product.images.length > 0
            ? product.images[0]
            : null,
        addedAt: new Date().toISOString(),
      };
      updatedItems = [...cart.items, newItem];
    }

    // Calculate totals
    const totalProducts = updatedItems.reduce(
      (sum, item) => sum + item.quantity,
      0
    );
    const totalPrice = updatedItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    // Update cart
    await cart.update({
      items: updatedItems,
      totalProducts,
      totalPrice,
    });

    res.json({
      success: true,
      message: "Product added to cart successfully",
      cart: {
        items: updatedItems,
        totalProducts,
        totalPrice: parseFloat(totalPrice),
      },
    });
  } catch (error) {
    console.error("Error adding to cart:", error);
    res.status(500).json({
      success: false,
      message: "Error adding product to cart",
      error: error.message,
    });
  }
});

/**
 * PUT /api/cart/item/:itemId - Update cart item quantity
 */
app.put("/api/cart/item/:itemId", ensureAuthenticated, async (req, res) => {
  try {
    const { itemId } = req.params;
    const { quantity } = req.body;

    if (!quantity || quantity < 1) {
      return res.status(400).json({
        success: false,
        message: "Valid quantity is required",
      });
    }

    const cart = await Cart.findOne({
      where: { userId: req.user.id },
    });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Cart not found",
      });
    }

    const itemIndex = cart.items.findIndex((item) => item.addedAt === itemId);

    if (itemIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Item not found in cart",
      });
    }

    const updatedItems = [...cart.items];
    updatedItems[itemIndex].quantity = quantity;

    // Calculate totals
    const totalProducts = updatedItems.reduce(
      (sum, item) => sum + item.quantity,
      0
    );
    const totalPrice = updatedItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    await cart.update({
      items: updatedItems,
      totalProducts,
      totalPrice,
    });

    res.json({
      success: true,
      message: "Cart updated successfully",
      cart: {
        items: updatedItems,
        totalProducts,
        totalPrice: parseFloat(totalPrice),
      },
    });
  } catch (error) {
    console.error("Error updating cart item:", error);
    res.status(500).json({
      success: false,
      message: "Error updating cart item",
      error: error.message,
    });
  }
});

/**
 * DELETE /api/cart/item/:itemId - Remove item from cart
 */
app.delete("/api/cart/item/:itemId", ensureAuthenticated, async (req, res) => {
  try {
    const { itemId } = req.params;

    const cart = await Cart.findOne({
      where: { userId: req.user.id },
    });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Cart not found",
      });
    }

    const updatedItems = cart.items.filter((item) => item.addedAt !== itemId);

    // Calculate totals
    const totalProducts = updatedItems.reduce(
      (sum, item) => sum + item.quantity,
      0
    );
    const totalPrice = updatedItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    await cart.update({
      items: updatedItems,
      totalProducts,
      totalPrice,
    });

    res.json({
      success: true,
      message: "Item removed from cart",
      cart: {
        items: updatedItems,
        totalProducts,
        totalPrice: parseFloat(totalPrice),
      },
    });
  } catch (error) {
    console.error("Error removing cart item:", error);
    res.status(500).json({
      success: false,
      message: "Error removing item from cart",
      error: error.message,
    });
  }
});

/**
 * DELETE /api/cart/clear - Clear entire cart
 */
app.delete("/api/cart/clear", ensureAuthenticated, async (req, res) => {
  try {
    const cart = await Cart.findOne({
      where: { userId: req.user.id },
    });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Cart not found",
      });
    }

    await cart.update({
      items: [],
      totalProducts: 0,
      totalPrice: 0,
    });

    res.json({
      success: true,
      message: "Cart cleared successfully",
      cart: {
        items: [],
        totalProducts: 0,
        totalPrice: 0,
      },
    });
  } catch (error) {
    console.error("Error clearing cart:", error);
    res.status(500).json({
      success: false,
      message: "Error clearing cart",
      error: error.message,
    });
  }
});

/**
 * GET /api/cart/count - Get cart item count
 */
app.get("/api/cart/count", ensureAuthenticated, async (req, res) => {
  try {
    const cart = await Cart.findOne({
      where: { userId: req.user.id },
    });

    if (!cart) {
      return res.json({
        success: true,
        totalProducts: 0,
        count: 0,
      });
    }

    res.json({
      success: true,
      totalProducts: cart.totalProducts,
      count: cart.totalProducts,
    });
  } catch (error) {
    console.error("Error fetching cart count:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching cart count",
      error: error.message,
    });
  }
});

// ============================================================================
// ORDER ROUTES - REMOVED DUPLICATES (Using external ordersRoute)
// ============================================================================

// REMOVED: All the duplicate order routes that were causing validation errors
// The ordersRoute.js file will handle all /api/orders requests

// ============================================================================
// API ROUTES
// ============================================================================

// Health check endpoint
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
    res.status(500).json({
      status: "ERROR",
      database: "Disconnected",
      error: error.message,
    });
  }
});

// Base route
app.get("/", (req, res) => {
  res.json({
    message: "Kings Collection API",
    version: "2.0.0",
    orm: "Sequelize",
  });
});

// ============================================================================
// USER ROUTES
// ============================================================================

/**
 * GET /api/users/me - Get current user data
 */
app.get("/api/users/me", ensureAuthenticated, async (req, res) => {
  try {
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
      mailingAddress: user.mailingAddress,
      newsletter: user.newsletter,
      isActive: user.isActive,
      createdAt: user.createdAt,
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error fetching user data",
      error: error.message,
    });
  }
});

/**
 * POST /api/users/verify-token - Verify JWT token
 */
app.post("/api/users/verify-token", ensureAuthenticated, async (req, res) => {
  try {
    res.json({
      valid: true,
      user: {
        id: req.user.id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
      },
    });
  } catch (error) {
    res.status(500).json({
      valid: false,
      message: "Token verification failed",
      error: error.message,
    });
  }
});

// ============================================================================
// DASHBOARD ROUTES
// ============================================================================

/**
 * GET /api/dashboard - Client dashboard data
 */
app.get("/api/dashboard", ensureAuthenticated, async (req, res) => {
  try {
    const [orderCount, recentOrders, messageCount, totalSpent, cart] =
      await Promise.all([
        Order.count({ where: { userId: req.user.id } }),
        Order.findAll({
          where: { userId: req.user.id },
          limit: 5,
          order: [["createdAt", "DESC"]],
        }),
        0, // Message count placeholder
        Order.sum("totalAmount", {
          where: { userId: req.user.id, status: ["delivered", "shipped"] },
        }),
        Cart.findOne({ where: { userId: req.user.id } }),
      ]);

    res.json({
      orderCount: orderCount || 0,
      messageCount: messageCount || 0,
      cartCount: cart ? cart.totalProducts : 0,
      wishlistCount: 0,
      loyaltyPoints: Math.floor((totalSpent || 0) / 10),
      totalSaved: Math.floor((totalSpent || 0) * 0.05),
      wishlistOnSale: 0,
      recentOrders: recentOrders.map((order) => ({
        id: order.id,
        orderId: order.orderId,
        totalPrice: parseFloat(order.totalAmount),
        status: order.status,
        orderDate: order.createdAt,
      })),
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error fetching dashboard data",
      error: error.message,
    });
  }
});

// ============================================================================
// PRODUCT ROUTES
// ============================================================================

/**
 * GET /api/products/recommended - Get recommended products
 */
app.get("/api/products/recommended", ensureAuthenticated, async (req, res) => {
  try {
    const products = await Product.findAll({
      limit: 4,
      order: sequelize.random(),
      include: [
        {
          model: Category,
          as: "category",
          attributes: ["id", "name", "image"],
        },
      ],
    });

    const formattedProducts = products.map((product) => ({
      _id: product.id,
      title: product.title,
      price: parseFloat(product.price),
      image:
        product.images && product.images.length > 0 ? product.images[0] : null,
      description: product.description,
    }));

    res.json(formattedProducts);
  } catch (error) {
    console.error("Error fetching recommended products:", error);
    res.json([]);
  }
});

/**
 * GET /api/products/search - Search products
 */
app.get("/api/products/search", ensureAuthenticated, async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.length < 2) {
      return res.json([]);
    }

    const products = await Product.findAll({
      where: {
        [sequelize.Op.or]: [
          { title: { [sequelize.Op.like]: `%${q}%` } },
          { description: { [sequelize.Op.like]: `%${q}%` } },
        ],
      },
      limit: 10,
      include: [
        {
          model: Category,
          as: "category",
          attributes: ["id", "name", "image"],
        },
      ],
    });

    const formattedProducts = products.map((product) => ({
      _id: product.id,
      title: product.title,
      price: parseFloat(product.price),
      image:
        product.images && product.images.length > 0 ? product.images[0] : null,
    }));

    res.json(formattedProducts);
  } catch (error) {
    console.error("Error searching products:", error);
    res.json([]);
  }
});

// ============================================================================
// ADMIN ROUTES
// ============================================================================

/**
 * GET /api/admin/dashboard - Admin dashboard summary data
 */
app.get(
  "/api/admin/dashboard",
  ensureAuthenticated,
  ensureAdmin,
  async (req, res) => {
    try {
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

      const [
        totalRevenue,
        pendingOrders,
        newCustomers,
        totalProducts,
        activeCustomers,
        recentOrders,
        recentActivities,
        lowStockResult,
      ] = await Promise.all([
        Order.sum("totalAmount", {
          where: {
            status: ["delivered", "shipped"],
            createdAt: {
              [sequelize.Op.between]: [currentMonthStart, currentMonthEnd],
            },
          },
        }),
        Order.count({ where: { status: "pending" } }),
        User.count({
          where: {
            role: "client",
            createdAt: {
              [sequelize.Op.between]: [currentMonthStart, currentMonthEnd],
            },
          },
        }),
        Product.count(),
        User.count({ where: { role: "client", isActive: true } }),
        Order.findAll({
          limit: 5,
          order: [["createdAt", "DESC"]],
          include: [{ model: User, attributes: ["name", "email"] }],
        }),
        User.findAll({
          where: { role: "client" },
          limit: 5,
          order: [["createdAt", "DESC"]],
          attributes: ["name", "email", "createdAt"],
        }),
        Product.count({ where: { stock_id: { [sequelize.Op.lte]: 10 } } }),
      ]);

      const orderActivities = recentOrders.map((order) => ({
        id: `order-${order.id}`,
        action: `New order from ${order.User.name}`,
        time: formatTimeAgo(order.createdAt),
        type: "order",
        amount: order.totalAmount,
      }));

      const userActivities = recentActivities.map((user) => ({
        id: `user-${user.id}`,
        action: `New customer registered: ${user.name}`,
        time: formatTimeAgo(user.createdAt),
        type: "customer",
      }));

      const allActivities = [...orderActivities, ...userActivities]
        .sort((a, b) => new Date(b.time) - new Date(a.time))
        .slice(0, 5);

      res.json({
        metrics: {
          totalRevenue: totalRevenue || 0,
          pendingOrders: pendingOrders || 0,
          newCustomers: newCustomers || 0,
          lowStockItems: lowStockResult || 0,
          totalProducts: totalProducts || 0,
          activeCustomers: activeCustomers || 0,
        },
        recentActivities: allActivities,
      });
    } catch (error) {
      res.status(500).json({
        message: "Server error fetching dashboard data",
        error: error.message,
      });
    }
  }
);

// ============================================================================
// VIEW ROUTES
// ============================================================================

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

// ============================================================================
// EXTERNAL ROUTE MOUNTING
// ============================================================================

app.use("/api/auth", authRoutes(passportInstance));
app.use("/api/users", userAuthRoutes);
app.use("/api", updateProductRoutes);
app.use("/api/products", productRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/orders", ordersRoute); // This handles ALL order routes

// ============================================================================
// ERROR HANDLERS
// ============================================================================

// 404 Not Found Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
    path: req.path,
    method: req.method,
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("Global error handler:", err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: "Internal server error",
    error: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

// ============================================================================
// SERVER INITIALIZATION
// ============================================================================

const startServer = async () => {
  try {
    await initializeDatabase();

    const PORT = process.env.PORT || 3005;
    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || "development"}`);
      console.log(`🛒 Cart system: ACTIVE`);
      console.log(`📦 Order system: ACTIVE (Using Raw MySQL)`);
      console.log(`👤 User system: ACTIVE`);
      console.log(`🛍️  Product system: ACTIVE`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
};

// Start the server
startServer();