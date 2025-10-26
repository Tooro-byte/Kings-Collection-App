import React, { useState, useEffect } from "react";

const Payment = () => {
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("mobile");
  const [orderDetails, setOrderDetails] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [shippingAddress, setShippingAddress] = useState({
    name: "",
    phone: "",
    address: "",
    city: "",
    country: "Uganda",
  });
  const [user, setUser] = useState(null);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);

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
    fetchCartItems();
    fetchUserProfile();
  }, []);

  const fetchCartItems = async () => {
    try {
      setLoading(true);
      const response = await makeAuthenticatedRequest("/api/cart");

      if (response.success) {
        setCartItems(response.items || []);

        // Calculate order details
        const subtotal = response.items.reduce(
          (total, item) =>
            total +
            parseFloat(item.product?.price || item.price || 0) *
              (item.quantity || 1),
          0
        );
        const shipping = subtotal > 0 ? 10000 : 0;
        const total = subtotal + shipping;

        setOrderDetails({
          subtotal,
          shipping,
          total,
          itemCount: response.items.length,
        });
      }
    } catch (error) {
      console.error("Error fetching cart items:", error);
      setCartItems([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserProfile = async () => {
    try {
      // Try different possible endpoints for user data
      let userData;
      try {
        userData = await makeAuthenticatedRequest("/api/users/me");
      } catch (error) {
        console.log("Trying alternative user endpoint...");
        try {
          const dashboardData = await makeAuthenticatedRequest(
            "/api/dashboard"
          );
          userData = dashboardData.user || {
            name: "Customer",
            email: "",
            phone: "",
          };
        } catch (dashboardError) {
          console.log("Using fallback user data");
          userData = { name: "Customer", email: "", phone: "" };
        }
      }

      if (userData) {
        setUser(userData);
        setShippingAddress((prev) => ({
          ...prev,
          name: userData.name || "",
          phone: userData.phone || "",
          email: userData.email || "",
        }));
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
      // Set default values if user fetch fails
      setShippingAddress((prev) => ({
        ...prev,
        name: "Customer",
      }));
    }
  };

  const formatPrice = (price) => {
    return parseFloat(price).toLocaleString("en-UG");
  };

  const validateShippingAddress = () => {
    if (!shippingAddress.name.trim()) {
      alert("Please enter your full name");
      return false;
    }
    if (!shippingAddress.phone.trim()) {
      alert("Please enter your phone number");
      return false;
    }
    if (!shippingAddress.address.trim()) {
      alert("Please enter your shipping address");
      return false;
    }
    if (!shippingAddress.city.trim()) {
      alert("Please enter your city");
      return false;
    }
    if (!paymentConfirmed) {
      alert("Please confirm that you have made the payment");
      return false;
    }
    return true;
  };

  // Debug function to check cart structure
  const debugCartStructure = async () => {
    try {
      const cartResponse = await makeAuthenticatedRequest("/api/cart");
      console.log("=== CART DEBUG INFO ===");
      console.log("Cart success:", cartResponse.success);
      console.log("Cart items count:", cartResponse.items?.length);

      if (cartResponse.items && cartResponse.items.length > 0) {
        cartResponse.items.forEach((item, index) => {
          console.log(`Item ${index}:`, {
            productId: item.productId,
            product: item.product,
            quantity: item.quantity,
            price: item.price,
            addedAt: item.addedAt,
            hasProductId: !!item.productId,
            hasProductObject: !!item.product,
            productObjectId: item.product?._id || item.product?.id,
          });
        });
      }
      console.log("=== END CART DEBUG ===");
      return cartResponse;
    } catch (error) {
      console.error("Debug error:", error);
      return null;
    }
  };

  const handlePlaceOrder = async () => {
    if (!selectedPaymentMethod) {
      alert("Please select a payment method");
      return;
    }

    if (!validateShippingAddress()) {
      return;
    }

    try {
      setIsProcessing(true);

      // Debug cart structure first
      const cartDebug = await debugCartStructure();

      if (
        !cartDebug ||
        !cartDebug.success ||
        !cartDebug.items ||
        cartDebug.items.length === 0
      ) {
        alert("Your cart is empty or there's an issue with your cart data");
        setIsProcessing(false);
        return;
      }

      // Check if cart items have valid product IDs
      const invalidItems = cartDebug.items.filter((item) => {
        const hasProductId = !!item.productId;
        const hasProductObjectId = !!(item.product?._id || item.product?.id);
        return !hasProductId && !hasProductObjectId;
      });

      if (invalidItems.length > 0) {
        console.error("Invalid cart items:", invalidItems);
        alert(
          "Some items in your cart are invalid. Please remove them and try again."
        );
        setIsProcessing(false);
        return;
      }

      // Prepare the order payload according to your backend requirements
      const orderPayload = {
        paymentMethod: selectedPaymentMethod,
        shippingAddress: {
          name: shippingAddress.name.trim(),
          phone: shippingAddress.phone.trim(),
          address: shippingAddress.address.trim(),
          city: shippingAddress.city.trim(),
          country: shippingAddress.country,
        },
        customerNotes: `Payment completed via ${selectedPaymentMethod}.`,
      };

      console.log("Creating order with payload:", orderPayload);

      // Create order using the backend endpoint
      const orderResponse = await makeAuthenticatedRequest("/api/orders", {
        method: "POST",
        body: JSON.stringify(orderPayload),
      });

      if (orderResponse.success) {
        // Clear cart after successful order
        try {
          await makeAuthenticatedRequest("/api/cart/clear", {
            method: "DELETE",
          });
        } catch (clearError) {
          console.warn("Could not clear cart:", clearError);
        }

        const orderId =
          orderResponse.order?.orderId ||
          orderResponse.order?._id ||
          orderResponse.orderId ||
          orderResponse._id ||
          orderResponse.id ||
          "Your order";

        alert(
          `Order placed successfully! Order ID: ${orderId}\n\nYou will receive a confirmation call shortly.`
        );

        // Redirect to orders page
        window.location.href = "/orders";
      } else {
        alert(
          "Failed to place order: " +
            (orderResponse.message || "Unknown error. Please try again.")
        );
      }
    } catch (error) {
      console.error("Error placing order:", error);

      // More specific error messages based on the actual error
      if (error.message.includes("400")) {
        alert(
          "Invalid order data. This might be due to:\n• Invalid product IDs in cart\n• Insufficient stock\n• Corrupted cart data\n\nPlease try clearing your cart and adding items again, or contact support."
        );
      } else if (error.message.includes("404")) {
        alert(
          "Order service is currently unavailable. Please try again later."
        );
      } else if (error.message.includes("500")) {
        alert("Server error. Please try again in a few moments.");
      } else if (error.message.includes("Network Error")) {
        alert(
          "Network connection error. Please check your internet connection and try again."
        );
      } else {
        alert("Error placing order: " + error.message);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleInputChange = (field, value) => {
    setShippingAddress((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-gold-500 mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading payment details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-800 relative overflow-hidden">
      {/* Navigation Bar */}
      <nav className="bg-blue-900 bg-opacity-95 backdrop-blur-lg sticky top-0 z-40 border-b-2 border-red-500 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gold-500 rounded-full flex items-center justify-center">
                <span className="text-white-900 font-bold text-sm">K</span>
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
                <span>Back to Cart</span>
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        {/* Header */}
        <div className="bg-teal-800 bg-opacity-80 backdrop-blur-lg rounded-xl p-6 border border-gold-500 mb-8 transform hover:scale-105 transition-transform duration-300">
          <h1 className="text-4xl font-bold text-gold-500 mb-2 text-center">
            Complete Your Payment
          </h1>
          <p className="text-gray-400 text-center">
            Choose your preferred payment method to complete your order
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Payment Methods */}
          <div className="bg-gradient-to-br from-blue-900 via-blue-800 to-purple-900 rounded-2xl p-6 border-2 border-blue-500 shadow-2xl transform hover:scale-105 transition-all duration-500 hover:rotate-1">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                <span className="text-white text-2xl">🏦</span>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">
                Bank Transfer
              </h2>
              <p className="text-blue-200">Direct bank transfer</p>
            </div>

            <div className="space-y-4">
              <div className="bg-blue-800 bg-opacity-50 rounded-xl p-4 border border-blue-400">
                <h3 className="font-bold text-blue-300 mb-3 text-lg">
                  Stanbic Bank Uganda
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-blue-200">Account Name:</span>
                    <span className="text-white font-semibold">
                      Kings Collections Ltd
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-200">Account Number:</span>
                    <span className="text-white font-mono font-bold">
                      9030012345678
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-200">Branch:</span>
                    <span className="text-white font-semibold">
                      Kampala Main
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-200">SWIFT Code:</span>
                    <span className="text-white font-mono font-bold">
                      SBICUGKX
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedPaymentMethod("bank")}
                className={`w-full py-3 rounded-xl font-bold text-lg transition-all duration-300 ${
                  selectedPaymentMethod === "bank"
                    ? "bg-white text-blue-600 shadow-2xl transform scale-105"
                    : "bg-blue-600 hover:bg-blue-500 text-white hover:shadow-xl"
                }`}
              >
                {selectedPaymentMethod === "bank"
                  ? "✓ Selected"
                  : "Select Bank Transfer"}
              </button>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-900 via-pink-800 to-red-900 rounded-2xl p-6 border-2 border-purple-500 shadow-2xl transform hover:scale-105 transition-all duration-500 hover:-rotate-1">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                <span className="text-white text-2xl">📱</span>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">
                Mobile Money
              </h2>
              <p className="text-purple-200">Instant mobile payments</p>
            </div>

            <div className="space-y-4">
              <div className="bg-yellow-600 bg-opacity-20 rounded-xl p-4 border border-yellow-500">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-yellow-300 text-lg">
                    MTN Mobile Money
                  </h3>
                  <span className="text-yellow-200 text-sm">📞</span>
                </div>
                <div className="text-center">
                  <p className="text-white font-mono text-xl font-bold mb-1">
                    +256 785 642 772
                  </p>
                  <p className="text-yellow-200 text-sm">Kings Collections</p>
                </div>
              </div>

              <div className="bg-red-600 bg-opacity-20 rounded-xl p-4 border border-red-500">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-red-300 text-lg">
                    Airtel Money
                  </h3>
                  <span className="text-red-200 text-sm">📞</span>
                </div>
                <div className="text-center">
                  <p className="text-white font-mono text-xl font-bold mb-1">
                    +256 757 871 210
                  </p>
                  <p className="text-red-200 text-sm">Kings Collections</p>
                </div>
              </div>

              <button
                onClick={() => setSelectedPaymentMethod("mobile")}
                className={`w-full py-3 rounded-xl font-bold text-lg transition-all duration-300 ${
                  selectedPaymentMethod === "mobile"
                    ? "bg-white text-purple-600 shadow-2xl transform scale-105"
                    : "bg-purple-600 hover:bg-purple-500 text-white hover:shadow-xl"
                }`}
              >
                {selectedPaymentMethod === "mobile"
                  ? "✓ Selected"
                  : "Select Mobile Money"}
              </button>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-600 via-blue-500 to-cyan-500 rounded-2xl p-6 border-2 border-cyan-400 shadow-2xl transform hover:scale-105 transition-all duration-500 hover:rotate-1">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-cyan-400 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                <span className="text-white text-2xl">🌐</span>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">PayPal</h2>
              <p className="text-cyan-200">International payments</p>
            </div>

            <div className="space-y-4">
              <div className="bg-cyan-700 bg-opacity-30 rounded-xl p-4 border border-cyan-400">
                <h3 className="font-bold text-cyan-300 mb-3 text-lg">
                  Secure PayPal Payment
                </h3>
                <p className="text-cyan-200 text-sm mb-4">
                  Pay securely with your PayPal account or credit card.
                </p>
                <div className="text-center">
                  <p className="text-white font-bold text-lg">
                    Amount: UGX{" "}
                    {orderDetails ? formatPrice(orderDetails.total) : "0"}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedPaymentMethod("paypal")}
                className={`w-full py-3 rounded-xl font-bold text-lg transition-all duration-300 ${
                  selectedPaymentMethod === "paypal"
                    ? "bg-white text-cyan-600 shadow-2xl transform scale-105"
                    : "bg-cyan-500 hover:bg-cyan-400 text-white hover:shadow-xl"
                }`}
              >
                {selectedPaymentMethod === "paypal"
                  ? "✓ Selected"
                  : "Continue with PayPal"}
              </button>
            </div>
          </div>
        </div>

        {/* Shipping Address & Order Summary */}
        <div className="mt-12 grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Shipping Address Form */}
          <div className="bg-gray-800 bg-opacity-80 backdrop-blur-lg rounded-2xl p-8 border border-gold-500">
            <h2 className="text-2xl font-bold text-gold-500 mb-6">
              Shipping Address
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-gray-300 mb-2">Full Name *</label>
                <input
                  type="text"
                  value={shippingAddress.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
                  placeholder="Enter your full name"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-300 mb-2">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  value={shippingAddress.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
                  placeholder="+256 XXX XXX XXX"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-300 mb-2">Address *</label>
                <textarea
                  value={shippingAddress.address}
                  onChange={(e) => handleInputChange("address", e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
                  placeholder="Enter your complete shipping address"
                  rows="3"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-300 mb-2">City *</label>
                  <input
                    type="text"
                    value={shippingAddress.city}
                    onChange={(e) => handleInputChange("city", e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
                    placeholder="Enter your city"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-300 mb-2">Country</label>
                  <input
                    type="text"
                    value={shippingAddress.country}
                    onChange={(e) =>
                      handleInputChange("country", e.target.value)
                    }
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
                    disabled
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Order Summary & Confirmation */}
          <div className="bg-gray-800 bg-opacity-80 backdrop-blur-lg rounded-2xl p-8 border border-gold-500">
            <h2 className="text-2xl font-bold text-gold-500 mb-6">
              Order Summary
            </h2>

            {orderDetails && (
              <div className="space-y-4 mb-6">
                <div className="flex justify-between text-gray-300">
                  <span>Subtotal ({orderDetails.itemCount} items)</span>
                  <span>UGX {formatPrice(orderDetails.subtotal)}</span>
                </div>

                <div className="flex justify-between text-gray-300">
                  <span>Shipping</span>
                  <span>UGX {formatPrice(orderDetails.shipping)}</span>
                </div>

                <div className="border-t border-gold-500 pt-4 flex justify-between text-xl font-bold text-white">
                  <span>Total Amount</span>
                  <span className="text-gold-500 text-2xl">
                    UGX {formatPrice(orderDetails.total)}
                  </span>
                </div>
              </div>
            )}

            {/* Selected Payment Method */}
            <div className="mb-6 p-4 bg-gold-500 bg-opacity-10 rounded-lg border border-gold-500">
              <h3 className="font-bold text-gold-500 mb-2">
                Selected Payment Method:
              </h3>
              <p className="text-white text-lg">
                {selectedPaymentMethod === "bank" && "🏦 Bank Transfer"}
                {selectedPaymentMethod === "mobile" && "📱 Mobile Money"}
                {selectedPaymentMethod === "paypal" && "🌐 PayPal"}
                {!selectedPaymentMethod && "Please select a payment method"}
              </p>
            </div>

            {/* Confirmation Section */}
            <div className="space-y-4">
              <div className="flex items-start space-x-3 p-4 bg-gray-700 rounded-lg">
                <input
                  type="checkbox"
                  id="confirmPayment"
                  checked={paymentConfirmed}
                  onChange={(e) => setPaymentConfirmed(e.target.checked)}
                  className="w-5 h-5 text-gold-500 bg-gray-600 border-gray-500 rounded focus:ring-gold-500 focus:ring-2 mt-1"
                />
                <label
                  htmlFor="confirmPayment"
                  className="text-gray-300 text-sm"
                >
                  I confirm that I have made the payment using the selected
                  method. I understand that my order will be processed once
                  payment is verified.
                </label>
              </div>

              <button
                onClick={handlePlaceOrder}
                disabled={
                  isProcessing || !selectedPaymentMethod || !paymentConfirmed
                }
                className={`w-full py-4 rounded-xl font-bold text-xl transition-all duration-300 flex items-center justify-center space-x-3 ${
                  isProcessing || !selectedPaymentMethod || !paymentConfirmed
                    ? "bg-gray-600 cursor-not-allowed"
                    : "bg-emerald-600 hover:bg-emerald-500 text-white hover:shadow-2xl hover:shadow-emerald-500/30 hover:-translate-y-1"
                }`}
              >
                {isProcessing ? (
                  <>
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                    <span>Processing Payment...</span>
                  </>
                ) : (
                  <>
                    <span>✅</span>
                    <span>Confirm & Place Order</span>
                  </>
                )}
              </button>

              <div className="text-center text-gray-400 text-sm">
                <p>You will receive a confirmation email with order details</p>
              </div>
            </div>
          </div>
        </div>

        {/* Support Information */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-blue-900 bg-opacity-20 rounded-xl p-6 border border-blue-500">
            <h3 className="font-bold text-blue-400 mb-2">📞 Need Help?</h3>
            <p className="text-blue-200">
              Contact our support team for assistance
            </p>
            <p className="text-white font-semibold mt-2">+256 772 123 456</p>
            <p className="text-blue-200 text-sm">
              support@kingscollections.com
            </p>
          </div>

          <div className="bg-green-900 bg-opacity-20 rounded-xl p-6 border border-green-500">
            <h3 className="font-bold text-green-400 mb-2">🛡️ Secure Payment</h3>
            <p className="text-green-200">
              Your payment information is secure and encrypted
            </p>
            <p className="text-green-200 text-sm mt-2">
              All transactions are protected
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Payment;
