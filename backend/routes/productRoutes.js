const express = require("express");
const router = express.Router();
const Product = require("../models/productSchema");

// GET all products
router.get("/", async (req, res) => {
  try {
    const products = await Product.findAll();
    res.json({ success: true, products });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET single product
router.get("/:id", async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);

    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    res.json({ success: true, product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
