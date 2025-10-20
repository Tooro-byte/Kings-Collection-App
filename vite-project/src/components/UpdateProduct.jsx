import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const UpdateProduct = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [recentUpdates, setRecentUpdates] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");

  // Product form state
  const [product, setProduct] = useState({
    title: "",
    description: "",
    category: "",
    price: "",
    stockId: "",
    images: [],
  });

  // Category form state
  const [category, setCategory] = useState({
    name: "",
    image: null,
  });

  // Image preview states
  const [categoryPreview, setCategoryPreview] = useState("");
  const [productPreviews, setProductPreviews] = useState([]);

  // Retry fetch with exponential backoff
  const fetchWithRetry = async (url, options, retries = 3, delay = 1000) => {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(url, options);
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.message || `HTTP ${response.status}`);
        }
        return response;
      } catch (error) {
        if (i < retries - 1) {
          await new Promise((resolve) => setTimeout(resolve, delay));
          delay *= 2;
        } else {
          throw error;
        }
      }
    }
  };

  // Show toast notification
  const showToast = useCallback((type, message) => {
    const id = Date.now();
    const newToast = { id, type, message };
    setToasts((prev) => [...prev, newToast]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 3000);
  }, []);

  // Fetch categories and products
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const instance = axios.create({ timeout: 5000 });
        const [categoriesRes, productsRes] = await Promise.all([
          instance.get("/api/categories"),
          instance.get("/api/products"),
        ]);

        // Handle categories data
        if (
          categoriesRes.data &&
          Array.isArray(categoriesRes.data.categories)
        ) {
          setCategories(categoriesRes.data.categories);
        } else {
          console.warn("Categories data is invalid or empty");
          setCategories([]);
        }

        // Handle products data
        if (productsRes.data && Array.isArray(productsRes.data.products)) {
          setProducts(productsRes.data.products);
        } else {
          console.warn("Products data is invalid or empty");
          setProducts([]);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        showToast("error", "Failed to load data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [showToast]);

  // Fetch product data when product is selected
  useEffect(() => {
    const fetchProductData = async () => {
      if (!selectedProductId) {
        // Reset form when no product is selected
        setProduct({
          title: "",
          description: "",
          category: "",
          price: "",
          stockId: "",
          images: [],
        });
        setProductPreviews([]);
        return;
      }

      try {
        setLoading(true);
        const response = await axios.get(`/api/products/${selectedProductId}`);

        if (response.data && response.data.product) {
          const productData = response.data.product;
          setProduct({
            title: productData.title || "",
            description: productData.description || "",
            category: productData.category_id || "",
            price: productData.price || "",
            stockId: productData.stock_id || "",
            images: productData.images || [],
          });
          setProductPreviews(productData.images || []);
        }
      } catch (error) {
        console.error("Error fetching product data:", error);
        showToast("error", "Failed to load product data");
      } finally {
        setLoading(false);
      }
    };

    fetchProductData();
  }, [selectedProductId, showToast]);

  // Fetch category data when category is selected
  useEffect(() => {
    const fetchCategoryData = async () => {
      if (!selectedCategoryId) {
        // Reset form when no category is selected
        setCategory({
          name: "",
          image: null,
        });
        setCategoryPreview("");
        return;
      }

      try {
        setLoading(true);
        const response = await axios.get(
          `/update-category/${selectedCategoryId}`
        );

        if (response.data && response.data.category) {
          const categoryData = response.data.category;
          setCategory({
            name: categoryData.name || "",
            image: null, // We don't set the file object for existing image
          });
          setCategoryPreview(categoryData.image || "");
        }
      } catch (error) {
        console.error("Error fetching category data:", error);
        showToast("error", "Failed to load category data");
      } finally {
        setLoading(false);
      }
    };

    fetchCategoryData();
  }, [selectedCategoryId, showToast]);

  // Handle product form changes
  const handleProductChange = (e) => {
    const { name, value } = e.target;
    setProduct((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handle category form changes
  const handleCategoryChange = (e) => {
    const { name, value } = e.target;
    setCategory((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handle category image upload
  const handleCategoryImage = (e) => {
    const file = e.target.files[0];
    if (file) {
      setCategory((prev) => ({ ...prev, image: file }));
      const reader = new FileReader();
      reader.onload = () => {
        setCategoryPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle product images upload
  const handleProductImages = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 8) {
      showToast("error", "Maximum 8 images allowed");
      return;
    }

    const newPreviews = [];
    const newImages = [];

    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        newPreviews.push(reader.result);
        if (newPreviews.length === files.length) {
          setProductPreviews((prev) => [...prev, ...newPreviews]);
        }
      };
      reader.readAsDataURL(file);
      newImages.push(file);
    });

    setProduct((prev) => ({
      ...prev,
      images: [...prev.images, ...newImages],
    }));
  };

  // Remove product image
  const removeProductImage = async (index, imageUrl = null) => {
    if (imageUrl) {
      if (window.confirm("Are you sure you want to remove this image?")) {
        try {
          const response = await fetchWithRetry("/remove-image", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ imageUrl }),
          });

          if (response.ok) {
            setProductPreviews((prev) => prev.filter((_, i) => i !== index));
            setProduct((prev) => ({
              ...prev,
              images: prev.images.filter((_, i) => i !== index),
            }));
            showToast("success", "Image removed successfully");
          } else {
            const data = await response.json();
            showToast("error", data.message || "Failed to remove image");
          }
        } catch (error) {
          console.error("Network error removing image:", error);
          showToast("error", "Network error removing image");
        }
      }
    } else {
      setProductPreviews((prev) => prev.filter((_, i) => i !== index));
      setProduct((prev) => ({
        ...prev,
        images: prev.images.filter((_, i) => i !== index),
      }));
    }
  };

  // Update product
  const updateProduct = async (e) => {
    e.preventDefault();

    if (!selectedProductId) {
      showToast("error", "Please select a product to update");
      return;
    }

    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("title", product.title);
      formData.append("description", product.description);
      formData.append("category", product.category);
      formData.append("price", product.price);
      formData.append("stockId", product.stockId);

      product.images.forEach((image, index) => {
        if (image instanceof File) {
          formData.append("images", image);
        }
      });

      const response = await fetchWithRetry(
        `/update-product/${selectedProductId}`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (response.ok) {
        showToast("success", "Product updated successfully");
        setRecentUpdates((prev) => [
          {
            id: Date.now(),
            type: "product",
            title: product.title,
            price: product.price,
            images: productPreviews,
            action: "updated",
          },
          ...prev.slice(0, 4),
        ]);

        // Refresh products list
        const productsRes = await axios.get("/api/products");
        if (productsRes.data && Array.isArray(productsRes.data.products)) {
          setProducts(productsRes.data.products);
        }

        // Reset form
        setSelectedProductId("");
      } else {
        const data = await response.json().catch(() => ({}));
        showToast("error", data.message || "Failed to update product");
      }
    } catch (error) {
      console.error("Error updating product:", error);
      showToast("error", "Network error updating product");
    } finally {
      setSubmitting(false);
    }
  };

  // Update category
  const updateCategory = async (e) => {
    e.preventDefault();

    if (!selectedCategoryId) {
      showToast("error", "Please select a category to update");
      return;
    }

    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("name", category.name);
      if (category.image) {
        formData.append("image", category.image);
      }

      const response = await fetchWithRetry(
        `/update-category/${selectedCategoryId}`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (response.ok) {
        showToast("success", "Category updated successfully");
        setRecentUpdates((prev) => [
          {
            id: Date.now(),
            type: "category",
            name: category.name,
            image: categoryPreview,
            action: "updated",
          },
          ...prev.slice(0, 4),
        ]);

        // Refresh categories list
        const categoriesRes = await axios.get("/api/categories");
        if (
          categoriesRes.data &&
          Array.isArray(categoriesRes.data.categories)
        ) {
          setCategories(categoriesRes.data.categories);
        }

        // Reset form
        setSelectedCategoryId("");
      } else {
        const data = await response.json().catch(() => ({}));
        showToast("error", data.message || "Failed to update category");
      }
    } catch (error) {
      console.error("Error updating category:", error);
      showToast("error", "Network error updating category");
    } finally {
      setSubmitting(false);
    }
  };

  // Delete product
  const deleteProduct = async () => {
    if (!selectedProductId) {
      showToast("error", "Please select a product to delete");
      return;
    }

    if (window.confirm("Are you sure you want to delete this product?")) {
      try {
        const response = await fetchWithRetry(
          `/delete-product/${selectedProductId}`,
          {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
          }
        );

        if (response.ok) {
          showToast("success", "Product deleted successfully");

          // Refresh products list
          const productsRes = await axios.get("/api/products");
          if (productsRes.data && Array.isArray(productsRes.data.products)) {
            setProducts(productsRes.data.products);
          }

          // Reset form
          setSelectedProductId("");
        } else {
          const data = await response.json().catch(() => ({}));
          showToast("error", data.message || "Failed to delete product");
        }
      } catch (error) {
        console.error("Error deleting product:", error);
        showToast("error", "Network error deleting product");
      }
    }
  };

  // Delete category
  const deleteCategory = async () => {
    if (!selectedCategoryId) {
      showToast("error", "Please select a category to delete");
      return;
    }

    if (
      window.confirm(
        "Are you sure you want to delete this category? All products in this category will also be deleted."
      )
    ) {
      try {
        const response = await fetchWithRetry(
          `/delete-category/${selectedCategoryId}`,
          {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
          }
        );

        if (response.ok) {
          showToast("success", "Category deleted successfully");

          // Refresh categories and products lists
          const [categoriesRes, productsRes] = await Promise.all([
            axios.get("/api/categories"),
            axios.get("/api/products"),
          ]);

          if (
            categoriesRes.data &&
            Array.isArray(categoriesRes.data.categories)
          ) {
            setCategories(categoriesRes.data.categories);
          }
          if (productsRes.data && Array.isArray(productsRes.data.products)) {
            setProducts(productsRes.data.products);
          }

          // Reset form
          setSelectedCategoryId("");
        } else {
          const data = await response.json().catch(() => ({}));
          showToast("error", data.message || "Failed to delete category");
        }
      } catch (error) {
        console.error("Error deleting category:", error);
        showToast("error", "Network error deleting category");
      }
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
        <p className="mt-4 text-gray-600">Loading data...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 h-20 bg-white/95 backdrop-blur-xl shadow-lg border-b border-blue-200/30 z-50">
        <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <i className="fas fa-crown text-2xl text-yellow-500 animate-bounce"></i>
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-900 to-blue-600 bg-clip-text text-transparent">
              Kings Collections Admin
            </span>
          </div>
          <div className="flex space-x-3">
            <a
              href="/admin"
              className="flex items-center space-x-2 px-4 py-2 rounded-xl text-gray-700 hover:bg-blue-600 hover:text-white transition-all duration-300 border border-blue-200"
            >
              <i className="fas fa-tachometer-alt"></i>
              <span>Dashboard</span>
            </a>
            <a
              href="/add-product"
              className="flex items-center space-x-2 px-4 py-2 rounded-xl text-gray-700 hover:bg-blue-600 hover:text-white transition-all duration-300 border border-blue-200"
            >
              <i className="fas fa-box"></i>
              <span>Add Product</span>
            </a>
            <a
              href="/update-product"
              className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg transform -translate-y-1 transition-all duration-300"
            >
              <i className="fas fa-edit"></i>
              <span>Update Product</span>
            </a>
            <a
              href="/"
              className="flex items-center space-x-2 px-4 py-2 rounded-xl text-gray-700 hover:bg-blue-600 hover:text-white transition-all duration-300 border border-blue-200"
            >
              <i className="fas fa-tags"></i>
              <span>Home</span>
            </a>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 pt-28 pb-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-black bg-gradient-to-r from-blue-900 to-blue-600 bg-clip-text text-transparent mb-3">
            Update Product & Category
          </h1>
          <p className="text-blue-600/80 text-lg">
            Select a product or category to update from your Kings Collections
            inventory
          </p>
        </div>

        {/* Selection Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          {/* Product Selection */}
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/50">
            <div className="flex items-center space-x-4 mb-6">
              <div className="p-4 bg-blue-50 rounded-2xl">
                <i className="fas fa-box text-2xl text-blue-600"></i>
              </div>
              <h2 className="text-2xl font-black bg-gradient-to-r from-blue-900 to-blue-600 bg-clip-text text-transparent">
                Select Product
              </h2>
            </div>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl border-2 border-blue-200/50 focus:border-blue-500 focus:ring-4 focus:ring-blue-200/30 transition-all duration-300 outline-none"
            >
              <option value="">Choose a product to update...</option>
              {products.map((prod) => (
                <option key={prod.id} value={prod.id}>
                  {prod.title} - UGX {parseFloat(prod.price).toFixed(2)}
                </option>
              ))}
            </select>
            {selectedProductId && (
              <p className="mt-3 text-sm text-green-600">
                ✓ Product selected:{" "}
                {
                  products.find((p) => p.id === parseInt(selectedProductId))
                    ?.title
                }
              </p>
            )}
          </div>

          {/* Category Selection */}
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/50">
            <div className="flex items-center space-x-4 mb-6">
              <div className="p-4 bg-blue-50 rounded-2xl">
                <i className="fas fa-tags text-2xl text-blue-600"></i>
              </div>
              <h2 className="text-2xl font-black bg-gradient-to-r from-blue-900 to-blue-600 bg-clip-text text-transparent">
                Select Category
              </h2>
            </div>
            <select
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl border-2 border-blue-200/50 focus:border-blue-500 focus:ring-4 focus:ring-blue-200/30 transition-all duration-300 outline-none"
            >
              <option value="">Choose a category to update...</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
            {selectedCategoryId && (
              <p className="mt-3 text-sm text-green-600">
                ✓ Category selected:{" "}
                {
                  categories.find((c) => c.id === parseInt(selectedCategoryId))
                    ?.name
                }
              </p>
            )}
          </div>
        </div>

        {/* Forms Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-12">
          {/* Category Update Form */}
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/50 hover:transform hover:-translate-y-2 transition-all duration-300">
            <div className="flex items-center space-x-4 mb-8">
              <div className="p-4 bg-blue-50 rounded-2xl">
                <i className="fas fa-tags text-2xl text-blue-600"></i>
              </div>
              <h2 className="text-2xl font-black bg-gradient-to-r from-blue-900 to-blue-600 bg-clip-text text-transparent">
                Update Category
              </h2>
            </div>

            <form onSubmit={updateCategory} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  Category Name
                </label>
                <input
                  type="text"
                  value={category.name}
                  onChange={handleCategoryChange}
                  name="name"
                  placeholder="Enter category name"
                  className="w-full px-4 py-3 rounded-2xl border-2 border-blue-200/50 focus:border-blue-500 focus:ring-4 focus:ring-blue-200/30 transition-all duration-300 outline-none"
                  required
                  disabled={!selectedCategoryId}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  Category Icon
                </label>
                <div className="relative p-6 border-2 border-dashed border-blue-300/50 rounded-2xl bg-blue-50/50 hover:border-blue-400 transition-all duration-300">
                  <input
                    type="file"
                    onChange={handleCategoryImage}
                    accept="image/jpeg,image/png,image/gif"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    disabled={!selectedCategoryId}
                  />
                  <div className="text-center">
                    <i className="fas fa-cloud-upload-alt text-2xl text-blue-500 mb-2"></i>
                    <p className="text-blue-600 font-medium">
                      {selectedCategoryId
                        ? "Click to upload new category icon"
                        : "Select a category first"}
                    </p>
                  </div>
                  {categoryPreview && (
                    <div className="mt-4 flex justify-center">
                      <img
                        src={categoryPreview}
                        alt="Category preview"
                        className="w-24 h-24 object-cover rounded-2xl shadow-lg"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex space-x-4 justify-end">
                <button
                  type="submit"
                  disabled={submitting || !selectedCategoryId}
                  className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 disabled:opacity-50"
                >
                  <i className="fas fa-save"></i>
                  <span>{submitting ? "Saving..." : "Save Changes"}</span>
                </button>
                <button
                  type="button"
                  onClick={deleteCategory}
                  disabled={!selectedCategoryId}
                  className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-2xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 disabled:opacity-50"
                >
                  <i className="fas fa-trash"></i>
                  <span>Delete Category</span>
                </button>
              </div>
            </form>
          </div>

          {/* Product Update Form */}
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/50 hover:transform hover:-translate-y-2 transition-all duration-300">
            <div className="flex items-center space-x-4 mb-8">
              <div className="p-4 bg-blue-50 rounded-2xl">
                <i className="fas fa-box text-2xl text-blue-600"></i>
              </div>
              <h2 className="text-2xl font-black bg-gradient-to-r from-blue-900 to-blue-600 bg-clip-text text-transparent">
                Update Product
              </h2>
            </div>

            <form onSubmit={updateProduct} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-2">
                    Product Title
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={product.title}
                    onChange={handleProductChange}
                    placeholder="Enter product title"
                    maxLength="50"
                    className="w-full px-4 py-3 rounded-2xl border-2 border-blue-200/50 focus:border-blue-500 focus:ring-4 focus:ring-blue-200/30 transition-all duration-300 outline-none"
                    required
                    disabled={!selectedProductId}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-2">
                    Category
                  </label>
                  <select
                    name="category"
                    value={product.category}
                    onChange={handleProductChange}
                    className="w-full px-4 py-3 rounded-2xl border-2 border-blue-200/50 focus:border-blue-500 focus:ring-4 focus:ring-blue-200/30 transition-all duration-300 outline-none"
                    required
                    disabled={!selectedProductId}
                  >
                    <option value="">Select Category</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  Description
                </label>
                <textarea
                  name="description"
                  value={product.description}
                  onChange={handleProductChange}
                  placeholder="Enter product description"
                  maxLength="100"
                  rows="3"
                  className="w-full px-4 py-3 rounded-2xl border-2 border-blue-200/50 focus:border-blue-500 focus:ring-4 focus:ring-blue-200/30 transition-all duration-300 outline-none resize-none"
                  required
                  disabled={!selectedProductId}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-2">
                    Price (UGX)
                  </label>
                  <input
                    type="number"
                    name="price"
                    value={product.price}
                    onChange={handleProductChange}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    className="w-full px-4 py-3 rounded-2xl border-2 border-blue-200/50 focus:border-blue-500 focus:ring-4 focus:ring-blue-200/30 transition-all duration-300 outline-none"
                    required
                    disabled={!selectedProductId}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-2">
                    Stock ID
                  </label>
                  <input
                    type="number"
                    name="stockId"
                    value={product.stockId}
                    onChange={handleProductChange}
                    placeholder="Enter stock ID"
                    min="0"
                    className="w-full px-4 py-3 rounded-2xl border-2 border-blue-200/50 focus:border-blue-500 focus:ring-4 focus:ring-blue-200/30 transition-all duration-300 outline-none"
                    required
                    disabled={!selectedProductId}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  Product Images (Max 8)
                </label>
                <div className="relative p-6 border-2 border-dashed border-blue-300/50 rounded-2xl bg-blue-50/50 hover:border-blue-400 transition-all duration-300">
                  <input
                    type="file"
                    onChange={handleProductImages}
                    accept="image/jpeg,image/png,image/gif"
                    multiple
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    disabled={!selectedProductId}
                  />
                  <div className="text-center">
                    <i className="fas fa-images text-2xl text-blue-500 mb-2"></i>
                    <p className="text-blue-600 font-medium">
                      {selectedProductId
                        ? "Click to upload new product images"
                        : "Select a product first"}
                    </p>
                  </div>

                  {productPreviews.length > 0 && (
                    <div className="mt-6 flex flex-wrap gap-4">
                      {productPreviews.map((preview, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={preview}
                            alt={`Product preview ${index + 1}`}
                            className="w-20 h-20 object-cover rounded-xl shadow-lg group-hover:scale-105 transition-transform duration-300"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              removeProductImage(
                                index,
                                typeof preview === "string" ? preview : null
                              )
                            }
                            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600 transition-colors duration-300 shadow-lg"
                          >
                            <i className="fas fa-times"></i>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex space-x-4 justify-end">
                <button
                  type="submit"
                  disabled={submitting || !selectedProductId}
                  className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-2xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 disabled:opacity-50"
                >
                  <i className="fas fa-save"></i>
                  <span>{submitting ? "Saving..." : "Save Changes"}</span>
                </button>
                <button
                  type="button"
                  onClick={deleteProduct}
                  disabled={!selectedProductId}
                  className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-2xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 disabled:opacity-50"
                >
                  <i className="fas fa-trash"></i>
                  <span>Delete Product</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Recent Updates Section */}
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/50">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-black bg-gradient-to-r from-blue-900 to-blue-600 bg-clip-text text-transparent">
              Recent Updates
            </h2>
            <div className="flex items-center space-x-2 text-blue-600 font-semibold">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span>Real-time Updates</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {recentUpdates.map((update) => (
              <div
                key={update.id}
                className="bg-white rounded-2xl p-4 shadow-lg hover:shadow-xl hover:transform hover:-translate-y-2 transition-all duration-300"
              >
                <div className="mb-3">
                  <img
                    src={
                      update.type === "product"
                        ? update.images?.[0] || "/Images/placeholder.png"
                        : update.image || "/Images/placeholder.png"
                    }
                    alt={update.type === "product" ? update.title : update.name}
                    className="w-full h-32 object-cover rounded-xl"
                  />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800 text-sm mb-1">
                    {update.type === "product" ? update.title : update.name}
                  </h3>
                  <p className="text-blue-600 text-xs">
                    {update.type === "product"
                      ? `Price: UGX ${
                          update.price
                            ? parseFloat(update.price).toFixed(2)
                            : "0.00"
                        }`
                      : `${
                          update.action === "updated"
                            ? "Category Updated"
                            : "Category Deleted"
                        }`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Toast Notifications */}
      <div className="fixed bottom-6 right-6 z-50 space-y-3">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex items-center space-x-3 bg-white/95 backdrop-blur-xl rounded-2xl p-4 shadow-2xl border-l-4 ${
              toast.type === "success" ? "border-green-500" : "border-red-500"
            } min-w-80 transform transition-all duration-300 animate-in slide-in-from-right`}
          >
            <div
              className={`p-2 rounded-xl ${
                toast.type === "success"
                  ? "bg-green-100 text-green-600"
                  : "bg-red-100 text-red-600"
              }`}
            >
              <i
                className={`fas fa-${
                  toast.type === "success"
                    ? "check-circle"
                    : "exclamation-circle"
                }`}
              ></i>
            </div>
            <div className="flex-1 text-sm font-medium text-gray-800">
              {toast.message}
            </div>
            <button
              onClick={() =>
                setToasts((prev) => prev.filter((t) => t.id !== toast.id))
              }
              className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
            >
              <i className="fas fa-times"></i>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default UpdateProduct;
