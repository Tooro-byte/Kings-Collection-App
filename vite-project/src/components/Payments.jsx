import React, { useState, useEffect } from "react";

const Payment = () => {
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("mobile");
  const [orderDetails, setOrderDetails] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [user, setUser] = useState(null);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

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
      const userData = await makeAuthenticatedRequest("/api/users/me");
      if (userData) {
        setUser(userData);
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
    }
  };

  const formatPrice = (price) => {
    return parseFloat(price).toLocaleString("en-UG");
  };

  const validateOrder = () => {
    if (!selectedPaymentMethod) {
      setErrorMessage("Please select a payment method");
      return false;
    }
    if (!paymentConfirmed) {
      setErrorMessage("Please confirm that you have made the payment");
      return false;
    }
    if (cartItems.length === 0) {
      setErrorMessage("Your cart is empty");
      return false;
    }
    setErrorMessage("");
    return true;
  };

  // Super simplified order placement
  const handlePlaceOrder = async () => {
    setErrorMessage("");

    if (!validateOrder()) {
      return;
    }

    try {
      setIsProcessing(true);
      console.log("🚀 Starting order process...");

      // Minimal payload - no address needed
      const orderPayload = {
        paymentMethod: selectedPaymentMethod,
        customerNotes: `Payment completed via ${selectedPaymentMethod}.`,
      };

      console.log("📦 Order payload:", orderPayload);

      // Create order
      const orderResponse = await makeAuthenticatedRequest("/api/orders", {
        method: "POST",
        body: JSON.stringify(orderPayload),
      });

      console.log("✅ Order response:", orderResponse);

      if (orderResponse.success) {
        console.log("🎉 Order created successfully!");

        // Clear cart
        try {
          await makeAuthenticatedRequest("/api/cart/clear", {
            method: "DELETE",
          });
          console.log("🛒 Cart cleared successfully");
        } catch (clearError) {
          console.warn("⚠️ Could not clear cart:", clearError);
        }

        const orderId =
          orderResponse.order?.orderId || orderResponse.orderId || "N/A";

        // Show success message
        alert(
          `🎉 Order Placed Successfully!\n\nOrder ID: ${orderId}\nTotal: UGX ${formatPrice(
            orderDetails?.total || 0
          )}\n\nWe will contact you at ${
            user?.email
          } to arrange delivery. Thank you!`
        );

        // Redirect to orders page
        window.location.href = "/orders";
      } else {
        const errorMsg =
          orderResponse.message || "Order failed. Please try again.";
        setErrorMessage(errorMsg);
        console.error("❌ Order creation failed:", orderResponse);
      }
    } catch (error) {
      console.error("💥 Order placement error:", error);

      let userFriendlyError = "Failed to place order. Please try again.";

      if (error.message.includes("400")) {
        userFriendlyError =
          "Unable to process order. Please check your cart and try again.";
      } else if (error.message.includes("401")) {
        userFriendlyError = "Please log in to continue.";
        setTimeout(() => (window.location.href = "/login"), 2000);
      } else if (error.message.includes("500")) {
        userFriendlyError = "Server error. Please try again in a few moments.";
      } else if (error.message.includes("Network Error")) {
        userFriendlyError =
          "Network connection issue. Please check your internet.";
      }

      setErrorMessage(userFriendlyError);
    } finally {
      setIsProcessing(false);
    }
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
        {/* Error Message Display */}
        {errorMessage && (
          <div className="mb-6 p-4 bg-red-600 bg-opacity-20 border border-red-500 rounded-lg">
            <div className="flex items-center">
              <span className="text-red-400 mr-2">⚠️</span>
              <p className="text-red-200 text-sm">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="bg-teal-800 bg-opacity-80 backdrop-blur-lg rounded-xl p-6 border border-gold-500 mb-8">
          <h1 className="text-4xl font-bold text-gold-500 mb-2 text-center">
            Complete Your Order
          </h1>
          <p className="text-gray-400 text-center">
            Select payment method and confirm your order
          </p>
          {cartItems.length > 0 && user && (
            <div className="text-center mt-4">
              <p className="text-gold-300">
                Ordering as:{" "}
                <span className="text-white font-semibold">{user.name}</span>
              </p>
              <p className="text-gray-400 text-sm mt-1">
                We will contact you at {user.email} to arrange delivery
              </p>
            </div>
          )}
        </div>

        {cartItems.length === 0 ? (
          <div className="bg-gray-800 bg-opacity-80 backdrop-blur-lg rounded-2xl p-12 text-center border border-gold-500">
            <div className="text-6xl mb-4">🛒</div>
            <h2 className="text-2xl font-bold text-white mb-4">
              Your cart is empty
            </h2>
            <p className="text-gray-400 mb-6">
              Add some products to your cart to proceed with payment
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
          <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Payment Methods (Same as before) */}
              <div className="bg-gradient-to-br from-blue-900 via-blue-800 to-purple-900 rounded-2xl p-6 border-2 border-blue-500 shadow-2xl">
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

              <div className="bg-gradient-to-br from-purple-900 via-pink-800 to-red-900 rounded-2xl p-6 border-2 border-purple-500 shadow-2xl">
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
                      <p className="text-yellow-200 text-sm">
                        Kings Collections
                      </p>
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

              <div className="bg-gradient-to-br from-blue-600 via-blue-500 to-cyan-500 rounded-2xl p-6 border-2 border-cyan-400 shadow-2xl">
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

            {/* Order Summary & Confirmation */}
            <div className="mt-12 bg-gray-800 bg-opacity-80 backdrop-blur-lg rounded-2xl p-8 border border-gold-500 max-w-2xl mx-auto">
              <h2 className="text-2xl font-bold text-gold-500 mb-6 text-center">
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

              {/* Delivery Information - SIMPLIFIED */}
              <div className="mb-6 p-4 bg-blue-500 bg-opacity-10 rounded-lg border border-blue-500">
                <h3 className="font-bold text-blue-400 mb-2">
                  🚚 Delivery Info
                </h3>
                <p className="text-blue-200 text-sm">
                  We will contact you at {user?.email} after payment to arrange
                  delivery. No address needed now!
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
                    method. I understand that Kings Collections will contact me
                    via email to arrange delivery.
                  </label>
                </div>

                <button
                  onClick={handlePlaceOrder}
                  disabled={
                    isProcessing ||
                    !selectedPaymentMethod ||
                    !paymentConfirmed ||
                    cartItems.length === 0
                  }
                  className={`w-full py-4 rounded-xl font-bold text-xl transition-all duration-300 flex items-center justify-center space-x-3 ${
                    isProcessing ||
                    !selectedPaymentMethod ||
                    !paymentConfirmed ||
                    cartItems.length === 0
                      ? "bg-gray-600 cursor-not-allowed text-gray-400"
                      : "bg-emerald-600 hover:bg-emerald-500 text-white hover:shadow-2xl hover:shadow-emerald-500/30 hover:-translate-y-1"
                  }`}
                >
                  {isProcessing ? (
                    <>
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                      <span>Placing Order...</span>
                    </>
                  ) : (
                    <>
                      <span>✅</span>
                      <span>Place Order Now</span>
                    </>
                  )}
                </button>

                <div className="text-center text-gray-400 text-sm">
                  <p>
                    You'll receive order confirmation and delivery updates via
                    email
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Support Information */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
          <div className="bg-blue-900 bg-opacity-20 rounded-xl p-6 border border-blue-500">
            <h3 className="font-bold text-blue-400 mb-2">📞 Need Help?</h3>
            <p className="text-blue-200">Contact our support team</p>
            <p className="text-white font-semibold mt-2">+256 772 123 456</p>
            <p className="text-blue-200 text-sm">
              support@kingscollections.com
            </p>
          </div>

          <div className="bg-green-900 bg-opacity-20 rounded-xl p-6 border border-green-500">
            <h3 className="font-bold text-green-400 mb-2">🛡️ Secure Payment</h3>
            <p className="text-green-200">Your payment information is secure</p>
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
