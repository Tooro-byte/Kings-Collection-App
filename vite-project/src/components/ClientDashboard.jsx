import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

const ClientDashboard = () => {
  const [activeSection, setActiveSection] = useState("dashboard");
  const [user, setUser] = useState({
    name: "Guest",
    role: "client",
    photo:
      "https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=100",
  });
  const [dashboardData, setDashboardData] = useState({
    orderCount: 0,
    cartCount: 0,
    messageCount: 0,
    notificationCount: 0,
    wishlistCount: 0,
    totalSpent: 0,
    lastOrderDate: "N/A",
    loyaltyPoints: 0,
    totalSaved: 0,
    wishlistOnSale: 0,
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [recommendedProducts, setRecommendedProducts] = useState([]);
  const [currentTime, setCurrentTime] = useState("");
  const [currentDate, setCurrentDate] = useState("");
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileNav, setShowMobileNav] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [messages, setMessages] = useState([]);
  const [cart, setCart] = useState({
    products: [],
    totalProducts: 0,
    totalCartPrice: 0,
  });
  const [notificationQueue, setNotificationQueue] = useState([]);
  const [messageFilter, setMessageFilter] = useState("all");

  const notificationRef = useRef(null);
  const userMenuRef = useRef(null);
  const searchRef = useRef(null);

  // Fetch user data
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await fetch("/api/users/me", {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        if (!response.ok) throw new Error("Failed to fetch user data");
        const userData = await response.json();
        setUser({
          name: userData.user.name || "Guest",
          role: userData.user.role || "client",
          photo:
            userData.user.photo ||
            "https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=100",
        });
      } catch (error) {
        console.error("Error fetching user data:", error);
        showNotification("Error fetching user data", "error");
      }
    };
    fetchUserData();
  }, []);

  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const response = await fetch("/api/dashboard");
        if (!response.ok) throw new Error("Failed to fetch dashboard data");
        const data = await response.json();
        setDashboardData(data);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        showNotification("Error fetching dashboard data", "error");
      }
    };
    fetchDashboardData();
  }, []);

  // Fetch recent orders
  useEffect(() => {
    const fetchRecentOrders = async () => {
      try {
        const response = await fetch("/api/orders/recent");
        if (!response.ok) throw new Error("Failed to fetch recent orders");
        const orders = await response.json();
        setRecentOrders(orders);
      } catch (error) {
        console.error("Error fetching recent orders:", error);
        showNotification("Error fetching recent orders", "error");
      }
    };
    fetchRecentOrders();
  }, []);

  // Fetch recommended products
  useEffect(() => {
    const fetchRecommendedProducts = async () => {
      try {
        const response = await fetch("/api/products/recommended");
        if (!response.ok)
          throw new Error("Failed to fetch recommended products");
        const products = await response.json();
        setRecommendedProducts(products);
      } catch (error) {
        console.error("Error fetching recommended products:", error);
        showNotification("Error fetching recommended products", "error");
      }
    };
    fetchRecommendedProducts();
  }, []);

  // Fetch messages
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const response = await fetch("/api/messages");
        if (!response.ok) throw new Error("Failed to fetch messages");
        const messages = await response.json();
        setMessages(messages);
        setDashboardData((prev) => ({
          ...prev,
          messageCount: messages.filter((msg) => msg.isUnread).length,
        }));
      } catch (error) {
        console.error("Error fetching messages:", error);
        showNotification("Error fetching messages", "error");
      }
    };
    fetchMessages();
  }, []);

  // Fetch cart data
  useEffect(() => {
    const fetchCartData = async () => {
      try {
        const response = await fetch("/api/cart");
        if (!response.ok) throw new Error("Failed to fetch cart");
        const cartData = await response.json();
        setCart(cartData);
        setDashboardData((prev) => ({
          ...prev,
          cartCount: cartData.totalProducts,
        }));
      } catch (error) {
        console.error("Error fetching cart:", error);
        showNotification("Error fetching cart", "error");
      }
    };
    fetchCartData();
  }, []);

  // Clock functionality
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("en-US", {
          hour12: false,
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
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

  // Handle search
  const handleSearch = async (query) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    try {
      const response = await fetch(
        `/api/products?search=${encodeURIComponent(query)}`
      );
      if (!response.ok) throw new Error("Failed to search products");
      const results = await response.json();
      setSearchResults(results);
    } catch (error) {
      console.error("Error searching products:", error);
      showNotification("Error searching products", "error");
    }
  };

  // Handle logout
  const handleLogout = () => {
    if (window.confirm("Are you sure you want to logout?")) {
      showNotification("Logging out...", "info");
      setTimeout(() => {
        window.location.href = "/";
      }, 1500);
    }
  };

  // Add to cart
  const addToCart = async (productId) => {
    try {
      const response = await fetch(`/api/cart/${productId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: 1 }),
      });
      if (!response.ok) throw new Error("Failed to add to cart");
      const result = await response.json();
      showNotification(result.Message || "Product added to cart!", "success");
      const cartResponse = await fetch("/api/cart");
      const cartData = await cartResponse.json();
      setCart(cartData);
      setDashboardData((prev) => ({
        ...prev,
        cartCount: cartData.totalProducts,
      }));
    } catch (error) {
      console.error("Error adding to cart:", error);
      showNotification("Error adding to cart", "error");
    }
  };

  // Update cart quantity
  const updateCartQuantity = async (productId, isIncrease) => {
    try {
      const endpoint = isIncrease
        ? `/api/cart/increase/${productId}`
        : `/api/cart/decrease/${productId}`;
      const response = await fetch(endpoint, { method: "PATCH" });
      if (!response.ok) throw new Error("Failed to update cart");
      const result = await response.json();
      showNotification(result.Message || "Cart updated", "success");
      const cartResponse = await fetch("/api/cart");
      const cartData = await cartResponse.json();
      setCart(cartData);
      setDashboardData((prev) => ({
        ...prev,
        cartCount: cartData.totalProducts,
      }));
    } catch (error) {
      console.error("Error updating cart:", error);
      showNotification("Error updating cart", "error");
    }
  };

  // Remove from cart
  const removeFromCart = async (productId) => {
    if (window.confirm("Remove this item from your cart?")) {
      try {
        const response = await fetch(`/api/cart/${productId}`, {
          method: "DELETE",
        });
        if (!response.ok) throw new Error("Failed to remove item");
        const result = await response.json();
        showNotification(result.Message || "Item removed from cart", "success");
        const cartResponse = await fetch("/api/cart");
        const cartData = await cartResponse.json();
        setCart(cartData);
        setDashboardData((prev) => ({
          ...prev,
          cartCount: cartData.totalProducts,
        }));
      } catch (error) {
        console.error("Error removing item:", error);
        showNotification("Error removing item", "error");
      }
    }
  };

  // Toggle wishlist
  const toggleWishlist = async (productId, isInWishlist) => {
    try {
      const response = await fetch(`/api/wishlist/${productId}`, {
        method: isInWishlist ? "DELETE" : "POST",
      });
      if (!response.ok) throw new Error("Failed to update wishlist");
      const result = await response.json();
      showNotification(
        isInWishlist ? "Removed from wishlist" : "Added to wishlist",
        isInWishlist ? "info" : "success"
      );
      const wishlistResponse = await fetch("/api/wishlist/count");
      const { count } = await wishlistResponse.json();
      setDashboardData((prev) => ({ ...prev, wishlistCount: count }));
    } catch (error) {
      console.error("Error toggling wishlist:", error);
      showNotification("Error updating wishlist", "error");
    }
  };

  // Show notification
  const showNotification = (message, type = "info", duration = 3000) => {
    const id = Date.now();
    setNotificationQueue((prev) => [...prev, { id, message, type, duration }]);
    setTimeout(() => {
      setNotificationQueue((prev) => prev.filter((n) => n.id !== id));
    }, duration);
  };

  // Order actions
  const trackOrder = () => {
    showNotification("Opening order tracking...", "info");
    setTimeout(() => {
      showNotification("Order is currently in transit", "success");
    }, 1000);
  };

  const viewOrderDetails = () => {
    showNotification("Loading order details...", "info");
  };

  const reorderItems = async (orderId) => {
    showNotification("Adding items to cart...", "info");
    try {
      const response = await fetch(`/api/orders/reorder/${orderId}`, {
        method: "POST",
      });
      if (!response.ok) throw new Error("Failed to reorder items");
      const result = await response.json();
      showNotification(result.Message || "Items added to cart!", "success");
      const cartResponse = await fetch("/api/cart");
      const cartData = await cartResponse.json();
      setCart(cartData);
      setDashboardData((prev) => ({
        ...prev,
        cartCount: cartData.totalProducts,
      }));
    } catch (error) {
      console.error("Error reordering items:", error);
      showNotification("Error reordering items", "error");
    }
  };

  const exportOrders = () => {
    showNotification("Preparing export...", "info");
    setTimeout(() => {
      showNotification("Orders exported successfully!", "success");
    }, 2000);
  };

  // Message actions
  const markMessageAsRead = async (messageId) => {
    try {
      const response = await fetch(`/api/messages/${messageId}/read`, {
        method: "PATCH",
      });
      if (!response.ok) throw new Error("Failed to mark message as read");
      setMessages((prev) =>
        prev.map((msg) =>
          msg._id === messageId ? { ...msg, isUnread: false } : msg
        )
      );
      setDashboardData((prev) => ({
        ...prev,
        messageCount: prev.messageCount - 1,
      }));
      showNotification("Message marked as read", "success");
    } catch (error) {
      console.error("Error marking message as read:", error);
      showNotification("Error marking message as read", "error");
    }
  };

  // Filter messages
  const filterMessages = (filter) => {
    setMessageFilter(filter);
  };

  // Animate counters
  const animateCounters = () => {
    const counters = document.querySelectorAll(".stat-number");
    counters.forEach((counter, index) => {
      setTimeout(() => {
        counter.style.transform = "scale(1.1)";
        setTimeout(() => {
          counter.style.transform = "scale(1)";
        }, 200);
      }, index * 100);
    });
  };

  // Navigation data
  const mainNavItems = [
    {
      id: "dashboard",
      icon: "fa-home",
      label: "Dashboard",
      href: "/client-page",
    },
    {
      id: "orders",
      icon: "fa-box",
      label: "My Orders",
      href: "/orders",
      badge: dashboardData.orderCount,
    },
    { id: "products", icon: "fa-tags", label: "Products", href: "/products" },
    {
      id: "cart",
      icon: "fa-shopping-cart",
      label: "Cart",
      href: "/cart",
      badge: dashboardData.cartCount,
    },
    {
      id: "messages",
      icon: "fa-envelope",
      label: "Messages",
      href: "/messages",
      badge: dashboardData.messageCount,
      isNew: true,
    },
    {
      id: "payment-methods",
      icon: "fa-credit-card",
      label: "Payment",
      href: "/payment-methods",
    },
  ];

  const sidebarSections = [
    {
      title: "Main",
      items: [
        {
          icon: "fa-home",
          label: "Dashboard Home",
          href: "/client-page",
          section: "dashboard",
        },
        {
          icon: "fa-box",
          label: "My Orders",
          href: "/orders",
          section: "orders",
          count: dashboardData.orderCount,
        },
        {
          icon: "fa-tags",
          label: "Products",
          href: "/products",
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
          href: "/account",
          section: "account",
        },
        {
          icon: "fa-map-marker-alt",
          label: "Addresses",
          href: "/addresses",
          section: "addresses",
        },
        {
          icon: "fa-credit-card",
          label: "Payment Methods",
          href: "/payment-methods",
          section: "payment-methods",
        },
      ],
    },
    {
      title: "Shopping",
      items: [
        {
          icon: "fa-heart",
          label: "Wishlist",
          href: "/wishlist",
          section: "wishlist",
          count: dashboardData.wishlistCount,
        },
        {
          icon: "fa-shopping-cart",
          label: "Cart",
          href: "/cart",
          section: "cart",
          count: dashboardData.cartCount,
        },
        {
          icon: "fa-star",
          label: "Reviews",
          href: "/reviews",
          section: "reviews",
        },
      ],
    },
    {
      title: "Communication",
      items: [
        {
          icon: "fa-envelope",
          label: "Messages",
          href: "/messages",
          section: "messages",
          count: dashboardData.messageCount,
          isNew: true,
        },
        {
          icon: "fa-bell",
          label: "Notifications",
          href: "/notifications",
          section: "notifications",
          count: dashboardData.notificationCount,
        },
      ],
    },
    {
      title: "Services",
      items: [
        {
          icon: "fa-gift",
          label: "Loyalty & Rewards",
          href: "/loyalty",
          section: "loyalty",
        },
        {
          icon: "fa-sync-alt",
          label: "Subscriptions",
          href: "/subscriptions",
          section: "subscriptions",
        },
        {
          icon: "fa-users",
          label: "Referrals",
          href: "/referrals",
          section: "referrals",
        },
      ],
    },
    {
      title: "Support",
      items: [
        {
          icon: "fa-cog",
          label: "Settings",
          href: "/settings",
          section: "settings",
        },
        {
          icon: "fa-life-ring",
          label: "Support & Help",
          href: "/support",
          section: "support",
        },
        {
          icon: "fa-sign-out-alt",
          label: "Logout",
          href: "/logout",
          section: "logout",
          isLogout: true,
        },
      ],
    },
  ];

  const statsCards = [
    {
      icon: "fa-box",
      number: dashboardData.orderCount,
      label: "Orders This Year",
      trend: "+15% from last year",
      type: "orders",
    },
    {
      icon: "fa-heart",
      number: dashboardData.wishlistCount,
      label: "Wishlist Items",
      trend: `${dashboardData.wishlistOnSale} items on sale`,
      type: "wishlist",
    },
    {
      icon: "fa-star",
      number: dashboardData.loyaltyPoints,
      label: "Loyalty Points",
      trend: "Ready to redeem",
      type: "loyalty",
    },
    {
      icon: "fa-piggy-bank",
      number: `$${dashboardData.totalSaved}`,
      label: "Total Saved",
      trend: "Through deals & discounts",
      type: "savings",
    },
  ];

  const accountSummaryItems = [
    { icon: "fa-box", number: dashboardData.orderCount, label: "Total Orders" },
    {
      icon: "fa-dollar-sign",
      number: `$${dashboardData.totalSpent}`,
      label: "Total Spent",
    },
    {
      icon: "fa-calendar",
      number: dashboardData.lastOrderDate,
      label: "Last Order",
    },
    {
      icon: "fa-star",
      number: dashboardData.loyaltyPoints,
      label: "Loyalty Points",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Notification Container */}
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

      {/* Header */}
      <header className="bg-white/95 backdrop-blur-xl border-b border-gray-200/80 sticky top-0 z-50 shadow-sm">
        <div className="max-w-8xl mx-auto px-6">
          <div className="flex items-center justify-between h-20 gap-8">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-700 rounded-2xl flex items-center justify-center shadow-lg">
                <i className="fas fa-crown text-white text-xl"></i>
              </div>
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
            <button
              className="md:hidden bg-blue-600 text-white p-2 rounded-lg"
              onClick={() => setShowMobileNav(!showMobileNav)}
            >
              <i className="fas fa-bars"></i>
            </button>

            {/* Main Navigation */}
            <nav
              className={`${
                showMobileNav ? "flex" : "hidden"
              } md:flex items-center gap-1 flex-1 justify-center flex-col md:flex-row absolute md:static top-20 left-0 right-0 bg-white md:bg-transparent p-4 md:p-0 z-40`}
            >
              {mainNavItems.map((item) => (
                <motion.a
                  key={item.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`relative flex items-center gap-3 px-6 py-3 rounded-2xl font-semibold transition-all duration-300 w-full md:w-auto text-center ${
                    activeSection === item.id
                      ? "bg-gradient-to-r from-blue-600 to-purple-700 text-white shadow-lg shadow-blue-500/25"
                      : "text-gray-700 hover:bg-white hover:shadow-lg hover:border hover:border-gray-200"
                  }`}
                  href={item.href}
                  onClick={(e) => {
                    e.preventDefault();
                    setActiveSection(item.id);
                    setShowMobileNav(false);
                  }}
                >
                  <i className={`fas ${item.icon} w-5 text-center`}></i>
                  <span className="whitespace-nowrap">{item.label}</span>
                  {item.badge > 0 && (
                    <span
                      className={`absolute -top-2 -right-2 text-xs px-2 py-1 rounded-full font-bold min-w-[1.5rem] text-center ${
                        item.isNew
                          ? "bg-gradient-to-r from-red-500 to-pink-600 text-white animate-pulse"
                          : "bg-gradient-to-r from-blue-500 to-cyan-600 text-white"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </motion.a>
              ))}
            </nav>

            {/* Header Actions */}
            <div className="flex items-center gap-4">
              {/* Search */}
              <div className="relative" ref={searchRef}>
                <div className="flex items-center bg-gray-100/80 backdrop-blur-sm rounded-2xl px-4 py-3 gap-3 min-w-[320px] border border-gray-200/60 hover:border-blue-300 transition-colors">
                  <i className="fas fa-search text-gray-500 text-sm"></i>
                  <input
                    type="text"
                    placeholder="Search products, brands, categories..."
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="bg-transparent border-none outline-none flex-1 text-sm placeholder-gray-500"
                  />
                </div>
                {searchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 bg-white rounded-2xl shadow-xl mt-3 max-h-80 overflow-y-auto z-50 border border-gray-200">
                    {searchResults.map((product) => (
                      <div
                        key={product._id}
                        className="p-4 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0 flex items-center gap-3"
                        onClick={() => addToCart(product._id)}
                      >
                        <img
                          src={product.images?.[0] || product.image}
                          alt={product.title}
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900">
                            {product.title}
                          </div>
                          <div className="text-gray-600 text-sm">
                            ${product.price.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Notifications */}
              <div className="relative" ref={notificationRef}>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="relative bg-white border border-gray-200 rounded-2xl p-3 hover:shadow-lg hover:border-blue-300 transition-all shadow-sm"
                  onClick={() => setShowNotifications(!showNotifications)}
                >
                  <i className="fas fa-bell text-gray-700"></i>
                  {dashboardData.notificationCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center font-bold shadow-sm">
                      {dashboardData.notificationCount}
                    </span>
                  )}
                </motion.button>
                <AnimatePresence>
                  {showNotifications && (
                    <motion.div
                      className="absolute top-full right-0 bg-white rounded-2xl shadow-2xl mt-3 w-96 max-h-96 overflow-y-auto z-50 border border-gray-200"
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    >
                      <div className="p-6 border-b border-gray-200">
                        <div className="flex justify-between items-center">
                          <h4 className="font-bold text-lg text-gray-900">
                            Notifications
                          </h4>
                          <button className="text-blue-600 text-sm font-semibold hover:text-blue-700">
                            Mark all as read
                          </button>
                        </div>
                      </div>
                      <div className="p-2">
                        {notifications.length > 0 ? (
                          notifications.map((notification) => (
                            <div
                              key={notification.id}
                              className="p-4 hover:bg-blue-50 rounded-xl cursor-pointer border-b border-gray-100 last:border-b-0"
                            >
                              <div className="font-semibold text-sm text-gray-900">
                                {notification.title}
                              </div>
                              <div className="text-gray-600 text-xs mt-1">
                                {notification.content}
                              </div>
                              <div className="text-gray-400 text-xs mt-2">
                                {notification.time}
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="p-8 text-gray-500 text-center">
                            <i className="fas fa-bell-slash text-3xl mb-3 text-gray-300"></i>
                            <div>No notifications</div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* User Menu */}
              <div className="relative" ref={userMenuRef}>
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  className="flex items-center gap-3 cursor-pointer bg-white rounded-2xl p-2 pl-4 border border-gray-200 hover:shadow-lg hover:border-blue-300 transition-all"
                  onClick={() => setShowUserMenu(!showUserMenu)}
                >
                  <img
                    src={user.photo}
                    alt="User"
                    className="w-12 h-12 rounded-xl border-2 border-blue-500 shadow-sm"
                  />
                  <div className="flex flex-col mr-2">
                    <span className="font-bold text-gray-900 text-sm">
                      {user.name}
                    </span>
                    <span className="text-blue-600 text-xs font-semibold bg-blue-50 px-2 py-1 rounded-full">
                      {user.role === "client" ? "👑 Premium Member" : user.role}
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
                      <a
                        href="/account"
                        className="flex items-center gap-4 p-4 hover:bg-blue-50 rounded-t-2xl border-b border-gray-100"
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
                        href="/support"
                        className="flex items-center gap-4 p-4 hover:bg-blue-50 border-b border-gray-100"
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
                      </a>
                      <a
                        href="/logout"
                        onClick={handleLogout}
                        className="flex items-center gap-4 p-4 hover:bg-red-50 rounded-b-2xl text-red-600"
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
                      </a>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-8xl mx-auto px-6 py-8">
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
              <h1 className="text-5xl font-bold mb-4">
                Welcome back,{" "}
                <span className="bg-gradient-to-r from-amber-300 to-yellow-400 bg-clip-text text-transparent">
                  {user.name}!
                </span>
              </h1>
              <p className="text-blue-100 text-xl mb-8 max-w-2xl">
                Ready to discover amazing deals and new arrivals? Your
                personalized shopping experience awaits.
              </p>
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 inline-block">
                <div className="flex flex-col items-start">
                  <span className="text-3xl font-mono font-bold text-white mb-2">
                    {currentTime}
                  </span>
                  <span className="text-blue-100 text-lg">{currentDate}</span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 min-w-[480px]">
              {accountSummaryItems.map((item, index) => (
                <motion.div
                  key={index}
                  whileHover={{ scale: 1.05, y: -2 }}
                  className="flex items-center gap-4 bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all"
                >
                  <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center text-white text-xl">
                    <i className={`fas ${item.icon}`}></i>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-white">
                      {item.number}
                    </div>
                    <div className="text-blue-100 text-sm font-medium">
                      {item.label}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.section>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-4 gap-8">
          {/* Sidebar */}
          <aside className="bg-white rounded-3xl p-6 shadow-xl border border-gray-200 h-fit sticky top-32">
            <nav className="space-y-8">
              {sidebarSections.map((section, sectionIndex) => (
                <div key={sectionIndex}>
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 px-2">
                    {section.title}
                  </h4>
                  <div className="space-y-2">
                    {section.items.map((item, itemIndex) => (
                      <motion.a
                        key={itemIndex}
                        whileHover={{ x: 4 }}
                        className={`flex items-center gap-4 px-4 py-3 rounded-2xl font-medium transition-all group ${
                          item.isLogout
                            ? "text-red-600 hover:bg-red-50 hover:border-red-200"
                            : activeSection === item.section
                            ? "bg-gradient-to-r from-blue-50 to-purple-50 text-blue-700 border border-blue-200 shadow-sm"
                            : "text-gray-700 hover:bg-gray-50 hover:shadow-sm hover:border hover:border-gray-200"
                        }`}
                        href={item.href}
                        onClick={(e) => {
                          if (item.isLogout) {
                            e.preventDefault();
                            handleLogout();
                          } else {
                            e.preventDefault();
                            setActiveSection(item.section);
                          }
                        }}
                      >
                        <i
                          className={`fas ${item.icon} w-5 text-center ${
                            item.isLogout
                              ? "text-red-500"
                              : "text-gray-500 group-hover:text-blue-600"
                          }`}
                        ></i>
                        <span className="flex-1">{item.label}</span>
                        {item.count > 0 && (
                          <span
                            className={`text-xs px-2 py-1 rounded-full font-semibold ${
                              item.isNew
                                ? "bg-gradient-to-r from-red-500 to-pink-600 text-white"
                                : "bg-blue-100 text-blue-700"
                            }`}
                          >
                            {item.count}
                          </span>
                        )}
                      </motion.a>
                    ))}
                  </div>
                </div>
              ))}
            </nav>
          </aside>

          {/* Main Dashboard Content */}
          <div className="col-span-3 space-y-8">
            {/* Stats Grid */}
            <motion.div
              className="grid grid-cols-4 gap-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              onAnimationComplete={animateCounters}
            >
              {statsCards.map((stat, index) => (
                <motion.div
                  key={stat.type}
                  whileHover={{ scale: 1.02, y: -2 }}
                  className="bg-white rounded-2xl p-6 border border-gray-200 shadow-lg hover:shadow-xl transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl shadow-lg ${
                        stat.type === "orders"
                          ? "bg-gradient-to-r from-blue-500 to-blue-600"
                          : stat.type === "wishlist"
                          ? "bg-gradient-to-r from-pink-500 to-rose-600"
                          : stat.type === "loyalty"
                          ? "bg-gradient-to-r from-amber-500 to-orange-600"
                          : "bg-gradient-to-r from-emerald-500 to-green-600"
                      }`}
                    >
                      <i className={`fas ${stat.icon}`}></i>
                    </div>
                    <div className="flex-1">
                      <div className="text-3xl font-bold text-gray-900 stat-number">
                        {stat.number}
                      </div>
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
            <div className="grid grid-cols-2 gap-8">
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
                  <div className="flex items-center gap-2">
                    <select
                      className="border border-gray-200 rounded-lg p-2 text-sm"
                      onChange={(e) => filterMessages(e.target.value)}
                    >
                      <option value="all">All Orders</option>
                      <option value="delivered">Delivered</option>
                      <option value="shipped">Shipped</option>
                      <option value="pending">Pending</option>
                    </select>
                    <button
                      className="text-blue-600 font-semibold text-sm hover:text-blue-700 flex items-center gap-2"
                      onClick={exportOrders}
                    >
                      Export Orders
                      <i className="fas fa-download"></i>
                    </button>
                    <a
                      href="/orders"
                      className="text-blue-600 font-semibold text-sm hover:text-blue-700 flex items-center gap-2"
                    >
                      View All
                      <i className="fas fa-arrow-right"></i>
                    </a>
                  </div>
                </div>
                <div className="space-y-4">
                  {recentOrders.length > 0 ? (
                    recentOrders.map((order) => (
                      <div
                        key={order._id}
                        className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-200 hover:shadow-md transition-all"
                      >
                        <img
                          src={order.image}
                          alt={order.title}
                          className="w-16 h-16 rounded-xl object-cover"
                        />
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900">
                            Order #{order.orderId}
                          </h4>
                          <p className="text-gray-600 text-sm">
                            {order.orderDate}
                          </p>
                          <div className="text-gray-500 text-xs">
                            ${order.totalPrice.toFixed(2)}
                          </div>
                        </div>
                        <div
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            order.status === "Delivered"
                              ? "bg-emerald-100 text-emerald-700"
                              : order.status === "Shipped"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {order.status}
                        </div>
                        <div className="flex gap-2">
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="text-blue-600 text-sm hover:text-blue-700"
                            onClick={() => trackOrder()}
                          >
                            <i className="fas fa-truck mr-1"></i>Track
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="text-blue-600 text-sm hover:text-blue-700"
                            onClick={() => viewOrderDetails()}
                          >
                            <i className="fas fa-receipt mr-1"></i>Invoice
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="text-blue-600 text-sm hover:text-blue-700"
                            onClick={() => reorderItems(order.orderId)}
                          >
                            <i className="fas fa-redo mr-1"></i>Reorder
                          </motion.button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <i className="fas fa-box-open text-4xl mb-3 text-gray-300"></i>
                      <div>No recent orders</div>
                    </div>
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
                  <a
                    href="/products"
                    className="text-blue-600 font-semibold text-sm hover:text-blue-700 flex items-center gap-2"
                  >
                    Browse More
                    <i className="fas fa-arrow-right"></i>
                  </a>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {recommendedProducts.length > 0 ? (
                    recommendedProducts.map((product) => (
                      <div
                        key={product._id}
                        className="bg-gray-50 rounded-2xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all group"
                      >
                        <div className="relative h-40 bg-gray-200 overflow-hidden">
                          <img
                            src={product.images?.[0] || product.image}
                            alt={product.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          {product.isNew && (
                            <div className="absolute top-3 left-3 bg-red-500 text-white text-xs px-2 py-1 rounded-full font-bold">
                              NEW
                            </div>
                          )}
                        </div>
                        <div className="p-4">
                          <h4 className="font-semibold text-gray-900 text-sm mb-2 line-clamp-2">
                            {product.title}
                          </h4>
                          <div className="flex items-center gap-1 text-amber-500 text-xs mb-2">
                            {[...Array(5)].map((_, i) => (
                              <i
                                key={i}
                                className={`fas ${
                                  i < Math.floor(product.averageRating)
                                    ? "fa-star"
                                    : i < product.averageRating
                                    ? "fa-star-half-alt"
                                    : "far fa-star"
                                }`}
                              ></i>
                            ))}
                            <span className="text-gray-500 ml-1">
                              ({product.averageRating})
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-blue-600 font-bold text-lg">
                                ${product.price.toFixed(2)}
                              </span>
                              {product.originalPrice && (
                                <span className="text-gray-400 text-sm line-through">
                                  ${product.originalPrice.toFixed(2)}
                                </span>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => addToCart(product._id)}
                                className="bg-blue-600 text-white px-3 py-2 rounded-xl text-sm hover:bg-blue-700 transition-colors font-semibold"
                              >
                                <i className="fas fa-shopping-cart mr-1"></i>
                                Add
                              </motion.button>
                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() =>
                                  toggleWishlist(
                                    product._id,
                                    product.isInWishlist
                                  )
                                }
                                className="text-gray-500 hover:text-red-500"
                              >
                                <i
                                  className={`fa${
                                    product.isInWishlist ? "s" : "r"
                                  } fa-heart`}
                                ></i>
                              </motion.button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-2 text-center py-8 text-gray-500">
                      <i className="fas fa-gift text-4xl mb-3 text-gray-300"></i>
                      <div>No recommendations available</div>
                    </div>
                  )}
                </div>
              </motion.div>

              {/* Cart Section */}
              {activeSection === "cart" && (
                <motion.div
                  className="bg-white rounded-2xl p-6 border border-gray-200 shadow-lg col-span-2"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                >
                  <h3 className="text-2xl font-bold text-gray-900 mb-6">
                    Your Cart
                  </h3>
                  <div className="space-y-4">
                    {cart.products.length > 0 ? (
                      cart.products.map((item) => (
                        <div
                          key={item.productId}
                          className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-200 hover:shadow-md transition-all"
                        >
                          <input type="checkbox" checked className="w-5 h-5" />
                          <img
                            src={
                              item.image ||
                              "https://images.pexels.com/photos/1598505/pexels-photo-1598505.jpeg?auto=compress&cs=tinysrgb&w=150"
                            }
                            alt={item.title}
                            className="w-16 h-16 rounded-xl object-cover"
                          />
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900">
                              {item.title}
                            </h4>
                            <p className="text-gray-600 text-sm">
                              Size: {item.size || "N/A"}, Color:{" "}
                              {item.color || "N/A"}
                            </p>
                            <div className="flex gap-2 text-sm text-gray-500">
                              <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                                Premium Quality
                              </span>
                              <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                                Free Shipping
                              </span>
                            </div>
                            <div className="text-gray-900 font-semibold">
                              ${item.price.toFixed(2)}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() =>
                                updateCartQuantity(item.productId, false)
                              }
                              className="bg-gray-200 text-gray-700 px-2 py-1 rounded-lg"
                            >
                              <i className="fas fa-minus"></i>
                            </motion.button>
                            <input
                              type="number"
                              value={item.quantity}
                              min="1"
                              className="w-12 text-center border border-gray-200 rounded-lg"
                              readOnly
                            />
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() =>
                                updateCartQuantity(item.productId, true)
                              }
                              className="bg-gray-200 text-gray-700 px-2 py-1 rounded-lg"
                            >
                              <i className="fas fa-plus"></i>
                            </motion.button>
                          </div>
                          <div className="text-gray-900 font-semibold">
                            ${(item.price * item.quantity).toFixed(2)}
                          </div>
                          <div className="flex gap-2">
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() =>
                                toggleWishlist(
                                  item.productId,
                                  item.isInWishlist
                                )
                              }
                              className="text-gray-500 hover:text-red-500"
                            >
                              <i
                                className={`fa${
                                  item.isInWishlist ? "s" : "r"
                                } fa-heart`}
                              ></i>
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => removeFromCart(item.productId)}
                              className="text-gray-500 hover:text-red-500"
                            >
                              <i className="fas fa-trash"></i>
                            </motion.button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <i className="fas fa-shopping-cart text-4xl mb-3 text-gray-300"></i>
                        <div>Your cart is empty</div>
                      </div>
                    )}
                  </div>
                  {cart.products.length > 0 && (
                    <div className="mt-6 p-4 bg-gray-50 rounded-2xl">
                      <div className="space-y-2 text-gray-900">
                        <div className="flex justify-between">
                          <span>Subtotal</span>
                          <span>${cart.totalCartPrice.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Shipping</span>
                          <span>Free</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Tax</span>
                          <span>
                            ${(cart.totalCartPrice * 0.08).toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Discount</span>
                          <span>
                            -${(cart.totalCartPrice * 0.1).toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between font-bold text-lg">
                          <span>Total</span>
                          <span>
                            $
                            {(
                              cart.totalCartPrice +
                              cart.totalCartPrice * 0.08 -
                              cart.totalCartPrice * 0.1
                            ).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {/* Messages Section */}
              {activeSection === "messages" && (
                <motion.div
                  className="bg-white rounded-2xl p-6 border border-gray-200 shadow-lg col-span-2"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                >
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-2xl font-bold text-gray-900">
                      Messages
                    </h3>
                    <div className="flex gap-2">
                      <button
                        className={`px-3 py-1 rounded-lg text-sm ${
                          messageFilter === "all"
                            ? "bg-blue-600 text-white"
                            : "bg-gray-200 text-gray-700"
                        }`}
                        onClick={() => filterMessages("all")}
                      >
                        All
                      </button>
                      <button
                        className={`px-3 py-1 rounded-lg text-sm ${
                          messageFilter === "unread"
                            ? "bg-blue-600 text-white"
                            : "bg-gray-200 text-gray-700"
                        }`}
                        onClick={() => filterMessages("unread")}
                      >
                        Unread
                      </button>
                      <button
                        className={`px-3 py-1 rounded-lg text-sm ${
                          messageFilter === "orders"
                            ? "bg-blue-600 text-white"
                            : "bg-gray-200 text-gray-700"
                        }`}
                        onClick={() => filterMessages("orders")}
                      >
                        Orders
                      </button>
                      <button
                        className={`px-3 py-1 rounded-lg text-sm ${
                          messageFilter === "promotions"
                            ? "bg-blue-600 text-white"
                            : "bg-gray-200 text-gray-700"
                        }`}
                        onClick={() => filterMessages("promotions")}
                      >
                        Promotions
                      </button>
                    </div>
                  </div>
                  <div className="space-y-4">
                    {messages
                      .filter((message) => {
                        if (messageFilter === "unread") return message.isUnread;
                        if (messageFilter === "orders")
                          return message.type === "order";
                        if (messageFilter === "promotions")
                          return message.type === "promotion";
                        return true;
                      })
                      .map((message) => (
                        <div
                          key={message._id}
                          className={`flex gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-200 hover:shadow-md transition-all ${
                            message.isUnread ? "bg-blue-50" : ""
                          }`}
                        >
                          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                            <i
                              className={`fas fa-${
                                message.type === "order" ? "truck" : "gift"
                              } text-blue-600`}
                            ></i>
                          </div>
                          <div className="flex-1">
                            <div className="flex justify-between">
                              <h4 className="font-semibold text-gray-900">
                                {message.title}
                              </h4>
                              <span className="text-gray-500 text-xs">
                                {message.timeAgo}
                              </span>
                            </div>
                            <p className="text-gray-600 text-sm">
                              {message.content}
                            </p>
                            <div className="flex gap-2 mt-2">
                              {message.type === "order" && (
                                <motion.button
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  className="text-blue-600 text-sm hover:text-blue-700"
                                  onClick={() => trackOrder()}
                                >
                                  Track Order
                                </motion.button>
                              )}
                              {message.isUnread && (
                                <motion.button
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  className="text-blue-600 text-sm hover:text-blue-700"
                                  onClick={() => markMessageAsRead(message._id)}
                                >
                                  Mark as Read
                                </motion.button>
                              )}
                              {message.type === "promotion" && (
                                <motion.button
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  className="text-blue-600 text-sm hover:text-blue-700"
                                  onClick={() =>
                                    showNotification(
                                      "Redirecting to shop...",
                                      "info"
                                    )
                                  }
                                >
                                  Shop Now
                                </motion.button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ClientDashboard;
