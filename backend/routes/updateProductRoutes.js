const express = require("express");
const router = express.Router();
const { Op } = require("sequelize");
const Product = require("../models/productSchema");
const Category = require("../models/categoryModel");
const multer = require("multer");
const fs = require("fs");
const path = require("path");

// Ensure upload directories exist
const createUploadDirs = () => {
  const dirs = [
    path.join(__dirname, "../public/uploads"),
    path.join(__dirname, "../public/upload/category"),
  ];

  dirs.forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
};

createUploadDirs();

// Multer storage configuration for multiple files
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

// GET Update Product Form
router.get("/update-product/:id", async (req, res) => {
  try {
    console.log(`Fetching product with ID: ${req.params.id}`);

    const product = await Product.findByPk(req.params.id);

    if (!product) {
      console.error(`Product not found: ${req.params.id}`);
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const categories = await Category.findAll({
      attributes: ["id", "name", "image"],
    });

    // Format product images with full URLs
    const formattedImages = Array.isArray(product.images)
      ? product.images.map((img) =>
          img.startsWith("/") ? img : `/uploads/${img}`
        )
      : [];

    res.json({
      success: true,
      product: {
        id: product.id,
        title: product.title,
        description: product.description,
        category: product.category_id,
        price: product.price,
        stockId: product.stock_id,
        images: formattedImages,
        size: product.size || [],
        color: product.color,
      },
      categories: categories.map((cat) => ({
        id: cat.id,
        name: cat.name,
        image: cat.image ? `/upload/category/${cat.image}` : null,
      })),
    });
  } catch (error) {
    console.error(`Error fetching product ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      message: "Server error fetching product: " + error.message,
    });
  }
});

// GET Update Category Form
router.get("/update-category/:id", async (req, res) => {
  try {
    console.log(`Fetching category with ID: ${req.params.id}`);

    const category = await Category.findByPk(req.params.id);
    if (!category) {
      console.error(`Category not found: ${req.params.id}`);
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    const categories = await Category.findAll({
      attributes: ["id", "name", "image"],
    });

    res.json({
      success: true,
      category: {
        id: category.id,
        name: category.name,
        image: category.image ? `/upload/category/${category.image}` : null,
      },
      categories: categories.map((cat) => ({
        id: cat.id,
        name: cat.name,
        image: cat.image ? `/upload/category/${cat.image}` : null,
      })),
    });
  } catch (error) {
    console.error(`Error fetching category ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      message: "Server error fetching category: " + error.message,
    });
  }
});

// POST Update Product with multiple images
router.post(
  "/update-product/:id",
  upload.array("images", 8),
  async (req, res) => {
    try {
      const { title, description, price, stockId, category } = req.body;
      const productId = req.params.id;

      console.log(`Updating product ${productId} with data:`, {
        title,
        description,
        price,
        stockId,
        category,
        filesCount: req.files ? req.files.length : 0,
      });

      // Find product
      const product = await Product.findByPk(productId);
      if (!product) {
        console.error(`Product not found: ${productId}`);
        return res.status(404).json({
          success: false,
          message: "Product not found",
        });
      }

      // Verify category exists
      const categoryExists = await Category.findByPk(category);
      if (!categoryExists) {
        console.error(`Category not found: ${category}`);
        return res.status(400).json({
          success: false,
          message: "Invalid category",
        });
      }

      // Update product fields
      const updateData = {
        title: title || product.title,
        description: description || product.description,
        price: price ? parseFloat(price) : product.price,
        stock_id: stockId ? parseInt(stockId) : product.stock_id,
        category_id: category || product.category_id,
      };

      // Handle new images
      if (req.files && req.files.length > 0) {
        const newImages = req.files.map((file) => `/uploads/${file.filename}`);

        // Combine existing images with new ones, limit to 8 total
        const existingImages = Array.isArray(product.images)
          ? product.images
          : [];
        const allImages = [...existingImages, ...newImages].slice(0, 8);

        updateData.images = allImages;
      }

      await product.update(updateData);

      // Fetch updated product with category details
      const updatedProduct = await Product.findByPk(productId);

      console.log(`Product updated successfully: ${updatedProduct.id}`);

      // Emit real-time update (Socket.io)
      const io = req.app.get("io");
      if (io) {
        io.emit("productUpdated", {
          id: updatedProduct.id,
          _id: updatedProduct.id,
          title: updatedProduct.title,
          images: updatedProduct.images,
          price: updatedProduct.price,
          category: {
            _id: categoryExists.id,
            id: categoryExists.id,
            name: categoryExists.name,
          },
          stockId: updatedProduct.stock_id,
        });
      }

      res.status(200).json({
        success: true,
        message: "Product updated successfully",
        product: {
          id: updatedProduct.id,
          title: updatedProduct.title,
          description: updatedProduct.description,
          price: updatedProduct.price,
          category_id: updatedProduct.category_id,
          stock_id: updatedProduct.stock_id,
          images: updatedProduct.images,
          size: updatedProduct.size,
          color: updatedProduct.color,
        },
      });
    } catch (error) {
      console.error(`Error updating product ${req.params.id}:`, error);
      res.status(500).json({
        success: false,
        message: "Server error updating product: " + error.message,
      });
    }
  }
);

// POST Update Category
router.post(
  "/update-category/:id",
  upload.single("image"),
  async (req, res) => {
    try {
      const { name } = req.body;
      const categoryId = req.params.id;

      console.log(`Updating category ${categoryId} with data:`, { name });

      const category = await Category.findByPk(categoryId);
      if (!category) {
        console.error(`Category not found: ${categoryId}`);
        return res.status(404).json({
          success: false,
          message: "Category not found",
        });
      }

      const updateData = {
        name: name || category.name,
      };

      // Handle new image
      if (req.file) {
        // Delete old image file if exists
        if (category.image) {
          const oldFilePath = path.join(
            __dirname,
            "../public/upload/category",
            category.image
          );
          if (fs.existsSync(oldFilePath)) {
            fs.unlinkSync(oldFilePath);
          }
        }
        updateData.image = req.file.filename;
      }

      await category.update(updateData);

      // Fetch updated category
      const updatedCategory = await Category.findByPk(categoryId);

      console.log(`Category updated successfully: ${updatedCategory.id}`);

      // Emit real-time update (Socket.io)
      const io = req.app.get("io");
      if (io) {
        io.emit("categoryUpdated", {
          id: updatedCategory.id,
          _id: updatedCategory.id,
          name: updatedCategory.name,
          image: updatedCategory.image
            ? `/upload/category/${updatedCategory.image}`
            : null,
        });
      }

      res.status(200).json({
        success: true,
        message: "Category updated successfully",
        category: {
          id: updatedCategory.id,
          name: updatedCategory.name,
          image: updatedCategory.image
            ? `/upload/category/${updatedCategory.image}`
            : null,
        },
      });
    } catch (error) {
      console.error(`Error updating category ${req.params.id}:`, error);
      res.status(500).json({
        success: false,
        message: "Server error updating category: " + error.message,
      });
    }
  }
);

// DELETE Product
router.delete("/delete-product/:id", async (req, res) => {
  try {
    const productId = req.params.id;
    console.log(`Deleting product with ID: ${productId}`);

    const product = await Product.findByPk(productId);
    if (!product) {
      console.error(`Product not found: ${productId}`);
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Delete associated image files
    if (product.images && Array.isArray(product.images)) {
      product.images.forEach((imageUrl) => {
        const filename = path.basename(imageUrl);
        const filePath = path.join(__dirname, "../public/uploads", filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      });
    }

    await product.destroy();
    console.log(`Product deleted successfully: ${productId}`);

    // Emit real-time update (Socket.io)
    const io = req.app.get("io");
    if (io) {
      io.emit("productDeleted", {
        id: productId,
      });
    }

    res.status(200).json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (error) {
    console.error(`Error deleting product ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      message: "Server error deleting product: " + error.message,
    });
  }
});

// DELETE Category
router.delete("/delete-category/:id", async (req, res) => {
  try {
    const categoryId = req.params.id;
    console.log(`Deleting category with ID: ${categoryId}`);

    const category = await Category.findByPk(categoryId);
    if (!category) {
      console.error(`Category not found: ${categoryId}`);
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    // Delete category image file
    if (category.image) {
      const filePath = path.join(
        __dirname,
        "../public/upload/category",
        category.image
      );
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    // Delete associated products and their images
    const products = await Product.findAll({
      where: { category_id: categoryId },
    });
    for (const product of products) {
      if (product.images && Array.isArray(product.images)) {
        product.images.forEach((imageUrl) => {
          const filename = path.basename(imageUrl);
          const filePath = path.join(__dirname, "../public/uploads", filename);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        });
      }
      await product.destroy();
    }

    await category.destroy();
    console.log(`Category deleted successfully: ${categoryId}`);

    // Emit real-time update (Socket.io)
    const io = req.app.get("io");
    if (io) {
      io.emit("categoryDeleted", {
        id: categoryId,
      });
    }

    res.status(200).json({
      success: true,
      message: "Category deleted successfully",
      deletedProducts: products.length,
    });
  } catch (error) {
    console.error(`Error deleting category ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      message: "Server error deleting category: " + error.message,
    });
  }
});

// POST Remove Image
router.post("/remove-image", async (req, res) => {
  try {
    const { imageUrl } = req.body;
    console.log(`Removing image: ${imageUrl}`);

    if (!imageUrl) {
      return res.status(400).json({
        success: false,
        message: "Image URL is required",
      });
    }

    const filename = path.basename(imageUrl);
    let filePath = null;

    // Determine the correct file path based on image URL pattern
    if (imageUrl.includes("/upload/category/")) {
      filePath = path.join(__dirname, "../public/upload/category", filename);
    } else if (imageUrl.includes("/uploads/")) {
      filePath = path.join(__dirname, "../public/uploads", filename);
    } else {
      return res.status(400).json({
        success: false,
        message: "Invalid image URL",
      });
    }

    // Remove image from products
    const products = await Product.findAll();
    let updatedProduct = null;

    for (const product of products) {
      if (product.images && product.images.includes(imageUrl)) {
        const updatedImages = product.images.filter((img) => img !== imageUrl);
        await product.update({ images: updatedImages });
        updatedProduct = product;
        break;
      }
    }

    // Remove image from categories
    if (!updatedProduct) {
      const category = await Category.findOne({
        where: {
          image: filename, // Store only filename in database
        },
      });

      if (category) {
        await category.update({ image: null });
        updatedProduct = { type: "category", data: category };
      }
    }

    // Delete physical file
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`File deleted from disk: ${filePath}`);
    }

    // Emit real-time update (Socket.io)
    if (updatedProduct) {
      const io = req.app.get("io");
      if (io) {
        if (updatedProduct.type === "category") {
          io.emit("categoryUpdated", {
            id: updatedProduct.data.id,
            name: updatedProduct.data.name,
            image: null,
          });
        } else {
          io.emit("productUpdated", {
            id: updatedProduct.id,
            images: updatedProduct.images,
          });
        }
      }
    }

    res.json({
      success: true,
      message: "Image removed successfully",
    });
  } catch (error) {
    console.error("Error removing image:", error);
    res.status(500).json({
      success: false,
      message: "Server error removing image: " + error.message,
    });
  }
});

module.exports = router;
