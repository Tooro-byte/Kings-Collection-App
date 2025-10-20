const express = require("express");
const router = express.Router();
const Category = require("../models/categoryModel");

// GET all categories
router.get("/", async (req, res) => {
  try {
    const categories = await Category.findAll();
    res.json({ success: true, categories });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
