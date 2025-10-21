const { Sequelize } = require("sequelize");
const sequelize = require("../config/database");

// Import models with correct patterns
const User = require("./userModel")(sequelize); // ✅ Factory function - NEEDS (sequelize)
const Product = require("./productSchema"); // ✅ Direct Model - NO (sequelize)
const Cart = require("./cartModel")(sequelize); // ✅ Factory function - NEEDS (sequelize)

// Import Category model with error handling
let Category;
try {
  const categoryModule = require("./categoryModel");
  // Check if it's a factory function or direct Model
  if (typeof categoryModule === "function") {
    Category = categoryModule(sequelize); // Factory function
  } else {
    Category = categoryModule; // Direct Model
  }
} catch (error) {
  console.warn("⚠️ Category model not found, creating placeholder...");
  Category = sequelize.define(
    "Category",
    {
      id: {
        type: Sequelize.DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      name: {
        type: Sequelize.DataTypes.STRING,
        allowNull: false,
      },
      image: {
        type: Sequelize.DataTypes.STRING,
        allowNull: true,
      },
    },
    {
      tableName: "categories",
      timestamps: true,
    }
  );
}

// Import Order model with error handling
let Order;
try {
  const orderModule = require("./orderModel");
  if (typeof orderModule === "function") {
    Order = orderModule(sequelize); // Factory function
  } else {
    Order = orderModule; // Direct Model
  }
} catch (error) {
  console.warn("⚠️ Order model not found, creating placeholder...");
  Order = sequelize.define(
    "Order",
    {
      id: {
        type: Sequelize.DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      userId: {
        type: Sequelize.DataTypes.INTEGER,
        allowNull: false,
      },
      items: {
        type: Sequelize.DataTypes.JSON,
        allowNull: false,
        defaultValue: [],
      },
      total: {
        type: Sequelize.DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
      status: {
        type: Sequelize.DataTypes.STRING,
        allowNull: false,
        defaultValue: "pending",
      },
    },
    {
      tableName: "orders",
      timestamps: true,
    }
  );
}

// Define associations
Product.belongsTo(Category, {
  foreignKey: "category_id",
  as: "category",
});

Category.hasMany(Product, {
  foreignKey: "category_id",
  as: "products",
});

Cart.belongsTo(User, {
  foreignKey: "userId",
  as: "user",
  onDelete: "CASCADE",
});

User.hasOne(Cart, {
  foreignKey: "userId",
  as: "cart",
  onDelete: "CASCADE",
});

Order.belongsTo(User, {
  foreignKey: "userId",
  as: "user",
  onDelete: "CASCADE",
});

User.hasMany(Order, {
  foreignKey: "userId",
  as: "orders",
  onDelete: "CASCADE",
});

// Sync all models
const syncDatabase = async () => {
  try {
    await sequelize.sync({ force: false });
    console.log("✅ Database models synchronized successfully");
  } catch (error) {
    console.error("❌ Error synchronizing database models:", error);
    throw error;
  }
};

module.exports = {
  sequelize,
  User,
  Product,
  Category,
  Cart,
  Order,
  syncDatabase,
};
