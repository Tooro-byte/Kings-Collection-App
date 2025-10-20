import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

const AdminDashboard = () => {
  const [activeSection, setActiveSection] = useState("dashboard");
  const [user, setUser] = useState({
    name: "Admin User",
    email: "admin@example.com",
    avatar:
      "https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=100",
    role: "Administrator",
  });
  const [metrics, setMetrics] = useState({
    totalRevenue: 0,
    pendingOrders: 0,
    newCustomers: 0,
    lowStockItems: 0,
    totalProducts: 0,
    activeCustomers: 0,
  });
  const [recentActivities, setRecentActivities] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [error, setError] = useState(null);

  const userDropdownRef = useRef(null);
  const navigate = useNavigate();

  const fetchWithAuth = async (url, options = {}) => {
    try {
      const config = {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...options.headers,
        },
        ...options,
      };

      const response = await fetch(url, config);

      const contentType = response.headers.get("content-type");
      if (contentType && !contentType.includes("application/json")) {
        const text = await response.text();
        if (text.startsWith("<!DOCTYPE") || text.startsWith("<html")) {
          throw new Error(
            `API returned HTML instead of JSON. Status: ${response.status}`
          );
        }
        try {
          return JSON.parse(text);
        } catch {
          throw new Error(`Unexpected response type: ${contentType}`);
        }
      }

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("API endpoint not found.");
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Fetch error for ${url}:`, error);
      throw error;
    }
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      let dashboardData;
      try {
        dashboardData = await fetchWithAuth("/api/admin/dashboard");
      } catch (adminError) {
        console.log(
          "Admin endpoint failed, trying regular dashboard:",
          adminError
        );
        const regularData = await fetchWithAuth("/api/dashboard");
        dashboardData = {
          metrics: {
            totalRevenue: regularData.totalSpent || 0,
            pendingOrders: regularData.orderCount || 0,
            newCustomers: 0,
            lowStockItems: 0,
            totalProducts: 0,
            activeCustomers: 1,
          },
          recentActivities: [],
          products: [],
        };
      }

      if (dashboardData) {
        setMetrics(dashboardData.metrics || {});
        setRecentActivities(dashboardData.recentActivities || []);
        setProducts(dashboardData.products || []);
      } else {
        throw new Error("No dashboard data received");
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      setError(error.message);
      setMetrics({
        totalRevenue: 0,
        pendingOrders: 0,
        newCustomers: 0,
        lowStockItems: 0,
        totalProducts: 0,
        activeCustomers: 0,
      });
      setRecentActivities([]);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        userDropdownRef.current &&
        !userDropdownRef.current.contains(event.target)
      ) {
        setShowUserDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to logout?")) {
      navigate("/logout");
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-UG", {
      style: "currency",
      currency: "UGX",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const mainNavItems = [
    {
      id: "dashboard",
      icon: "fa-tachometer-alt",
      label: "Dashboard",
      href: "/admin",
    },
    {
      id: "orders",
      icon: "fa-shopping-cart",
      label: "Orders",
      href: "/admin/orders",
      badge: metrics.pendingOrders,
    },
    {
      id: "products",
      icon: "fa-box",
      label: "Products",
      href: "/admin/products",
    },
    {
      id: "customers",
      icon: "fa-users",
      label: "Customers",
      href: "/admin/customers",
    },
  ];

  const sidebarSections = [
    {
      title: "Management",
      items: [
        { icon: "fa-tags", label: "Categories", href: "/admin/categories" },
        { icon: "fa-chart-line", label: "Analytics", href: "/admin/analytics" },
        { icon: "fa-bullhorn", label: "Marketing", href: "/admin/marketing" },
      ],
    },
    {
      title: "System",
      items: [
        { icon: "fa-cog", label: "Settings", href: "/admin/settings" },
        { icon: "fa-shield-alt", label: "Security", href: "/admin/security" },
        {
          icon: "fa-sign-out-alt",
          label: "Logout",
          href: "/logout",
          isLogout: true,
        },
      ],
    },
  ];

  const statCards = [
    {
      title: "Monthly Revenue",
      value: formatCurrency(metrics.totalRevenue),
      icon: "fa-money-bill-wave",
      color: "from-emerald-500 to-green-600",
      bgColor: "bg-gradient-to-r from-emerald-500 to-green-600",
    },
    {
      title: "Pending Orders",
      value: metrics.pendingOrders,
      icon: "fa-shopping-cart",
      color: "from-blue-500 to-cyan-600",
      bgColor: "bg-gradient-to-r from-blue-500 to-cyan-600",
    },
    {
      title: "New Customers",
      value: metrics.newCustomers,
      icon: "fa-users",
      color: "from-purple-500 to-indigo-600",
      bgColor: "bg-gradient-to-r from-purple-500 to-indigo-600",
    },
    {
      title: "Low Stock Items",
      value: metrics.lowStockItems,
      icon: "fa-exclamation-triangle",
      color: "from-amber-500 to-orange-600",
      bgColor: "bg-gradient-to-r from-amber-500 to-orange-600",
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 font-medium">
            Loading Admin Dashboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {error && (
        <div className="fixed top-4 right-4 z-50 max-w-sm">
          <motion.div
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg shadow-lg"
          >
            <div className="flex items-center">
              <i className="fas fa-exclamation-triangle mr-2"></i>
              <span className="text-sm font-medium">{error}</span>
              <button
                onClick={() => setError(null)}
                className="ml-auto text-red-500 hover:text-red-700"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
          </motion.div>
        </div>
      )}

      <nav className="bg-white/80 backdrop-blur-lg shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-700 rounded-lg flex items-center justify-center mr-3">
                  <i className="fas fa-crown text-white text-sm"></i>
                </div>
                <span className="text-xl font-bold text-slate-900">
                  Kings Collection
                </span>
                <span className="ml-2 text-sm text-slate-500 bg-slate-100 px-2 py-1 rounded">
                  Admin
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-1">
              {mainNavItems.map((item) => (
                <Link
                  key={item.id}
                  to={item.href}
                  onClick={() => setActiveSection(item.id)}
                  className={`relative px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${
                    activeSection === item.id
                      ? "bg-blue-50 text-blue-700 border border-blue-200 shadow-sm"
                      : "text-slate-600 hover:text-slate-900 hover:bg-white hover:shadow-sm"
                  }`}
                >
                  <i className={`fas ${item.icon} mr-2`}></i>
                  {item.label}
                  {item.badge > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {item.badge}
                    </span>
                  )}
                </Link>
              ))}
            </div>

            <div className="flex items-center space-x-4">
              <button
                onClick={fetchDashboardData}
                className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
                title="Refresh"
              >
                <i className="fas fa-sync-alt text-lg"></i>
              </button>

              <div className="relative" ref={userDropdownRef}>
                <button
                  onClick={() => setShowUserDropdown(!showUserDropdown)}
                  className="flex items-center space-x-3 p-2 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <img
                    src={user.avatar}
                    alt="Admin"
                    className="w-8 h-8 rounded-full border-2 border-blue-500"
                  />
                  <div className="text-left">
                    <div className="text-sm font-medium text-slate-900">
                      {user.name}
                    </div>
                    <div className="text-xs text-slate-500">{user.role}</div>
                  </div>
                  <i
                    className={`fas fa-chevron-down text-slate-400 text-sm transition-transform ${
                      showUserDropdown ? "rotate-180" : ""
                    }`}
                  ></i>
                </button>

                <AnimatePresence>
                  {showUserDropdown && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-2 w-64 bg-white/95 backdrop-blur-lg rounded-xl shadow-lg border border-slate-200 py-2 z-50"
                    >
                      <div className="px-4 py-3 border-b border-slate-100">
                        <div className="font-medium text-slate-900">
                          {user.name}
                        </div>
                        <div className="text-sm text-slate-500">
                          {user.email}
                        </div>
                      </div>

                      <Link
                        to="/admin/profile"
                        className="flex items-center px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        <i className="fas fa-user-circle text-slate-400 mr-3 w-5"></i>
                        Profile Settings
                      </Link>

                      <Link
                        to="/admin/settings"
                        className="flex items-center px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        <i className="fas fa-cog text-slate-400 mr-3 w-5"></i>
                        System Settings
                      </Link>

                      <div className="border-t border-slate-100 mt-2 pt-2">
                        <button
                          onClick={handleLogout}
                          className="flex items-center w-full px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <i className="fas fa-sign-out-alt mr-3 w-5"></i>
                          Logout
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          <aside className="w-64 flex-shrink-0">
            <div className="bg-white/80 backdrop-blur-lg rounded-xl shadow-sm border border-slate-200 p-6 sticky top-8">
              <nav className="space-y-8">
                {sidebarSections.map((section, index) => (
                  <div key={index}>
                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                      {section.title}
                    </h3>
                    <div className="space-y-1">
                      {section.items.map((item, itemIndex) => (
                        <Link
                          key={itemIndex}
                          to={item.href}
                          onClick={() => {
                            if (item.isLogout) {
                              handleLogout();
                            } else {
                              setActiveSection(
                                item.href.split("/")[2] || "dashboard"
                              );
                            }
                          }}
                          className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                            item.isLogout
                              ? "text-red-600 hover:bg-red-50"
                              : "text-slate-700 hover:bg-blue-50 hover:text-blue-700"
                          }`}
                        >
                          <i
                            className={`fas ${item.icon} mr-3 w-4 text-center`}
                          ></i>
                          {item.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </nav>

              <div className="mt-8 pt-6 border-t border-slate-200">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                  Quick Actions
                </h3>
                <div className="space-y-2">
                  <Link
                    to="/add-product"
                    className="flex items-center justify-center w-full bg-gradient-to-r from-blue-600 to-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:shadow-lg transition-all duration-200"
                  >
                    <i className="fas fa-plus mr-2"></i>
                    Add Product
                  </Link>
                  <Link
                    to="/admin/analytics"
                    className="flex items-center justify-center w-full border border-slate-300 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
                  >
                    <i className="fas fa-chart-bar mr-2"></i>
                    View Reports
                  </Link>
                </div>
              </div>
            </div>
          </aside>

          <main className="flex-1 min-w-0">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-slate-900 mb-2">
                Welcome back, {user.name}!
              </h1>
              <p className="text-slate-600">
                Here's what's happening with your store today.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {statCards.map((stat, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white/80 backdrop-blur-lg rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-all duration-200"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div
                      className={`p-3 rounded-xl ${stat.bgColor} text-white shadow-lg`}
                    >
                      <i className={`fas ${stat.icon} text-lg`}></i>
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-1">
                    {stat.value}
                  </h3>
                  <p className="text-slate-600 text-sm">{stat.title}</p>
                </motion.div>
              ))}
            </div>

            <div className="bg-white/80 backdrop-blur-lg rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-slate-900">
                  Products
                </h2>
                <Link
                  to="/admin/products"
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  View All
                </Link>
              </div>
              {products.length > 0 ? (
                <div className="space-y-4">
                  {products.map((product) => (
                    <div
                      key={product.id}
                      className="flex items-center space-x-4 p-3 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      <img
                        src={product.image || "/Images/placeholder.png"}
                        alt={product.title}
                        className="w-12 h-12 object-cover rounded-lg"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-900">
                          {product.title}
                        </p>
                        <p className="text-xs text-slate-500">
                          {formatCurrency(product.price)}
                        </p>
                      </div>
                      <Link
                        to={`/update-product/${product.id}`}
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                      >
                        Edit
                      </Link>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <i className="fas fa-box-open text-3xl mb-3 text-slate-300"></i>
                  <p className="text-sm">No products available</p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white/80 backdrop-blur-lg rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold text-slate-900">
                    Recent Activity
                  </h2>
                  <Link
                    to="/admin/activity"
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    View All
                  </Link>
                </div>
                <div className="space-y-4">
                  {recentActivities.length > 0 ? (
                    recentActivities.map((activity) => (
                      <div
                        key={activity.id}
                        className="flex items-center space-x-4 p-3 rounded-lg hover:bg-slate-50 transition-colors"
                      >
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            activity.type === "order"
                              ? "bg-blue-100 text-blue-600"
                              : activity.type === "inventory"
                              ? "bg-amber-100 text-amber-600"
                              : activity.type === "customer"
                              ? "bg-emerald-100 text-emerald-600"
                              : activity.type === "payment"
                              ? "bg-purple-100 text-purple-600"
                              : "bg-red-100 text-red-600"
                          }`}
                        >
                          <i
                            className={`fas ${
                              activity.type === "order"
                                ? "fa-shopping-cart"
                                : activity.type === "inventory"
                                ? "fa-box"
                                : activity.type === "customer"
                                ? "fa-user-plus"
                                : activity.type === "payment"
                                ? "fa-credit-card"
                                : "fa-exclamation-triangle"
                            }`}
                          ></i>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-slate-900">
                            {activity.action}
                          </p>
                          <p className="text-xs text-slate-500">
                            {activity.time}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-slate-500">
                      <i className="fas fa-history text-3xl mb-3 text-slate-300"></i>
                      <p className="text-sm">No recent activities</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white/80 backdrop-blur-lg rounded-xl shadow-sm border border-slate-200 p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-6">
                  Store Overview
                </h2>
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-3 border-b border-slate-100">
                    <span className="text-sm text-slate-600">
                      Total Products
                    </span>
                    <span className="text-sm font-semibold text-slate-900">
                      {metrics.totalProducts}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-slate-100">
                    <span className="text-sm text-slate-600">
                      Active Customers
                    </span>
                    <span className="text-sm font-semibold text-slate-900">
                      {metrics.activeCustomers}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-slate-100">
                    <span className="text-sm text-slate-600">
                      This Month's Sales
                    </span>
                    <span className="text-sm font-semibold text-slate-900">
                      {metrics.pendingOrders}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-3">
                    <span className="text-sm text-slate-600">Store Rating</span>
                    <div className="flex items-center">
                      <span className="text-sm font-semibold text-slate-900 mr-2">
                        -
                      </span>
                      <i className="fas fa-star text-slate-300"></i>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-slate-200">
                  <Link
                    to="/admin/analytics"
                    className="flex items-center justify-center w-full bg-slate-100 text-slate-700 px-4 py-3 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors"
                  >
                    <i className="fas fa-chart-line mr-2"></i>
                    View Detailed Analytics
                  </Link>
                </div>
              </div>
            </div>

            <div className="mt-8 bg-gradient-to-r from-blue-600 to-purple-700 rounded-xl p-6 text-white shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold mb-2">
                    Need help with your store?
                  </h3>
                  <p className="text-blue-100 text-sm">
                    Access our comprehensive documentation and support
                    resources.
                  </p>
                </div>
                <div className="flex space-x-3">
                  <Link
                    to="/admin/docs"
                    className="px-4 py-2 bg-white text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-50 transition-colors"
                  >
                    Documentation
                  </Link>
                  <Link
                    to="/admin/support"
                    className="px-4 py-2 border border-white text-white rounded-lg text-sm font-medium hover:bg-white hover:text-blue-600 transition-colors"
                  >
                    Contact Support
                  </Link>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
