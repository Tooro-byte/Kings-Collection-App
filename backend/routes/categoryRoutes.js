const express = require("express");
const router = express.Router();
const Category = require("../models/categoryModel");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Ensure upload directories exist
const createUploadDirs = () => {
  const dirs = [
    path.join(__dirname, "../public/upload/category"),
    path.join(__dirname, "../public/uploads"),
  ];

  dirs.forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
};

createUploadDirs();

// Multer configuration for category images
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, "../public/upload/category");
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "category-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif|webp/;
    const extname = filetypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = filetypes.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error("Only images are allowed"));
  },
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

// GET all categories
router.get("/", async (req, res) => {
  try {
    const categories = await Category.findAll({
      order: [["name", "ASC"]],
    });

    // Format response to match frontend expectations
    const formattedCategories = categories.map((category) => ({
      _id: category.id,
      id: category.id,
      name: category.name,
      image: category.image ? `/upload/category/${category.image}` : null,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    }));

    res.json(formattedCategories);
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching categories: " + error.message,
    });
  }
});

// POST create new category
router.post("/", upload.single("image"), async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || name.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Category name is required",
      });
    }

    // Check if category already exists
    const existingCategory = await Category.findOne({
      where: { name: name.trim() },
    });

    if (existingCategory) {
      return res.status(400).json({
        success: false,
        message: "Category already exists",
      });
    }

    // Handle image path
    let imagePath = null;
    if (req.file) {
      imagePath = req.file.filename;
    }

    // Create new category
    const newCategory = await Category.create({
      name: name.trim(),
      image: imagePath,
    });

    // Format response
    const formattedCategory = {
      _id: newCategory.id,
      id: newCategory.id,
      name: newCategory.name,
      image: newCategory.image ? `/upload/category/${newCategory.image}` : null,
      createdAt: newCategory.createdAt,
      updatedAt: newCategory.updatedAt,
    };

    res.status(201).json({
      success: true,
      category: formattedCategory,
      message: "Category created successfully",
    });
  } catch (error) {
    console.error("Error creating category:", error);
    res.status(500).json({
      success: false,
      message: "Server error creating category: " + error.message,
    });
  }
});

// GET category by ID
router.get("/:id", async (req, res) => {
  try {
    const category = await Category.findByPk(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    const formattedCategory = {
      _id: category.id,
      id: category.id,
      name: category.name,
      image: category.image ? `/upload/category/${category.image}` : null,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    };

    res.json({
      success: true,
      category: formattedCategory,
    });
  } catch (error) {
    console.error("Error fetching category:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching category: " + error.message,
    });
  }
});

module.exports = router;
