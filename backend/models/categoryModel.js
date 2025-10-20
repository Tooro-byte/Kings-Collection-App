const { DataTypes } = require("sequelize");
const sequelize = require("../config/database"); 

const Category = sequelize.define(
  "Category",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true,
      },
    },
    image: {
      type: DataTypes.STRING(500),
      allowNull: false,
    },
  },
  {
    tableName: "categories",
    timestamps: true,
  }
);

module.exports = Category;
