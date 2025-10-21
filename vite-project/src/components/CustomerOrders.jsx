import React, { useState, useEffect } from "react";

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState(null);

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
    };
    return texts[status] || status;
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
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-gold-500 mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading your orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-800">
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
                <span>Shop</span>
              </a>
              <a
                href="/cart"
                className="flex items-center space-x-2 text-white hover:text-gold-500 transition-colors duration-200 px-3 py-2 rounded-lg hover:bg-gold-500 hover:bg-opacity-10"
              >
                <span>🛒</span>
                <span>Cart</span>
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
        {/* Header */}
        <div className="bg-gray-800 bg-opacity-80 backdrop-blur-lg rounded-2xl p-8 border border-gold-500 mb-8 transform hover:scale-105 transition-transform duration-300">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-4xl font-bold text-gold-500 mb-2">
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
                className="bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
              >
                <option value="all">All Orders</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="processing">Processing</option>
                <option value="shipped">Shipped</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </div>

        {!Array.isArray(orders) || orders.length === 0 ? (
          <div className="bg-gray-800 bg-opacity-80 backdrop-blur-lg rounded-2xl p-12 text-center border border-gold-500">
            <div className="text-6xl mb-4">📦</div>
            <h2 className="text-2xl font-bold text-white mb-4">
              No orders yet
            </h2>
            <p className="text-gray-400 mb-6">
              Start shopping to see your orders here
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
          <div className="space-y-6">
            {filteredOrders.map((order) => (
              <div
                key={order._id || order.id}
                className="bg-gray-800 bg-opacity-80 backdrop-blur-lg rounded-2xl p-6 border border-gray-700 hover:border-gold-500 transition-all duration-300 hover:shadow-2xl hover:shadow-gold-500/20 transform hover:-translate-y-1"
              >
                {/* Order Header */}
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
                  <div className="flex items-center space-x-4">
                    <div className="bg-gold-500 bg-opacity-20 p-3 rounded-xl border border-gold-500">
                      <span className="text-gold-500 text-2xl">📦</span>
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
                      <div className="text-2xl font-bold text-gold-500">
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

                {/* Order Items */}
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
                            src={
                              item.product?.images?.[0] ||
                              item.image ||
                              "/images/placeholder.jpg"
                            }
                            alt={item.product?.title || item.title || "Product"}
                            className="w-16 h-16 object-cover rounded-lg"
                            onError={(e) => {
                              e.target.src = "/images/placeholder.jpg";
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
                            <div className="text-gold-500 font-bold">
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
                      <button className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg font-semibold transition-colors duration-200">
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
            <div className="bg-gold-500 bg-opacity-20 rounded-2xl p-6 border border-gold-500 text-center">
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
              <div className="text-gold-200">Total Spent</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Orders;
