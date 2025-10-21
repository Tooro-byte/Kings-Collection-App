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

// ============================================================================
// ORDER ROUTES
// ============================================================================

/**
 * GET /api/orders/test - Test route
 */
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

    // Filter by status
    if (status && status !== "all") {
      whereClause += " AND o.status = ?";
      queryParams.push(status);
    }

    // Search by order number
    if (search) {
      whereClause += " AND o.order_number LIKE ?";
      queryParams.push(`%${search}%`);
    }

    // Get orders with item count
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

    // Get total count for pagination
    const [countResult] = await db.execute(
      `SELECT COUNT(DISTINCT o.id) as total
       FROM orders o
       WHERE ${whereClause}`,
      queryParams
    );

    const totalOrders = countResult[0].total;

    // Get order items for each order
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
            images: item.images ? JSON.parse(item.images) : [],
            total: item.price * item.quantity,
          })),
          shippingFee: parseFloat(order.shipping),
          subtotal: parseFloat(order.subtotal),
          statusColor: getStatusColor(order.status),
          statusText: getStatusText(order.status),
          shippingAddress: order.shipping_address
            ? JSON.parse(order.shipping_address)
            : null,
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
 * GET /api/orders/recent - Get recent orders for user (compatible with frontend)
 */
router.get("/recent", ensureAuthenticated, ensureClient, async (req, res) => {
  try {
    const userId = req.user.id;

    const [orders] = await db.execute(
      `SELECT o.*, 
              COUNT(oi.id) as item_count
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
          `SELECT oi.* 
           FROM order_items oi 
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
          items: items,
          shippingFee: parseFloat(order.shipping),
          statusColor: getStatusColor(order.status),
          statusText: getStatusText(order.status),
        };
      })
    );

    // Return in format compatible with frontend
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
 * GET /api/orders/:orderId - Get specific order details
 */
router.get("/:orderId", ensureAuthenticated, ensureClient, async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.id;

    // Get order details
    const [orders] = await db.execute(
      `SELECT o.*, 
              COUNT(oi.id) as item_count,
              SUM(oi.quantity * oi.price) as calculated_total
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

    // Get order items with product details
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
        images: item.images ? JSON.parse(item.images) : [],
        total: item.price * item.quantity,
      })),
      statusColor: getStatusColor(order.status),
      statusText: getStatusText(order.status),
      shippingAddress: order.shipping_address
        ? JSON.parse(order.shipping_address)
        : null,
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

/**
 * POST /api/orders - Create new order from cart
 */
router.post("/", ensureAuthenticated, ensureClient, async (req, res) => {
  console.log("📦 ORDER CREATION STARTED");

  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    const userId = req.user.id;
    const { paymentMethod, shippingAddress, customerNotes } = req.body;

    console.log("User ID:", userId, "Payment Method:", paymentMethod);

    // Get cart from carts table
    const [carts] = await connection.execute(
      `SELECT * FROM carts WHERE userId = ?`,
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
    // Parse the JSON items from the cart
    const cartItems =
      typeof cart.items === "string" ? JSON.parse(cart.items) : cart.items;

    console.log("Cart items found:", cartItems.length);

    if (cartItems.length === 0) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Cart is empty",
      });
    }

    // Validate all products still exist and have stock
    for (const item of cartItems) {
      const [products] = await connection.execute(
        `SELECT id, title, price, images, stock_id FROM products WHERE id = ?`,
        [item.productId]
      );

      if (products.length === 0) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: `Product "${item.title}" is no longer available`,
        });
      }

      const product = products[0];
      if (product.stock_id < item.quantity) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for "${item.title}". Available: ${product.stock_id}, Requested: ${item.quantity}`,
        });
      }
    }

    // Calculate totals from cart items
    const subtotal = cartItems.reduce((total, item) => {
      return total + parseFloat(item.price) * parseInt(item.quantity || 1);
    }, 0);
    const shipping = subtotal > 0 ? 10000 : 0;
    const total = subtotal + shipping;

    console.log(
      "Totals - Subtotal:",
      subtotal,
      "Shipping:",
      shipping,
      "Total:",
      total
    );

    // Generate order number
    const orderNumber = generateOrderId();

    // Create order
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
        JSON.stringify(
          shippingAddress || {
            name: "Customer Name",
            phone: "Customer Phone",
            address: "Shipping Address",
            city: "",
            country: "Uganda",
          }
        ),
        customerNotes || "Payment completed via " + paymentMethod,
      ]
    );

    const orderId = orderResult.insertId;
    console.log("✅ Order created with ID:", orderId);

    // Create order items and update product stock
    for (const item of cartItems) {
      const [products] = await connection.execute(
        `SELECT title, price, images, stock_id FROM products WHERE id = ?`,
        [item.productId]
      );

      const product = products[0];
      const productName = product?.title || item.title;
      const productPrice = product?.price || item.price;
      const imageUrl =
        item.image || (product?.images ? JSON.parse(product.images)[0] : null);

      console.log(
        `Creating order item for product: ${productName}, Price: ${productPrice}`
      );

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

      console.log(
        `✅ Order item created and stock updated for product ${item.productId}`
      );
    }

    console.log("✅ All order items created and stock updated");

    // Clear cart by updating the cart items to empty array
    await connection.execute(
      `UPDATE carts SET items = '[]', totalProducts = 0, totalPrice = 0 WHERE userId = ?`,
      [userId]
    );
    console.log("✅ Cart cleared");

    await connection.commit();

    // Get complete order details for response
    const [newOrder] = await connection.execute(
      `SELECT o.*, 
              COUNT(oi.id) as item_count
       FROM orders o
       LEFT JOIN order_items oi ON o.id = oi.order_id
       WHERE o.id = ?
       GROUP BY o.id`,
      [orderId]
    );

    const [orderItems] = await connection.execute(
      `SELECT oi.* 
       FROM order_items oi 
       WHERE oi.order_id = ?`,
      [orderId]
    );

    const completeOrder = {
      _id: orderId,
      id: orderId,
      orderId: orderNumber,
      totalPrice: total,
      status: "pending",
      paymentMethod: paymentMethod,
      orderDate: new Date().toISOString(),
      items: orderItems,
      shippingFee: shipping,
      subtotal: subtotal,
    };

    console.log("🎉 ORDER CREATION COMPLETED SUCCESSFULLY!");

    res.status(201).json({
      success: true,
      message: "Order created successfully!",
      order: completeOrder,
    });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error("❌ Order creation failed:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create order: " + error.message,
    });
  } finally {
    if (connection) connection.release();
  }
});

/**
 * PUT /api/orders/:orderId/status - Update order status (Admin/SalesAgent only)
 */
router.put("/:orderId/status", ensureAuthenticated, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, paymentStatus } = req.body;
    const userId = req.user.id;

    // Check if user has permission (admin or sales agent)
    if (req.user.role !== "admin" && req.user.role !== "salesAgent") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin or Sales Agent privileges required.",
      });
    }

    const validStatuses = [
      "pending",
      "confirmed",
      "shipped",
      "delivered",
      "cancelled",
    ];
    const validPaymentStatuses = ["pending", "completed", "failed", "refunded"];

    const updateFields = [];
    const updateValues = [];

    if (status && validStatuses.includes(status)) {
      updateFields.push("status = ?");
      updateValues.push(status);
    }

    if (paymentStatus && validPaymentStatuses.includes(paymentStatus)) {
      updateFields.push("payment_status = ?");
      updateValues.push(paymentStatus);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid fields to update",
      });
    }

    updateValues.push(orderId);

    const [result] = await db.execute(
      `UPDATE orders SET ${updateFields.join(
        ", "
      )}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      updateValues
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Get updated order
    const [updatedOrders] = await db.execute(
      "SELECT * FROM orders WHERE id = ?",
      [orderId]
    );

    res.json({
      success: true,
      message: "Order status updated successfully",
      order: updatedOrders[0],
    });
  } catch (error) {
    console.error("Error updating order status:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update order status",
    });
  }
});

/**
 * PUT /api/orders/:orderId/cancel - Cancel order
 */
router.put(
  "/:orderId/cancel",
  ensureAuthenticated,
  ensureClient,
  async (req, res) => {
    let connection;
    try {
      connection = await db.getConnection();
      await connection.beginTransaction();

      const { orderId } = req.params;
      const userId = req.user.id;

      // Get order details
      const [orders] = await connection.execute(
        "SELECT * FROM orders WHERE id = ? AND user_id = ?",
        [orderId, userId]
      );

      if (orders.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: "Order not found",
        });
      }

      const order = orders[0];

      // Only allow cancellation for pending or confirmed orders
      if (!["pending", "confirmed"].includes(order.status)) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: "Order cannot be cancelled at this stage",
        });
      }

      // Update order status
      await connection.execute(
        'UPDATE orders SET status = "cancelled", updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [orderId]
      );

      // Restore product stock
      const [orderItems] = await connection.execute(
        "SELECT product_id, quantity FROM order_items WHERE order_id = ?",
        [orderId]
      );

      for (const item of orderItems) {
        await connection.execute(
          "UPDATE products SET stock_id = stock_id + ? WHERE id = ?",
          [item.quantity, item.product_id]
        );
      }

      await connection.commit();

      // Get updated order
      const [updatedOrders] = await db.execute(
        "SELECT * FROM orders WHERE id = ?",
        [orderId]
      );

      res.json({
        success: true,
        message: "Order cancelled successfully",
        order: updatedOrders[0],
      });
    } catch (error) {
      if (connection) await connection.rollback();
      console.error("Error cancelling order:", error);
      res.status(500).json({
        success: false,
        message: "Failed to cancel order",
      });
    } finally {
      if (connection) connection.release();
    }
  }
);

/**
 * GET /api/orders/stats/overview - Get order statistics for user
 */
router.get(
  "/stats/overview",
  ensureAuthenticated,
  ensureClient,
  async (req, res) => {
    try {
      const userId = req.user.id;

      const [stats] = await db.execute(
        `
      SELECT 
        COUNT(*) as totalOrders,
        SUM(total) as totalSpent,
        AVG(total) as averageOrderValue,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pendingOrders,
        SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmedOrders,
        SUM(CASE WHEN status = 'shipped' THEN 1 ELSE 0 END) as shippedOrders,
        SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as deliveredOrders,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelledOrders
      FROM orders
      WHERE user_id = ?
    `,
        [userId]
      );

      res.json({
        success: true,
        stats: stats[0],
      });
    } catch (error) {
      console.error("Error fetching order stats:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch order statistics",
      });
    }
  }
);

/**
 * GET /api/orders/admin/overview - Get order statistics for admin
 */
router.get(
  "/admin/overview",
  ensureAuthenticated,
  ensureAdmin,
  async (req, res) => {
    try {
      const [stats] = await db.execute(`
      SELECT 
        COUNT(*) as totalOrders,
        SUM(total) as totalRevenue,
        AVG(total) as averageOrderValue,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pendingOrders,
        SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmedOrders,
        SUM(CASE WHEN status = 'shipped' THEN 1 ELSE 0 END) as shippedOrders,
        SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as deliveredOrders,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelledOrders,
        COUNT(DISTINCT user_id) as totalCustomers
      FROM orders
    `);

      // Get recent orders for admin
      const [recentOrders] = await db.execute(`
      SELECT o.*, u.name as customer_name, u.email as customer_email
      FROM orders o
      JOIN users u ON o.user_id = u.id
      ORDER BY o.created_at DESC
      LIMIT 10
    `);

      res.json({
        success: true,
        stats: stats[0],
        recentOrders: recentOrders,
      });
    } catch (error) {
      console.error("Error fetching admin order stats:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch admin order statistics",
      });
    }
  }
);

module.exports = router;
