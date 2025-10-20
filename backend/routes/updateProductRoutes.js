const express = require("express");
const router = express.Router();
const { Op } = require("sequelize");
const Product = require("../models/productSchema");
const Category = require("../models/categoryModel");
const multer = require("multer");
const fs = require("fs");
const path = require("path");

// Multer storage configuration for multiple files
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, "../public/uploads");
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
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
    // FIXED: Removed include since we haven't set up associations yet
    // You can add associations later if needed

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

    res.json({
      success: true,
      product: {
        id: product.id,
        title: product.title,
        description: product.description,
        category: product.category_id,
        price: product.price,
        stockId: product.stock_id,
        images: product.images || [],
        // FIXED: Removed category_details since no association
      },
      categories: categories.map((cat) => ({
        id: cat.id,
        name: cat.name,
        image: cat.image,
      })),
    });
  } catch (error) {
    console.error(`Error fetching product ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      message: "Server error fetching product",
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
        image: category.image,
      },
      categories: categories.map((cat) => ({
        id: cat.id,
        name: cat.name,
        image: cat.image,
      })),
    });
  } catch (error) {
    console.error(`Error fetching category ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      message: "Server error fetching category",
    });
  }
});

// POST Update Product with multiple images
router.post(
  "/update-product/:id",
  upload.array("images", 8), // Handle up to 8 files
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

      // Fetch updated product
      const updatedProduct = await Product.findByPk(productId);

      console.log(`Product updated successfully: ${updatedProduct.id}`);

      // Emit real-time update (Socket.io) - KEPT from your original
      const io = req.app.get("io");
      if (io) {
        io.emit("productUpdated", {
          id: updatedProduct.id,
          title: updatedProduct.title,
          images: updatedProduct.images,
          price: updatedProduct.price,
          category: { name: categoryExists.name }, // Use categoryExists we fetched earlier
          stockId: updatedProduct.stock_id,
        });
      } else {
        console.warn("Socket.IO instance not available for emit.");
      }

      res.status(200).json({
        success: true,
        message: "Product updated successfully",
        product: updatedProduct,
      });
    } catch (error) {
      console.error(`Error updating product ${req.params.id}:`, error);
      res.status(500).json({
        success: false,
        message: error.message || "Server error updating product",
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
          const oldFilename = path.basename(category.image);
          const oldFilePath = path.join(
            __dirname,
            "../public/uploads",
            oldFilename
          );
          if (fs.existsSync(oldFilePath)) {
            fs.unlinkSync(oldFilePath);
          }
        }
        updateData.image = `/uploads/${req.file.filename}`;
      }

      await category.update(updateData);
      console.log(`Category updated successfully: ${category.id}`);

      // Emit real-time update (Socket.io) - KEPT from your original
      const io = req.app.get("io");
      if (io) {
        io.emit("categoryUpdated", {
          id: category.id,
          name: category.name,
          image: category.image,
        });
      } else {
        console.warn("Socket.IO instance not available for emit.");
      }

      res.status(200).json({
        success: true,
        message: "Category updated successfully",
        category: category,
      });
    } catch (error) {
      console.error(`Error updating category ${req.params.id}:`, error);
      res.status(500).json({
        success: false,
        message: error.message || "Server error updating category",
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

    // Emit real-time update (Socket.io) - KEPT from your original
    const io = req.app.get("io");
    if (io) {
      io.emit("productUpdated", {
        id: productId,
        title: "Deleted Product",
      });
    } else {
      console.warn("Socket.IO instance not available for emit.");
    }

    res.status(200).json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (error) {
    console.error(`Error deleting product ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      message: error.message || "Server error deleting product",
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
      const filename = path.basename(category.image);
      const filePath = path.join(__dirname, "../public/uploads", filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    // Delete associated products
    const deletedProductsCount = await Product.destroy({
      where: { category_id: categoryId },
    });

    console.log(
      `Deleted ${deletedProductsCount} products associated with category ${categoryId}`
    );

    await category.destroy();
    console.log(`Category deleted successfully: ${categoryId}`);

    // Emit real-time update (Socket.io) - KEPT from your original
    const io = req.app.get("io");
    if (io) {
      io.emit("categoryUpdated", {
        id: categoryId,
        name: "Deleted Category",
      });
    } else {
      console.warn("Socket.IO instance not available for emit.");
    }

    res.status(200).json({
      success: true,
      message: "Category deleted successfully",
      deletedProducts: deletedProductsCount,
    });
  } catch (error) {
    console.error(`Error deleting category ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      message: error.message || "Server error deleting category",
    });
  }
});

// POST Remove Image - FIXED: Using correct Sequelize query
router.post("/remove-image", async (req, res) => {
  try {
    const { imageUrl } = req.body;
    console.log(`Removing image: ${imageUrl}`);

    const filename = path.basename(imageUrl);
    const filePath = path.join(__dirname, "../public/uploads", filename);

    // Remove image from products - FIXED: Using proper JSON search
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
        where: { image: imageUrl },
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

    // Emit real-time update (Socket.io) - KEPT from your original
    if (updatedProduct) {
      const io = req.app.get("io");
      if (io) {
        if (updatedProduct.type === "category") {
          io.emit("categoryUpdated", {
            id: updatedProduct.data.id,
            name: updatedProduct.data.name,
            image: updatedProduct.data.image,
          });
        } else {
          // Get category name for the product
          const productCategory = await Category.findByPk(
            updatedProduct.category_id
          );
          io.emit("productUpdated", {
            id: updatedProduct.id,
            title: updatedProduct.title,
            images: updatedProduct.images,
            price: updatedProduct.price,
            category: {
              name: productCategory ? productCategory.name : "Unknown",
            },
            stockId: updatedProduct.stock_id,
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
      message: error.message || "Server error removing image",
    });
  }
});

module.exports = router;
