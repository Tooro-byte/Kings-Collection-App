import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";

const CustomerOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [trackingOrder, setTrackingOrder] = useState(null);
  const [clearingOrders, setClearingOrders] = useState(false);

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

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await makeAuthenticatedRequest("/api/orders/recent");

      // Handle different response structures
      if (Array.isArray(response)) {
        setOrders(response);
      } else if (response && Array.isArray(response.orders)) {
        setOrders(response.orders);
      } else if (response && response.success && Array.isArray(response.data)) {
        setOrders(response.data);
      } else {
        console.warn("Unexpected response format:", response);
        setOrders([]);
      }
    } catch (error) {
      console.error("Error fetching orders:", error);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  // UPDATED: Clear all orders function with better error handling
  const clearAllOrders = async () => {
    if (
      !window.confirm(
        "Are you sure you want to clear ALL your order history? This action cannot be undone and will permanently delete all your order records."
      )
    ) {
      return;
    }

    try {
      setClearingOrders(true);
      const response = await makeAuthenticatedRequest(`/api/orders/clear`, {
        method: "DELETE",
      });

      if (response.success) {
        setOrders([]);
        alert(
          `✅ ${response.message} (${
            response.ordersDeleted || 0
          } orders deleted)`
        );
      } else {
        alert("❌ Failed to clear orders");
      }
    } catch (error) {
      console.error("Error clearing orders:", error);
      alert(`❌ Error clearing orders: ${error.message}`);
    } finally {
      setClearingOrders(false);
    }
  };

  const formatPrice = (price) => {
    return parseFloat(price || 0).toLocaleString("en-UG");
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: "bg-yellow-500 text-yellow-900",
      confirmed: "bg-blue-500 text-blue-900",
      processing: "bg-purple-500 text-purple-900",
      shipped: "bg-indigo-500 text-indigo-900",
      delivered: "bg-green-500 text-green-900",
      cancelled: "bg-red-500 text-red-900",
      approved: "bg-green-500 text-green-900",
      rejected: "bg-red-500 text-red-900",
    };
    return colors[status] || "bg-gray-500 text-gray-900";
  };

  const getStatusText = (status) => {
    const texts = {
      pending: "Pending Confirmation",
      confirmed: "Order Confirmed",
      processing: "Processing",
      shipped: "Shipped",
      delivered: "Delivered",
      cancelled: "Cancelled",
      approved: "Approved",
      rejected: "Rejected",
    };
    return texts[status] || status;
  };

  const getStatusIndex = (status) => {
    const statusFlow = [
      "pending",
      "approved",
      "processing",
      "shipped",
      "delivered",
    ];
    return statusFlow.indexOf(status);
  };

  // UPDATED FUNCTION: Better image handling with API base URL
  const getProductImage = (item) => {
    // Handle different possible image sources with proper URL construction
    let imageUrl = "";

    if (item.product?.images?.[0]) {
      imageUrl = item.product.images[0];
    } else if (item.image) {
      imageUrl = item.image;
    } else if (item.product?.image) {
      imageUrl = item.product.image;
    } else if (item.images?.[0]) {
      imageUrl = item.images[0];
    }

    // Ensure the image URL is complete
    if (imageUrl) {
      if (imageUrl.startsWith("http")) {
        return imageUrl;
      } else if (imageUrl.startsWith("/uploads/")) {
        return `${API_BASE_URL}${imageUrl}`;
      } else if (imageUrl.startsWith("/")) {
        return `${API_BASE_URL}${imageUrl}`;
      } else {
        return `${API_BASE_URL}/uploads/${imageUrl}`;
      }
    }

    // Fallback to a nice placeholder
    return "https://images.unsplash.com/photo-1560769629-975ec94e6a86?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=100&h=100&q=80";
  };

  const TrackOrderModal = ({ order, onClose }) => {
    const statusFlow = [
      { status: "pending", label: "Pending", description: "Order received" },
      {
        status: "approved",
        label: "Approved",
        description: "Order approved by admin",
      },
      {
        status: "processing",
        label: "Processing",
        description: "Preparing for shipment",
      },
      { status: "shipped", label: "Shipped", description: "On the way to you" },
      {
        status: "delivered",
        label: "Delivered",
        description: "Order delivered",
      },
    ];

    const currentStatusIndex = getStatusIndex(order.status);

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gray-800 rounded-2xl p-6 max-w-md w-full border border-orange-500"
        >
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-orange-500">Track Order</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white text-2xl"
            >
              ×
            </button>
          </div>

          <div className="space-y-4">
            {statusFlow.map((step, index) => (
              <div key={step.status} className="flex items-start space-x-4">
                <div
                  className={`flex flex-col items-center ${
                    index < statusFlow.length - 1 ? "flex-grow" : ""
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      index <= currentStatusIndex
                        ? "bg-orange-500 text-gray-900"
                        : "bg-gray-600 text-gray-400"
                    }`}
                  >
                    {index < currentStatusIndex ? "✓" : index + 1}
                  </div>
                  {index < statusFlow.length - 1 && (
                    <div
                      className={`flex-grow w-1 mt-2 ${
                        index < currentStatusIndex
                          ? "bg-orange-500"
                          : "bg-gray-600"
                      }`}
                    ></div>
                  )}
                </div>
                <div className="flex-1 pb-6">
                  <div
                    className={`font-semibold ${
                      index <= currentStatusIndex
                        ? "text-orange-500"
                        : "text-gray-400"
                    }`}
                  >
                    {step.label}
                  </div>
                  <div className="text-sm text-gray-400">
                    {step.description}
                  </div>
                  {index === 1 && order.status === "approved" && (
                    <div className="mt-2 p-3 bg-green-900 bg-opacity-50 rounded-lg border border-green-500">
                      <p className="text-green-300 text-sm">
                        ✅ Order approved! You will receive a call from{" "}
                        <strong>+256 785 642772</strong> to confirm delivery
                        details.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 bg-gray-700 rounded-lg">
            <h4 className="font-semibold text-white mb-2">
              Delivery Information
            </h4>
            <p className="text-gray-300 text-sm">
              Order ID: <strong>{order.orderId}</strong>
            </p>
            <p className="text-gray-300 text-sm">
              Contact: <strong>+256 785 642772</strong>
            </p>
            {order.estimatedDelivery && (
              <p className="text-gray-300 text-sm">
                Estimated Delivery: {formatDate(order.estimatedDelivery)}
              </p>
            )}
          </div>
        </motion.div>
      </div>
    );
  };

  // Ensure filteredOrders is always an array
  const filteredOrders = Array.isArray(orders)
    ? filter === "all"
      ? orders
      : orders.filter((order) => order.status === filter)
    : [];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading your orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-800">
      {/* UPDATED: Orange Navigation Bar */}
      <nav className="bg-gradient-to-r from-orange-600 to-amber-600 shadow-lg border-b border-orange-700 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                <span className="text-orange-600 font-bold text-lg">KC</span>
              </div>
              <h1 className="text-2xl font-bold text-white">
                Kings Collections
              </h1>
            </div>

            <div className="flex items-center space-x-6">
              <a
                href="/products"
                className="flex items-center space-x-2 text-white hover:text-orange-200 transition-colors duration-200 px-3 py-2 rounded-lg hover:bg-orange-700"
              >
                <span>🛍️</span>
                <span>Shop</span>
              </a>
              <a
                href="/cart"
                className="flex items-center space-x-2 text-white hover:text-orange-200 transition-colors duration-200 px-3 py-2 rounded-lg hover:bg-orange-700"
              >
                <span>🛒</span>
                <span>Cart</span>
              </a>
              <a
                href="/orders"
                className="flex items-center space-x-2 text-white bg-orange-800 px-3 py-2 rounded-lg font-semibold"
              >
                <span>📦</span>
                <span>Orders</span>
              </a>
              <a
                href="/profile"
                className="flex items-center space-x-2 text-white hover:text-orange-200 transition-colors duration-200 px-3 py-2 rounded-lg hover:bg-orange-700"
              >
                <span>👤</span>
                <span>Profile</span>
              </a>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="bg-gray-800 bg-opacity-80 backdrop-blur-lg rounded-2xl p-8 border border-orange-500 mb-8 transform hover:scale-105 transition-transform duration-300">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-4xl font-bold text-orange-500 mb-2">
                My Orders
              </h1>
              <p className="text-gray-400 text-lg">
                Track and manage your purchases
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-white text-sm">Filter by:</span>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="all">All Orders</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="processing">Processing</option>
                <option value="shipped">Shipped</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>

              {/* UPDATED: Clear Orders Button with loading state */}
              {orders.length > 0 && (
                <button
                  onClick={clearAllOrders}
                  disabled={clearingOrders}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:bg-red-400 disabled:cursor-not-allowed transition-all duration-200"
                >
                  {clearingOrders ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Clearing...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-trash-alt"></i>
                      Clear All Orders
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        {!Array.isArray(orders) || orders.length === 0 ? (
          <div className="bg-gray-800 bg-opacity-80 backdrop-blur-lg rounded-2xl p-12 text-center border border-orange-500">
            <div className="text-6xl mb-4">📦</div>
            <h2 className="text-2xl font-bold text-white mb-4">
              {clearingOrders ? "Clearing Orders..." : "No orders yet"}
            </h2>
            <p className="text-gray-400 mb-6">
              {clearingOrders
                ? "Please wait while we clear your order history..."
                : "Start shopping to see your orders here"}
            </p>
            {!clearingOrders && (
              <a
                href="/products"
                className="bg-orange-500 hover:bg-orange-600 text-gray-900 px-8 py-3 rounded-lg font-bold text-lg transition-colors duration-200 inline-flex items-center space-x-2"
              >
                <span>🛍️</span>
                <span>Start Shopping</span>
              </a>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {filteredOrders.map((order) => (
              <div
                key={order._id || order.id}
                className="bg-gray-800 bg-opacity-80 backdrop-blur-lg rounded-2xl p-6 border border-gray-700 hover:border-orange-500 transition-all duration-300 hover:shadow-2xl hover:shadow-orange-500/20 transform hover:-translate-y-1"
              >
                {/* Order Header */}
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
                  <div className="flex items-center space-x-4">
                    <div className="bg-orange-500 bg-opacity-20 p-3 rounded-xl border border-orange-500">
                      <span className="text-orange-500 text-2xl">📦</span>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white">
                        {order.orderId || `ORDER-${order._id || order.id}`}
                      </h3>
                      <p className="text-gray-400 text-sm">
                        Placed on{" "}
                        {formatDate(order.orderDate || order.createdAt)}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <div
                      className={`px-4 py-2 rounded-full text-sm font-semibold ${getStatusColor(
                        order.status
                      )}`}
                    >
                      {getStatusText(order.status)}
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-orange-500">
                        UGX {formatPrice(order.totalPrice || order.total)}
                      </div>
                      <div className="text-gray-400 text-sm">
                        {order.items && Array.isArray(order.items)
                          ? order.items.reduce(
                              (sum, item) => sum + (item.quantity || 1),
                              0
                            )
                          : 0}{" "}
                        items
                      </div>
                    </div>
                  </div>
                </div>

                {/* Approved Message */}
                {order.status === "approved" && (
                  <div className="mb-6 p-4 bg-green-900 bg-opacity-50 rounded-xl border border-green-500">
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">✅</span>
                      <div>
                        <h4 className="font-semibold text-green-300">
                          Order Approved!
                        </h4>
                        <p className="text-green-200 text-sm">
                          You will receive a call from{" "}
                          <strong>+256 785 642772</strong> to confirm delivery
                          details.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Order Items - UPDATED with proper image display */}
                <div className="border-t border-gray-700 pt-6">
                  <h4 className="text-lg font-semibold text-white mb-4">
                    Order Items
                  </h4>
                  <div className="space-y-4">
                    {order.items &&
                      Array.isArray(order.items) &&
                      order.items.map((item, index) => (
                        <div
                          key={index}
                          className="flex items-center space-x-4 p-4 bg-gray-900 rounded-xl border border-gray-700"
                        >
                          <img
                            src={getProductImage(item)}
                            alt={item.product?.title || item.title || "Product"}
                            className="w-16 h-16 object-cover rounded-lg border border-gray-600"
                            onError={(e) => {
                              e.target.src =
                                "https://images.unsplash.com/photo-1560769629-975ec94e6a86?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=100&h=100&q=80";
                            }}
                          />
                          <div className="flex-1">
                            <h5 className="font-semibold text-white">
                              {item.product?.title ||
                                item.title ||
                                "Unknown Product"}
                            </h5>
                            <p className="text-gray-400 text-sm">
                              Quantity: {item.quantity || 1} • Size:{" "}
                              {item.size || "N/A"}
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="text-orange-500 font-bold">
                              UGX{" "}
                              {formatPrice(item.product?.price || item.price)}
                            </div>
                            <div className="text-gray-400 text-sm">
                              UGX{" "}
                              {formatPrice(
                                (item.product?.price || item.price || 0) *
                                  (item.quantity || 1)
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Order Footer */}
                <div className="border-t border-gray-700 pt-6 mt-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="text-gray-400 text-sm">
                      Payment Method:{" "}
                      <span className="text-white font-semibold capitalize">
                        {order.paymentMethod || "Not specified"}
                      </span>
                    </div>
                    <div className="flex space-x-3">
                      <button
                        onClick={() => setTrackingOrder(order)}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg font-semibold transition-colors duration-200"
                      >
                        Track Order
                      </button>
                      <button className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-2 rounded-lg font-semibold transition-colors duration-200">
                        View Details
                      </button>
                      {order.status === "delivered" && (
                        <button className="bg-green-600 hover:bg-green-500 text-white px-6 py-2 rounded-lg font-semibold transition-colors duration-200">
                          Rate & Review
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Stats Section */}
        {Array.isArray(orders) && orders.length > 0 && (
          <div className="mt-12 grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-blue-900 bg-opacity-50 rounded-2xl p-6 border border-blue-500 text-center">
              <div className="text-3xl font-bold text-white mb-2">
                {orders.length}
              </div>
              <div className="text-blue-200">Total Orders</div>
            </div>
            <div className="bg-green-900 bg-opacity-50 rounded-2xl p-6 border border-green-500 text-center">
              <div className="text-3xl font-bold text-white mb-2">
                {orders.filter((o) => o.status === "delivered").length}
              </div>
              <div className="text-green-200">Delivered</div>
            </div>
            <div className="bg-purple-900 bg-opacity-50 rounded-2xl p-6 border border-purple-500 text-center">
              <div className="text-3xl font-bold text-white mb-2">
                {
                  orders.filter(
                    (o) => o.status === "processing" || o.status === "shipped"
                  ).length
                }
              </div>
              <div className="text-purple-200">In Progress</div>
            </div>
            <div className="bg-orange-500 bg-opacity-20 rounded-2xl p-6 border border-orange-500 text-center">
              <div className="text-3xl font-bold text-white mb-2">
                UGX{" "}
                {formatPrice(
                  orders.reduce(
                    (total, order) =>
                      total + parseFloat(order.totalPrice || order.total || 0),
                    0
                  )
                )}
              </div>
              <div className="text-orange-200">Total Spent</div>
            </div>
          </div>
        )}
      </div>

      {/* Track Order Modal */}
      {trackingOrder && (
        <TrackOrderModal
          order={trackingOrder}
          onClose={() => setTrackingOrder(null)}
        />
      )}
    </div>
  );
};

export default CustomerOrders;
