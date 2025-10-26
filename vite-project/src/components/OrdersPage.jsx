import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";

const OrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);

  const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL || "http://localhost:3005";

  const makeAuthenticatedRequest = async (url, options = {}) => {
    const defaultOptions = {
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(`${API_BASE_URL}${url}`, defaultOptions);

      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = "/admin/login";
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

  const fetchOrders = async (page = 1, status = "") => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "10",
        ...(status && { status }),
      });

      const data = await makeAuthenticatedRequest(
        `/api/admin/orders?${params}`
      );
      setOrders(data.orders || []);
      setTotalPages(data.totalPages || 1);
      setCurrentPage(data.currentPage || 1);
    } catch (error) {
      console.error("Error fetching orders:", error);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // NEW FUNCTION: Clear all orders
  const clearAllOrders = async () => {
    if (
      !window.confirm(
        "Are you sure you want to clear ALL orders? This action cannot be undone and will delete all order records permanently."
      )
    ) {
      return;
    }

    try {
      const response = await makeAuthenticatedRequest(
        `/api/admin/orders/clear`,
        {
          method: "DELETE",
        }
      );

      if (response.success) {
        setOrders([]);
        setTotalPages(1);
        setCurrentPage(1);
        alert("All orders have been cleared successfully");
      } else {
        alert("Failed to clear orders");
      }
    } catch (error) {
      console.error("Error clearing orders:", error);
      alert("Error clearing orders");
    }
  };

  const updateOrderStatus = async (orderId, status, notes = "") => {
    try {
      const response = await makeAuthenticatedRequest(
        `/api/admin/orders/${orderId}/status`,
        {
          method: "PATCH",
          body: JSON.stringify({ status, notes }),
        }
      );

      if (response.success) {
        fetchOrders(currentPage, statusFilter);
        // Send notification to customer
        await makeAuthenticatedRequest(`/api/admin/orders/${orderId}/notify`, {
          method: "POST",
          body: JSON.stringify({ status, notes }),
        });
      } else {
        alert("Failed to update order status");
      }
    } catch (error) {
      console.error("Error updating order status:", error);
      alert("Error updating order status");
    }
  };

  const deleteOrder = async (orderId) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this order? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      const response = await makeAuthenticatedRequest(
        `/api/admin/orders/${orderId}`,
        {
          method: "DELETE",
        }
      );

      if (response.success) {
        fetchOrders(currentPage, statusFilter);
        alert("Order deleted successfully");
      } else {
        alert("Failed to delete order");
      }
    } catch (error) {
      console.error("Error deleting order:", error);
      alert("Error deleting order");
    }
  };

  const cancelOrder = async (orderId, reason) => {
    if (!reason) {
      alert("Please provide a cancellation reason");
      return;
    }

    try {
      await updateOrderStatus(orderId, "cancelled", reason);
    } catch (error) {
      console.error("Error cancelling order:", error);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
      processing: "bg-blue-100 text-blue-800 border-blue-200",
      approved: "bg-green-100 text-green-800 border-green-200",
      shipped: "bg-purple-100 text-purple-800 border-purple-200",
      delivered: "bg-emerald-100 text-emerald-800 border-emerald-200",
      cancelled: "bg-red-100 text-red-800 border-red-200",
      rejected: "bg-red-100 text-red-800 border-red-200",
    };
    return colors[status] || "bg-gray-100 text-gray-800 border-gray-200";
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-UG", {
      style: "currency",
      currency: "UGX",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
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

  const OrderDetailsModal = ({ order, onClose }) => {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        >
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-2xl font-bold text-gray-900">Order Details</h3>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl transition-colors"
            >
              ×
            </button>
          </div>

          <div className="space-y-6">
            {/* Order & Customer Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                <h4 className="font-semibold text-blue-900 mb-3">
                  Order Information
                </h4>
                <div className="space-y-2">
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">ID:</span> {order.orderId}
                  </p>
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">Date:</span>{" "}
                    {formatDate(order.orderDate)}
                  </p>
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">Status:</span>
                    <span
                      className={`ml-2 px-2 py-1 rounded-full text-xs ${getStatusColor(
                        order.status
                      )}`}
                    >
                      {order.status}
                    </span>
                  </p>
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">Payment:</span>{" "}
                    {order.paymentMethod || "Not specified"}
                  </p>
                </div>
              </div>

              <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                <h4 className="font-semibold text-green-900 mb-3">
                  Customer Information
                </h4>
                <div className="space-y-2">
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">Name:</span>{" "}
                    {order.customer?.name}
                  </p>
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">Email:</span>{" "}
                    {order.customer?.email}
                  </p>
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">Phone:</span>{" "}
                    {order.customer?.phone}
                  </p>
                </div>
              </div>
            </div>

            {/* Order Items - FIXED with proper image handling */}
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <h4 className="font-semibold text-gray-900 mb-4">Order Items</h4>
              <div className="space-y-4">
                {order.items?.map((item, index) => (
                  <div
                    key={index}
                    className="flex justify-between items-center p-4 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center space-x-4 flex-1">
                      <div className="relative">
                        <img
                          src={getProductImage(item)}
                          alt={item.product?.title || item.title || "Product"}
                          className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                          onError={(e) => {
                            e.target.src =
                              "https://images.unsplash.com/photo-1560769629-975ec94e6a86?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=100&h=100&q=80";
                          }}
                        />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">
                          {item.product?.title ||
                            item.title ||
                            "Unknown Product"}
                        </p>
                        <p className="text-sm text-gray-600">
                          Quantity: {item.quantity || 1} • Size:{" "}
                          {item.size || "Standard"}
                        </p>
                        <p className="text-sm text-gray-600">
                          Price:{" "}
                          {formatCurrency(
                            item.product?.price || item.price || 0
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-blue-600">
                        {formatCurrency(
                          (item.product?.price || item.price || 0) *
                            (item.quantity || 1)
                        )}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-gray-200 pt-4">
              <div className="flex justify-between items-center text-lg">
                <span className="font-semibold text-gray-900">
                  Total Amount:
                </span>
                <span className="text-2xl font-bold text-blue-600">
                  {formatCurrency(order.total)}
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    );
  };

  const CancelOrderModal = ({ order, onClose, onConfirm }) => {
    const [reason, setReason] = useState("");

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl p-6 max-w-md w-full"
        >
          <h3 className="text-xl font-bold text-gray-900 mb-4">Cancel Order</h3>
          <p className="text-gray-600 mb-4">
            Please provide a reason for cancellation:
          </p>

          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Enter cancellation reason..."
            className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            rows="4"
          />

          <div className="flex gap-3 mt-6">
            <button
              onClick={() => onConfirm(order.id, reason)}
              disabled={!reason.trim()}
              className="flex-1 bg-red-600 text-white py-2 rounded-lg font-medium hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              Confirm Cancellation
            </button>
            <button
              onClick={onClose}
              className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </motion.div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-700 font-medium">Loading Orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50 py-8">
      {/* UPDATED: Orange Navigation Bar */}
      <nav className="bg-gradient-to-r from-orange-600 to-amber-600 shadow-lg border-b border-orange-700">
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
            <div className="flex items-center space-x-4">
              <a
                href="/admin/dashboard"
                className="text-white hover:text-orange-200 transition-colors px-3 py-2 rounded-lg hover:bg-orange-700"
              >
                Dashboard
              </a>
              <a
                href="/admin/products"
                className="text-white hover:text-orange-200 transition-colors px-3 py-2 rounded-lg hover:bg-orange-700"
              >
                Products
              </a>
              <a
                href="/admin/orders"
                className="text-white bg-orange-800 px-3 py-2 rounded-lg font-semibold"
              >
                Orders
              </a>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 text-center"
        >
          <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent mb-2">
            Orders Management
          </h1>
          <p className="text-gray-600 text-lg">
            Manage and process customer orders efficiently
          </p>
        </motion.div>

        {/* Filters & Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg border border-gray-200 p-6 mb-8"
        >
          <div className="flex flex-col lg:flex-row gap-6 items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-4 items-center">
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    fetchOrders(1, e.target.value);
                  }}
                  className="appearance-none bg-white border border-gray-300 rounded-xl px-4 py-3 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="processing">Processing</option>
                  <option value="shipped">Shipped</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                  <i className="fas fa-chevron-down text-sm"></i>
                </div>
              </div>

              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                  Total: {orders.length}
                </span>
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                  Pending: {orders.filter((o) => o.status === "pending").length}
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              {/* NEW: Clear All Orders Button */}
              {orders.length > 0 && (
                <button
                  onClick={clearAllOrders}
                  className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  <i className="fas fa-trash-alt"></i>
                  Clear All Orders
                </button>
              )}

              <button
                onClick={() => fetchOrders(currentPage, statusFilter)}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-xl text-sm font-medium hover:from-orange-700 hover:to-amber-700 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                <i className="fas fa-sync-alt"></i>
                Refresh Orders
              </button>
            </div>
          </div>
        </motion.div>

        {/* Orders Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {orders.length > 0 ? (
            orders.map((order) => (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-300"
              >
                {/* Order Header */}
                <div className="p-6 border-b border-gray-200">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-amber-500 rounded-xl flex items-center justify-center text-white font-bold">
                        #{order.orderId?.slice(-4)}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          Order {order.orderId}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {formatDate(order.orderDate)}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(
                          order.status
                        )}`}
                      >
                        {order.status.charAt(0).toUpperCase() +
                          order.status.slice(1)}
                      </span>
                      <span className="text-xl font-bold text-orange-600">
                        {formatCurrency(order.total)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Customer Info */}
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                      <i className="fas fa-user text-gray-600"></i>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {order.customer?.name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {order.customer?.email}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Order Items - FIXED with proper images */}
                <div className="p-6 border-b border-gray-200">
                  <h4 className="font-semibold text-gray-900 mb-4">
                    Items ({order.items?.length || 0})
                  </h4>
                  <div className="space-y-3">
                    {order.items?.map((item, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                      >
                        <img
                          src={getProductImage(item)}
                          alt={item.product?.title || item.title || "Product"}
                          className="w-12 h-12 object-cover rounded-lg border border-gray-200"
                          onError={(e) => {
                            e.target.src =
                              "https://images.unsplash.com/photo-1560769629-975ec94e6a86?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=100&h=100&q=80";
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">
                            {item.product?.title ||
                              item.title ||
                              "Unknown Product"}
                          </p>
                          <p className="text-sm text-gray-500">
                            Qty: {item.quantity} •{" "}
                            {formatCurrency(
                              item.product?.price || item.price || 0
                            )}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">
                            {formatCurrency(
                              (item.product?.price || item.price || 0) *
                                (item.quantity || 1)
                            )}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="p-6">
                  <div className="flex flex-wrap gap-2">
                    {order.status === "pending" && (
                      <>
                        <button
                          onClick={() =>
                            updateOrderStatus(
                              order.id,
                              "approved",
                              "Your order has been approved. You will receive a call from +256 785 642772"
                            )
                          }
                          className="flex-1 sm:flex-none px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() =>
                            updateOrderStatus(order.id, "rejected")
                          }
                          className="flex-1 sm:flex-none px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
                        >
                          Reject
                        </button>
                      </>
                    )}
                    {order.status === "approved" && (
                      <button
                        onClick={() =>
                          updateOrderStatus(order.id, "processing")
                        }
                        className="flex-1 sm:flex-none px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Start Processing
                      </button>
                    )}
                    {order.status === "processing" && (
                      <button
                        onClick={() => updateOrderStatus(order.id, "shipped")}
                        className="flex-1 sm:flex-none px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors"
                      >
                        Mark Shipped
                      </button>
                    )}
                    {order.status === "shipped" && (
                      <button
                        onClick={() => updateOrderStatus(order.id, "delivered")}
                        className="flex-1 sm:flex-none px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors"
                      >
                        Mark Delivered
                      </button>
                    )}
                    {["pending", "approved", "processing"].includes(
                      order.status
                    ) && (
                      <button
                        onClick={() =>
                          setSelectedOrder({ ...order, action: "cancel" })
                        }
                        className="flex-1 sm:flex-none px-4 py-2 bg-orange-600 text-white text-sm font-medium rounded-lg hover:bg-orange-700 transition-colors"
                      >
                        Cancel
                      </button>
                    )}
                    <button
                      onClick={() => deleteOrder(order.id)}
                      className="flex-1 sm:flex-none px-4 py-2 bg-red-500 text-white text-sm font-medium rounded-lg hover:bg-red-600 transition-colors"
                    >
                      Delete
                    </button>
                    <button
                      onClick={() =>
                        setSelectedOrder({ ...order, action: "view" })
                      }
                      className="flex-1 sm:flex-none px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              </motion.div>
            ))
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="col-span-2 text-center py-16"
            >
              <div className="w-24 h-24 bg-gradient-to-r from-orange-100 to-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <i className="fas fa-shopping-cart text-3xl text-orange-600"></i>
              </div>
              <h3 className="text-2xl font-bold text-gray-700 mb-3">
                No Orders Found
              </h3>
              <p className="text-gray-500 text-lg mb-6">
                {statusFilter
                  ? `No orders with status "${statusFilter}"`
                  : "No orders have been placed yet"}
              </p>
              <button
                onClick={() => {
                  setStatusFilter("");
                  fetchOrders();
                }}
                className="px-6 py-3 bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-xl font-semibold hover:from-orange-700 hover:to-amber-700 transition-all duration-200"
              >
                <i className="fas fa-sync-alt mr-2"></i>
                Reset Filters
              </button>
            </motion.div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-center mt-8"
          >
            <div className="flex gap-2 bg-white/80 backdrop-blur-lg rounded-xl p-2 shadow-lg border border-gray-200">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                (page) => (
                  <button
                    key={page}
                    onClick={() => fetchOrders(page, statusFilter)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      currentPage === page
                        ? "bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-lg"
                        : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    {page}
                  </button>
                )
              )}
            </div>
          </motion.div>
        )}
      </div>

      {/* Modals */}
      {selectedOrder?.action === "view" && (
        <OrderDetailsModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
        />
      )}

      {selectedOrder?.action === "cancel" && (
        <CancelOrderModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onConfirm={cancelOrder}
        />
      )}
    </div>
  );
};

export default OrdersPage;
