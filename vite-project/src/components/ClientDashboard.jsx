import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate, useLocation } from "react-router-dom"; // Added imports

const ClientDashboard = () => {
  const [activeSection, setActiveSection] = useState("dashboard");
  const [user, setUser] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [recommendedProducts, setRecommendedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentTime, setCurrentTime] = useState("");
  const [currentDate, setCurrentDate] = useState("");
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileNav, setShowMobileNav] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);

  const notificationRef = useRef(null);
  const userMenuRef = useRef(null);
  const searchRef = useRef(null);

  // Added React Router hooks
  const navigate = useNavigate();
  const location = useLocation();

  // API base URL - pointing to the backend server
  const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL || "http://localhost:3005/api";

  // Helper function to make authenticated requests
  const makeAuthenticatedRequest = async (url, options = {}) => {
    // Check if backend server is reachable
    try {
      const healthCheck = await fetch(
        `${API_BASE_URL.replace("/api", "")}/health`,
        {
          method: "GET",
          credentials: "include",
        }
      );
      if (!healthCheck.ok) {
        throw new Error(
          `Backend server health check failed: ${healthCheck.status}`
        );
      }
    } catch (healthError) {
      console.error("Backend server is not reachable:", healthError);
      throw new Error(
        "Cannot connect to backend server. Please ensure the server is running on http://localhost:3005"
      );
    }

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
        if (response.status === 0 || response.status >= 500) {
          throw new Error(
            `Server connection failed. Please check if the backend server is running on http://localhost:3005`
          );
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        if (text.includes("<!DOCTYPE html>")) {
          throw new Error(
            `Server returned HTML instead of JSON. This usually means the API endpoint doesn't exist or the server is not properly configured.`
          );
        }
        throw new Error(
          `Expected JSON response but got: ${contentType || "unknown"}`
        );
      }

      return await response.json();
    } catch (error) {
      console.error(`API Request failed for ${API_BASE_URL}${url}:`, error);

      // Provide more specific error messages
      if (
        error.name === "TypeError" &&
        error.message.includes("Failed to fetch")
      ) {
        throw new Error(
          "Cannot connect to backend server. Please ensure the server is running on http://localhost:3005 and CORS is properly configured."
        );
      }

      throw error;
    }
  };

  // Handle token authentication on component mount
  useEffect(() => {
    const handleTokenAuthentication = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get("token");

      if (token) {
        try {
          await makeAuthenticatedRequest("/users/verify-token", {
            method: "POST",
            body: JSON.stringify({ token }),
          });

          // Remove token from URL after successful verification
          const newUrl = window.location.pathname;
          window.history.replaceState({}, document.title, newUrl);
        } catch (error) {
          console.error("Token verification failed:", error);
          setError("Authentication failed. Please log in again.");
        }
      }
    };

    handleTokenAuthentication();
  }, []);

  // Fetch user data
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        console.log("Fetching user data...");
        const userData = await makeAuthenticatedRequest("/users/me");
        console.log("User data received:", userData);
        setUser(userData);
      } catch (error) {
        console.error("Failed to fetch user data:", error);
        setError(`Failed to load user data: ${error.message}`);
      }
    };

    fetchUserData();
  }, []);

  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        console.log("Fetching dashboard data...");
        const data = await makeAuthenticatedRequest("/dashboard");
        console.log("Dashboard data received:", data);
        setDashboardData(data);
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
        setError(`Failed to load dashboard data: ${error.message}`);
      }
    };

    fetchDashboardData();
  }, []);

  // Fetch recent orders
  useEffect(() => {
    const fetchRecentOrders = async () => {
      try {
        console.log("Fetching recent orders...");
        const orders = await makeAuthenticatedRequest("/orders/recent");
        console.log("Orders received:", orders);
        setRecentOrders(orders);
      } catch (error) {
        console.error("Failed to fetch recent orders:", error);
        setError(`Failed to load recent orders: ${error.message}`);
      }
    };

    fetchRecentOrders();
  }, []);

  // Fetch recommended products
  useEffect(() => {
    const fetchRecommendedProducts = async () => {
      try {
        console.log("Fetching recommended products...");
        const products = await makeAuthenticatedRequest(
          "/products/recommended"
        );
        console.log("Products received:", products);
        setRecommendedProducts(products);
        setLoading(false);
      } catch (error) {
        console.error("Failed to fetch recommended products:", error);
        setError(`Failed to load recommended products: ${error.message}`);
        setLoading(false);
      }
    };

    fetchRecommendedProducts();
  }, []);

  // Clock functionality
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        })
      );
      setCurrentDate(
        now.toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target)
      ) {
        setShowNotifications(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setSearchResults([]);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearch = async (query) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      const results = await makeAuthenticatedRequest(
        `/products/search?q=${encodeURIComponent(query)}`
      );
      setSearchResults(results);
    } catch (error) {
      console.error("Search failed:", error);
      setSearchResults([]);
    }
  };

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to logout?")) {
      window.location.href = `${API_BASE_URL.replace("/api", "")}/logout`;
      window.location.href = "/";
    }
  };

  // Navigation handler function
  const handleNavigation = (path, sectionId) => {
    navigate(path);
    setActiveSection(sectionId);
    setShowMobileNav(false);
  };

  // Navigation data - Updated to use paths instead of href
  const mainNavItems = [
    {
      id: "dashboard",
      icon: "fa-home",
      label: "Dashboard",
      path: "/client",
    },
    {
      id: "orders",
      icon: "fa-box",
      label: "My Orders",
      path: "/orders",
      badge: dashboardData?.orderCount || 0,
    },
    { id: "products", icon: "fa-tags", label: "Products", path: "/products" },
    {
      id: "cart",
      icon: "fa-shopping-cart",
      label: "Cart",
      path: "/cart",
      badge: dashboardData?.cartCount || 0,
    },
    {
      id: "messages",
      icon: "fa-envelope",
      label: "Messages",
      path: "/messages",
      badge: dashboardData?.messageCount || 0,
      isNew: true,
    },
    {
      id: "payment-methods",
      icon: "fa-credit-card",
      label: "Payment",
      path: "/payment-methods",
    },
  ];

  const sidebarSections = [
    {
      title: "Main",
      items: [
        {
          icon: "fa-home",
          label: "Dashboard Home",
          path: "/client",
          section: "dashboard",
        },
        {
          icon: "fa-box",
          label: "My Orders",
          path: "/orders",
          section: "orders",
          count: dashboardData?.orderCount || 0,
        },
        {
          icon: "fa-tags",
          label: "Products",
          path: "/products",
          section: "products",
        },
      ],
    },
    {
      title: "Account",
      items: [
        {
          icon: "fa-user-cog",
          label: "Account Details",
          path: "/account",
          section: "account",
        },
        {
          icon: "fa-map-marker-alt",
          label: "Addresses",
          path: "/addresses",
          section: "addresses",
        },
        {
          icon: "fa-credit-card",
          label: "Payment Methods",
          path: "/payment-methods",
          section: "payment-methods",
        },
      ],
    },
  ];

  const statsCards = [
    {
      icon: "fa-box",
      number: dashboardData?.orderCount || 0,
      label: "Orders This Year",
      trend: "+15% from last year",
      type: "orders",
    },
    {
      icon: "fa-heart",
      number: dashboardData?.wishlistCount || 0,
      label: "Wishlist Items",
      trend: `${dashboardData?.wishlistOnSale || 0} items on sale`,
      type: "wishlist",
    },
    {
      icon: "fa-star",
      number: dashboardData?.loyaltyPoints || 0,
      label: "Loyalty Points",
      trend: "Ready to redeem",
      type: "loyalty",
    },
    {
      icon: "fa-piggy-bank",
      number: `$${dashboardData?.totalSaved || 0}`,
      label: "Total Saved",
      trend: "Through deals & discounts",
      type: "savings",
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center bg-white p-8 rounded-3xl shadow-2xl"
        >
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-700 text-lg font-semibold">
            Loading your dashboard...
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Error Message */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-100 border border-red-400 text-red-700 p-4 rounded-lg mb-4 mx-auto max-w-6xl mx-6"
        >
          <div className="flex items-center gap-3">
            <i className="fas fa-exclamation-triangle text-red-500"></i>
            <span>{error}</span>
          </div>
        </motion.div>
      )}

      {/* Header */}
      <header className="bg-white/95 backdrop-blur-xl border-b border-gray-200/80 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-20 gap-8">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <motion.div
                className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-700 rounded-2xl flex items-center justify-center shadow-lg"
                whileHover={{ scale: 1.05, rotate: 5 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <i className="fas fa-crown text-white text-xl"></i>
              </motion.div>
              <div>
                <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-700 bg-clip-text text-transparent">
                  Kings Collection
                </span>
                <div className="text-xs text-gray-500 font-medium">
                  Premium Shopping
                </div>
              </div>
            </div>

            {/* Mobile Nav Toggle */}
            <motion.button
              aria-label="Toggle mobile navigation"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="md:hidden bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 transition-colors"
              onClick={() => setShowMobileNav(!showMobileNav)}
            >
              <i className="fas fa-bars"></i>
            </motion.button>

            {/* Main Navigation - FIXED: Using buttons with navigate */}
            <nav
              className={`${
                showMobileNav ? "flex" : "hidden"
              } md:flex items-center gap-1 flex-1 justify-center flex-col md:flex-row absolute md:static top-20 left-0 right-0 bg-white md:bg-transparent p-4 md:p-0 z-40 border-t md:border-t-0 border-gray-200 md:border-none`}
            >
              {mainNavItems.map((item) => (
                <motion.button
                  key={item.id}
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  className={`relative flex items-center gap-3 px-6 py-3 rounded-2xl font-semibold transition-all duration-300 w-full md:w-auto text-center ${
                    activeSection === item.id
                      ? "bg-gradient-to-r from-blue-600 to-purple-700 text-white shadow-lg shadow-blue-500/25"
                      : "text-gray-700 hover:bg-white hover:shadow-lg hover:border hover:border-gray-200"
                  }`}
                  onClick={() => handleNavigation(item.path, item.id)}
                  aria-label={item.label}
                >
                  <i className={`fas ${item.icon} w-5 text-center`}></i>
                  <span className="whitespace-nowrap">{item.label}</span>
                  {item.badge > 0 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className={`absolute -top-2 -right-2 text-xs px-2 py-1 rounded-full font-bold min-w-[1.5rem] text-center ${
                        item.isNew
                          ? "bg-gradient-to-r from-red-500 to-pink-600 text-white animate-pulse"
                          : "bg-gradient-to-r from-blue-500 to-cyan-600 text-white"
                      }`}
                    >
                      {item.badge > 99 ? "99+" : item.badge}
                    </motion.span>
                  )}
                </motion.button>
              ))}
            </nav>

            {/* Header Actions */}
            <div className="flex items-center gap-4">
              {/* Search */}
              <div className="relative hidden md:block" ref={searchRef}>
                <motion.div
                  className="flex items-center bg-gray-100/80 backdrop-blur-sm rounded-2xl px-4 py-3 gap-3 min-w-[320px] border border-gray-200/60 hover:border-blue-300 transition-colors"
                  whileHover={{ scale: 1.02 }}
                  transition={{ type: "spring", stiffness: 400 }}
                >
                  <i className="fas fa-search text-gray-500 text-sm"></i>
                  <input
                    type="text"
                    placeholder="Search products, brands, categories..."
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="bg-transparent border-none outline-none flex-1 text-sm placeholder-gray-500"
                    aria-label="Search products"
                  />
                </motion.div>
                {searchResults.length > 0 && (
                  <motion.div
                    className="absolute top-full left-0 bg-white rounded-2xl shadow-xl mt-2 w-full z-50 border border-gray-200"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    {searchResults.map((result) => (
                      <Link
                        key={result._id}
                        to={`/products/${result._id}`}
                        className="block p-3 hover:bg-gray-50 text-gray-700 hover:text-blue-600"
                      >
                        {result.title}
                      </Link>
                    ))}
                  </motion.div>
                )}
              </div>

              {/* User Menu */}
              <div className="relative" ref={userMenuRef}>
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center gap-3 cursor-pointer bg-white rounded-2xl p-2 pl-4 border border-gray-200 hover:shadow-lg hover:border-blue-300 transition-all"
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  aria-label="User menu"
                >
                  <motion.img
                    src={
                      user?.photo ||
                      "https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=100"
                    }
                    alt="User profile"
                    className="w-12 h-12 rounded-xl border-2 border-blue-500 shadow-sm object-cover"
                    whileHover={{ scale: 1.1 }}
                    transition={{ type: "spring", stiffness: 400 }}
                    onError={(e) => {
                      e.target.src =
                        "https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=100";
                    }}
                  />
                  <div className="flex flex-col mr-2">
                    <span className="font-bold text-gray-900 text-sm">
                      {user?.name || "Loading..."}
                    </span>
                    <span className="text-blue-600 text-xs font-semibold bg-blue-50 px-2 py-1 rounded-full">
                      {user?.role === "premium_client"
                        ? "👑 Premium Member"
                        : user?.role || "Member"}
                    </span>
                  </div>
                </motion.div>
                <AnimatePresence>
                  {showUserMenu && (
                    <motion.div
                      className="absolute top-full right-0 bg-white rounded-2xl shadow-2xl mt-3 w-64 z-50 border border-gray-200"
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    >
                      <Link
                        to="/account"
                        className="flex items-center gap-4 p-4 hover:bg-blue-50 rounded-t-2xl border-b border-gray-100 transition-colors"
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
                      </Link>
                      <Link
                        to="/support"
                        className="flex items-center gap-4 p-4 hover:bg-blue-50 border-b border-gray-100 transition-colors"
                      >
                        <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                          <i className="fas fa-life-ring text-green-600"></i>
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">
                            Help & Support
                          </div>
                          <div className="text-gray-500 text-sm">
                            Get assistance
                          </div>
                        </div>
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-4 p-4 hover:bg-red-50 rounded-b-2xl text-red-600 transition-colors w-full text-left"
                        aria-label="Logout"
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
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Welcome Section */}
        <motion.section
          className="bg-gradient-to-r from-blue-600 to-purple-700 rounded-3xl p-8 shadow-2xl mb-8 text-white relative overflow-hidden"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-32 translate-x-32"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-24 -translate-x-24"></div>
          <div className="flex items-center justify-between relative z-10">
            <div className="flex-1">
              <motion.h1
                className="text-5xl font-bold mb-4"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                Welcome back,{" "}
                <span className="bg-gradient-to-r from-amber-300 to-yellow-400 bg-clip-text text-transparent">
                  {user?.name || "Valued Customer"}!
                </span>
              </motion.h1>
              <motion.p
                className="text-blue-100 text-xl mb-8 max-w-2xl"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
              >
                Ready to discover amazing deals and new arrivals? Your
                personalized shopping experience awaits.
              </motion.p>
              <motion.div
                className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 inline-block"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 }}
                whileHover={{ scale: 1.05 }}
              >
                <div className="flex flex-col items-start">
                  <motion.span
                    className="text-3xl font-mono font-bold text-white mb-2"
                    key={currentTime}
                    initial={{ scale: 1.2 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 500 }}
                  >
                    {currentTime}
                  </motion.span>
                  <span className="text-blue-100 text-lg">{currentDate}</span>
                </div>
              </motion.div>
            </div>
          </div>
        </motion.section>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <motion.aside
            className="bg-white rounded-3xl p-6 shadow-xl border border-gray-200 h-fit lg:sticky top-32"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
          >
            <nav className="space-y-8">
              {sidebarSections.map((section, sectionIndex) => (
                <motion.div
                  key={`sidebar-section-${sectionIndex}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 + sectionIndex * 0.1 }}
                >
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 px-2">
                    {section.title}
                  </h4>
                  <div className="space-y-2">
                    {section.items.map((item, itemIndex) => (
                      <motion.button
                        key={`sidebar-item-${sectionIndex}-${itemIndex}`}
                        whileHover={{ x: 4, scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={`flex items-center gap-4 px-4 py-3 rounded-2xl font-medium transition-all group w-full text-left ${
                          activeSection === item.section
                            ? "bg-gradient-to-r from-blue-50 to-purple-50 text-blue-700 border border-blue-200 shadow-sm"
                            : "text-gray-700 hover:bg-gray-50 hover:shadow-sm hover:border hover:border-gray-200"
                        }`}
                        onClick={() =>
                          handleNavigation(item.path, item.section)
                        }
                        aria-label={item.label}
                      >
                        <i
                          className={`fas ${item.icon} w-5 text-center ${
                            activeSection === item.section
                              ? "text-blue-600"
                              : "text-gray-500 group-hover:text-blue-600"
                          }`}
                        ></i>
                        <span className="flex-1">{item.label}</span>
                        {item.count > 0 && (
                          <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className={`text-xs px-2 py-1 rounded-full font-semibold ${
                              item.isNew
                                ? "bg-gradient-to-r from-red-500 to-pink-600 text-white"
                                : "bg-blue-100 text-blue-700"
                            }`}
                          >
                            {item.count > 99 ? "99+" : item.count}
                          </motion.span>
                        )}
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              ))}
            </nav>
          </motion.aside>

          {/* Main Dashboard Content */}
          <div className="lg:col-span-3 space-y-8">
            {/* Stats Grid */}
            <motion.div
              className="grid grid-cols-2 lg:grid-cols-4 gap-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              {statsCards.map((stat, index) => (
                <motion.div
                  key={`stat-card-${stat.type}-${index}`}
                  whileHover={{ scale: 1.02, y: -2 }}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                  className="bg-white rounded-2xl p-6 border border-gray-200 shadow-lg hover:shadow-xl transition-all"
                >
                  <div className="flex items-center gap-4">
                    <motion.div
                      className={`w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl shadow-lg ${
                        stat.type === "orders"
                          ? "bg-gradient-to-r from-blue-500 to-blue-600"
                          : stat.type === "wishlist"
                          ? "bg-gradient-to-r from-pink-500 to-rose-600"
                          : stat.type === "loyalty"
                          ? "bg-gradient-to-r from-amber-500 to-orange-600"
                          : "bg-gradient-to-r from-emerald-500 to-green-600"
                      }`}
                      whileHover={{ rotate: 360 }}
                      transition={{ duration: 0.5 }}
                    >
                      <i className={`fas ${stat.icon}`}></i>
                    </motion.div>
                    <div className="flex-1">
                      <motion.div
                        className="text-3xl font-bold text-gray-900"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{
                          delay: 0.5 + index * 0.1,
                          type: "spring",
                        }}
                      >
                        {stat.number}
                      </motion.div>
                      <div className="text-gray-600 font-semibold mb-2">
                        {stat.label}
                      </div>
                      <div
                        className={`text-sm flex items-center gap-2 ${
                          stat.trend.includes("+")
                            ? "text-emerald-600"
                            : "text-gray-500"
                        }`}
                      >
                        {stat.trend.includes("+") && (
                          <i className="fas fa-arrow-up text-xs"></i>
                        )}
                        <span className="font-medium">{stat.trend}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>

            {/* Dashboard Widgets */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Recent Orders */}
              <motion.div
                className="bg-white rounded-2xl p-6 border border-gray-200 shadow-lg"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
              >
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">
                      Recent Orders
                    </h3>
                    <p className="text-gray-600">Your latest purchases</p>
                  </div>
                  <button
                    onClick={() => handleNavigation("/orders", "orders")}
                    className="text-blue-600 font-semibold text-sm hover:text-blue-700 flex items-center gap-2"
                    aria-label="View all orders"
                  >
                    View All
                    <i className="fas fa-arrow-right"></i>
                  </button>
                </div>
                <div className="space-y-4">
                  {recentOrders.length > 0 ? (
                    recentOrders.map((order, index) => (
                      <motion.div
                        key={order._id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.5 + index * 0.1 }}
                        className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-200 hover:shadow-md transition-all"
                      >
                        <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center">
                          <i className="fas fa-box text-blue-600"></i>
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900">
                            Order #{order.orderId}
                          </h4>
                          <p className="text-gray-600 text-sm">
                            {new Date(order.orderDate).toLocaleDateString()}
                          </p>
                          <div className="text-gray-900 font-semibold">
                            ${order.totalPrice?.toFixed(2)}
                          </div>
                        </div>
                        <div
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            order.status === "delivered"
                              ? "bg-emerald-100 text-emerald-700"
                              : order.status === "shipped"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {order.status}
                        </div>
                      </motion.div>
                    ))
                  ) : (
                    <motion.div
                      className="text-center py-8 text-gray-500"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.6 }}
                    >
                      <i className="fas fa-box-open text-4xl mb-3 text-gray-300"></i>
                      <div>No recent orders</div>
                    </motion.div>
                  )}
                </div>
              </motion.div>

              {/* Recommendations */}
              <motion.div
                className="bg-white rounded-2xl p-6 border border-gray-200 shadow-lg"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
              >
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">
                      Recommended for You
                    </h3>
                    <p className="text-gray-600">Based on your preferences</p>
                  </div>
                  <button
                    onClick={() => handleNavigation("/products", "products")}
                    className="text-blue-600 font-semibold text-sm hover:text-blue-700 flex items-center gap-2"
                    aria-label="Browse more products"
                  >
                    Browse More
                    <i className="fas fa-arrow-right"></i>
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {recommendedProducts.length > 0 ? (
                    recommendedProducts.map((product, index) => (
                      <motion.div
                        key={product._id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.5 + index * 0.1 }}
                        className="bg-gray-50 rounded-2xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all group"
                      >
                        <div className="relative h-40 bg-gray-200 overflow-hidden">
                          <motion.img
                            src={product.image || product.images?.[0]}
                            alt={product.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            whileHover={{ scale: 1.1 }}
                            transition={{ duration: 0.3 }}
                            onError={(e) => {
                              e.target.src =
                                "https://images.pexels.com/photos/1598505/pexels-photo-1598505.jpeg?auto=compress&cs=tinysrgb&w=150";
                            }}
                          />
                        </div>
                        <div className="p-4">
                          <h4 className="font-semibold text-gray-900 text-sm mb-2 line-clamp-2">
                            {product.title}
                          </h4>
                          <div className="flex items-center justify-between">
                            <span className="text-blue-600 font-bold">
                              ${product.price?.toFixed(2)}
                            </span>
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              className="bg-blue-600 text-white px-3 py-2 rounded-xl text-sm hover:bg-blue-700 transition-colors font-semibold"
                              aria-label={`Add ${product.title} to cart`}
                            >
                              <i className="fas fa-shopping-cart mr-1"></i>
                              Add
                            </motion.button>
                          </div>
                        </div>
                      </motion.div>
                    ))
                  ) : (
                    <motion.div
                      className="col-span-2 text-center py-8 text-gray-500"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.6 }}
                    >
                      <i className="fas fa-gift text-4xl mb-3 text-gray-300"></i>
                      <div>No recommendations available</div>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ClientDashboard;
