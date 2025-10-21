import React, { useState, useEffect, useCallback } from "react";

const StockProducts = () => {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [activeCategory, setActiveCategory] = useState("all");
  const [cartCount, setCartCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSizes, setSelectedSizes] = useState({});
  const [loadingStates, setLoadingStates] = useState({});
  const [notification, setNotification] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [quickViewProduct, setQuickViewProduct] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // API base URL
  const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL || "http://localhost:3005";

  // Helper function for authenticated requests
  const makeAuthenticatedRequest = async (url, options = {}) => {
    const defaultOptions = {
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(`${API_BASE_URL}${url}`, defaultOptions);

      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = "/login";
          throw new Error("Authentication required");
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API Request failed for ${url}:`, error);
      throw error;
    }
  };

  // Fetch initial data
  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setIsLoading(true);

      // Fetch categories
      const categoriesResponse = await makeAuthenticatedRequest(
        "/api/categories"
      );
      console.log("Categories API response:", categoriesResponse);

      let categoriesData = [];
      if (Array.isArray(categoriesResponse)) {
        categoriesData = categoriesResponse;
      } else if (
        categoriesResponse &&
        categoriesResponse.success &&
        Array.isArray(categoriesResponse.categories)
      ) {
        categoriesData = categoriesResponse.categories;
      } else if (categoriesResponse && Array.isArray(categoriesResponse.data)) {
        categoriesData = categoriesResponse.data;
      }

      setCategories(categoriesData);

      // Fetch products
      const productsResponse = await makeAuthenticatedRequest("/api/products");
      console.log("Products API response:", productsResponse);

      let productsData = [];
      if (
        productsResponse &&
        productsResponse.success &&
        Array.isArray(productsResponse.products)
      ) {
        productsData = productsResponse.products;
      } else if (Array.isArray(productsResponse)) {
        productsData = productsResponse;
      } else if (productsResponse && Array.isArray(productsResponse.data)) {
        productsData = productsResponse.data;
      }

      setProducts(productsData);
      setFilteredProducts(productsData);

      // Fetch cart count
      await fetchCartCount();
    } catch (error) {
      console.error("Error fetching initial data:", error);
      showNotification("Error loading products. Please try again.", "error");
      // Set empty arrays to prevent map errors
      setCategories([]);
      setProducts([]);
      setFilteredProducts([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Fixed cart count function
  const fetchCartCount = async () => {
    try {
      const response = await makeAuthenticatedRequest("/api/cart/count");

      if (response.success) {
        setCartCount(response.totalProducts || 0);
      } else {
        setCartCount(0);
      }
    } catch (error) {
      console.error("Error fetching cart count:", error);
      setCartCount(0);
    }
  };

  // Improved search function
  const searchProducts = useCallback((productsList, term) => {
    if (!term.trim()) return productsList;

    const searchTerms = term
      .toLowerCase()
      .trim()
      .split(/\s+/)
      .filter((t) => t.length > 0);

    return productsList.filter((product) => {
      const searchableText = [
        product.title || "",
        product.name || "",
        product.description || "",
        product.category?.name || "",
        product.brand || "",
        product.color || "",
      ]
        .join(" ")
        .toLowerCase();

      // Check if ALL search terms are found in the product (AND logic)
      return searchTerms.every((searchTerm) =>
        searchableText.includes(searchTerm)
      );
    });
  }, []);

  // Filter products based on category and search term
  useEffect(() => {
    let filtered = Array.isArray(products) ? products : [];

    // Filter by category first
    if (activeCategory !== "all") {
      filtered = filtered.filter(
        (product) =>
          product.category_id === parseInt(activeCategory) ||
          (product.category && product.category._id === activeCategory) ||
          (product.category && product.category.id === parseInt(activeCategory))
      );
    }

    // Then apply search filter
    if (searchTerm) {
      filtered = searchProducts(filtered, searchTerm);
    }

    setFilteredProducts(filtered);
  }, [activeCategory, searchTerm, products, searchProducts]);

  const handleCategoryClick = (categoryId, categoryName) => {
    setActiveCategory(categoryId);

    const productsContainer = document.getElementById("products-container");
    if (productsContainer) {
      productsContainer.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleSizeSelect = (productId, size) => {
    setSelectedSizes((prev) => ({
      ...prev,
      [productId]: size,
    }));
  };

  // Improved add to cart function
  const handleAddToCart = async (productId) => {
    const selectedSize = selectedSizes[productId];
    const product = Array.isArray(products)
      ? products.find((p) => p._id === productId || p.id === productId)
      : null;

    if (!product) {
      showNotification("Product not found", "error");
      return;
    }

    // Validate size selection if product has sizes
    if (product.size && product.size.length > 0 && !selectedSize) {
      showNotification("Please select a size before adding to cart", "error");
      return;
    }

    // Set loading state for this product
    setLoadingStates((prev) => ({
      ...prev,
      [productId]: true,
    }));

    try {
      const cartData = {
        productId: productId,
        quantity: 1,
        size: selectedSize || null,
      };

      const response = await makeAuthenticatedRequest("/api/cart", {
        method: "POST",
        body: JSON.stringify(cartData),
      });

      if (response.success) {
        // Update cart count from the response
        const newCount = response.cart?.totalProducts || cartCount + 1;
        setCartCount(newCount);
        showNotification("Product added to cart successfully!", "success");

        // Refresh cart count to ensure it's accurate
        await fetchCartCount();
      } else {
        showNotification(
          response.message || "Failed to add product to cart",
          "error"
        );
      }
    } catch (error) {
      console.error("Error adding to cart:", error);
      showNotification(
        "Failed to add product to cart. Please try again.",
        "error"
      );
    } finally {
      // Always remove loading state
      setTimeout(() => {
        setLoadingStates((prev) => ({
          ...prev,
          [productId]: false,
        }));
      }, 1000);
    }
  };

  // Improved Quick View with image gallery
  const showQuickView = (product) => {
    setQuickViewProduct(product);
    setCurrentImageIndex(0);
  };

  const closeQuickView = () => {
    setQuickViewProduct(null);
    setCurrentImageIndex(0);
  };

  const nextImage = () => {
    if (quickViewProduct) {
      const images = quickViewProduct.images || [];
      setCurrentImageIndex((prev) =>
        prev === images.length - 1 ? 0 : prev + 1
      );
    }
  };

  const prevImage = () => {
    if (quickViewProduct) {
      const images = quickViewProduct.images || [];
      setCurrentImageIndex((prev) =>
        prev === 0 ? images.length - 1 : prev - 1
      );
    }
  };

  const showNotification = (message, type = "info") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const getActiveCategoryName = () => {
    if (activeCategory === "all") return "All Categories";
    const category = Array.isArray(categories)
      ? categories.find(
          (cat) =>
            cat._id === activeCategory || cat.id === parseInt(activeCategory)
        )
      : null;
    return category ? category.name : "All Categories";
  };

  const getProductImageUrl = (image) => {
    if (!image) return "/images/placeholder.jpg";
    if (image.startsWith("http")) return image;
    if (image.startsWith("/")) return `${API_BASE_URL}${image}`;
    return `${API_BASE_URL}/uploads/${image}`;
  };

  const getCategoryImageUrl = (image) => {
    if (!image) return null;
    if (image.startsWith("http")) return image;
    if (image.startsWith("/")) return `${API_BASE_URL}${image}`;
    return `${API_BASE_URL}/upload/category/${image}`;
  };

  // Format price consistently
  const formatPrice = (price) => {
    if (!price) return "0.00";
    return parseFloat(price).toLocaleString();
  };

  // Get product ID consistently
  const getProductId = (product) => {
    return product._id || product.id;
  };

  // Get product title consistently
  const getProductTitle = (product) => {
    return product.title || product.name || "Untitled Product";
  };

  // Clear search function
  const clearSearch = () => {
    setSearchTerm("");
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-gold-500 mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading products...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white">
      {/* Notification System */}
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg transform transition-all duration-300 ${
            notification.type === "error"
              ? "bg-red-600"
              : notification.type === "success"
              ? "bg-green-600"
              : "bg-blue-600"
          }`}
        >
          <div className="flex items-center">
            <span className="mr-2">
              {notification.type === "error"
                ? "❌"
                : notification.type === "success"
                ? "✅"
                : "ℹ️"}
            </span>
            {notification.message}
          </div>
        </div>
      )}

      {/* Quick View Modal */}
      {quickViewProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden border-2 border-gold-500">
            <div className="relative">
              {/* Close Button */}
              <button
                onClick={closeQuickView}
                className="absolute top-4 right-4 z-10 bg-gray-900 hover:bg-red-600 text-white rounded-full w-10 h-10 flex items-center justify-center transition-colors duration-200"
              >
                ✕
              </button>

              {/* Image Gallery */}
              <div className="relative h-96 bg-gray-900">
                <img
                  src={getProductImageUrl(
                    quickViewProduct.images?.[currentImageIndex]
                  )}
                  alt={getProductTitle(quickViewProduct)}
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    e.target.src = "/images/placeholder.jpg";
                  }}
                />

                {/* Navigation Arrows - Only show if multiple images */}
                {(quickViewProduct.images || []).length > 1 && (
                  <>
                    <button
                      onClick={prevImage}
                      className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-gray-900 bg-opacity-70 hover:bg-opacity-90 text-white rounded-full w-12 h-12 flex items-center justify-center transition-all duration-200 hover:scale-110"
                    >
                      ‹
                    </button>
                    <button
                      onClick={nextImage}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-gray-900 bg-opacity-70 hover:bg-opacity-90 text-white rounded-full w-12 h-12 flex items-center justify-center transition-all duration-200 hover:scale-110"
                    >
                      ›
                    </button>
                  </>
                )}

                {/* Image Counter */}
                {(quickViewProduct.images || []).length > 1 && (
                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-gray-900 bg-opacity-70 text-white px-3 py-1 rounded-full text-sm">
                    {currentImageIndex + 1} /{" "}
                    {(quickViewProduct.images || []).length}
                  </div>
                )}
              </div>

              {/* Product Details */}
              <div className="p-6">
                <h2 className="text-2xl font-bold text-gold-500 mb-2">
                  {getProductTitle(quickViewProduct)}
                </h2>

                <p className="text-gray-300 mb-4 leading-relaxed">
                  {quickViewProduct.description || "No description available"}
                </p>

                <div className="flex items-center justify-between mb-4">
                  <div className="text-2xl font-bold text-gold-500">
                    UGX {formatPrice(quickViewProduct.price)}
                  </div>

                  {/* Size Selection */}
                  {quickViewProduct.size &&
                    Array.isArray(quickViewProduct.size) &&
                    quickViewProduct.size.length > 0 && (
                      <select
                        className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
                        value={
                          selectedSizes[getProductId(quickViewProduct)] || ""
                        }
                        onChange={(e) =>
                          handleSizeSelect(
                            getProductId(quickViewProduct),
                            e.target.value
                          )
                        }
                      >
                        <option value="">Select Size</option>
                        {quickViewProduct.size.map((sizeOption) => (
                          <option key={sizeOption} value={sizeOption}>
                            {sizeOption}
                          </option>
                        ))}
                      </select>
                    )}
                </div>

                {/* Add to Cart Button in Quick View */}
                <button
                  className={`w-full py-3 rounded-lg font-bold text-lg transition-all duration-200 flex items-center justify-center space-x-2 ${
                    loadingStates[getProductId(quickViewProduct)]
                      ? "bg-emerald-700 cursor-not-allowed"
                      : "bg-emerald-600 hover:bg-emerald-500 text-white hover:shadow-lg hover:shadow-emerald-500/30 hover:-translate-y-0.5"
                  }`}
                  onClick={() =>
                    handleAddToCart(getProductId(quickViewProduct))
                  }
                  disabled={loadingStates[getProductId(quickViewProduct)]}
                >
                  {loadingStates[getProductId(quickViewProduct)] ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>Adding to Cart...</span>
                    </>
                  ) : (
                    <>
                      <span>🛒</span>
                      <span>Add to Cart</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Bar */}
      <nav className="bg-gray-900 bg-opacity-95 backdrop-blur-lg sticky top-0 z-40 border-b-2 border-gold-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gold-500 rounded-full flex items-center justify-center">
                <span className="text-gray-900 font-bold text-sm">K</span>
              </div>
              <h1 className="text-2xl font-bold text-gold-500">
                Kings Collections
              </h1>
            </div>

            <div className="flex items-center space-x-6">
              <a
                href="/cart"
                className="flex items-center space-x-2 text-white hover:text-gold-500 transition-colors duration-200 px-3 py-2 rounded-lg hover:bg-gold-500 hover:bg-opacity-10"
              >
                <span>🛒</span>
                <span>MyCart</span>
                <span className="text-blue-400 font-semibold">
                  ({cartCount})
                </span>
              </a>
              <a
                href="/orders"
                className="flex items-center space-x-2 text-white hover:text-gold-500 transition-colors duration-200 px-3 py-2 rounded-lg hover:bg-gold-500 hover:bg-opacity-10"
              >
                <span>📦</span>
                <span>Orders</span>
              </a>
              <a
                href="/payment"
                className="flex items-center space-x-2 text-white hover:text-gold-500 transition-colors duration-200 px-3 py-2 rounded-lg hover:bg-gold-500 hover:bg-opacity-10"
              >
                <span>💳</span>
                <span>Payment</span>
              </a>
              <a
                href="/profile"
                className="flex items-center space-x-2 text-white hover:text-gold-500 transition-colors duration-200 px-3 py-2 rounded-lg hover:bg-gold-500 hover:bg-opacity-10"
              >
                <span>👤</span>
                <span>Profile</span>
              </a>
              <a
                href="/client"
                className="flex items-center space-x-2 text-white hover:text-gold-500 transition-colors duration-200 px-3 py-2 rounded-lg hover:bg-gold-500 hover:bg-opacity-10"
              >
                <span>↩️</span>
                <span>Go Back</span>
              </a>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <aside className="lg:w-80 bg-gray-800 rounded-xl p-6 border border-gray-700 lg:sticky lg:top-24 self-start">
            <div className="border-b border-gold-500 pb-4 mb-6">
              <h2 className="text-xl font-bold text-gold-500 flex items-center space-x-2">
                <span>📁</span>
                <span>Categories</span>
              </h2>
            </div>

            <div className="space-y-3">
              <div
                className={`flex items-center space-x-4 p-4 rounded-xl cursor-pointer transition-all duration-200 border ${
                  activeCategory === "all"
                    ? "bg-gold-500 text-gray-900 border-gold-500"
                    : "border-transparent hover:border-gold-500 hover:bg-gold-500 hover:bg-opacity-10"
                }`}
                onClick={() => handleCategoryClick("all", "ALL CATEGORIES")}
              >
                <div className="w-12 h-12 bg-gold-500 bg-opacity-20 rounded-lg flex items-center justify-center">
                  <span className="text-gold-500">📦</span>
                </div>
                <div className="font-semibold text-sm tracking-wide">
                  ALL CATEGORIES
                </div>
              </div>

              {Array.isArray(categories) && categories.length > 0 ? (
                categories.map((category) => {
                  const categoryId = category._id || category.id;
                  return (
                    <div
                      key={categoryId}
                      className={`flex items-center space-x-4 p-4 rounded-xl cursor-pointer transition-all duration-200 border ${
                        activeCategory === categoryId.toString()
                          ? "bg-gold-500 text-gray-900 border-gold-500"
                          : "border-transparent hover:border-gold-500 hover:bg-gold-500 hover:bg-opacity-10"
                      }`}
                      onClick={() =>
                        handleCategoryClick(
                          categoryId.toString(),
                          category.name
                        )
                      }
                    >
                      <div className="w-12 h-12 bg-gold-500 bg-opacity-20 rounded-lg flex items-center justify-center overflow-hidden">
                        {getCategoryImageUrl(category.image) ? (
                          <img
                            src={getCategoryImageUrl(category.image)}
                            alt={category.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.style.display = "none";
                              e.target.nextSibling.style.display = "flex";
                            }}
                          />
                        ) : null}
                        <div
                          className="text-gold-500"
                          style={{
                            display: getCategoryImageUrl(category.image)
                              ? "none"
                              : "flex",
                          }}
                        >
                          📂
                        </div>
                      </div>
                      <div className="font-semibold text-sm">
                        {category.name}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <span className="text-4xl mb-2 block">📂</span>
                  <p>No categories available</p>
                  <p className="text-sm mt-2">
                    Categories will appear here once added
                  </p>
                </div>
              )}
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1">
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 mb-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-3xl font-bold text-gold-500">
                  Men's Collection
                </h1>
                <div className="text-right">
                  <div className="text-lg font-semibold text-gold-500">
                    {getActiveCategoryName()}
                  </div>
                  <div className="text-gray-400 text-sm">
                    {Array.isArray(filteredProducts)
                      ? filteredProducts.length
                      : 0}{" "}
                    Products
                    {searchTerm && (
                      <span className="text-gold-500 ml-2">
                        (search: "{searchTerm}")
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Improved Search Bar */}
            <div className="mb-6 relative">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search products by name, description, category, brand..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent pr-12"
                />
                {searchTerm && (
                  <button
                    onClick={clearSearch}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors duration-200"
                  >
                    ✕
                  </button>
                )}
              </div>
              {searchTerm && (
                <div className="mt-2 text-sm text-gray-400">
                  Search tips: Try product names, descriptions, categories, or
                  brands
                </div>
              )}
            </div>

            {/* Products Grid */}
            <div
              id="products-container"
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {Array.isArray(filteredProducts) &&
              filteredProducts.length > 0 ? (
                filteredProducts.map((product) => {
                  const productId = getProductId(product);
                  const productTitle = getProductTitle(product);

                  return (
                    <div
                      key={productId}
                      className="bg-gray-800 rounded-xl overflow-hidden border border-gray-700 transition-all duration-300 hover:border-gold-500 hover:shadow-2xl hover:shadow-gold-500/20 hover:-translate-y-2"
                    >
                      <div className="relative h-64 overflow-hidden">
                        <img
                          src={getProductImageUrl(product.images?.[0])}
                          alt={productTitle}
                          className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                          onError={(e) => {
                            e.target.src = "/images/placeholder.jpg";
                          }}
                        />
                        <div
                          className="absolute inset-0 bg-gray-900 bg-opacity-80 flex items-center justify-center opacity-0 transition-opacity duration-300 hover:opacity-100 cursor-pointer"
                          onClick={() => showQuickView(product)}
                        >
                          <div className="text-gold-500 font-bold text-lg uppercase tracking-wider">
                            Quick View
                          </div>
                        </div>
                      </div>

                      <div className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="text-lg font-semibold text-white flex-1 mr-2">
                            {productTitle}
                          </h3>
                          <div className="text-xs text-gray-400 bg-gold-500 bg-opacity-20 px-2 py-1 rounded border border-gold-500">
                            Stock ID:{" "}
                            {product.stockId ||
                              product.stock_id ||
                              productId ||
                              "N/A"}
                          </div>
                        </div>

                        <p className="text-gray-400 text-sm mb-4 leading-relaxed">
                          {product.description || "No description available"}
                        </p>

                        <div className="flex items-center justify-between">
                          <div className="text-xl font-bold text-gold-500">
                            UGX {formatPrice(product.price)}
                          </div>

                          <div className="flex items-center space-x-2">
                            {product.size &&
                              Array.isArray(product.size) &&
                              product.size.length > 0 && (
                                <select
                                  className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm focus:outline-none focus:ring-1 focus:ring-gold-500"
                                  value={selectedSizes[productId] || ""}
                                  onChange={(e) =>
                                    handleSizeSelect(productId, e.target.value)
                                  }
                                >
                                  <option value="">Select Size</option>
                                  {product.size.map((sizeOption) => (
                                    <option key={sizeOption} value={sizeOption}>
                                      {sizeOption}
                                    </option>
                                  ))}
                                </select>
                              )}

                            {/* Updated Add to Cart Button with Emerald Color */}
                            <button
                              className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-semibold transition-all duration-200 ${
                                loadingStates[productId]
                                  ? "bg-emerald-700 cursor-not-allowed"
                                  : "bg-emerald-600 hover:bg-emerald-500 text-white hover:shadow-lg hover:shadow-emerald-500/30 hover:-translate-y-0.5"
                              }`}
                              onClick={() => handleAddToCart(productId)}
                              disabled={loadingStates[productId]}
                            >
                              {loadingStates[productId] ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                  <span>Adding...</span>
                                </>
                              ) : (
                                <>
                                  <span>🛒</span>
                                  <span>Add to Cart</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="col-span-full text-center py-12">
                  <span className="text-6xl mb-4 block">🔍</span>
                  <h3 className="text-2xl font-bold text-white mb-2">
                    {searchTerm
                      ? "No matching products found"
                      : "No products found"}
                  </h3>
                  <p className="text-gray-400 mb-4">
                    {searchTerm
                      ? `No products found for "${searchTerm}". Try different keywords or check the spelling.`
                      : activeCategory !== "all"
                      ? "No products available in this category"
                      : "No products available in the store"}
                  </p>
                  {searchTerm && (
                    <button
                      onClick={clearSearch}
                      className="bg-gold-500 hover:bg-gold-600 text-gray-900 px-6 py-2 rounded-lg font-semibold transition-colors duration-200"
                    >
                      Clear Search
                    </button>
                  )}
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default StockProducts;
