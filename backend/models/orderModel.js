const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Order = sequelize.define(
    "Order",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "user_id", // Explicitly map to database column
        references: {
          model: "Users",
          key: "id",
        },
      },
      order_number: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        field: "order_number",
      },
      subtotal: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
      shipping: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
      total: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM(
          "pending",
          "confirmed",
          "shipped",
          "delivered",
          "cancelled"
        ),
        allowNull: false,
        defaultValue: "pending",
      },
      payment_method: {
        type: DataTypes.ENUM("bank", "mobile", "paypal"),
        allowNull: false,
        field: "payment_method",
      },
      payment_status: {
        type: DataTypes.ENUM("pending", "completed", "failed", "refunded"),
        allowNull: false,
        defaultValue: "pending",
        field: "payment_status",
      },
      shipping_address: {
        type: DataTypes.JSON,
        allowNull: true,
        field: "shipping_address",
      },
      customer_notes: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: "customer_notes",
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: "created_at",
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: "updated_at",
      },
    },
    {
      tableName: "orders",
      timestamps: true, // This will use createdAt and updatedAt by default
      createdAt: "created_at", // Map to database column
      updatedAt: "updated_at", // Map to database column
      indexes: [
        {
          fields: ["user_id"],
        },
        {
          fields: ["order_number"],
        },
        {
          fields: ["status"],
        },
        {
          fields: ["created_at"],
        },
      ],
    }
  );

  Order.associate = function (models) {
    Order.belongsTo(models.User, {
      foreignKey: "user_id", // Use the actual database column name
      as: "user",
      onDelete: "CASCADE",
    });

    Order.hasMany(models.OrderItem, {
      foreignKey: "order_id",
      as: "items",
      onDelete: "CASCADE",
    });
  };

  // Generate unique order ID
  Order.beforeCreate(async (order) => {
    if (!order.order_number) {
      const timestamp = Date.now();
      const random = Math.floor(Math.random() * 1000)
        .toString()
        .padStart(3, "0");
      order.order_number = `ORD-${timestamp}-${random}`;
    }
  });

  // Instance method to get status color
  Order.prototype.getStatusColor = function () {
    const statusColors = {
      pending: "bg-yellow-500",
      confirmed: "bg-blue-500",
      shipped: "bg-indigo-500",
      delivered: "bg-green-500",
      cancelled: "bg-red-500",
    };
    return statusColors[this.status] || "bg-gray-500";
  };

  // Instance method to get status text
  Order.prototype.getStatusText = function () {
    const statusTexts = {
      pending: "Pending Confirmation",
      confirmed: "Order Confirmed",
      shipped: "Shipped",
      delivered: "Delivered",
      cancelled: "Cancelled",
    };
    return statusTexts[this.status] || this.status;
  };

  return Order;
};
