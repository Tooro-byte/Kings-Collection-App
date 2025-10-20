// AddProduct.jsx
import React, { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";

const AddProduct = () => {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [categories, setCategories] = useState([]); // Fetch if needed
  const [product, setProduct] = useState({
    title: "",
    description: "",
    category: "",
    price: "",
    stockId: "",
    images: [],
  });
  const [category, setCategory] = useState({ name: "", image: null });
  const [categoryPreview, setCategoryPreview] = useState("");
  const [productPreviews, setProductPreviews] = useState([]);

  // Show toast
  const showToast = useCallback((type, message) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(
      () => setToasts((prev) => prev.filter((t) => t.id !== id)),
      3000
    );
  }, []);

  // Handle form changes and image uploads (same as UpdateProduct.jsx)
  const handleProductChange = (e) => {
    const { name, value } = e.target;
    setProduct((prev) => ({ ...prev, [name]: value }));
  };

  const handleCategoryChange = (e) => {
    const { name, value } = e.target;
    setCategory((prev) => ({ ...prev, [name]: value }));
  };

  const handleCategoryImage = (e) => {
    const file = e.target.files[0];
    if (file) {
      setCategory((prev) => ({ ...prev, image: file }));
      const reader = new FileReader();
      reader.onload = () => setCategoryPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

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
    setProduct((prev) => ({ ...prev, images: [...prev.images, ...newImages] }));
  };

  // Add product
  const addProduct = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("title", product.title);
      formData.append("description", product.description);
      formData.append("category", product.category);
      formData.append("price", product.price);
      formData.append("stockId", product.stockId);
      product.images.forEach((image) => formData.append("images", image));

      const response = await fetch("/api/products", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        showToast("success", "Product added successfully");
        navigate("/admin");
      } else {
        const data = await response.json().catch(() => ({}));
        showToast("error", data.message || "Failed to add product");
      }
    } catch (error) {
      console.error("Error adding product:", error);
      showToast("error", "Network error adding product");
    } finally {
      setSubmitting(false);
    }
  };

  // Add category
  const addCategory = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("name", category.name);
      if (category.image) formData.append("image", category.image);

      const response = await fetch("/api/categories", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        showToast("success", "Category added successfully");
        navigate("/admin");
      } else {
        const data = await response.json().catch(() => ({}));
        showToast("error", data.message || "Failed to add category");
      }
    } catch (error) {
      console.error("Error adding category:", error);
      showToast("error", "Network error adding category");
    } finally {
      setSubmitting(false);
    }
  };

  // Similar UI as UpdateProduct.jsx, but with "Add" labels and no delete buttons
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
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
              className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg transform -translate-y-1 transition-all duration-300"
            >
              <i className="fas fa-box"></i>
              <span>Add Product</span>
            </a>
            <a
              href="/update-product"
              className="flex items-center space-x-2 px-4 py-2 rounded-xl text-gray-700 hover:bg-blue-600 hover:text-white transition-all duration-300 border border-blue-200"
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

      <div className="max-w-7xl mx-auto px-6 pt-28 pb-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-black bg-gradient-to-r from-blue-900 to-blue-600 bg-clip-text text-transparent mb-3">
            Add Product & Category
          </h1>
          <p className="text-blue-600/80 text-lg">
            Create new products or categories for your Kings Collections
            inventory
          </p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-12">
          {/* Category Form */}
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/50 hover:transform hover:-translate-y-2 transition-all duration-300">
            <div className="flex items-center space-x-4 mb-8">
              <div className="p-4 bg-blue-50 rounded-2xl">
                <i className="fas fa-tags text-2xl text-blue-600"></i>
              </div>
              <h2 className="text-2xl font-black bg-gradient-to-r from-blue-900 to-blue-600 bg-clip-text text-transparent">
                Add Category
              </h2>
            </div>
            <form onSubmit={addCategory} className="space-y-6">
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
                  />
                  <div className="text-center">
                    <i className="fas fa-cloud-upload-alt text-2xl text-blue-500 mb-2"></i>
                    <p className="text-blue-600 font-medium">
                      Click to upload category icon
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
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 disabled:opacity-50"
                >
                  <i className="fas fa-save"></i>
                  <span>{submitting ? "Saving..." : "Add Category"}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Product Form */}
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/50 hover:transform hover:-translate-y-2 transition-all duration-300">
            <div className="flex items-center space-x-4 mb-8">
              <div className="p-4 bg-blue-50 rounded-2xl">
                <i className="fas fa-box text-2xl text-blue-600"></i>
              </div>
              <h2 className="text-2xl font-black bg-gradient-to-r from-blue-900 to-blue-600 bg-clip-text text-transparent">
                Add Product
              </h2>
            </div>
            <form onSubmit={addProduct} className="space-y-6">
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
                  />
                  <div className="text-center">
                    <i className="fas fa-images text-2xl text-blue-500 mb-2"></i>
                    <p className="text-blue-600 font-medium">
                      Click to upload product images
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
                            onClick={() => {
                              setProductPreviews((prev) =>
                                prev.filter((_, i) => i !== index)
                              );
                              setProduct((prev) => ({
                                ...prev,
                                images: prev.images.filter(
                                  (_, i) => i !== index
                                ),
                              }));
                            }}
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
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-2xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 disabled:opacity-50"
                >
                  <i className="fas fa-save"></i>
                  <span>{submitting ? "Saving..." : "Add Product"}</span>
                </button>
              </div>
            </form>
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

export default AddProduct;
