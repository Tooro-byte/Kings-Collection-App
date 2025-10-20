import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";

// Default fallback data
const defaultUser = {
  name: "Sales Agent",
  email: "agent@kingscollection.com",
  avatar:
    "https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=60",
  role: "Sales Agent",
};

const defaultSalesMetrics = {
  pendingOrders: 0,
  todaysSales: 0,
  newCustomers: 0,
  ordersTrend: 0,
  revenueTrend: 0,
  customersTrend: 0,
  ordersToday: 0,
  totalRevenue: 0,
  rating: 0,
  pendingTasks: 0,
  urgentOrders: 0,
  customerInquiries: 0,
  notifications: 0,
  lowStockItems: 0,
  returns: 0,
  tasks: 0,
  messages: 0,
  promotions: 0,
  newOrders: 0,
  processingOrders: 0,
  shippedOrders: 0,
  returningCustomers: 0,
  returningTrend: 0,
  ratingChange: 0,
  avgOrderValue: 0,
  urgentActions: 0,
  todaysTasks: 0,
};

const defaultProducts = [
  {
    _id: "1",
    title: "Sample Product",
    price: 10000,
    images: [
      "https://images.pexels.com/photos/1598505/pexels-photo-1598505.jpeg?auto=compress&cs=tinysrgb&w=150",
    ],
    stockId: "STK001",
    category: { name: "Sample Category" },
    sku: "SAMPLE001",
  },
];

const SalesDashboard = () => {
  const [activeSection, setActiveSection] = useState("dashboard");
  const [user, setUser] = useState(defaultUser);
  const [salesMetrics, setSalesMetrics] = useState(defaultSalesMetrics);
  const [products, setProducts] = useState([]);
  const [cartItems, setCartItems] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [urgentOrders, setUrgentOrders] = useState([]);
  const [customerInquiries, setCustomerInquiries] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [activities, setActivities] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentTime, setCurrentTime] = useState("");
  const [currentDate, setCurrentDate] = useState("");
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [amountReceived, setAmountReceived] = useState(0);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [toast, setToast] = useState(null);

  const userDropdownRef = useRef(null);
  const taxRate = 0.085;
  const locale = "en-UG";
  const currency = "UGX";

  // Helper to check if response is JSON
  const isJsonResponse = (response) =>
    response.headers.get("content-type")?.includes("application/json");

  // Fetch user data
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await fetch("/api/sales/user");
        console.log(
          "User API Response Status:",
          response.status,
          response.statusText
        );
        console.log(
          "User API Response Headers:",
          response.headers.get("content-type")
        );

        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }

        if (!isJsonResponse(response)) {
          const text = await response.text();
          console.error("User API Non-JSON Response:", text.slice(0, 100));
          throw new Error("Response is not JSON");
        }

        const userData = await response.json();
        setUser({
          name: userData.name || defaultUser.name,
          email: userData.email || defaultUser.email,
          avatar: userData.avatar || defaultUser.avatar,
          role: userData.role === "salesAgent" ? "Sales Agent" : userData.role,
        });
      } catch (error) {
        console.error("Error fetching user data:", error);
        setUser(defaultUser); // Fallback to default
        showToast("error", "User Data", `Failed to load: ${error.message}`);
      }
    };
    fetchUserData();
  }, []);

  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const response = await fetch("/api/sales/dashboard");
        console.log(
          "Dashboard API Response Status:",
          response.status,
          response.statusText
        );
        console.log(
          "Dashboard API Response Headers:",
          response.headers.get("content-type")
        );

        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }

        if (!isJsonResponse(response)) {
          const text = await response.text();
          console.error("Dashboard API Non-JSON Response:", text.slice(0, 100));
          throw new Error("Response is not JSON");
        }

        const data = await response.json();
        setSalesMetrics(data.metrics || defaultSalesMetrics);
        setNotifications(data.notifications || []);
        setUrgentOrders(data.urgentOrders || []);
        setCustomerInquiries(data.customerInquiries || []);
        setTasks(data.tasks || []);
        setActivities(data.activities || []);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        setSalesMetrics(defaultSalesMetrics); // Fallback to default
        showToast("error", "Dashboard", `Failed to load: ${error.message}`);
      }
    };
    fetchDashboardData();
  }, []);

  // Fetch products
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch("/api/sales/products");
        console.log(
          "Products API Response Status:",
          response.status,
          response.statusText
        );
        console.log(
          "Products API Response Headers:",
          response.headers.get("content-type")
        );

        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }

        if (!isJsonResponse(response)) {
          const text = await response.text();
          console.error("Products API Non-JSON Response:", text.slice(0, 100));
          throw new Error("Response is not JSON");
        }

        const productsData = await response.json();
        setProducts(productsData || defaultProducts);
        setFilteredProducts(productsData || defaultProducts);
      } catch (error) {
        console.error("Error fetching products:", error);
        setProducts(defaultProducts); // Fallback to default
        setFilteredProducts(defaultProducts);
        showToast("error", "Products", `Failed to load: ${error.message}`);
      }
    };
    fetchProducts();
  }, []);

  // Real-time clock
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString(locale, {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        })
      );
      setCurrentDate(
        now.toLocaleDateString(locale, {
          weekday: "short",
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      );
      const hour = now.getHours();
      let greeting;
      if (hour < 12) greeting = "Good Morning,";
      else if (hour < 17) greeting = "Good Afternoon,";
      else greeting = "Good Evening,";
      setUser((prev) => ({ ...prev, greeting }));
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
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
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter products based on search
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredProducts(products);
    } else {
      const filtered = products.filter(
        (product) =>
          product.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          product.category?.name
            ?.toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          product.sku?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredProducts(filtered);
    }
  }, [searchQuery, products]);

  // Toast notification system
  const showToast = (type, title, message, duration = 4000) => {
    const toastData = { type, title, message, id: Date.now() };
    setToast(toastData);
    setTimeout(() => setToast(null), duration);
  };

  const getToastIcon = (type) => {
    switch (type) {
      case "success":
        return "fa-check-circle";
      case "warning":
        return "fa-exclamation-triangle";
      case "error":
        return "fa-times-circle";
      case "info":
      default:
        return "fa-info-circle";
    }
  };

  // Navigation handler
  const switchSection = (sectionId) => {
    setActiveSection(sectionId);
    showToast(
      "success",
      "Navigation",
      `Switched to ${formatSectionName(sectionId)} section`
    );
  };

  const formatSectionName = (sectionId) =>
    sectionId.charAt(0).toUpperCase() + sectionId.slice(1).replace("-", " ");

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyboardShortcuts = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "f") {
        e.preventDefault();
        handleCustomerLookup();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "d") {
        e.preventDefault();
        switchSection("dashboard");
      }
    };
    document.addEventListener("keydown", handleKeyboardShortcuts);
    return () =>
      document.removeEventListener("keydown", handleKeyboardShortcuts);
  }, []);

  // Cart and POS functions
  const addToCart = (product) => {
    const existingItem = cartItems.find(
      (item) => item.productId === product._id
    );
    if (existingItem) {
      setCartItems(
        cartItems.map((item) =>
          item.productId === product._id
            ? {
                ...item,
                quantity: item.quantity + 1,
                total: (item.quantity + 1) * item.price,
              }
            : item
        )
      );
    } else {
      setCartItems([
        ...cartItems,
        {
          productId: product._id,
          title: product.title,
          price: product.price,
          image: product.images?.[0],
          quantity: 1,
          total: product.price,
        },
      ]);
    }
    showToast("success", "Cart", `${product.title} added to cart`);
  };

  const updateCartQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCartItems(
      cartItems.map((item) =>
        item.productId === productId
          ? { ...item, quantity, total: quantity * item.price }
          : item
      )
    );
    showToast("info", "Cart", "Cart updated");
  };

  const removeFromCart = (productId) => {
    setCartItems(cartItems.filter((item) => item.productId !== productId));
    showToast("info", "Cart", "Item removed from cart");
  };

  const clearCart = () => {
    setCartItems([]);
    setAmountReceived(0);
    showToast("info", "Cart", "Cart cleared");
  };

  const calculateCartTotals = () => {
    const subtotal = cartItems.reduce((sum, item) => sum + item.total, 0);
    const tax = subtotal * taxRate;
    const total = subtotal + tax;
    return { subtotal, tax, total };
  };

  const calculateChange = () => {
    const { total } = calculateCartTotals();
    return Math.max(0, amountReceived - total);
  };

  const completeSale = async () => {
    if (cartItems.length === 0) {
      showToast("warning", "Sale Error", "Cart is empty");
      return;
    }
    const { total } = calculateCartTotals();
    try {
      const response = await fetch("/api/sales/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cartItems,
          total,
          paymentMethod,
          amountReceived,
        }),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      if (!isJsonResponse(response)) {
        const text = await response.text();
        console.error(
          "Complete Sale API Non-JSON Response:",
          text.slice(0, 100)
        );
        throw new Error("Response is not JSON");
      }
      const result = await response.json();
      showToast(
        "success",
        "Sale Complete",
        `Transaction completed - ${formatCurrency(total)}`
      );
      clearCart();
      const dashboardResponse = await fetch("/api/sales/dashboard");
      if (!dashboardResponse.ok) {
        throw new Error(`HTTP error! Status: ${dashboardResponse.status}`);
      }
      if (!isJsonResponse(dashboardResponse)) {
        const text = await dashboardResponse.text();
        console.error(
          "Dashboard Refresh API Non-JSON Response:",
          text.slice(0, 100)
        );
        throw new Error("Response is not JSON");
      }
      const data = await dashboardResponse.json();
      setSalesMetrics(data.metrics || defaultSalesMetrics);
    } catch (error) {
      console.error("Error completing sale:", error);
      showToast("error", "Sale Error", `Error: ${error.message}`);
    }
  };

  const holdSale = async () => {
    if (cartItems.length === 0) {
      showToast("warning", "Hold Sale", "Cart is empty");
      return;
    }
    const heldSale = {
      id: "HOLD-" + Date.now(),
      items: cartItems,
      timestamp: new Date(),
    };
    try {
      const response = await fetch("/api/sales/hold", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(heldSale),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      if (!isJsonResponse(response)) {
        const text = await response.text();
        console.error("Hold Sale API Non-JSON Response:", text.slice(0, 100));
        throw new Error("Response is not JSON");
      }
      showToast("info", "Sale Held", "Current sale has been held");
      clearCart();
    } catch (error) {
      console.error("Error holding sale:", error);
      showToast("error", "Hold Sale", `Error: ${error.message}`);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
    }).format(amount);
  };

  const capitalizeName = (name) => {
    if (!name) return "Guest";
    return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
  };

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to logout?")) {
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = "/logout";
    }
  };

  const handleCustomerLookup = () => {
    const searchTerm = prompt("Enter customer name, email, or order number:");
    if (searchTerm) {
      switchSection("customers");
      showToast(
        "success",
        "Customer Search",
        `Found customers matching "${searchTerm}"`
      );
    }
  };

  const handleOrderAction = async (action) => {
    const orderId = prompt(`Enter Order ID to ${action}:`);
    if (orderId) {
      try {
        const response = await fetch(`/api/orders/${orderId}/${action}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        if (!isJsonResponse(response)) {
          const text = await response.text();
          console.error(
            `Order Action (${action}) API Non-JSON Response:`,
            text.slice(0, 100)
          );
          throw new Error("Response is not JSON");
        }
        const data = await response.json();
        if (data.success) {
          showToast(
            "success",
            `Order ${action.charAt(0).toUpperCase() + action.slice(1)}`,
            `Order #${orderId} has been ${action}ed`
          );
          const dashboardResponse = await fetch("/api/sales/dashboard");
          if (!dashboardResponse.ok) {
            throw new Error(`HTTP error! Status: ${dashboardResponse.status}`);
          }
          if (!isJsonResponse(dashboardResponse)) {
            const text = await dashboardResponse.text();
            console.error(
              "Dashboard Refresh API Non-JSON Response:",
              text.slice(0, 100)
            );
            throw new Error("Response is not JSON");
          }
          const dashboardData = await dashboardResponse.json();
          setSalesMetrics(dashboardData.metrics || defaultSalesMetrics);
        } else {
          showToast(
            "error",
            "Order Action Failed",
            `Failed to ${action} order #${orderId}`
          );
        }
      } catch (error) {
        console.error(`Error performing ${action} on order:`, error);
        showToast("error", "Error", `Error: ${error.message}`);
      }
    }
  };

  // Navigation items
  const mainNavItems = [
    {
      id: "dashboard",
      icon: "fa-tachometer-alt",
      label: "Dashboard Home",
      href: "/sales",
    },
    {
      id: "orders",
      icon: "fa-shopping-cart",
      label: "Orders",
      href: "/orders",
      badge: salesMetrics.pendingOrders,
      urgent: true,
    },
    {
      id: "pos",
      icon: "fa-cash-register",
      label: "Point of Sale",
      href: "/pos",
    },
    {
      id: "customers",
      icon: "fa-users",
      label: "Customers",
      href: "/customers",
      badge: salesMetrics.newCustomers,
    },
    {
      id: "inventory",
      icon: "fa-warehouse",
      label: "Inventory",
      href: "/inventory",
      badge: salesMetrics.lowStockItems,
      warning: true,
    },
    {
      id: "add-product",
      icon: "fa-plus-circle",
      label: "Add Product",
      href: "/add-product/new",
    },
  ];

  const sidebarSections = [
    {
      title: "Core Functions",
      items: [
        {
          icon: "fa-tachometer-alt",
          label: "Dashboard",
          href: "/sales",
          badge: salesMetrics.pendingTasks,
        },
        {
          icon: "fa-shopping-cart",
          label: "Orders",
          href: "/orders",
          badge: salesMetrics.pendingOrders,
          urgent: true,
        },
        { icon: "fa-cash-register", label: "Point of Sale", href: "/pos" },
        {
          icon: "fa-users",
          label: "Customers",
          href: "/customers",
          badge: salesMetrics.newCustomers,
        },
        {
          icon: "fa-warehouse",
          label: "Inventory",
          href: "/inventory",
          badge: salesMetrics.lowStockItems,
          warning: true,
        },
        {
          icon: "fa-plus-circle",
          label: "Add Product",
          href: "/add-product/new",
        },
      ],
    },
    {
      title: "Management",
      items: [
        {
          icon: "fa-undo-alt",
          label: "Returns",
          href: "/returns",
          badge: salesMetrics.returns,
        },
        {
          icon: "fa-tasks",
          label: "Tasks",
          href: "/tasks",
          badge: salesMetrics.tasks,
          urgent: true,
        },
        {
          icon: "fa-comments",
          label: "Messages",
          href: "/messages",
          badge: salesMetrics.messages,
        },
        {
          icon: "fa-tags",
          label: "Promotions",
          href: "/promotions",
          badge: salesMetrics.promotions,
          active: true,
        },
      ],
    },
    {
      title: "Analytics & Reports",
      items: [
        { icon: "fa-chart-line", label: "Reports", href: "/reports" },
        { icon: "fa-chart-bar", label: "Analytics", href: "/analytics" },
      ],
    },
    {
      title: "Personal",
      items: [
        { icon: "fa-calendar-alt", label: "Schedule", href: "/schedule" },
        { icon: "fa-graduation-cap", label: "Training", href: "/training" },
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50">
      {/* Toast Container */}
      <div id="toastContainer" className="fixed top-4 right-4 z-50">
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className={`flex items-center gap-3 p-4 rounded-xl shadow-lg border ${
              toast.type === "success"
                ? "bg-green-100 text-green-700"
                : toast.type === "error"
                ? "bg-red-100 text-red-700"
                : toast.type === "warning"
                ? "bg-orange-100 text-orange-700"
                : "bg-blue-100 text-blue-700"
            }`}
          >
            <i className={`fas ${getToastIcon(toast.type)}`}></i>
            <div>
              <div className="font-semibold">{toast.title}</div>
              <div className="text-sm">{toast.message}</div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Top Navigation Bar */}
      <nav className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
        <div className="max-w-8xl mx-auto px-6">
          <div className="flex items-center gap-8 py-3">
            <Link
              to="/add-product/new"
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold hover:shadow-lg transition-all"
            >
              <i className="fas fa-plus-circle"></i>
              <span>Add Product</span>
            </Link>
            <div className="relative group">
              <button className="flex items-center gap-2 px-4 py-2 rounded-xl hover:bg-gray-50 transition-colors">
                <div className="relative w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center">
                  <i className="fas fa-bell text-gray-700"></i>
                  {salesMetrics.notifications > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center">
                      {salesMetrics.notifications}
                    </span>
                  )}
                </div>
                <span className="text-sm font-medium text-gray-700">
                  Notifications
                </span>
              </button>
              <div className="absolute top-full left-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                <div className="p-4 border-b border-gray-200">
                  <h4 className="font-semibold text-gray-900">Notifications</h4>
                </div>
                <div className="max-h-60 overflow-y-auto">
                  {notifications.length > 0 ? (
                    notifications.map((notification) => (
                      <div
                        key={notification._id}
                        className="p-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                        onClick={() =>
                          showToast(
                            "info",
                            "Notification",
                            `Clicked ${notification.title}`
                          )
                        }
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                            <i
                              className={`fas ${
                                notification.icon || "fa-bell"
                              } text-blue-600 text-sm`}
                            ></i>
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-gray-900 text-sm">
                              {notification.title}
                            </div>
                            <div className="text-gray-500 text-xs">
                              {notification.timeAgo}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-gray-500">
                      No new notifications
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="relative group">
              <button className="flex items-center gap-2 px-4 py-2 rounded-xl hover:bg-gray-50 transition-colors">
                <div className="relative w-9 h-9 bg-red-100 rounded-lg flex items-center justify-center">
                  <i className="fas fa-exclamation-triangle text-red-600"></i>
                  {salesMetrics.urgentOrders > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center">
                      {salesMetrics.urgentOrders}
                    </span>
                  )}
                </div>
                <span className="text-sm font-medium text-gray-700">
                  Urgent Orders
                </span>
              </button>
            </div>
            <div className="relative group">
              <button className="flex items-center gap-2 px-4 py-2 rounded-xl hover:bg-gray-50 transition-colors">
                <div className="relative w-9 h-9 bg-green-100 rounded-lg flex items-center justify-center">
                  <i className="fas fa-message text-green-600"></i>
                  {salesMetrics.customerInquiries > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center">
                      {salesMetrics.customerInquiries}
                    </span>
                  )}
                </div>
                <span className="text-sm font-medium text-gray-700">
                  Customer Inquiries
                </span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Header */}
      <header className="bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg">
        <div className="max-w-8xl mx-auto px-6 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-center">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/30">
                <i className="fas fa-crown text-yellow-300 text-2xl"></i>
              </div>
              <div>
                <div className="text-2xl font-bold">Kings Collection</div>
                <div className="text-purple-200 text-sm">
                  Premium Fashion Dashboard
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div>
                <div className="text-purple-200 text-sm greeting-text">
                  {user.greeting}
                </div>
                <div className="text-xl font-semibold">
                  {capitalizeName(user.name)}
                </div>
                <div className="inline-flex items-center gap-2 bg-white/20 px-3 py-1 rounded-2xl text-sm mt-1 backdrop-blur-sm border border-white/30">
                  <i className="fas fa-star text-yellow-300"></i>
                  <span>{user.role}</span>
                </div>
              </div>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 border border-white/30">
              <div className="text-center">
                <div className="text-2xl font-mono font-bold" id="currentTime">
                  {currentTime}
                </div>
                <div className="text-purple-200 text-sm" id="currentDate">
                  {currentDate}
                </div>
              </div>
            </div>
            <div className="lg:col-span-2 grid grid-cols-3 gap-4">
              <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 border border-white/30">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-500/30 rounded-xl flex items-center justify-center">
                    <i className="fas fa-shopping-cart text-blue-300"></i>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">
                      {salesMetrics.pendingOrders}
                    </div>
                    <div className="text-purple-200 text-xs">
                      Pending Orders
                    </div>
                    <div
                      className={`text-xs ${
                        salesMetrics.ordersTrend > 0
                          ? "text-green-300"
                          : "text-red-300"
                      }`}
                    >
                      {salesMetrics.ordersTrend > 0 ? "↗" : "↘"}{" "}
                      {Math.abs(salesMetrics.ordersTrend)}%
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 border border-white/30">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-500/30 rounded-xl flex items-center justify-center">
                    <i className="fas fa-money-bill text-green-300"></i>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">
                      {formatCurrency(salesMetrics.todaysSales)}
                    </div>
                    <div className="text-purple-200 text-xs">Today's Sales</div>
                    <div
                      className={`text-xs ${
                        salesMetrics.revenueTrend > 0
                          ? "text-green-300"
                          : "text-red-300"
                      }`}
                    >
                      {salesMetrics.revenueTrend > 0 ? "↗" : "↘"}{" "}
                      {Math.abs(salesMetrics.revenueTrend)}%
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 border border-white/30">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-500/30 rounded-xl flex items-center justify-center">
                    <i className="fas fa-users text-purple-300"></i>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">
                      {salesMetrics.newCustomers}
                    </div>
                    <div className="text-purple-200 text-xs">New Customers</div>
                    <div
                      className={`text-xs ${
                        salesMetrics.customersTrend > 0
                          ? "text-green-300"
                          : "text-red-300"
                      }`}
                    >
                      {salesMetrics.customersTrend > 0 ? "↗" : "↘"}{" "}
                      {Math.abs(salesMetrics.customersTrend)}%
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="relative" ref={userDropdownRef}>
              <button
                className="flex items-center gap-3 p-2 rounded-2xl hover:bg-white/10 transition-colors"
                onClick={() => setShowUserDropdown(!showUserDropdown)}
              >
                <div className="relative">
                  <img
                    src={user.avatar}
                    alt="User Avatar"
                    className="w-12 h-12 rounded-2xl border-2 border-white/50"
                  />
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                </div>
                <div className="text-left">
                  <div className="font-semibold text-sm">
                    {capitalizeName(user.name)}
                  </div>
                  <div className="text-purple-200 text-xs">{user.email}</div>
                </div>
                <i className="fas fa-chevron-down text-purple-200"></i>
              </button>
              <AnimatePresence>
                {showUserDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute top-full right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-gray-200 z-50"
                  >
                    <div className="p-4 border-b border-gray-200">
                      <div className="font-semibold text-gray-900">
                        {capitalizeName(user.name)}
                      </div>
                      <div className="text-gray-600 text-sm">{user.email}</div>
                    </div>
                    <div className="p-2">
                      <Link
                        to="/profile"
                        className="flex items-center gap-3 p-3 rounded-xl hover:bg-purple-50 transition-colors"
                        onClick={() => switchSection("settings")}
                      >
                        <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                          <i className="fas fa-user text-purple-600"></i>
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
                        to="/preferences"
                        className="flex items-center gap-3 p-3 rounded-xl hover:bg-purple-50 transition-colors"
                        onClick={() => switchSection("settings")}
                      >
                        <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                          <i className="fas fa-cog text-blue-600"></i>
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">
                            Preferences
                          </div>
                          <div className="text-gray-500 text-sm">
                            Customize settings
                          </div>
                        </div>
                      </Link>
                      <Link
                        to="/help"
                        className="flex items-center gap-3 p-3 rounded-xl hover:bg-purple-50 transition-colors"
                        onClick={() =>
                          showToast(
                            "info",
                            "Help",
                            "Navigating to Help & Support"
                          )
                        }
                      >
                        <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                          <i className="fas fa-question-circle text-green-600"></i>
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
                      <div className="border-t border-gray-200 mt-2 pt-2">
                        <button
                          onClick={handleLogout}
                          className="flex items-center gap-3 p-3 rounded-xl hover:bg-red-50 text-red-600 w-full transition-colors"
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
        </div>
      </header>

      {/* Quick Actions Bar */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-8xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <Link
                  to="/orders"
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all action-btn new-order"
                >
                  <i className="fas fa-plus-circle"></i>
                  <span>New Order</span>
                  <span className="text-xs bg-white/20 px-2 py-1 rounded">
                    Ctrl+N
                  </span>
                </Link>
                <button
                  onClick={() => switchSection("pos")}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors border border-gray-300 action-btn pos"
                >
                  <i className="fas fa-cash-register"></i>
                  <span>Quick Sale</span>
                  <span className="text-xs bg-gray-200 px-2 py-1 rounded">
                    F1
                  </span>
                </button>
                <button
                  onClick={handleCustomerLookup}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors border border-gray-300 action-btn customer-lookup"
                >
                  <i className="fas fa-search-plus"></i>
                  <span>Find Customer</span>
                  <span className="text-xs bg-gray-200 px-2 py-1 rounded">
                    Ctrl+F
                  </span>
                </button>
              </div>
              <div className="flex items-center gap-2 border-l border-gray-300 pl-6">
                <button
                  onClick={() => handleOrderAction("approve")}
                  className="flex items-center gap-2 px-3 py-2 bg-green-100 text-green-700 rounded-lg font-semibold hover:bg-green-200 transition-colors action-btn approve-order"
                >
                  <i className="fas fa-check-circle"></i>
                  <span>Approve</span>
                </button>
                <button
                  onClick={() => handleOrderAction("reject")}
                  className="flex items-center gap-2 px-3 py-2 bg-red-100 text-red-700 rounded-lg font-semibold hover:bg-red-200 transition-colors action-btn reject-order"
                >
                  <i className="fas fa-times-circle"></i>
                  <span>Reject</span>
                </button>
                <button
                  onClick={() => handleOrderAction("cancel")}
                  className="flex items-center gap-2 px-3 py-2 bg-orange-100 text-orange-700 rounded-lg font-semibold hover:bg-orange-200 transition-colors action-btn cancel-order"
                >
                  <i className="fas fa-ban"></i>
                  <span>Cancel</span>
                </button>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900 stat-number">
                  {salesMetrics.ordersToday}
                </div>
                <div className="text-gray-600 text-sm">Orders Today</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900 stat-number">
                  {formatCurrency(salesMetrics.totalRevenue)}
                </div>
                <div className="text-gray-600 text-sm">Revenue</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900 stat-number">
                  {salesMetrics.rating}★
                </div>
                <div className="text-gray-600 text-sm">Rating</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-8xl mx-auto px-6 py-8">
        <div className="flex gap-8">
          <aside className="w-80 flex-shrink-0 sidebar">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white rounded-3xl p-6 shadow-2xl border border-gray-200 sticky top-32"
            >
              <div className="flex items-center justify-between mb-8">
                <div className="font-bold text-gray-900 text-lg">
                  Navigation
                </div>
                <button className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 hover:bg-purple-100 transition-colors">
                  <i className="fas fa-bars"></i>
                </button>
              </div>
              <nav className="space-y-6">
                {sidebarSections.map((section, sectionIndex) => (
                  <div key={sectionIndex}>
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-2">
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
                            } else if (item.href === "#") {
                              e.preventDefault();
                              switchSection(
                                item.label.toLowerCase().replace(" ", "")
                              );
                            }
                          }}
                          className={`nav-item flex items-center gap-4 px-4 py-3 rounded-2xl font-medium transition-all ${
                            item.isLogout
                              ? "text-red-600 hover:bg-red-50"
                              : activeSection ===
                                item.label.toLowerCase().replace(" ", "")
                              ? "bg-gradient-to-r from-purple-50 to-pink-50 text-purple-700 border border-purple-200 active"
                              : "text-gray-700 hover:bg-gray-50"
                          }`}
                          data-section={item.label
                            .toLowerCase()
                            .replace(" ", "")}
                        >
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                              item.isLogout
                                ? "bg-red-100"
                                : activeSection ===
                                  item.label.toLowerCase().replace(" ", "")
                                ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white"
                                : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            <i className={`fas ${item.icon}`}></i>
                          </div>
                          <span className="flex-1">{item.label}</span>
                          {item.badge > 0 && (
                            <span
                              className={`text-xs px-2 py-1 rounded-full font-semibold ${
                                item.urgent
                                  ? "bg-red-500 text-white"
                                  : item.warning
                                  ? "bg-orange-500 text-white"
                                  : item.active
                                  ? "bg-green-500 text-white"
                                  : "bg-purple-500 text-white"
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
          <div className="flex-1 min-w-0">
            {activeSection === "dashboard" && (
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-8 content-section active"
                id="dashboard"
              >
                <div className="bg-white rounded-3xl p-8 shadow-2xl border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-3xl font-bold text-gray-900 mb-2">
                        Dashboard Overview
                      </h2>
                      <p className="text-gray-600">
                        Welcome back! Here's what's happening with your sales
                        today.
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <select
                        className="bg-white border border-gray-300 rounded-2xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-500"
                        onChange={(e) => {
                          showToast(
                            "info",
                            "Filter",
                            `Selected ${e.target.value}`
                          );
                        }}
                      >
                        <option value="today">Today</option>
                        <option value="week">This Week</option>
                        <option value="month">This Month</option>
                      </select>
                      <button
                        className="refresh-btn flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-2xl font-semibold shadow-lg hover:shadow-xl transition-all"
                        onClick={() => {
                          showToast(
                            "success",
                            "Refresh",
                            "Dashboard data updated"
                          );
                        }}
                      >
                        <i className="fas fa-sync-alt"></i>
                        <span>Refresh</span>
                      </button>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-8">
                  <div className="bg-white rounded-3xl p-6 shadow-2xl border border-gray-200">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center text-white">
                        <i className="fas fa-chart-line"></i>
                      </div>
                      <div className="font-bold text-gray-900">
                        Today's Performance
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <div className="text-3xl font-bold text-gray-900 stat-number">
                          {formatCurrency(salesMetrics.todaysSales)}
                        </div>
                        <div className="text-gray-600 font-semibold">
                          Revenue
                        </div>
                        <div
                          className={`text-sm font-semibold ${
                            salesMetrics.revenueTrend > 0
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {salesMetrics.revenueTrend > 0 ? "↗" : "↘"}{" "}
                          {Math.abs(salesMetrics.revenueTrend)}%
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="font-semibold text-gray-900 stat-number">
                            {salesMetrics.ordersToday}
                          </div>
                          <div className="text-gray-500 text-sm">Orders</div>
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900 stat-number">
                            {formatCurrency(salesMetrics.avgOrderValue)}
                          </div>
                          <div className="text-gray-500 text-sm">Avg Order</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white rounded-3xl p-6 shadow-2xl border border-gray-200">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center text-white">
                        <i className="fas fa-shopping-cart"></i>
                      </div>
                      <div className="font-bold text-gray-900">
                        Order Status
                      </div>
                    </div>
                    <div className="space-y-4">
                      {[
                        {
                          status: "New Orders",
                          count: salesMetrics.newOrders,
                          color: "green",
                        },
                        {
                          status: "Processing",
                          count: salesMetrics.processingOrders,
                          color: "orange",
                        },
                        {
                          status: "Shipped Today",
                          count: salesMetrics.shippedOrders,
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
                          <span className="font-semibold text-gray-900 stat-number">
                            {order.count}
                          </span>
                        </div>
                      ))}
                    </div>
                    <button
                      className="w-full mt-6 py-3 border-2 border-purple-600 text-purple-600 rounded-xl font-semibold hover:bg-purple-600 hover:text-white transition-colors"
                      onClick={() => switchSection("orders")}
                    >
                      View All Orders
                    </button>
                  </div>
                  <div className="bg-white rounded-3xl p-6 shadow-2xl border border-gray-200">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center text-white">
                        <i className="fas fa-users"></i>
                      </div>
                      <div className="font-bold text-gray-900">
                        Customer Activity
                      </div>
                    </div>
                    <div className="space-y-4">
                      {[
                        {
                          label: "New Customers",
                          value: salesMetrics.newCustomers,
                          trend: salesMetrics.customersTrend,
                        },
                        {
                          label: "Returning Customers",
                          value: salesMetrics.returningCustomers,
                          trend: salesMetrics.returningTrend,
                        },
                        {
                          label: "Customer Satisfaction",
                          value: `${salesMetrics.rating}★`,
                          trend: salesMetrics.ratingChange,
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
                            <span className="font-semibold text-gray-900 stat-number">
                              {item.value}
                            </span>
                            {item.trend !== undefined && (
                              <span
                                className={`text-xs px-2 py-1 rounded-full ${
                                  item.trend > 0
                                    ? "bg-green-100 text-green-700"
                                    : "bg-red-100 text-red-700"
                                }`}
                              >
                                {item.trend > 0 ? "+" : ""}
                                {item.trend}%
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-8">
                  <div className="bg-white rounded-3xl p-6 shadow-2xl border border-gray-200 priority-card urgent">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-xl font-bold text-gray-900">
                        Priority Tasks
                      </h3>
                      <div className="bg-gray-100 text-gray-600 text-sm px-3 py-1 rounded-xl priority-count">
                        {salesMetrics.pendingTasks} pending
                      </div>
                    </div>
                    <div className="space-y-4 priority-list">
                      {tasks
                        .filter((task) => task.status === "urgent")
                        .slice(0, 3)
                        .map((task, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-4 bg-red-50 rounded-2xl border border-red-200 priority-item"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center item-icon">
                                <i className="fas fa-clock text-red-600"></i>
                              </div>
                              <div className="item-content">
                                <div className="font-semibold text-gray-900 item-title">
                                  {task.title}
                                </div>
                                <div className="text-red-600 text-sm item-subtitle">
                                  {task.subtitle}
                                </div>
                              </div>
                            </div>
                            <button className="px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 transition-colors item-action btn btn-sm btn-danger">
                              Process
                            </button>
                          </div>
                        ))}
                      {tasks.filter((task) => task.status === "urgent")
                        .length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                          <i className="fas fa-check-circle text-4xl mb-3 text-gray-300"></i>
                          <div>No urgent tasks</div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="bg-white rounded-3xl p-6 shadow-2xl border border-gray-200">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-xl font-bold text-gray-900">
                        Recent Activity
                      </h3>
                      <button
                        className="text-purple-600 font-semibold hover:text-purple-700"
                        onClick={() => switchSection("activities")}
                      >
                        View All
                      </button>
                    </div>
                    <div className="space-y-4 activity-feed">
                      {activities.slice(0, 3).map((activity, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl activity-item"
                        >
                          <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center text-white activity-avatar">
                            {activity.avatar ? (
                              <img src={activity.avatar} alt="Customer" />
                            ) : (
                              <i
                                className={`fas ${activity.icon || "fa-user"}`}
                              ></i>
                            )}
                          </div>
                          <div className="flex-1 activity-content">
                            <div className="text-sm text-gray-900 activity-text">
                              <span className="font-semibold">
                                {activity.customer || "Unknown"}
                              </span>
                              <span> {activity.action}</span>
                              {activity.orderId && (
                                <span className="font-semibold">
                                  {" "}
                                  {activity.orderId}
                                </span>
                              )}
                            </div>
                            <div className="text-purple-600 text-xs activity-time">
                              {activity.time}
                            </div>
                          </div>
                          <button
                            className="px-3 py-1 border border-purple-600 text-purple-600 rounded-lg text-xs font-semibold hover:bg-purple-600 hover:text-white transition-colors activity-action btn btn-sm btn-outline"
                            onClick={() =>
                              showToast(
                                "info",
                                "Action",
                                `View ${
                                  activity.type === "order"
                                    ? "Order"
                                    : activity.type === "shipping"
                                    ? "Tracking"
                                    : "Review"
                                }`
                              )
                            }
                          >
                            {activity.type === "order"
                              ? "View Order"
                              : activity.type === "shipping"
                              ? "Track"
                              : "View Review"}
                          </button>
                        </div>
                      ))}
                      {activities.length === 0 && (
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
            {activeSection === "pos" && (
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-3xl shadow-2xl border border-gray-200 overflow-hidden content-section"
                id="pos"
              >
                <div className="p-8 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-3xl font-bold text-gray-900 mb-2">
                        Point of Sale
                      </h2>
                      <p className="text-gray-600">
                        Process in-store transactions and quick sales
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <button
                        className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
                        onClick={() =>
                          showToast(
                            "info",
                            "Transaction History",
                            "Navigating to transaction history"
                          )
                        }
                      >
                        <i className="fas fa-history"></i>
                        <span>Transaction History</span>
                      </button>
                      <button
                        onClick={clearCart}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
                      >
                        <i className="fas fa-plus"></i>
                        <span>New Transaction</span>
                      </button>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-8 p-8">
                  <div className="col-span-2 space-y-6">
                    <div className="relative">
                      <input
                        type="text"
                        id="productSearch"
                        placeholder="Search products or scan barcode..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => {
                          if (
                            e.key === "Enter" &&
                            e.target.value.startsWith("*")
                          ) {
                            const barcode = e.target.value.substring(1);
                            fetch(`/api/products/barcode/${barcode}`)
                              .then((response) => {
                                console.log(
                                  "Barcode API Response Status:",
                                  response.status,
                                  response.statusText
                                );
                                console.log(
                                  "Barcode API Response Headers:",
                                  response.headers.get("content-type")
                                );
                                if (!response.ok) {
                                  throw new Error(
                                    `HTTP error! Status: ${response.status}`
                                  );
                                }
                                if (!isJsonResponse(response)) {
                                  return response.text().then((text) => {
                                    console.error(
                                      "Barcode API Non-JSON Response:",
                                      text.slice(0, 100)
                                    );
                                    throw new Error("Response is not JSON");
                                  });
                                }
                                return response.json();
                              })
                              .then((product) => {
                                if (product) {
                                  addToCart(product);
                                  showToast(
                                    "success",
                                    "Barcode Scan",
                                    `Added ${product.title} to cart`
                                  );
                                } else {
                                  showToast(
                                    "warning",
                                    "Barcode Scan",
                                    `No product found for barcode: ${barcode}`
                                  );
                                }
                              })
                              .catch((error) => {
                                console.error("Error scanning barcode:", error);
                                showToast(
                                  "error",
                                  "Barcode Scan",
                                  `Error: ${error.message}`
                                );
                              });
                          }
                        }}
                        className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                      <i className="fas fa-search absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                      <button className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-purple-600">
                        <i className="fas fa-barcode"></i>
                      </button>
                    </div>
                    <div
                      id="productGrid"
                      className="grid grid-cols-2 gap-4 max-h-[600px] overflow-y-auto"
                    >
                      {filteredProducts.length > 0 ? (
                        filteredProducts.map((product) => (
                          <div
                            key={product._id}
                            className="product-item bg-gray-50 rounded-2xl p-4 border border-gray-200 hover:shadow-lg transition-all"
                            data-product-id={product._id}
                            data-price={product.price}
                          >
                            <div className="aspect-square mb-3 bg-gray-200 rounded-xl overflow-hidden product-image">
                              <img
                                src={
                                  product.images?.[0] ||
                                  "https://images.pexels.com/photos/1598505/pexels-photo-1598505.jpeg?auto=compress&cs=tinysrgb&w=150"
                                }
                                alt={product.title}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="space-y-2 product-info">
                              <h4 className="font-semibold text-gray-900 text-sm line-clamp-2 product-name">
                                {product.title}
                              </h4>
                              <div className="text-lg font-bold text-purple-600 product-price">
                                {formatCurrency(product.price)}
                              </div>
                              <div className="text-xs text-gray-500 product-stock">
                                {product.stockId
                                  ? `In Stock: ${product.stockId}`
                                  : "N/A"}
                              </div>
                              <button
                                onClick={() => addToCart(product)}
                                className="w-full py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all add-to-cart btn btn-primary"
                              >
                                <i className="fas fa-plus mr-2"></i>
                                Add to Cart
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="col-span-2 text-center py-12 text-gray-500">
                          <i className="fas fa-search text-4xl mb-3 text-gray-300"></i>
                          <div>No products found</div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-bold text-gray-900">
                        Current Sale
                      </h3>
                      <button
                        onClick={clearCart}
                        className="text-red-600 hover:text-red-700 font-semibold clear-cart"
                      >
                        Clear All
                      </button>
                    </div>
                    <div
                      id="cartItems"
                      className="space-y-3 max-h-[300px] overflow-y-auto"
                    >
                      {cartItems.length > 0 ? (
                        cartItems.map((item) => (
                          <div
                            key={item.productId}
                            className="cart-item bg-gray-50 rounded-2xl p-3 border border-gray-200"
                            data-product-id={item.productId}
                          >
                            <div className="flex items-center gap-3 item-info">
                              <img
                                src={
                                  item.image ||
                                  "https://images.pexels.com/photos/1598505/pexels-photo-1598505.jpeg?auto=compress&cs=tinysrgb&w=50"
                                }
                                alt={item.title}
                                className="w-12 h-12 rounded-lg object-cover item-image"
                              />
                              <div className="flex-1 item-details">
                                <div className="font-semibold text-gray-900 text-sm item-name">
                                  {item.title}
                                </div>
                                <div className="text-purple-600 font-semibold item-price">
                                  {formatCurrency(item.price)}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 item-controls">
                                <div className="quantity-controls">
                                  <button
                                    onClick={() =>
                                      updateCartQuantity(
                                        item.productId,
                                        item.quantity - 1
                                      )
                                    }
                                    className="w-6 h-6 bg-gray-200 rounded flex items-center justify-center hover:bg-gray-300 qty-btn minus"
                                    data-action="decrease"
                                    data-product-id={item.productId}
                                  >
                                    <i className="fas fa-minus text-xs"></i>
                                  </button>
                                  <span className="font-semibold text-gray-900 w-8 text-center quantity">
                                    {item.quantity}
                                  </span>
                                  <button
                                    onClick={() =>
                                      updateCartQuantity(
                                        item.productId,
                                        item.quantity + 1
                                      )
                                    }
                                    className="w-6 h-6 bg-gray-200 rounded flex items-center justify-center hover:bg-gray-300 qty-btn plus"
                                    data-action="increase"
                                    data-product-id={item.productId}
                                  >
                                    <i className="fas fa-plus text-xs"></i>
                                  </button>
                                </div>
                                <div className="font-semibold text-gray-900 item-total">
                                  {formatCurrency(item.total)}
                                </div>
                                <button
                                  onClick={() => removeFromCart(item.productId)}
                                  className="text-red-500 hover:text-red-700 remove-item"
                                  data-product-id={item.productId}
                                >
                                  <i className="fas fa-trash"></i>
                                </button>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8 text-gray-500 empty-cart">
                          <i className="fas fa-shopping-cart text-4xl mb-3 text-gray-300"></i>
                          <div>Add items to start a sale</div>
                        </div>
                      )}
                    </div>
                    <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200">
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Subtotal:</span>
                          <span className="font-semibold subtotal">
                            {formatCurrency(calculateCartTotals().subtotal)}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Tax (8.5%):</span>
                          <span className="font-semibold tax-amount">
                            {formatCurrency(calculateCartTotals().tax)}
                          </span>
                        </div>
                        <div className="flex justify-between text-lg font-bold border-t border-gray-300 pt-2">
                          <span>Total:</span>
                          <span className="total-amount">
                            {formatCurrency(calculateCartTotals().total)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="grid grid-cols-3 gap-2">
                        {["cash", "card", "digital"].map((method) => (
                          <button
                            key={method}
                            onClick={() => setPaymentMethod(method)}
                            className={`payment-btn py-3 rounded-xl font-semibold transition-all ${
                              paymentMethod === method
                                ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg active"
                                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                            }`}
                          >
                            <i
                              className={`fas fa-${
                                method === "cash"
                                  ? "money-bill"
                                  : method === "card"
                                  ? "credit-card"
                                  : "mobile-alt"
                              } mr-2`}
                            ></i>
                            {method.charAt(0).toUpperCase() + method.slice(1)}
                          </button>
                        ))}
                      </div>
                      <div className="space-y-2">
                        <input
                          type="number"
                          className="payment-amount w-full px-4 py-3 border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          placeholder="Amount received"
                          value={amountReceived || ""}
                          onChange={(e) => {
                            const amount = parseFloat(e.target.value) || 0;
                            setAmountReceived(amount);
                            if (isNaN(amount)) {
                              showToast(
                                "warning",
                                "Invalid Input",
                                "Please enter a valid amount"
                              );
                              e.target.value = "";
                            } else {
                              const change = calculateChange();
                              showToast(
                                "info",
                                "Payment",
                                `Change: ${formatCurrency(change)}`
                              );
                            }
                          }}
                        />
                        <div className="text-sm font-semibold text-gray-700 change-amount">
                          Change: {formatCurrency(calculateChange())}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={holdSale}
                          className="hold-sale py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
                        >
                          <i className="fas fa-pause mr-2"></i>
                          Hold Sale
                        </button>
                        <button
                          onClick={completeSale}
                          className="complete-sale py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
                        >
                          <i className="fas fa-check mr-2"></i>
                          Complete Sale
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalesDashboard;
