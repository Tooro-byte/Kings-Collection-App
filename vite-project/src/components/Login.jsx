// login.jsx (updated)
import React, { useState, useEffect, Component } from "react";
import { motion } from "framer-motion";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Stars } from "@react-three/drei";
import * as THREE from "three";

class ErrorBoundary extends Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Three.js Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="text-center text-red-500 p-4">
          <p>Error rendering 3D background: {this.state.error.message}</p>
          <p>
            Please try refreshing the page or check your browser's WebGL support
            at{" "}
            <a href="https://get.webgl.org" className="underline">
              get.webgl.org
            </a>
            .
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}

// Create a grid of tiles for the fret/meander pattern
const FretPattern = () => {
  const groupRef = React.useRef();
  const tiles = [];

  // Generate a 10x10 grid of small rectangular tiles
  for (let x = -5; x <= 5; x++) {
    for (let z = -5; z <= 5; z++) {
      tiles.push(
        <mesh
          key={`${x}-${z}`}
          position={[x * 0.8, 0, z * 0.8]}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <boxGeometry args={[0.6, 0.6, 0.05]} />
          <meshStandardMaterial
            color="#FFD700"
            metalness={0.8}
            roughness={0.2}
            transparent
            opacity={0.5}
            side={THREE.DoubleSide}
          />
        </mesh>
      );
    }
  }

  // Subtle pulsing animation for tiles
  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.children.forEach((tile, index) => {
        tile.scale.y = 1 + Math.sin(Date.now() * 0.002 + index * 0.1) * 0.05;
      });
    }
  });

  return <group ref={groupRef}>{tiles}</group>;
};

// Blueprint grid lines
const BlueprintGrid = () => {
  const gridMaterial = new THREE.LineBasicMaterial({
    color: "#4B0082",
    transparent: true,
    opacity: 0.2,
  });

  const points = [];
  const gridSize = 20;
  const step = 1;
  for (let i = -gridSize; i <= gridSize; i += step) {
    points.push(new THREE.Vector3(i, 0, -gridSize));
    points.push(new THREE.Vector3(i, 0, gridSize));
    points.push(new THREE.Vector3(-gridSize, 0, i));
    points.push(new THREE.Vector3(gridSize, 0, i));
  }

  const geometry = new THREE.BufferGeometry().setFromPoints(points);

  return <lineSegments geometry={geometry} material={gridMaterial} />;
};

// Wainscoting plane
const Wainscoting = () => {
  return (
    <mesh position={[0, -2, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <planeGeometry args={[20, 10]} />
      <meshStandardMaterial
        color="#2F4F4F"
        metalness={0.5}
        roughness={0.4}
        transparent
        opacity={0.3}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
};

// Three.js Architectural Scene Component
const ArchitecturalScene = () => {
  return (
    <>
      <ambientLight intensity={0.3} color="#FFFFFF" />
      <pointLight position={[10, 10, 10]} intensity={0.7} color="#FFFFFF" />
      <FretPattern />
      <BlueprintGrid />
      <Wainscoting />
      <Stars
        radius={80}
        depth={40}
        count={500}
        factor={3}
        saturation={0}
        fade
      />
      <OrbitControls
        enableZoom={false}
        enablePan={false}
        autoRotate
        autoRotateSpeed={0.2}
      />
    </>
  );
};

const Login = () => {
  const [activeTab, setActiveTab] = useState("email-tab");
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    remember: false,
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [alert, setAlert] = useState({ show: false, message: "", type: "" });
  const [showPassword, setShowPassword] = useState(false);

  // Backend URL configuration
  const BACKEND_URL =
    import.meta.env.VITE_BACKEND_URL || "http://localhost:3005";
  console.log("BACKEND_URL:", BACKEND_URL);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get("token");
    const error = urlParams.get("error");
    const redirectUrl = urlParams.get("redirectUrl");

    if (token && redirectUrl) {
      localStorage.setItem("authToken", token);
      showAlert("Login successful! Redirecting...", "success");
      setTimeout(() => {
        window.location.href = decodeURIComponent(redirectUrl);
      }, 1500);
    } else if (error) {
      showAlert(getErrorMessage(error), "error");
    }
  }, []);

  const getErrorMessage = (error) => {
    const errorMessages = {
      auth_failed: "Authentication failed. Please try again.",
      invalid_profile: "Invalid profile data from provider.",
      server_error: "Server error during authentication.",
      database_error: "Database error. Please try again later.",
    };
    return errorMessages[error] || "Authentication failed.";
  };

  const showAlert = (message, type) => {
    setAlert({ show: true, message, type });
    setTimeout(() => {
      setAlert({ show: false, message: "", type: "" });
    }, 5000);
  };

  const closeAlert = () => {
    setAlert({ show: false, message: "", type: "" });
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setErrors({});
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Email is invalid";
    }
    if (!formData.password) {
      newErrors.password = "Password is required";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/users/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: formData.email.trim().toLowerCase(),
          password: formData.password,
        }),
      });
      const result = await response.json();
      if (response.ok) {
        localStorage.setItem("authToken", result.token);
        showAlert("Login successful! Redirecting...", "success");
        setTimeout(() => {
          window.location.href = result.redirectUrl || "/dashboard";
        }, 1500);
      } else {
        setErrors({ email: result.message || "Invalid email or password" });
      }
    } catch (error) {
      setErrors({ email: "Network error. Please try again." });
    } finally {
      setIsLoading(false);
    }
  };
  //Update Social Login
  const handleSocialLogin = (provider) => {
    const redirectUrl = encodeURIComponent(`${window.location.origin}`);
    window.location.href = `${BACKEND_URL}/api/auth/${provider}?redirectUrl=${redirectUrl}`;
  };
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-fixed bg-cover bg-center relative">
      {/* Three.js Background */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <ErrorBoundary>
          <Canvas
            camera={{ position: [0, 2, 10], fov: 60 }}
            gl={{ clearColor: "#0A0A1E" }}
          >
            <ArchitecturalScene />
          </Canvas>
        </ErrorBoundary>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 4, repeat: Infinity, repeatType: "reverse" }}
          className="absolute inset-0 bg-gradient-to-br from-emerald-400/50 to-sapphire-600/50"
        />
      </div>

      {/* Overlay for contrast */}
      <div className="fixed inset-0 bg-black bg-opacity-20 z-0"></div>

      <motion.div
        className="bg-white/90 rounded-2xl p-8 max-w-md w-full shadow-2xl backdrop-blur-xl z-10 border border-blue-500/50"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        {/* Header */}
        <motion.div
          className="text-center mb-7"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <h1 className="flex items-center justify-center gap-3 text-2xl font-semibold text-gray-900">
            <img
              src="/Images/sula.jpg"
              alt="Platform Logo"
              className="w-10 h-10 rounded-lg"
            />
            Welcome Back
          </h1>
          <p className="text-gray-600 mt-2">
            Sign in to explore exclusive deals!
          </p>
        </motion.div>

        {/* Alert Messages */}
        {alert.show && (
          <motion.div
            className={`flex items-center gap-2.5 p-3 rounded-xl mb-5 ${
              alert.type === "success"
                ? "bg-green-100 text-green-800 border border-green-300"
                : "bg-red-100 text-red-800 border border-red-300"
            }`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <i
              className={`fas fa-${
                alert.type === "success" ? "check-circle" : "exclamation-circle"
              }`}
            ></i>
            <span className="flex-1 text-sm font-medium">{alert.message}</span>
            <button
              className="p-1 rounded-full hover:bg-black hover:bg-opacity-10 transition-colors"
              onClick={closeAlert}
            >
              <i className="fas fa-times"></i>
            </button>
          </motion.div>
        )}

        {/* Tab Buttons */}
        <motion.div
          className="flex gap-3 mb-6"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <button
            className={`flex-1 py-3 rounded-xl font-medium transition-all ${
              activeTab === "email-tab"
                ? "bg-blue-500 text-white shadow-md"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
            onClick={() => handleTabChange("email-tab")}
          >
            Email Login
          </button>
          <button
            className={`flex-1 py-3 rounded-xl font-medium transition-all ${
              activeTab === "social-tab"
                ? "bg-blue-500 text-white shadow-md"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
            onClick={() => handleTabChange("social-tab")}
          >
            Social Login
          </button>
        </motion.div>

        {/* Email Login Tab */}
        {activeTab === "email-tab" && (
          <motion.div
            className="space-y-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            <form className="space-y-6" onSubmit={handleEmailLogin}>
              <div>
                <label
                  htmlFor="email"
                  className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2"
                >
                  <i className="fas fa-envelope text-gray-500 w-4"></i>
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  placeholder="Enter your email"
                  required
                  autoComplete="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3.5 border-2 rounded-xl transition-all focus:outline-none focus:ring-3 ${
                    errors.email
                      ? "border-red-300 focus:border-red-500 focus:ring-red-100"
                      : "border-gray-200 focus:border-blue-500 focus:ring-blue-100"
                  }`}
                />
                {errors.email && (
                  <div className="text-red-600 text-sm mt-2">
                    {errors.email}
                  </div>
                )}
              </div>
              <div>
                <label
                  htmlFor="password"
                  className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2"
                >
                  <i className="fas fa-lock text-gray-500 w-4"></i>
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    name="password"
                    placeholder="Enter your password"
                    required
                    autoComplete="current-password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3.5 border-2 rounded-xl transition-all focus:outline-none focus:ring-3 pr-12 ${
                      errors.password
                        ? "border-red-300 focus:border-red-500 focus:ring-red-100"
                        : "border-gray-200 focus:border-blue-500 focus:ring-blue-100"
                    }`}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 p-2 transition-colors"
                    onClick={togglePasswordVisibility}
                  >
                    <i
                      className={`fas ${
                        showPassword ? "fa-eye-slash" : "fa-eye"
                      }`}
                    ></i>
                  </button>
                </div>
                {errors.password && (
                  <div className="text-red-600 text-sm mt-2">
                    {errors.password}
                  </div>
                )}
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="remember"
                    name="remember"
                    checked={formData.remember}
                    onChange={handleInputChange}
                    className="w-4 h-4 text-blue-500 rounded focus:ring-blue-400"
                  />
                  <label
                    htmlFor="remember"
                    className="text-sm text-gray-600 cursor-pointer"
                  >
                    Keep me signed in
                  </label>
                </div>
                <a
                  href="/forgot-password"
                  className="text-blue-500 text-sm font-medium hover:text-blue-600 hover:underline transition-colors"
                >
                  Forgot Password?
                </a>
              </div>
              <motion.button
                type="submit"
                disabled={isLoading}
                className={`w-full py-3.5 px-4 bg-blue-500 text-white rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${
                  isLoading
                    ? "opacity-60 cursor-not-allowed"
                    : "hover:bg-blue-600 hover:shadow-lg hover:-translate-y-0.5"
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {isLoading ? (
                  <>
                    <i className="fas fa-spinner animate-spin"></i>
                    Signing In...
                  </>
                ) : (
                  <>
                    <i className="fas fa-sign-in-alt"></i>
                    Sign In
                  </>
                )}
              </motion.button>
            </form>
          </motion.div>
        )}

        {/* Social Login Tab */}
        {activeTab === "social-tab" && (
          <motion.div
            className="text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            <p className="text-gray-600 text-sm mb-5">
              Sign in with your social account
            </p>
            <div className="space-y-3">
              <motion.button
                onClick={() => handleSocialLogin("google")}
                className="w-full max-w-xs mx-auto py-3.5 px-4 border-2 border-red-500 text-red-500 rounded-xl font-medium transition-all flex items-center justify-center gap-3 hover:bg-red-500 hover:text-white hover:shadow-md"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <i className="fab fa-google"></i>
                Sign in with Google
              </motion.button>
              <motion.button
                onClick={() => handleSocialLogin("facebook")}
                className="w-full max-w-xs mx-auto py-3.5 px-4 border-2 border-blue-600 text-blue-600 rounded-xl font-medium transition-all flex items-center justify-center gap-3 hover:bg-blue-600 hover:text-white hover:shadow-md"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <i className="fab fa-facebook-f"></i>
                Sign in with Facebook
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* Footer */}
        <motion.div
          className="text-center mt-6 pt-6 border-t border-gray-200"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <p className="text-gray-600 text-sm">
            New to our platform?{" "}
            <a
              href="/signup"
              className="text-blue-500 font-medium hover:text-blue-600 hover:underline transition-colors"
            >
              Create an account
            </a>
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Login;
