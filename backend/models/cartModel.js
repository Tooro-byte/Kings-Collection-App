const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Cart = sequelize.define(
    "Cart",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "Users",
          key: "id",
        },
      },
      items: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: [],
        validate: {
          isValidItems(value) {
            if (!Array.isArray(value)) {
              throw new Error("Items must be an array");
            }
            value.forEach((item) => {
              if (!item.productId) {
                throw new Error("Each item must have a productId");
              }
              if (!item.quantity || item.quantity < 1) {
                throw new Error("Each item must have a valid quantity");
              }
              if (!item.price || item.price < 0) {
                throw new Error("Each item must have a valid price");
              }
            });
          },
        },
      },
      totalProducts: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        validate: {
          min: 0,
        },
      },
      totalPrice: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.0,
        validate: {
          min: 0,
        },
      },
    },
    {
      tableName: "carts",
      timestamps: true,
      indexes: [
        {
          unique: true,
          fields: ["userId"],
        },
      ],
    }
  );

  Cart.associate = function (models) {
    Cart.belongsTo(models.User, {
      foreignKey: "userId",
      as: "user",
      onDelete: "CASCADE",
    });
  };

  // Instance method to calculate totals
  Cart.prototype.calculateTotals = function () {
    const totalProducts = this.items.reduce(
      (sum, item) => sum + item.quantity,
      0
    );
    const totalPrice = this.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    this.totalProducts = totalProducts;
    this.totalPrice = totalPrice;

    return { totalProducts, totalPrice };
  };

  // Instance method to add item
  Cart.prototype.addItem = function (product, quantity = 1, size = null) {
    const existingItemIndex = this.items.findIndex(
      (item) => item.productId === product.id && item.size === size
    );

    if (existingItemIndex > -1) {
      this.items[existingItemIndex].quantity += quantity;
    } else {
      const newItem = {
        productId: product.id,
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
      this.items.push(newItem);
    }

    this.calculateTotals();
  };

  // Instance method to remove item
  Cart.prototype.removeItem = function (itemId) {
    this.items = this.items.filter((item) => item.addedAt !== itemId);
    this.calculateTotals();
  };

  // Instance method to update quantity
  Cart.prototype.updateQuantity = function (itemId, quantity) {
    const item = this.items.find((item) => item.addedAt === itemId);
    if (item) {
      item.quantity = quantity;
      this.calculateTotals();
    }
  };

  // Instance method to clear cart
  Cart.prototype.clear = function () {
    this.items = [];
    this.totalProducts = 0;
    this.totalPrice = 0;
  };

  return Cart;
};
