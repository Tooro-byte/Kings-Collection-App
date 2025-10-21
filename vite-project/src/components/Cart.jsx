import React, { useState, useEffect } from "react";

const Cart = () => {
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingItems, setUpdatingItems] = useState({});
  const [notification, setNotification] = useState(null);

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

  // Fetch cart items
  const fetchCartItems = async () => {
    try {
      setLoading(true);
      const response = await makeAuthenticatedRequest("/api/cart");

      if (response.success) {
        setCartItems(response.items || []);
      } else {
        showNotification(response.message || "Error loading cart", "error");
        setCartItems([]);
      }
    } catch (error) {
      console.error("Error fetching cart items:", error);
      showNotification("Error loading cart items", "error");
      setCartItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCartItems();
  }, []);

  const showNotification = (message, type = "info") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // Update quantity
  const updateQuantity = async (itemId, newQuantity) => {
    if (newQuantity < 1) return;

    try {
      setUpdatingItems((prev) => ({ ...prev, [itemId]: true }));

      const response = await makeAuthenticatedRequest(
        `/api/cart/item/${itemId}`,
        {
          method: "PUT",
          body: JSON.stringify({ quantity: newQuantity }),
        }
      );

      if (response.success) {
        await fetchCartItems();
        showNotification("Cart updated successfully", "success");
      } else {
        showNotification(
          response.message || "Error updating quantity",
          "error"
        );
      }
    } catch (error) {
      console.error("Error updating quantity:", error);
      showNotification("Error updating quantity", "error");
    } finally {
      setUpdatingItems((prev) => ({ ...prev, [itemId]: false }));
    }
  };

  // Remove item from cart
  const removeItem = async (itemId) => {
    try {
      setUpdatingItems((prev) => ({ ...prev, [itemId]: true }));

      const response = await makeAuthenticatedRequest(
        `/api/cart/item/${itemId}`,
        {
          method: "DELETE",
        }
      );

      if (response.success) {
        await fetchCartItems();
        showNotification("Item removed from cart", "success");
      } else {
        showNotification(response.message || "Error removing item", "error");
      }
    } catch (error) {
      console.error("Error removing item:", error);
      showNotification("Error removing item", "error");
    } finally {
      setUpdatingItems((prev) => ({ ...prev, [itemId]: false }));
    }
  };

  // Clear entire cart
  const clearCart = async () => {
    try {
      const response = await makeAuthenticatedRequest("/api/cart/clear", {
        method: "DELETE",
      });

      if (response.success) {
        await fetchCartItems();
        showNotification("Cart cleared successfully", "success");
      } else {
        showNotification(response.message || "Error clearing cart", "error");
      }
    } catch (error) {
      console.error("Error clearing cart:", error);
      showNotification("Error clearing cart", "error");
    }
  };

  // Calculate totals
  const calculateTotals = () => {
    const subtotal = cartItems.reduce((total, item) => {
      const price = item.product?.price || item.price || 0;
      const quantity = item.quantity || 1;
      return total + parseFloat(price) * quantity;
    }, 0);

    const shipping = subtotal > 0 ? 10000 : 0; // UGX 10,000 shipping
    const total = subtotal + shipping;

    return { subtotal, shipping, total };
  };

  const { subtotal, shipping, total } = calculateTotals();

  const formatPrice = (price) => {
    return parseFloat(price).toLocaleString("en-UG");
  };

  const getProductImageUrl = (image) => {
    if (!image) return "/images/placeholder.jpg";
    if (image.startsWith("http")) return image;
    if (image.startsWith("/")) return `${API_BASE_URL}${image}`;
    return `${API_BASE_URL}/uploads/${image}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-gold-500 mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading cart...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white">
      {/* Notification */}
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
                href="/products"
                className="flex items-center space-x-2 text-white hover:text-gold-500 transition-colors duration-200 px-3 py-2 rounded-lg hover:bg-gold-500 hover:bg-opacity-10"
              >
                <span>🛍️</span>
                <span>Continue Shopping</span>
              </a>
              <a
                href="/orders"
                className="flex items-center space-x-2 text-white hover:text-gold-500 transition-colors duration-200 px-3 py-2 rounded-lg hover:bg-gold-500 hover:bg-opacity-10"
              >
                <span>📦</span>
                <span>Orders</span>
              </a>
              <a
                href="/profile"
                className="flex items-center space-x-2 text-white hover:text-gold-500 transition-colors duration-200 px-3 py-2 rounded-lg hover:bg-gold-500 hover:bg-opacity-10"
              >
                <span>👤</span>
                <span>Profile</span>
              </a>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gold-500 mb-2">
                Shopping Cart
              </h1>
              <p className="text-gray-400">
                Review your items and proceed to checkout
              </p>
            </div>
            {cartItems.length > 0 && (
              <button
                onClick={clearCart}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors duration-200 flex items-center space-x-2"
              >
                <span>🗑️</span>
                <span>Clear Cart</span>
              </button>
            )}
          </div>
        </div>

        {cartItems.length === 0 ? (
          <div className="bg-gray-800 rounded-xl p-12 text-center border border-gray-700">
            <div className="text-6xl mb-4">🛒</div>
            <h2 className="text-2xl font-bold text-white mb-4">
              Your cart is empty
            </h2>
            <p className="text-gray-400 mb-6">
              Add some products to your cart to see them here
            </p>
            <a
              href="/products"
              className="bg-gold-500 hover:bg-gold-600 text-gray-900 px-8 py-3 rounded-lg font-bold text-lg transition-colors duration-200 inline-flex items-center space-x-2"
            >
              <span>🛍️</span>
              <span>Start Shopping</span>
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2">
              <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                <div className="p-6 border-b border-gray-700">
                  <h2 className="text-xl font-bold text-gold-500">
                    Cart Items ({cartItems.length})
                  </h2>
                </div>

                <div className="divide-y divide-gray-700">
                  {cartItems.map((item) => (
                    <div key={item.addedAt} className="p-6">
                      <div className="flex flex-col sm:flex-row gap-4">
                        {/* Product Image */}
                        <div className="flex-shrink-0">
                          <img
                            src={getProductImageUrl(
                              item.product?.images?.[0] || item.image
                            )}
                            alt={item.product?.title || item.title}
                            className="w-20 h-20 object-cover rounded-lg"
                            onError={(e) => {
                              e.target.src = "/images/placeholder.jpg";
                            }}
                          />
                        </div>

                        {/* Product Details */}
                        <div className="flex-1">
                          <h3 className="font-semibold text-white text-lg mb-1">
                            {item.product?.title ||
                              item.title ||
                              "Unknown Product"}
                          </h3>
                          <p className="text-gray-400 text-sm mb-2">
                            {item.size && `Size: ${item.size}`}
                          </p>
                          <div className="text-gold-500 font-bold text-lg">
                            UGX{" "}
                            {formatPrice(
                              item.product?.price || item.price || 0
                            )}
                          </div>
                        </div>

                        {/* Quantity Controls */}
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() =>
                                updateQuantity(
                                  item.addedAt,
                                  (item.quantity || 1) - 1
                                )
                              }
                              disabled={
                                updatingItems[item.addedAt] ||
                                item.quantity <= 1
                              }
                              className="w-8 h-8 rounded-full bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors duration-200"
                            >
                              -
                            </button>
                            <span className="w-12 text-center font-semibold">
                              {updatingItems[item.addedAt] ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gold-500 mx-auto"></div>
                              ) : (
                                item.quantity || 1
                              )}
                            </span>
                            <button
                              onClick={() =>
                                updateQuantity(
                                  item.addedAt,
                                  (item.quantity || 1) + 1
                                )
                              }
                              disabled={updatingItems[item.addedAt]}
                              className="w-8 h-8 rounded-full bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors duration-200"
                            >
                              +
                            </button>
                          </div>

                          {/* Remove Button */}
                          <button
                            onClick={() => removeItem(item.addedAt)}
                            disabled={updatingItems[item.addedAt]}
                            className="text-red-400 hover:text-red-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 p-2"
                            title="Remove item"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>

                      {/* Item Total */}
                      <div className="mt-4 pt-4 border-t border-gray-700 flex justify-between items-center">
                        <span className="text-gray-400">Item Total:</span>
                        <span className="text-gold-500 font-bold text-lg">
                          UGX{" "}
                          {formatPrice(
                            (item.product?.price || item.price || 0) *
                              (item.quantity || 1)
                          )}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 sticky top-24">
                <h2 className="text-xl font-bold text-gold-500 mb-6">
                  Order Summary
                </h2>

                <div className="space-y-4 mb-6">
                  <div className="flex justify-between text-gray-300">
                    <span>
                      Subtotal (
                      {cartItems.reduce(
                        (sum, item) => sum + (item.quantity || 1),
                        0
                      )}{" "}
                      items)
                    </span>
                    <span>UGX {formatPrice(subtotal)}</span>
                  </div>

                  <div className="flex justify-between text-gray-300">
                    <span>Shipping</span>
                    <span>UGX {formatPrice(shipping)}</span>
                  </div>

                  <div className="border-t border-gray-700 pt-4 flex justify-between text-lg font-bold text-white">
                    <span>Total</span>
                    <span className="text-gold-500">
                      UGX {formatPrice(total)}
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  <a
                    href="/payment"
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-3 px-6 rounded-lg font-bold text-center block transition-all duration-200 hover:shadow-lg hover:shadow-emerald-500/30 hover:-translate-y-0.5"
                  >
                    Proceed to Checkout
                  </a>

                  <a
                    href="/products"
                    className="w-full bg-gray-700 hover:bg-gray-600 text-white py-3 px-6 rounded-lg font-bold text-center block transition-colors duration-200"
                  >
                    Continue Shopping
                  </a>
                </div>

                <div className="mt-6 p-4 bg-gray-900 rounded-lg border border-gold-500 border-opacity-30">
                  <h3 className="font-semibold text-gold-500 mb-2">
                    📦 Delivery Information
                  </h3>
                  <p className="text-sm text-gray-400">
                    Free delivery within Kampala for orders over UGX 200,000.
                    Standard delivery: 2-3 business days.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Cart;
