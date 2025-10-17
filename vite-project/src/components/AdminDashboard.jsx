import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { io } from "socket.io-client";
import Chart from "chart.js/auto";

const AdminDashboard = () => {
  const [activeSection, setActiveSection] = useState("dashboard");
  const [user, setUser] = useState({
    name: "Loading...",
    email: "Loading...",
    avatar:
      "https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=100",
    role: "Administrator",
  });
  const [dashboardMetrics, setDashboardMetrics] = useState({
    monthlyRevenue: 0,
    revenueTrend: 0,
    pendingOrders: 0,
    ordersTrend: 0,
    approvedOrders: 0,
    approvedOrdersTrend: 0,
    newSales: 0,
    lowStockItems: 0,
    activeCustomers: 0,
    employees: 0,
    activeCampaigns: 0,
    supportTickets: 0,
    totalProducts: 0,
    dailyRevenue: 0,
    transactions: 0,
    newOrders: 0,
    processingOrders: 0,
    shippedOrders: 0,
    outOfStockItems: 0,
    lowStockChange: 0,
    outOfStockChange: 0,
    urgentActions: 0,
    performanceAlerts: 0,
    trafficSpike: 0,
    salesDrop: 0,
  });
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notificationQueue, setNotificationQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState("today");

  const userDropdownRef = useRef(null);
  const notificationsRef = useRef(null);
  const revenueChartRef = useRef(null);
  const salesTrendChartRef = useRef(null);
  const categoryChartRef = useRef(null);
  const socketRef = useRef(null);

  // Fetch with retry and exponential backoff
  const fetchWithRetry = async (url, options, retries = 3, delay = 1000) => {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(url, options);
        if (!response.ok)
          throw new Error(`HTTP error! Status: ${response.status}`);
        return response;
      } catch (error) {
        if (i < retries - 1) {
          await new Promise((resolve) => setTimeout(resolve, delay));
          delay *= 2; // Exponential backoff
        } else {
          throw error;
        }
      }
    }
  };

  // Show toast notification
  const showToast = (type, message, duration = 3000) => {
    const id = Date.now();
    setNotificationQueue((prev) => [...prev, { id, type, message, duration }]);
    setTimeout(() => {
      setNotificationQueue((prev) => prev.filter((n) => n.id !== id));
    }, duration);
  };

  // Fetch user data
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await fetchWithRetry("/api/admin/user", {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        const userData = await response.json();
        setUser({
          name: userData.name || "Admin User",
          email: userData.email || "admin@kingscollection.com",
          avatar:
            userData.avatar ||
            "https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=100",
          role: userData.role || "Administrator",
        });
      } catch (error) {
        console.error("Error fetching user data:", error);
        showToast("error", "Failed to fetch user data");
      }
    };
    fetchUserData();
  }, []);

  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const response = await fetchWithRetry(
          `/api/admin/dashboard?period=${timeFilter}`
        );
        const data = await response.json();
        setDashboardMetrics(data.metrics || {});
        setProducts(data.products || []);
        setCategories(data.categories || []);
        setRecentActivities(data.recentActivities || []);
        setTopProducts(data.topProducts || []);
        setOrders(data.orders || []);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        showToast("error", "Failed to fetch dashboard data");
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, [timeFilter]);

  // Socket.IO setup
  useEffect(() => {
    socketRef.current = io("http://localhost:3005");
    socketRef.current.on("connect", () => {
      console.log("Connected to Socket.IO server");
    });

    socketRef.current.on("productUpdated", (product) => {
      if (product.title === "Deleted Product") {
        setProducts((prev) => prev.filter((p) => p._id !== product._id));
        showToast("success", "Product deleted successfully");
      } else {
        setProducts((prev) => {
          const index = prev.findIndex((p) => p._id === product._id);
          if (index >= 0) {
            return [
              ...prev.slice(0, index),
              { ...prev[index], ...product },
              ...prev.slice(index + 1),
            ];
          } else {
            return [product, ...prev];
          }
        });
        showToast(
          "success",
          index >= 0
            ? "Product updated successfully"
            : "New product added successfully"
        );
      }
    });

    socketRef.current.on("categoryUpdated", (category) => {
      if (category.name === "Deleted Category") {
        setCategories((prev) => prev.filter((c) => c._id !== category._id));
        showToast("success", "Category deleted successfully");
      } else {
        setCategories((prev) => {
          const index = prev.findIndex((c) => c._id === category._id);
          if (index >= 0) {
            return [
              ...prev.slice(0, index),
              { ...prev[index], ...category },
              ...prev.slice(index + 1),
            ];
          } else {
            return [category, ...prev];
          }
        });
        showToast(
          "success",
          index >= 0
            ? "Category updated successfully"
            : "New category added successfully"
        );
      }
    });

    return () => {
      socketRef.current.disconnect();
    };
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        userDropdownRef.current &&
        !userDropdownRef.current.contains(event.target)
      ) {
        setShowUserDropdown(false);
      }
      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(event.target)
      ) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Initialize charts
  useEffect(() => {
    if (!loading) {
      // Revenue Chart
      if (revenueChartRef.current) {
        const ctx = revenueChartRef.current.getContext("2d");
        new Chart(ctx, {
          type: "line",
          data: {
            labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
            datasets: [
              {
                label: "Revenue (UGX)",
                data: [5000000, 6000000, 5500000, 7000000, 6500000, 8000000],
                borderColor: "#007bff",
                fill: false,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
          },
        });
      }

      // Sales Trend Chart
      if (salesTrendChartRef.current) {
        const ctx = salesTrendChartRef.current.getContext("2d");
        new Chart(ctx, {
          type: "bar",
          data: {
            labels: ["Mon", "Tue", "Wed", "Thu", "Fri"],
            datasets: [
              {
                label: "Sales (UGX)",
                data: [2000000, 2500000, 1800000, 3000000, 2700000],
                backgroundColor: "#007bff",
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
          },
        });
      }

      // Category Chart
      if (categoryChartRef.current) {
        const ctx = categoryChartRef.current.getContext("2d");
        new Chart(ctx, {
          type: "pie",
          data: {
            labels: categories.map((c) => c.name) || [
              "Apparel",
              "Accessories",
              "Footwear",
            ],
            datasets: [
              {
                data: categories.map((c) => c.productCount) || [50, 30, 20],
                backgroundColor: ["#007bff", "#28a745", "#f1c40f"],
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
          },
        });
      }
    }
  }, [loading, categories]);

  // Handle logout
  const handleLogout = () => {
    if (window.confirm("Are you sure you want to logout?")) {
      showToast("info", "Logging out...");
      setTimeout(() => {
        window.location.href = "/logout";
      }, 1000);
    }
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-UG", {
      style: "currency",
      currency: "UGX",
    }).format(amount);
  };

  // Handle delete product
  const handleDeleteProduct = async (productId) => {
    if (window.confirm("Are you sure you want to delete this product?")) {
      try {
        const response = await fetchWithRetry(
          `/api/admin/products/${productId}`,
          {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
          }
        );
        if (response.ok) {
          socketRef.current.emit("productUpdated", {
            _id: productId,
            title: "Deleted Product",
          });
        } else {
          const data = await response.json();
          showToast("error", data.message || "Failed to delete product");
        }
      } catch (error) {
        console.error("Error deleting product:", error);
        showToast(
          "error",
          "Network error deleting product. Please check your connection."
        );
      }
    }
  };

  // Handle delete category
  const handleDeleteCategory = async (categoryId) => {
    if (window.confirm("Are you sure you want to delete this category?")) {
      try {
        const response = await fetchWithRetry(
          `/api/admin/categories/${categoryId}`,
          {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
          }
        );
        if (response.ok) {
          socketRef.current.emit("categoryUpdated", {
            _id: categoryId,
            name: "Deleted Category",
          });
        } else {
          const data = await response.json();
          showToast("error", data.message || "Failed to delete category");
        }
      } catch (error) {
        console.error("Error deleting category:", error);
        showToast(
          "error",
          "Network error deleting category. Please check your connection."
        );
      }
    }
  };

  // Navigation items
  const mainNavItems = [
    {
      id: "dashboard",
      icon: "fa-tachometer-alt",
      label: "Dashboard Home",
      href: "/admin-page",
    },
    {
      id: "sales",
      icon: "fa-chart-line",
      label: "Sales",
      href: "/sales",
      badge: dashboardMetrics.newSales,
    },
    {
      id: "orders",
      icon: "fa-box",
      label: "Orders",
      href: "/orders",
      badge: dashboardMetrics.pendingOrders,
      urgent: true,
    },
    {
      id: "inventory",
      icon: "fa-warehouse",
      label: "Inventory",
      href: "/inventory",
      badge: dashboardMetrics.lowStockItems,
      warning: true,
    },
  ];

  const sidebarSections = [
    {
      title: "Management",
      items: [
        {
          icon: "fa-users",
          label: "Customers",
          href: "/customers",
          badge: dashboardMetrics.activeCustomers,
        },
        {
          icon: "fa-user-tie",
          label: "Employees",
          href: "/employees",
          badge: dashboardMetrics.employees,
        },
        {
          icon: "fa-tags",
          label: "Marketing",
          href: "/marketing",
          badge: dashboardMetrics.activeCampaigns,
          active: true,
        },
        { icon: "fa-box-open", label: "Products", href: "/add-product/new" },
      ],
    },
    {
      title: "Operations",
      items: [
        { icon: "fa-credit-card", label: "Payments", href: "/payments" },
        { icon: "fa-globe", label: "Website Management", href: "/website" },
        {
          icon: "fa-headset",
          label: "Support Tickets",
          href: "/support",
          badge: dashboardMetrics.supportTickets,
          urgent: true,
        },
      ],
    },
    {
      title: "Insights",
      items: [
        { icon: "fa-chart-bar", label: "Analytics", href: "/analytics" },
        { icon: "fa-dollar-sign", label: "Financials", href: "/financials" },
      ],
    },
    {
      title: "Admin",
      items: [
        { icon: "fa-shield-alt", label: "Security", href: "/security" },
        { icon: "fa-cog", label: "Settings", href: "/settings" },
        {
          icon: "fa-sign-out-alt",
          label: "Logout",
          href: "/logout",
          isLogout: true,
        },
      ],
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-blue-600 font-semibold">
            Loading Admin Dashboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Toast Notifications */}
      <div className="fixed top-8 right-8 z-[10000] pointer-events-none">
        <AnimatePresence>
          {notificationQueue.map((notification) => (
            <motion.div
              key={notification.id}
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 100 }}
              transition={{ duration: 0.3 }}
              className={`pointer-events-auto cursor-pointer max-w-sm w-full p-4 rounded-xl shadow-lg mb-2 text-white flex items-center gap-3 ${
                notification.type === "success"
                  ? "bg-green-600"
                  : notification.type === "error"
                  ? "bg-red-600"
                  : "bg-blue-600"
              }`}
              onClick={() =>
                setNotificationQueue((prev) =>
                  prev.filter((n) => n.id !== notification.id)
                )
              }
            >
              <i
                className={`fas fa-${
                  notification.type === "success"
                    ? "check-circle"
                    : notification.type === "error"
                    ? "exclamation-circle"
                    : "info-circle"
                }`}
              ></i>
              <span>{notification.message}</span>
              <button className="ml-auto bg-transparent border-none text-white">
                <i className="fas fa-times"></i>
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Fixed Navigation Bar */}
      <nav className="fixed top-0 left-0 right-0 h-20 bg-white/95 backdrop-blur-xl border-b border-blue-200/50 z-50 shadow-sm">
        <div className="max-w-8xl mx-auto px-6 h-full">
          <div className="flex items-center justify-between h-full gap-8">
            {/* Logo */}
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-700 rounded-2xl flex items-center justify-center shadow-lg">
                <i className="fas fa-crown text-white text-xl"></i>
              </div>
              <div>
                <div className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-700 bg-clip-text text-transparent">
                  Kings Collection
                </div>
                <div className="text-xs text-blue-600 font-medium">
                  Admin Control Panel
                </div>
              </div>
            </div>

            {/* Main Navigation Tabs */}
            <div className="flex items-center gap-2 flex-1 justify-center">
              {mainNavItems.map((item) => (
                <motion.a
                  key={item.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`relative flex items-center gap-3 px-6 py-3 rounded-2xl font-semibold transition-all duration-300 ${
                    activeSection === item.id
                      ? "bg-gradient-to-r from-blue-600 to-purple-700 text-white shadow-lg shadow-blue-500/25"
                      : "text-gray-700 hover:bg-white hover:shadow-lg hover:border hover:border-gray-200"
                  }`}
                  href={item.href}
                  onClick={(e) => {
                    e.preventDefault();
                    setActiveSection(item.id);
                  }}
                >
                  <i className={`fas ${item.icon} w-5 text-center`}></i>
                  <span className="whitespace-nowrap">{item.label}</span>
                  {item.badge > 0 && (
                    <span
                      className={`absolute -top-2 -right-2 text-xs px-2 py-1 rounded-full font-bold min-w-[1.5rem] text-center ${
                        item.urgent
                          ? "bg-gradient-to-r from-red-500 to-pink-600 text-white animate-pulse"
                          : item.warning
                          ? "bg-gradient-to-r from-amber-500 to-orange-600 text-white"
                          : "bg-gradient-to-r from-blue-500 to-cyan-600 text-white"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </motion.a>
              ))}
            </div>

            {/* Add Product Button */}
            <motion.a
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              href="/add-product/new"
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-2xl font-semibold shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/40 transition-all"
            >
              <i className="fas fa-plus-circle"></i>
              <span>Add New Product</span>
            </motion.a>
          </div>
        </div>
      </nav>

      {/* Main Header */}
      <header className="pt-20 pb-8">
        <div className="max-w-8xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Welcome Section */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white/95 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/20 relative overflow-hidden"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="text-blue-600 text-lg font-medium mb-2">
                    Welcome,
                  </div>
                  <div className="text-3xl font-bold text-gray-900 mb-2">
                    {user.name}
                  </div>
                  <div className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-700 text-white px-4 py-2 rounded-2xl text-sm font-semibold shadow-lg">
                    <i className="fas fa-shield-alt"></i>
                    <span>Administrator</span>
                  </div>
                </div>

                {/* User Avatar with Dropdown */}
                <div className="relative" ref={userDropdownRef}>
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    className="relative cursor-pointer"
                    onClick={() => setShowUserDropdown(!showUserDropdown)}
                  >
                    <img
                      src={user.avatar}
                      alt="Admin Avatar"
                      className="w-16 h-16 rounded-2xl border-4 border-blue-500 shadow-lg"
                    />
                    <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                  </motion.div>

                  <AnimatePresence>
                    {showUserDropdown && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute top-full right-0 mt-3 w-80 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200/50 z-50"
                      >
                        <div className="p-6 border-b border-gray-200/50">
                          <div className="font-semibold text-gray-900 text-lg">
                            {user.name}
                          </div>
                          <div className="text-blue-600 text-sm">
                            {user.email}
                          </div>
                        </div>
                        <div className="p-2">
                          <a
                            href="/profile"
                            className="flex items-center gap-4 p-3 rounded-xl hover:bg-blue-50 transition-colors"
                          >
                            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                              <i className="fas fa-user text-blue-600"></i>
                            </div>
                            <div>
                              <div className="font-semibold text-gray-900">
                                Profile Settings
                              </div>
                              <div className="text-gray-500 text-sm">
                                Manage your account
                              </div>
                            </div>
                          </a>
                          <a
                            href="/security"
                            className="flex items-center gap-4 p-3 rounded-xl hover:bg-blue-50 transition-colors"
                          >
                            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                              <i className="fas fa-shield-alt text-green-600"></i>
                            </div>
                            <div>
                              <div className="font-semibold text-gray-900">
                                Security Settings
                              </div>
                              <div className="text-gray-500 text-sm">
                                Protect your account
                              </div>
                            </div>
                          </a>
                          <a
                            href="/support"
                            className="flex items-center gap-4 p-3 rounded-xl hover:bg-blue-50 transition-colors"
                          >
                            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                              <i className="fas fa-question-circle text-purple-600"></i>
                            </div>
                            <div>
                              <div className="font-semibold text-gray-900">
                                Help & Support
                              </div>
                              <div className="text-gray-500 text-sm">
                                Get assistance
                              </div>
                            </div>
                          </a>
                          <div className="border-t border-gray-200/50 mt-2 pt-2">
                            <button
                              onClick={handleLogout}
                              className="flex items-center gap-4 p-3 rounded-xl hover:bg-red-50 text-red-600 w-full transition-colors"
                            >
                              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                                <i className="fas fa-sign-out-alt"></i>
                              </div>
                              <div>
                                <div className="font-semibold">Logout</div>
                                <div className="text-red-500 text-sm">
                                  Sign out of your account
                                </div>
                              </div>
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>

            {/* Header Stats */}
            <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  icon: "fa-money-bill",
                  value: formatCurrency(dashboardMetrics.monthlyRevenue || 0),
                  label: "Monthly Revenue",
                  trend: dashboardMetrics.revenueTrend || 0,
                  color: "green",
                },
                {
                  icon: "fa-shopping-cart",
                  value: dashboardMetrics.pendingOrders || 0,
                  label: "Pending Orders",
                  trend: dashboardMetrics.ordersTrend || 0,
                  color: "blue",
                },
                {
                  icon: "fa-check-circle",
                  value:
                    dashboardMetrics.approvedOrders?.toLocaleString() || "0",
                  label: "Approved Orders",
                  trend: dashboardMetrics.approvedOrdersTrend || 0,
                  color: "green",
                },
              ].map((stat, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ scale: 1.02, y: -2 }}
                  className="bg-white/95 backdrop-blur-xl rounded-3xl p-6 shadow-2xl border border-white/20"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white ${
                        stat.color === "green"
                          ? "bg-gradient-to-r from-green-500 to-emerald-600"
                          : "bg-gradient-to-r from-blue-500 to-cyan-600"
                      } shadow-lg`}
                    >
                      <i className={`fas ${stat.icon} text-xl`}></i>
                    </div>
                    <div className="flex-1">
                      <div className="text-2xl font-bold text-gray-900">
                        {stat.value}
                      </div>
                      <div className="text-blue-600 font-semibold text-sm">
                        {stat.label}
                      </div>
                      <div
                        className={`text-xs font-semibold mt-1 ${
                          stat.trend > 0 ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {stat.trend > 0 ? "↗" : "↘"} {Math.abs(stat.trend)}%
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pb-12">
        <div className="max-w-8xl mx-auto px-6">
          <div className="flex gap-8">
            {/* Sidebar */}
            <aside className="w-80 flex-shrink-0">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white/95 backdrop-blur-xl rounded-3xl p-6 shadow-2xl border border-white/20 sticky top-32"
              >
                <div className="flex items-center justify-between mb-8">
                  <div className="font-bold text-gray-900 text-lg">
                    Navigation
                  </div>
                  <button className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors">
                    <i className="fas fa-bars"></i>
                  </button>
                </div>
                <nav className="space-y-6">
                  {sidebarSections.map((section, sectionIndex) => (
                    <div key={sectionIndex}>
                      <div className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-3 px-2">
                        {section.title}
                      </div>
                      <div className="space-y-1">
                        {section.items.map((item, itemIndex) => (
                          <motion.a
                            key={itemIndex}
                            whileHover={{ x: 4 }}
                            href={item.href}
                            onClick={(e) => {
                              if (item.isLogout) {
                                e.preventDefault();
                                handleLogout();
                              } else {
                                e.preventDefault();
                                setActiveSection(
                                  item.href.split("/")[1] || "dashboard"
                                );
                              }
                            }}
                            className={`flex items-center gap-4 px-4 py-3 rounded-2xl font-medium transition-all ${
                              item.isLogout
                                ? "text-red-600 hover:bg-red-50"
                                : activeSection ===
                                  (item.href.split("/")[1] || "dashboard")
                                ? "bg-blue-50 text-blue-700"
                                : "text-gray-700 hover:bg-blue-50 hover:text-blue-700"
                            }`}
                          >
                            <div
                              className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                item.isLogout ? "bg-red-100" : "bg-blue-100"
                              }`}
                            >
                              <i
                                className={`fas ${item.icon} ${
                                  item.isLogout
                                    ? "text-red-600"
                                    : "text-blue-600"
                                }`}
                              ></i>
                            </div>
                            <span className="flex-1">{item.label}</span>
                            {item.badge > 0 && (
                              <span
                                className={`text-xs px-2 py-1 rounded-full font-semibold ${
                                  item.urgent
                                    ? "bg-red-500 text-white"
                                    : item.active
                                    ? "bg-green-500 text-white"
                                    : "bg-blue-500 text-white"
                                }`}
                              >
                                {item.badge}
                              </span>
                            )}
                          </motion.a>
                        ))}
                      </div>
                    </div>
                  ))}
                </nav>
              </motion.div>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 min-w-0">
              {/* Dashboard Section */}
              {activeSection === "dashboard" && (
                <motion.section
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-8"
                >
                  {/* Section Header */}
                  <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/20">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-3xl font-bold text-gray-900 mb-2">
                          Dashboard Overview
                        </h2>
                        <p className="text-blue-600">
                          Monitor and manage your e-commerce operations.
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <select
                          className="bg-white border border-gray-300 rounded-2xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                          value={timeFilter}
                          onChange={(e) => {
                            setTimeFilter(e.target.value);
                            showToast(
                              "info",
                              `Showing data for ${e.target.value}`
                            );
                          }}
                        >
                          <option value="today">Today</option>
                          <option value="week">This Week</option>
                          <option value="month">This Month</option>
                        </select>
                        <button
                          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-2xl font-semibold shadow-lg hover:shadow-xl transition-all"
                          onClick={async () => {
                            try {
                              const response = await fetchWithRetry(
                                "/api/admin/dashboard",
                                {
                                  method: "GET",
                                  headers: {
                                    "Content-Type": "application/json",
                                  },
                                }
                              );
                              if (response.ok) {
                                showToast("success", "Dashboard refreshed");
                                const data = await response.json();
                                setDashboardMetrics(data.metrics || {});
                                setProducts(data.products || []);
                                setCategories(data.categories || []);
                                setRecentActivities(
                                  data.recentActivities || []
                                );
                                setTopProducts(data.topProducts || []);
                                setOrders(data.orders || []);
                              } else {
                                showToast(
                                  "error",
                                  "Failed to refresh dashboard"
                                );
                              }
                            } catch (error) {
                              console.error(
                                "Network error refreshing dashboard:",
                                error
                              );
                              showToast(
                                "error",
                                "Network error refreshing dashboard."
                              );
                            }
                          }}
                        >
                          <i className="fas fa-sync-alt"></i>
                          <span>Refresh</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Charts */}
                  <div className="grid grid-cols-2 gap-8">
                    <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-6 shadow-2xl border border-white/20">
                      <h3 className="text-xl font-bold text-gray-900 mb-4">
                        Revenue Overview
                      </h3>
                      <div className="h-64">
                        <canvas ref={revenueChartRef} />
                      </div>
                    </div>
                    <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-6 shadow-2xl border border-white/20">
                      <h3 className="text-xl font-bold text-gray-900 mb-4">
                        Sales Trend
                      </h3>
                      <div className="h-64">
                        <canvas ref={salesTrendChartRef} />
                      </div>
                    </div>
                    <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-6 shadow-2xl border border-white/20 col-span-2">
                      <h3 className="text-xl font-bold text-gray-900 mb-4">
                        Category Distribution
                      </h3>
                      <div className="h-64">
                        <canvas ref={categoryChartRef} />
                      </div>
                    </div>
                  </div>

                  {/* Products and Categories */}
                  <div className="grid grid-cols-2 gap-8">
                    {/* Products Table */}
                    <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-6 shadow-2xl border border-white/20">
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-bold text-gray-900">
                          Products
                        </h3>
                        <a
                          href="/add-product/new"
                          className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors"
                        >
                          Add New Product
                        </a>
                      </div>
                      {products.length > 0 ? (
                        <div className="overflow-hidden rounded-xl border border-gray-200">
                          <table className="w-full">
                            <thead className="bg-gradient-to-r from-blue-600 to-purple-700 text-white">
                              <tr>
                                <th className="px-4 py-3 text-left text-sm font-semibold">
                                  Image
                                </th>
                                <th className="px-4 py-3 text-left text-sm font-semibold">
                                  Title
                                </th>
                                <th className="px-4 py-3 text-left text-sm font-semibold">
                                  Category
                                </th>
                                <th className="px-4 py-3 text-left text-sm font-semibold">
                                  Price
                                </th>
                                <th className="px-4 py-3 text-left text-sm font-semibold">
                                  Stock ID
                                </th>
                                <th className="px-4 py-3 text-left text-sm font-semibold">
                                  Actions
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                              {products.slice(0, 5).map((product) => (
                                <tr
                                  key={product._id}
                                  className="hover:bg-gray-50 transition-colors"
                                >
                                  <td className="px-4 py-3">
                                    <img
                                      src={
                                        product.images?.[0]
                                          ? `/upload/products/${product.images[0]}`
                                          : "/Images/placeholder.webp"
                                      }
                                      alt={product.title}
                                      className="w-10 h-10 rounded-lg object-cover"
                                    />
                                  </td>
                                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                    {product.title}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-gray-600">
                                    {product.category?.name || "No Category"}
                                  </td>
                                  <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                                    {formatCurrency(product.price || 0)}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-gray-600">
                                    {product.stockId || "N/A"}
                                  </td>
                                  <td className="px-4 py-3">
                                    <div className="flex gap-2">
                                      <a
                                        href={`/update-product/${product._id}`}
                                        className="px-3 py-1 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-colors"
                                      >
                                        Edit
                                      </a>
                                      <button
                                        onClick={() =>
                                          handleDeleteProduct(product._id)
                                        }
                                        className="px-3 py-1 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700 transition-colors"
                                      >
                                        Delete
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <i className="fas fa-box-open text-4xl mb-3 text-gray-300"></i>
                          <div>No products available</div>
                        </div>
                      )}
                    </div>

                    {/* Categories Table */}
                    <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-6 shadow-2xl border border-white/20">
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-bold text-gray-900">
                          Categories
                        </h3>
                        <a
                          href="/add-category/new"
                          className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors"
                        >
                          Add New Category
                        </a>
                      </div>
                      {categories.length > 0 ? (
                        <div className="overflow-hidden rounded-xl border border-gray-200">
                          <table className="w-full">
                            <thead className="bg-gradient-to-r from-blue-600 to-purple-700 text-white">
                              <tr>
                                <th className="px-4 py-3 text-left text-sm font-semibold">
                                  Image
                                </th>
                                <th className="px-4 py-3 text-left text-sm font-semibold">
                                  Name
                                </th>
                                <th className="px-4 py-3 text-left text-sm font-semibold">
                                  Actions
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                              {categories.map((category) => (
                                <tr
                                  key={category._id}
                                  className="hover:bg-gray-50 transition-colors"
                                >
                                  <td className="px-4 py-3">
                                    <img
                                      src={
                                        category.image
                                          ? `/upload/category/${category.image}`
                                          : "/Images/placeholder.webp"
                                      }
                                      alt={category.name}
                                      className="w-10 h-10 rounded-lg object-cover"
                                    />
                                  </td>
                                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                    {category.name}
                                  </td>
                                  <td className="px-4 py-3">
                                    <div className="flex gap-2">
                                      <a
                                        href={`/update-category/${category._id}`}
                                        className="px-3 py-1 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-colors"
                                      >
                                        Edit
                                      </a>
                                      <button
                                        onClick={() =>
                                          handleDeleteCategory(category._id)
                                        }
                                        className="px-3 py-1 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700 transition-colors"
                                      >
                                        Delete
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <i className="fas fa-tags text-4xl mb-3 text-gray-300"></i>
                          <div>No categories available</div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Metrics Row */}
                  <div className="grid grid-cols-3 gap-8">
                    {/* Revenue Overview */}
                    <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-6 shadow-2xl border border-white/20">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center text-white">
                          <i className="fas fa-money-bill"></i>
                        </div>
                        <div className="font-bold text-gray-900">
                          Revenue Overview
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <div className="text-2xl font-bold text-gray-900">
                            {formatCurrency(
                              dashboardMetrics.monthlyRevenue || 0
                            )}
                          </div>
                          <div className="text-blue-600 font-semibold">
                            Monthly Revenue
                          </div>
                          <div
                            className={`text-sm font-semibold ${
                              dashboardMetrics.revenueTrend > 0
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            {dashboardMetrics.revenueTrend > 0 ? "↗" : "↘"}{" "}
                            {Math.abs(dashboardMetrics.revenueTrend || 0)}%
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <div className="font-semibold text-gray-900">
                              {formatCurrency(
                                dashboardMetrics.dailyRevenue || 0
                              )}
                            </div>
                            <div className="text-xs text-gray-600">
                              Daily Avg
                            </div>
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900">
                              {(
                                dashboardMetrics.transactions || 0
                              ).toLocaleString()}
                            </div>
                            <div className="text-xs text-gray-600">
                              Transactions
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Order Summary */}
                    <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-6 shadow-2xl border border-white/20">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-600 rounded-2xl flex items-center justify-center text-white">
                          <i className="fas fa-shopping-cart"></i>
                        </div>
                        <div className="font-bold text-gray-900">
                          Order Summary
                        </div>
                      </div>
                      <div className="space-y-4">
                        {[
                          {
                            status: "New Orders",
                            count: dashboardMetrics.newOrders || 0,
                            color: "green",
                          },
                          {
                            status: "Processing",
                            count: dashboardMetrics.processingOrders || 0,
                            color: "orange",
                          },
                          {
                            status: "Shipped",
                            count: dashboardMetrics.shippedOrders || 0,
                            color: "blue",
                          },
                        ].map((order, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between"
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-3 h-3 rounded-full ${
                                  order.color === "green"
                                    ? "bg-green-500"
                                    : order.color === "orange"
                                    ? "bg-orange-500"
                                    : "bg-blue-500"
                                }`}
                              ></div>
                              <span className="text-sm text-gray-600">
                                {order.status}
                              </span>
                            </div>
                            <span className="font-semibold text-gray-900">
                              {order.count}
                            </span>
                          </div>
                        ))}
                      </div>
                      <button className="w-full mt-6 py-3 border-2 border-blue-600 text-blue-600 rounded-xl font-semibold hover:bg-blue-600 hover:text-white transition-colors">
                        View All Orders
                      </button>
                    </div>

                    {/* Inventory Status */}
                    <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-6 shadow-2xl border border-white/20">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center text-white">
                          <i className="fas fa-warehouse"></i>
                        </div>
                        <div className="font-bold text-gray-900">
                          Inventory Status
                        </div>
                      </div>
                      <div className="space-y-4">
                        {[
                          {
                            label: "Low Stock",
                            value: dashboardMetrics.lowStockItems || 0,
                            trend: `+${dashboardMetrics.lowStockChange || 0}`,
                            warning: true,
                          },
                          {
                            label: "Out of Stock",
                            value: dashboardMetrics.outOfStockItems || 0,
                            trend: `+${dashboardMetrics.outOfStockChange || 0}`,
                            danger: true,
                          },
                          {
                            label: "Total Products",
                            value: (
                              dashboardMetrics.totalProducts || 0
                            ).toLocaleString(),
                            trend: "",
                            neutral: true,
                          },
                        ].map((item, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between"
                          >
                            <span className="text-sm text-gray-600">
                              {item.label}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-gray-900">
                                {item.value}
                              </span>
                              {item.trend && (
                                <span
                                  className={`text-xs px-2 py-1 rounded-full ${
                                    item.warning
                                      ? "bg-orange-100 text-orange-700"
                                      : item.danger
                                      ? "bg-red-100 text-red-700"
                                      : "bg-blue-100 text-blue-700"
                                  }`}
                                >
                                  {item.trend}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                      <button className="w-full mt-6 py-3 border-2 border-blue-600 text-blue-600 rounded-xl font-semibold hover:bg-blue-600 hover:text-white transition-colors">
                        Manage Inventory
                      </button>
                    </div>
                  </div>

                  {/* Priority Section */}
                  <div className="grid grid-cols-2 gap-8">
                    {/* Urgent Actions */}
                    <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-6 shadow-2xl border border-white/20">
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-bold text-gray-900">
                          Critical Alerts
                        </h3>
                        <button className="text-blue-600 font-semibold hover:text-blue-700">
                          View All
                        </button>
                      </div>
                      <div className="space-y-4">
                        {dashboardMetrics.lowStockItems > 0 && (
                          <div className="flex items-center justify-between p-4 bg-orange-50 rounded-2xl border border-orange-200">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                                <i className="fas fa-box text-orange-600"></i>
                              </div>
                              <div>
                                <div className="font-semibold text-gray-900">
                                  Low Stock Alert
                                </div>
                                <div className="text-sm text-orange-600">
                                  {dashboardMetrics.lowStockItems} items
                                  critically low
                                </div>
                              </div>
                            </div>
                            <button className="px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 transition-colors">
                              Restock Now
                            </button>
                          </div>
                        )}
                        {dashboardMetrics.supportTickets > 0 && (
                          <div className="flex items-center justify-between p-4 bg-blue-50 rounded-2xl border border-blue-200">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                                <i className="fas fa-headset text-blue-600"></i>
                              </div>
                              <div>
                                <div className="font-semibold text-gray-900">
                                  Support Ticket
                                </div>
                                <div className="text-sm text-blue-600">
                                  Customer escalation
                                </div>
                              </div>
                            </div>
                            <button className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors">
                              Review
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Recent Activity */}
                    <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-6 shadow-2xl border border-white/20">
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-bold text-gray-900">
                          Recent Activity
                        </h3>
                        <button className="text-blue-600 font-semibold hover:text-blue-700">
                          View All
                        </button>
                      </div>
                      <div className="space-y-4">
                        {recentActivities.length > 0 ? (
                          recentActivities
                            .slice(0, 3)
                            .map((activity, index) => (
                              <div
                                key={index}
                                className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl"
                              >
                                <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-700 rounded-xl flex items-center justify-center text-white">
                                  <i className="fas fa-user"></i>
                                </div>
                                <div className="flex-1">
                                  <div className="text-sm text-gray-900">
                                    <span className="font-semibold">
                                      {activity.user?.name || "System"}
                                    </span>
                                    <span> {activity.action}</span>
                                    <span className="font-semibold">
                                      {" "}
                                      {activity.target}
                                    </span>
                                  </div>
                                  <div className="text-xs text-blue-600">
                                    {activity.timeAgo || "Just now"}
                                  </div>
                                </div>
                                <button className="px-3 py-1 border border-blue-600 text-blue-600 rounded-lg text-xs font-semibold hover:bg-blue-600 hover:text-white transition-colors">
                                  View
                                </button>
                              </div>
                            ))
                        ) : (
                          <div className="text-center py-8 text-gray-500">
                            <i className="fas fa-history text-4xl mb-3 text-gray-300"></i>
                            <div>No recent activities</div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.section>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
