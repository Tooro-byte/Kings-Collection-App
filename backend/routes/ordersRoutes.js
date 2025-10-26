const express = require("express");
const db = require("../config/mysql-raw");
const {
  ensureAuthenticated,
  ensureClient,
  ensureAdmin,
  ensureSalesAgent,
} = require("../AuthMiddleWare/checkRole");

const router = express.Router();

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const formatPrice = (price) => {
  return parseFloat(price).toLocaleString("en-UG");
};

const generateOrderId = () => {
  const timestamp = Date.now().toString();
  const random = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0");
  return `ORD-${timestamp}-${random}`;
};

const getStatusColor = (status) => {
  const statusColors = {
    pending: "bg-yellow-500",
    confirmed: "bg-blue-500",
    shipped: "bg-indigo-500",
    delivered: "bg-green-500",
    cancelled: "bg-red-500",
  };
  return statusColors[status] || "bg-gray-500";
};

const getStatusText = (status) => {
  const statusTexts = {
    pending: "Pending Confirmation",
    confirmed: "Order Confirmed",
    shipped: "Shipped",
    delivered: "Delivered",
    cancelled: "Cancelled",
  };
  return statusTexts[status] || status;
};

// Helper function to safely parse JSON
const safeJsonParse = (str, defaultValue = []) => {
  try {
    if (typeof str === "string") {
      return JSON.parse(str);
    }
    return str || defaultValue;
  } catch (error) {
    console.error("JSON parse error:", error);
    return defaultValue;
  }
};

// ============================================================================
// ORDER ROUTES
// ============================================================================

router.get("/test", async (req, res) => {
  try {
    const [results] = await db.execute(
      "SELECT NOW() as current_time, 1 + 1 AS result"
    );
    res.json({
      success: true,
      message: "Orders API is working!",
      database: "Connected",
      currentTime: results[0].current_time,
      testResult: results[0].result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Test failed: " + error.message,
    });
  }
});

/**
 * GET /api/orders - Get all orders for authenticated user with pagination
 */
router.get("/", ensureAuthenticated, ensureClient, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, search } = req.query;
    const userId = req.user.id;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let whereClause = "o.user_id = ?";
    const queryParams = [userId];

    if (status && status !== "all") {
      whereClause += " AND o.status = ?";
      queryParams.push(status);
    }

    if (search) {
      whereClause += " AND o.order_number LIKE ?";
      queryParams.push(`%${search}%`);
    }

    const [orders] = await db.execute(
      `SELECT o.*, 
              COUNT(oi.id) as item_count,
              SUM(oi.quantity * oi.price) as calculated_total
       FROM orders o
       LEFT JOIN order_items oi ON o.id = oi.order_id
       WHERE ${whereClause}
       GROUP BY o.id
       ORDER BY o.created_at DESC
       LIMIT ? OFFSET ?`,
      [...queryParams, parseInt(limit), offset]
    );

    const [countResult] = await db.execute(
      `SELECT COUNT(DISTINCT o.id) as total
       FROM orders o
       WHERE ${whereClause}`,
      queryParams
    );

    const totalOrders = countResult[0].total;

    const ordersWithItems = await Promise.all(
      orders.map(async (order) => {
        const [items] = await db.execute(
          `SELECT oi.*, p.title as product_name, p.images 
           FROM order_items oi 
           LEFT JOIN products p ON oi.product_id = p.id 
           WHERE oi.order_id = ?`,
          [order.id]
        );

        return {
          _id: order.id,
          id: order.id,
          orderId: order.order_number,
          totalPrice: parseFloat(order.total),
          status: order.status,
          paymentMethod: order.payment_method,
          paymentStatus: order.payment_status,
          orderDate: order.created_at,
          updatedAt: order.updated_at,
          items: items.map((item) => ({
            ...item,
            images: safeJsonParse(item.images),
            total: parseFloat(item.price) * parseInt(item.quantity),
          })),
          shippingFee: parseFloat(order.shipping),
          subtotal: parseFloat(order.subtotal),
          statusColor: getStatusColor(order.status),
          statusText: getStatusText(order.status),
          shippingAddress: safeJsonParse(order.shipping_address),
          customerNotes: order.customer_notes,
        };
      })
    );

    res.json({
      success: true,
      orders: ordersWithItems,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalOrders / parseInt(limit)),
        totalOrders: totalOrders,
        hasNext: offset + parseInt(limit) < totalOrders,
        hasPrev: parseInt(page) > 1,
      },
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch orders",
    });
  }
});

/**
 * POST /api/orders - Create new order from cart (SUPER SIMPLIFIED)
 */
router.post("/", ensureAuthenticated, ensureClient, async (req, res) => {
  console.log("🚀 ORDER CREATION STARTED - SUPER SIMPLIFIED");
  console.log("Request body:", req.body);

  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    const userId = req.user.id;
    const { paymentMethod, customerNotes } = req.body;

    console.log("👤 User ID:", userId);
    console.log("💳 Payment Method:", paymentMethod);

    // Validate payment method
    if (!paymentMethod) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Payment method is required",
      });
    }

    // Get user details - Only name and email
    const [users] = await db.execute(
      `SELECT id, name, email FROM Users WHERE id = ?`,
      [userId]
    );

    if (users.length === 0) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "User not found",
      });
    }

    const user = users[0];
    console.log("✅ User found:", { name: user.name, email: user.email });

    // Get cart data
    const [carts] = await connection.execute(
      `SELECT id, items, totalProducts, totalPrice FROM carts WHERE userId = ?`,
      [userId]
    );

    if (!carts || carts.length === 0) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Cart is empty",
      });
    }

    const cart = carts[0];
    console.log("🛒 Cart found - Total products:", cart.totalProducts);

    // Parse cart items
    let cartItems;
    try {
      cartItems = safeJsonParse(cart.items);
      console.log(`✅ Successfully parsed ${cartItems.length} cart items`);
    } catch (parseError) {
      console.error("❌ Cart parse error:", parseError);
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Invalid cart data format",
        error: parseError.message,
      });
    }

    if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Cart is empty",
      });
    }

    // Validate cart items
    console.log("🔍 Validating cart items...");
    const validationErrors = [];

    for (const [index, item] of cartItems.entries()) {
      console.log(`   Item ${index}:`, {
        productId: item.productId,
        quantity: item.quantity,
        price: item.price,
      });

      // Basic validation
      if (!item.productId) {
        validationErrors.push(`Item ${index}: Missing productId`);
        continue;
      }

      if (!item.quantity || item.quantity < 1) {
        validationErrors.push(
          `Item ${index}: Invalid quantity (${item.quantity})`
        );
        continue;
      }

      if (!item.price || item.price < 0) {
        validationErrors.push(`Item ${index}: Invalid price (${item.price})`);
        continue;
      }

      // Check product existence and stock
      try {
        const [products] = await connection.execute(
          `SELECT id, title, price, stock_id FROM products WHERE id = ?`,
          [item.productId]
        );

        if (products.length === 0) {
          validationErrors.push(
            `Item ${index}: Product ${item.productId} not found`
          );
          continue;
        }

        const product = products[0];
        if (product.stock_id < item.quantity) {
          validationErrors.push(
            `Item ${index}: Insufficient stock for "${product.title}" (Available: ${product.stock_id}, Requested: ${item.quantity})`
          );
        }
      } catch (dbError) {
        validationErrors.push(
          `Item ${index}: Database error checking product ${item.productId}`
        );
      }
    }

    if (validationErrors.length > 0) {
      await connection.rollback();
      console.error("❌ Validation errors:", validationErrors);
      return res.status(400).json({
        success: false,
        message: "Cart validation failed",
        errors: validationErrors,
      });
    }

    console.log("✅ All cart items validated successfully");

    // Calculate totals
    const subtotal = cartItems.reduce((total, item) => {
      return total + parseFloat(item.price) * parseInt(item.quantity);
    }, 0);

    const shipping = subtotal > 0 ? 10000 : 0;
    const total = subtotal + shipping;

    console.log(
      "💰 Totals - Subtotal:",
      subtotal,
      "Shipping:",
      shipping,
      "Total:",
      total
    );

    // Generate order number
    const orderNumber = generateOrderId();

    // SUPER SIMPLIFIED: No shipping address needed
    const shippingAddress = {
      name: user.name,
      email: user.email,
      contactMethod: "Will contact via email for address details",
    };

    console.log("📧 Contact info:", shippingAddress);

    // Create order
    console.log("📝 Creating order in database...");
    const [orderResult] = await connection.execute(
      `INSERT INTO orders (
        user_id, order_number, subtotal, shipping, total, 
        payment_method, shipping_address, customer_notes, status, payment_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'pending')`,
      [
        userId,
        orderNumber,
        subtotal,
        shipping,
        total,
        paymentMethod,
        JSON.stringify(shippingAddress),
        customerNotes ||
          `Payment via ${paymentMethod}. Customer: ${user.name} (${user.email})`,
      ]
    );

    const orderId = orderResult.insertId;
    console.log("✅ Order created with ID:", orderId);

    // Create order items and update stock
    console.log("📦 Creating order items...");
    for (const [index, item] of cartItems.entries()) {
      try {
        const [products] = await connection.execute(
          `SELECT title, price, images FROM products WHERE id = ?`,
          [item.productId]
        );

        const product = products[0];
        const productName =
          product?.title || item.title || `Product ${item.productId}`;
        const productPrice = product?.price || item.price || 0;

        let imageUrl = null;
        if (item.image) {
          imageUrl = item.image;
        } else if (product?.images) {
          const images = safeJsonParse(product.images);
          imageUrl = images && images.length > 0 ? images[0] : null;
        }

        console.log(`   Creating order item ${index + 1}: ${productName}`);

        // Insert order item
        await connection.execute(
          `INSERT INTO order_items (
            order_id, product_id, product_name, price, quantity, image
          ) VALUES (?, ?, ?, ?, ?, ?)`,
          [
            orderId,
            item.productId,
            productName,
            productPrice,
            item.quantity,
            imageUrl,
          ]
        );

        // Update product stock
        await connection.execute(
          `UPDATE products SET stock_id = stock_id - ? WHERE id = ?`,
          [item.quantity, item.productId]
        );

        console.log(`   ✅ Item ${index + 1} created and stock updated`);
      } catch (itemError) {
        console.error(`   ❌ Failed to create item ${index + 1}:`, itemError);
        throw new Error(`Failed to create order item: ${itemError.message}`);
      }
    }

    // Clear cart
    console.log("🗑️ Clearing cart...");
    await connection.execute(
      `UPDATE carts SET items = '[]', totalProducts = 0, totalPrice = 0, updatedAt = CURRENT_TIMESTAMP WHERE userId = ?`,
      [userId]
    );

    await connection.commit();
    console.log("🎉 ORDER CREATION COMPLETED SUCCESSFULLY!");

    // Return success response
    res.status(201).json({
      success: true,
      message: "Order created successfully!",
      order: {
        _id: orderId,
        id: orderId,
        orderId: orderNumber,
        totalPrice: total,
        status: "pending",
        paymentMethod: paymentMethod,
        orderDate: new Date().toISOString(),
        shippingFee: shipping,
        subtotal: subtotal,
      },
      orderId: orderNumber,
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
      console.log("🔙 Transaction rolled back");
    }

    console.error("💥 ORDER CREATION FAILED:", error);
    console.error("💥 Error details:", {
      message: error.message,
      code: error.code,
      errno: error.errno,
      sqlState: error.sqlState,
      sqlMessage: error.sqlMessage,
    });

    res.status(500).json({
      success: false,
      message: "Failed to create order: " + error.message,
      error:
        process.env.NODE_ENV === "development"
          ? {
              message: error.message,
              code: error.code,
              errno: error.errno,
              sqlState: error.sqlState,
              sqlMessage: error.sqlMessage,
            }
          : undefined,
    });
  } finally {
    if (connection) {
      connection.release();
      console.log("🔗 Database connection released");
    }
  }
});

/**
 * GET /api/orders/recent - Get recent orders
 */
router.get("/recent", ensureAuthenticated, ensureClient, async (req, res) => {
  try {
    const userId = req.user.id;

    const [orders] = await db.execute(
      `SELECT o.*, COUNT(oi.id) as item_count
       FROM orders o
       LEFT JOIN order_items oi ON o.id = oi.order_id
       WHERE o.user_id = ?
       GROUP BY o.id
       ORDER BY o.created_at DESC
       LIMIT 10`,
      [userId]
    );

    const ordersWithItems = await Promise.all(
      orders.map(async (order) => {
        const [items] = await db.execute(
          `SELECT oi.*, p.title as product_name, p.images 
           FROM order_items oi 
           LEFT JOIN products p ON oi.product_id = p.id 
           WHERE oi.order_id = ?`,
          [order.id]
        );

        return {
          _id: order.id,
          id: order.id,
          orderId: order.order_number,
          totalPrice: parseFloat(order.total),
          status: order.status,
          paymentMethod: order.payment_method,
          paymentStatus: order.payment_status,
          orderDate: order.created_at,
          items: items.map((item) => ({
            ...item,
            images: safeJsonParse(item.images),
            total: parseFloat(item.price) * parseInt(item.quantity),
          })),
          shippingFee: parseFloat(order.shipping),
          statusColor: getStatusColor(order.status),
          statusText: getStatusText(order.status),
        };
      })
    );

    res.json(ordersWithItems);
  } catch (error) {
    console.error("Error fetching recent orders:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch recent orders",
    });
  }
});

/**
 * GET /api/orders/:orderId - Get specific order
 */
router.get("/:orderId", ensureAuthenticated, ensureClient, async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.id;

    const [orders] = await db.execute(
      `SELECT o.*, COUNT(oi.id) as item_count
       FROM orders o
       LEFT JOIN order_items oi ON o.id = oi.order_id
       WHERE o.id = ? AND o.user_id = ?
       GROUP BY o.id`,
      [orderId, userId]
    );

    if (orders.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    const order = orders[0];
    const [items] = await db.execute(
      `SELECT oi.*, p.title as product_name, p.description, p.images 
       FROM order_items oi 
       LEFT JOIN products p ON oi.product_id = p.id 
       WHERE oi.order_id = ?`,
      [orderId]
    );

    const orderWithItems = {
      _id: order.id,
      id: order.id,
      orderId: order.order_number,
      totalPrice: parseFloat(order.total),
      status: order.status,
      paymentMethod: order.payment_method,
      paymentStatus: order.payment_status,
      orderDate: order.created_at,
      updatedAt: order.updated_at,
      items: items.map((item) => ({
        ...item,
        images: safeJsonParse(item.images),
        total: parseFloat(item.price) * parseInt(item.quantity),
      })),
      statusColor: getStatusColor(order.status),
      statusText: getStatusText(order.status),
      shippingAddress: safeJsonParse(order.shipping_address),
      customerNotes: order.customer_notes,
      shippingFee: parseFloat(order.shipping),
      subtotal: parseFloat(order.subtotal),
    };

    res.json({
      success: true,
      order: orderWithItems,
    });
  } catch (error) {
    console.error("Error fetching order:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch order",
    });
  }
});

// Include other routes (status update, cancel, stats, admin, clear) as needed...

module.exports = router;
