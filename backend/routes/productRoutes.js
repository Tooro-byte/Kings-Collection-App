const express = require("express");
const router = express.Router();
const { Sequelize } = require("sequelize");
const { Product, Category } = require("../models/associations");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const {
  ensureAuthenticated,
  ensureAdmin,
} = require("../AuthMiddleWare/checkRole");

// Ensure upload directories exist
const createUploadDirs = () => {
  const uploadPath = path.join(__dirname, "../public/uploads");
  const categoryUploadPath = path.join(__dirname, "../public/upload/category");

  if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath, { recursive: true });
  }
  if (!fs.existsSync(categoryUploadPath)) {
    fs.mkdirSync(categoryUploadPath, { recursive: true });
  }
};

createUploadDirs();

// Multer configuration for product images
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, "../public/uploads");
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + "-" + file.originalname);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif|webp/;
    const extname = filetypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = filetypes.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error("Only images (jpeg, jpg, png, gif, webp) are allowed"));
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit per file
    files: 8, // Maximum 8 files
  },
});

// GET all products with category details
router.get("/", async (req, res) => {
  try {
    const { category, search, page = 1, limit = 20 } = req.query;

    let whereClause = {};
    let includeClause = [
      {
        model: Category,
        as: "category",
        attributes: ["id", "name", "image"],
      },
    ];

    // Filter by category
    if (category && category !== "all") {
      whereClause.category_id = parseInt(category);
    }

    // Search functionality
    if (search) {
      whereClause = {
        ...whereClause,
        [Sequelize.Op.or]: [
          { title: { [Sequelize.Op.like]: `%${search}%` } },
          { description: { [Sequelize.Op.like]: `%${search}%` } },
        ],
      };
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows: products } = await Product.findAndCountAll({
      where: whereClause,
      include: includeClause,
      limit: parseInt(limit),
      offset: offset,
      order: [["createdAt", "DESC"]],
    });

    // Format products for frontend
    const formattedProducts = products.map((product) => ({
      _id: product.id,
      id: product.id,
      title: product.title,
      description: product.description,
      price: parseFloat(product.price),
      category_id: product.category_id,
      stock_id: product.stock_id,
      images: product.images || [],
      size: product.size || [],
      color: product.color,
      category: product.category
        ? {
            _id: product.category.id,
            id: product.category.id,
            name: product.category.name,
            image: product.category.image
              ? `/upload/category/${product.category.image}`
              : null,
          }
        : null,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    }));

    res.json({
      success: true,
      products: formattedProducts,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(count / parseInt(limit)),
        totalProducts: count,
        hasNext: offset + parseInt(limit) < count,
        hasPrev: parseInt(page) > 1,
      },
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET single product with category details
router.get("/:id", async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id, {
      include: [
        {
          model: Category,
          as: "category",
          attributes: ["id", "name", "image"],
        },
      ],
    });

    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    // Format product for frontend
    const formattedProduct = {
      _id: product.id,
      id: product.id,
      title: product.title,
      description: product.description,
      price: parseFloat(product.price),
      category_id: product.category_id,
      stock_id: product.stock_id,
      images: product.images || [],
      size: product.size || [],
      color: product.color,
      category: product.category
        ? {
            _id: product.category.id,
            id: product.category.id,
            name: product.category.name,
            image: product.category.image
              ? `/upload/category/${product.category.image}`
              : null,
          }
        : null,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };

    res.json({ success: true, product: formattedProduct });
  } catch (error) {
    console.error("Error fetching product:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST create new product (Admin only)
router.post(
  "/",
  ensureAuthenticated,
  ensureAdmin,
  upload.array("images", 8),
  async (req, res) => {
    try {
      console.log("Received product data:", req.body);
      console.log("Received files:", req.files ? req.files.length : 0);

      const { title, description, price, stockId, category, size, color } =
        req.body;

      // Validate required fields
      if (!title || !description || !price || !stockId || !category) {
        return res.status(400).json({
          success: false,
          message:
            "Title, description, price, stock ID, and category are required",
        });
      }

      // Verify category exists
      const categoryExists = await Category.findByPk(category);
      if (!categoryExists) {
        return res.status(400).json({
          success: false,
          message: "Invalid category",
        });
      }

      // Handle images
      let images = [];
      if (req.files && req.files.length > 0) {
        images = req.files.map((file) => `/uploads/${file.filename}`);
      }

      // Parse size array if provided
      let sizeArray = [];
      if (size) {
        try {
          sizeArray = Array.isArray(size) ? size : JSON.parse(size);
        } catch (e) {
          sizeArray = size.split(",").map((s) => s.trim());
        }
      }

      // Create new product
      const newProduct = await Product.create({
        title: title.trim(),
        description: description.trim(),
        price: parseFloat(price),
        stock_id: parseInt(stockId),
        category_id: parseInt(category),
        images: images,
        size: sizeArray,
        color: color || null,
      });

      // Fetch the created product with category details
      const productWithCategory = await Product.findByPk(newProduct.id, {
        include: [
          {
            model: Category,
            as: "category",
            attributes: ["id", "name", "image"],
          },
        ],
      });

      // Format response
      const formattedProduct = {
        _id: productWithCategory.id,
        id: productWithCategory.id,
        title: productWithCategory.title,
        description: productWithCategory.description,
        price: parseFloat(productWithCategory.price),
        category_id: productWithCategory.category_id,
        stock_id: productWithCategory.stock_id,
        images: productWithCategory.images || [],
        size: productWithCategory.size || [],
        color: productWithCategory.color,
        category: productWithCategory.category
          ? {
              _id: productWithCategory.category.id,
              id: productWithCategory.category.id,
              name: productWithCategory.category.name,
              image: productWithCategory.category.image
                ? `/upload/category/${productWithCategory.category.image}`
                : null,
            }
          : null,
        createdAt: productWithCategory.createdAt,
        updatedAt: productWithCategory.updatedAt,
      };

      console.log("Product created successfully:", formattedProduct.id);

      res.status(201).json({
        success: true,
        product: formattedProduct,
        message: "Product created successfully",
      });
    } catch (error) {
      console.error("Error creating product:", error);
      res.status(500).json({
        success: false,
        message: "Server error creating product: " + error.message,
      });
    }
  }
);

// PUT update product (Admin only)
router.put(
  "/:id",
  ensureAuthenticated,
  ensureAdmin,
  upload.array("images", 8),
  async (req, res) => {
    try {
      const productId = req.params.id;
      const { title, description, price, stockId, category, size, color } =
        req.body;

      const product = await Product.findByPk(productId);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Product not found",
        });
      }

      // Handle images update
      let images = product.images || [];
      if (req.files && req.files.length > 0) {
        // Add new images to existing ones
        const newImages = req.files.map((file) => `/uploads/${file.filename}`);
        images = [...images, ...newImages].slice(0, 8); // Keep max 8 images
      }

      // Parse size array if provided
      let sizeArray = product.size || [];
      if (size !== undefined) {
        try {
          sizeArray = Array.isArray(size) ? size : JSON.parse(size);
        } catch (e) {
          sizeArray = size.split(",").map((s) => s.trim());
        }
      }

      // Update product
      await product.update({
        title: title ? title.trim() : product.title,
        description: description ? description.trim() : product.description,
        price: price ? parseFloat(price) : product.price,
        stock_id: stockId ? parseInt(stockId) : product.stock_id,
        category_id: category ? parseInt(category) : product.category_id,
        images: images,
        size: sizeArray,
        color: color !== undefined ? color : product.color,
      });

      // Fetch updated product with category
      const updatedProduct = await Product.findByPk(productId, {
        include: [
          {
            model: Category,
            as: "category",
            attributes: ["id", "name", "image"],
          },
        ],
      });

      // Format response
      const formattedProduct = {
        _id: updatedProduct.id,
        id: updatedProduct.id,
        title: updatedProduct.title,
        description: updatedProduct.description,
        price: parseFloat(updatedProduct.price),
        category_id: updatedProduct.category_id,
        stock_id: updatedProduct.stock_id,
        images: updatedProduct.images || [],
        size: updatedProduct.size || [],
        color: updatedProduct.color,
        category: updatedProduct.category
          ? {
              _id: updatedProduct.category.id,
              id: updatedProduct.category.id,
              name: updatedProduct.category.name,
              image: updatedProduct.category.image
                ? `/upload/category/${updatedProduct.category.image}`
                : null,
            }
          : null,
        createdAt: updatedProduct.createdAt,
        updatedAt: updatedProduct.updatedAt,
      };

      res.json({
        success: true,
        product: formattedProduct,
        message: "Product updated successfully",
      });
    } catch (error) {
      console.error("Error updating product:", error);
      res.status(500).json({
        success: false,
        message: "Server error updating product: " + error.message,
      });
    }
  }
);

// DELETE product (Admin only)
router.delete("/:id", ensureAuthenticated, ensureAdmin, async (req, res) => {
  try {
    const productId = req.params.id;

    const product = await Product.findByPk(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Delete product images from filesystem
    if (product.images && product.images.length > 0) {
      product.images.forEach((image) => {
        const imagePath = path.join(__dirname, "../public", image);
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
        }
      });
    }

    await product.destroy();

    res.json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting product:", error);
    res.status(500).json({
      success: false,
      message: "Server error deleting product: " + error.message,
    });
  }
});

// DELETE product image (Admin only)
router.delete(
  "/:id/images/:imageIndex",
  ensureAuthenticated,
  ensureAdmin,
  async (req, res) => {
    try {
      const productId = req.params.id;
      const imageIndex = parseInt(req.params.imageIndex);

      const product = await Product.findByPk(productId);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Product not found",
        });
      }

      if (!product.images || product.images.length <= imageIndex) {
        return res.status(404).json({
          success: false,
          message: "Image not found",
        });
      }

      // Delete image from filesystem
      const imageToDelete = product.images[imageIndex];
      const imagePath = path.join(__dirname, "../public", imageToDelete);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }

      // Remove image from array
      const updatedImages = product.images.filter(
        (_, index) => index !== imageIndex
      );
      await product.update({ images: updatedImages });

      res.json({
        success: true,
        message: "Image deleted successfully",
        images: updatedImages,
      });
    } catch (error) {
      console.error("Error deleting product image:", error);
      res.status(500).json({
        success: false,
        message: "Server error deleting product image: " + error.message,
      });
    }
  }
);

module.exports = router;
