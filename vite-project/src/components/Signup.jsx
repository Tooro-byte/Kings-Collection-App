import React, { useState, useEffect, Component } from "react";
import { motion } from "framer-motion";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import "./Signup.css";

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

const StarField = () => {
  const starsRef = React.useRef();
  const numStars = 500;
  const positions = new Float32Array(numStars * 3);
  const opacities = new Float32Array(numStars);

  for (let i = 0; i < numStars; i++) {
    const theta = Math.random() * 2 * Math.PI;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = 50 * Math.cbrt(Math.random());
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);
    opacities[i] = 0.5 + Math.random() * 0.5;
  }

  useFrame(({ clock }) => {
    if (starsRef.current) {
      const attributes = starsRef.current.geometry.attributes;
      for (let i = 0; i < numStars; i++) {
        attributes.opacity.array[i] =
          0.5 + 0.5 * Math.sin(clock.getElapsedTime() * 2 + i);
      }
      attributes.opacity.needsUpdate = true;
    }
  });

  return (
    <points ref={starsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          array={positions}
          itemSize={3}
          count={numStars}
        />
        <bufferAttribute
          attach="attributes-opacity"
          array={opacities}
          itemSize={1}
          count={numStars}
        />
      </bufferGeometry>
      <pointsMaterial
        color="#FFFFFF"
        size={0.05}
        transparent
        opacity={1.0}
        vertexColors={false}
        depthWrite={false}
      />
    </points>
  );
};

const ArchitecturalScene = () => {
  const spiralMaterial = new THREE.LineBasicMaterial({
    color: "#00FFFF",
    transparent: true,
    opacity: 0.7,
    blending: THREE.AdditiveBlending,
  });

  const electricityMaterial = new THREE.MeshBasicMaterial({
    color: "#F5F5F5",
    transparent: false,
    blending: THREE.NormalBlending,
  });

  const lightningGroup = React.useRef();
  const particlesRef = React.useRef();

  const spiralPoints = [];
  const a = 0.3;
  const b = 0.2;
  const maxTheta = 8 * Math.PI;
  for (let theta = 0; theta <= maxTheta; theta += 0.1) {
    const r = a * Math.exp(b * theta);
    spiralPoints.push(
      new THREE.Vector3(r * Math.cos(theta), r * Math.sin(theta), 0)
    );
  }
  const spiralGeometry = new THREE.BufferGeometry().setFromPoints(spiralPoints);

  const spiralPoints2 = [];
  for (let theta = 0; theta <= maxTheta; theta += 0.1) {
    const r = a * Math.exp(b * (maxTheta - theta));
    spiralPoints2.push(
      new THREE.Vector3(
        r * Math.cos(theta + Math.PI),
        r * Math.sin(theta + Math.PI),
        0
      )
    );
  }
  const spiralGeometry2 = new THREE.BufferGeometry().setFromPoints(
    spiralPoints2
  );

  const particles = [];
  const numParticles = 10;
  for (let i = 0; i < numParticles; i++) {
    particles.push({
      theta: (i / numParticles) * maxTheta,
      direction: 0.04,
      isFirstSpiral: true,
    });
    particles.push({
      theta: (1 - i / numParticles) * maxTheta,
      direction: -0.04,
      isFirstSpiral: false,
    });
  }

  useFrame(({ clock }) => {
    if (particlesRef.current) {
      particlesRef.current.children.forEach((particle, index) => {
        const data = particles[index];
        data.theta += data.direction;
        if (data.theta > maxTheta) data.theta = 0;
        if (data.theta < 0) data.theta = maxTheta;
        const r = a * Math.exp(b * data.theta);
        const offset = Math.sin(clock.getElapsedTime() * 3 + index) * 0.1;
        if (data.isFirstSpiral) {
          particle.position.set(
            r * Math.cos(data.theta),
            r * Math.sin(data.theta) + offset,
            0.3
          );
        } else {
          const r2 = a * Math.exp(b * (maxTheta - data.theta));
          particle.position.set(
            r2 * Math.cos(data.theta + Math.PI),
            r2 * Math.sin(data.theta + Math.PI) + offset,
            0.3
          );
        }
      });
    }
    if (lightningGroup.current) {
      lightningGroup.current.children.forEach((light) => {
        light.intensity = Math.random() > 0.93 ? Math.random() * 6 + 3 : 0;
      });
    }
  });

  return (
    <>
      <ambientLight intensity={0.3} color="#00FFFF" />
      <StarField />
      <line geometry={spiralGeometry} material={spiralMaterial} />
      <line geometry={spiralGeometry2} material={spiralMaterial} />
      <group ref={particlesRef}>
        {particles.map((particle, i) => (
          <mesh key={i} position={[0, 0, 0.3]}>
            <sphereGeometry args={[0.15, 16, 16]} />
            <meshBasicMaterial {...electricityMaterial} />
          </mesh>
        ))}
      </group>
      <group ref={lightningGroup}>
        {[...Array(6)].map((_, i) => (
          <pointLight
            key={i}
            position={[Math.random() * 12 - 6, Math.random() * 12 - 6, 0]}
            color="#FFFFFF"
            intensity={0}
            decay={2}
          />
        ))}
      </group>
      <OrbitControls
        enableZoom={false}
        enablePan={false}
        autoRotate
        autoRotateSpeed={0.3}
      />
    </>
  );
};

// ONLY ONE Signup component declaration
const SignupComponent = () => {
  const [activeTab, setActiveTab] = useState("email-tab");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "",
    mailingAddress: "",
    terms: false,
    newsletter: false,
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [alert, setAlert] = useState({ show: false, message: "", type: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({
    strength: 0,
    text: "",
    width: "0%",
  });

  const BACKEND_URL =
    import.meta.env.VITE_BACKEND_URL || "http://localhost:3005";

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const error = urlParams.get("error");
    const message = urlParams.get("message");

    if (error) {
      const errorMessage = message
        ? decodeURIComponent(message)
        : getErrorMessage(error);
      showAlert(errorMessage, "error");
      setTimeout(() => {
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname
        );
      }, 100);
    }
  }, []);

  const getErrorMessage = (error) => {
    const errorMessages = {
      facebook_access_denied:
        "Facebook access was denied. Please try again and grant necessary permissions.",
      facebook_auth_failed:
        "Facebook authentication failed. Please check your internet connection and try again.",
      facebook_server_error:
        "Facebook server error. Please try again in a few minutes.",
      auth_failed: "Social authentication failed. Please try again.",
      invalid_profile: "Invalid profile data received from social provider.",
      server_error: "Server error during authentication. Please try again.",
      database_error: "Database error occurred. Please try again.",
      network_error: "Network error: Please check your internet and try again.",
    };
    return (
      errorMessages[error] ||
      (error.startsWith("facebook_")
        ? "Facebook authentication error. Please try again."
        : "An unknown error occurred during authentication.")
    );
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
    const newValue = type === "checkbox" ? checked : value;

    setFormData((prev) => ({
      ...prev,
      [name]: newValue,
    }));

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }

    if (name === "password") {
      checkPasswordStrength(newValue);
    }

    if (name === "password" || name === "confirmPassword") {
      validateConfirmPassword(name, newValue);
    }
  };

  const validateConfirmPassword = (changedField, newValue) => {
    const { password, confirmPassword } = formData;

    let currentPassword = password;
    let currentConfirmPassword = confirmPassword;

    if (changedField === "password") {
      currentPassword = newValue;
    } else if (changedField === "confirmPassword") {
      currentConfirmPassword = newValue;
    }

    if (currentPassword && currentConfirmPassword) {
      if (currentPassword !== currentConfirmPassword) {
        setErrors((prev) => ({
          ...prev,
          confirmPassword: "Passwords do not match",
        }));
      } else {
        setErrors((prev) => ({ ...prev, confirmPassword: "" }));
      }
    } else if (changedField === "confirmPassword" && !currentConfirmPassword) {
      setErrors((prev) => ({ ...prev, confirmPassword: "" }));
    }
  };

  const checkPasswordStrength = (password) => {
    let strength = 0;
    if (password.length >= 8) strength += 1;
    if (password.length >= 12) strength += 1;
    if (/[a-z]/.test(password)) strength += 1;
    if (/[A-Z]/.test(password)) strength += 1;
    if (/[0-9]/.test(password)) strength += 1;
    if (/[^A-Za-z0-9]/.test(password)) strength += 1;

    const percentage = (strength / 6) * 100;
    let text = "";
    let color = "";

    if (strength <= 2) {
      text = "Weak";
      color = "bg-red-500";
    } else if (strength <= 4) {
      text = "Medium";
      color = "bg-yellow-500";
    } else {
      text = "Strong";
      color = "bg-green-500";
    }

    setPasswordStrength({
      strength,
      text,
      width: `${percentage}%`,
      color,
    });
  };

  const handleSocialLogin = async (provider) => {
    try {
      window.location.href = `${BACKEND_URL}/api/auth/${provider}?redirectUrl=${encodeURIComponent(
        window.location.origin + "/signup"
      )}`;
    } catch (error) {
      console.error(`${provider} auth error:`, error);
      showAlert(`Failed to connect to ${provider}. Please try again.`, "error");
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim() || formData.name.trim().length < 2) {
      newErrors.name = "Name must be at least 2 characters";
    }

    if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Invalid email address";
    }

    if (!formData.password || formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    if (!formData.role) {
      newErrors.role = "Please select a role";
    }

    if (!formData.terms) {
      newErrors.terms = "You must agree to the terms";
    }

    if (formData.role === "client" && !formData.mailingAddress.trim()) {
      newErrors.mailingAddress = "Mailing address is required for clients";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleEmailSignup = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/users/signup/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(formData),
      });
      const result = await response.json();
      if (response.ok) {
        showAlert("Account created successfully! Redirecting...", "success");
        setTimeout(() => {
          window.location.href = result.redirectUrl || "/client";
        }, 1500);
      } else {
        handleSignupError(result);
      }
    } catch (error) {
      console.error("Signup error:", error);
      showAlert("Network error. Please try again.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignupError = (result) => {
    const message = result.message || "Signup failed. Please try again.";
    if (message.includes("already exists")) {
      setErrors((prev) => ({
        ...prev,
        email: "This email is already registered",
      }));
    } else if (message.includes("name")) {
      setErrors((prev) => ({ ...prev, name: message }));
    } else if (message.includes("email")) {
      setErrors((prev) => ({ ...prev, email: message }));
    } else if (message.includes("password")) {
      setErrors((prev) => ({ ...prev, password: message }));
    } else if (message.includes("mailing")) {
      setErrors((prev) => ({ ...prev, mailingAddress: message }));
    } else {
      showAlert(message, "error");
    }
  };

  const isMailingAddressRequired = formData.role === "client";

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <ErrorBoundary>
          <Canvas
            camera={{ position: [0, 0, 20], fov: 60 }}
            gl={{ clearColor: "#0A0A1E" }}
          >
            <ArchitecturalScene />
          </Canvas>
        </ErrorBoundary>
      </div>

      {alert.show && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className={`fixed top-5 left-1/2 transform -translate-x-1/2 z-50 flex items-center gap-3 px-6 py-4 rounded-lg shadow-lg max-w-md w-full ${
            alert.type === "success"
              ? "bg-green-100 text-green-800 border border-green-300"
              : "bg-red-100 text-red-800 border border-red-300"
          }`}
        >
          <i
            className={`fas fa-${
              alert.type === "success" ? "check-circle" : "exclamation-triangle"
            }`}
          ></i>
          <span className="flex-1 font-medium">{alert.message}</span>
          <button
            onClick={closeAlert}
            className="text-xl hover:opacity-70 transition-opacity"
          >
            ×
          </button>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
        className="bg-white/90 rounded-2xl p-8 max-w-md w-full shadow-2xl backdrop-blur-xl z-10 border border-cyan-500/50"
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-center mb-8"
        >
          <h1 className="flex items-center justify-center gap-3 text-2xl font-bold text-gray-900">
            <i className="fas fa-user-plus text-cyan-500"></i>
            KINGS COLLECTION
          </h1>
          <p className="text-gray-600 mt-2">
            Join us by signing up with your preferred method
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex gap-3 mb-6"
        >
          <button
            className={`flex-1 py-3 rounded-xl font-medium transition-all ${
              activeTab === "email-tab"
                ? "bg-cyan-500 text-white shadow-md"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
            onClick={() => handleTabChange("email-tab")}
          >
            Email & Password
          </button>
          <button
            className={`flex-1 py-3 rounded-xl font-medium transition-all ${
              activeTab === "social-tab"
                ? "bg-cyan-500 text-white shadow-md"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
            onClick={() => handleTabChange("social-tab")}
          >
            Social Signup
          </button>
        </motion.div>

        {activeTab === "email-tab" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="space-y-5"
          >
            <form className="space-y-5" onSubmit={handleEmailSignup}>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
              >
                <label
                  htmlFor="name"
                  className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2"
                >
                  <i className="fas fa-user text-gray-500 w-4"></i>
                  Full Name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  placeholder="Enter your full name"
                  required
                  autoComplete="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3.5 border-2 rounded-xl transition-all focus:outline-none focus:ring-3 ${
                    errors.name
                      ? "border-red-300 focus:border-red-500 focus:ring-red-100"
                      : "border-gray-200 focus:border-cyan-500 focus:ring-cyan-100"
                  }`}
                />
                {errors.name && (
                  <div className="text-red-600 text-sm mt-2">{errors.name}</div>
                )}
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2 }}
              >
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
                  placeholder="Enter your email address"
                  required
                  autoComplete="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3.5 border-2 rounded-xl transition-all focus:outline-none focus:ring-3 ${
                    errors.email
                      ? "border-red-300 focus:border-red-500 focus:ring-red-100"
                      : "border-gray-200 focus:border-cyan-500 focus:ring-cyan-100"
                  }`}
                />
                {errors.email && (
                  <div className="text-red-600 text-sm mt-2">
                    {errors.email}
                  </div>
                )}
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.3 }}
              >
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
                    placeholder="Create a password"
                    required
                    autoComplete="new-password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3.5 border-2 rounded-xl transition-all focus:outline-none focus:ring-3 pr-12 ${
                      errors.password
                        ? "border-red-300 focus:border-red-500 focus:ring-red-100"
                        : "border-gray-200 focus:border-cyan-500 focus:ring-cyan-100"
                    }`}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 p-2 transition-colors"
                    onClick={() => setShowPassword(!showPassword)}
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
                {formData.password && (
                  <div className="mt-3">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${passwordStrength.color}`}
                          style={{ width: passwordStrength.width }}
                        ></div>
                      </div>
                      <span
                        className={`text-sm font-medium ${
                          passwordStrength.strength <= 2
                            ? "text-red-600"
                            : passwordStrength.strength <= 4
                            ? "text-yellow-600"
                            : "text-green-600"
                        }`}
                      >
                        {passwordStrength.text}
                      </span>
                    </div>
                  </div>
                )}
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.4 }}
              >
                <label
                  htmlFor="confirmPassword"
                  className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2"
                >
                  <i className="fas fa-lock text-gray-500 w-4"></i>
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    id="confirmPassword"
                    name="confirmPassword"
                    placeholder="Confirm your password"
                    required
                    autoComplete="new-password"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3.5 border-2 rounded-xl transition-all focus:outline-none focus:ring-3 pr-12 ${
                      errors.confirmPassword
                        ? "border-red-300 focus:border-red-500 focus:ring-red-100"
                        : "border-gray-200 focus:border-cyan-500 focus:ring-cyan-100"
                    }`}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 p-2 transition-colors"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    <i
                      className={`fas ${
                        showConfirmPassword ? "fa-eye-slash" : "fa-eye"
                      }`}
                    ></i>
                  </button>
                </div>
                {errors.confirmPassword && (
                  <div className="text-red-600 text-sm mt-2">
                    {errors.confirmPassword}
                  </div>
                )}
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.5 }}
              >
                <label
                  htmlFor="role"
                  className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2"
                >
                  <i className="fas fa-briefcase text-gray-500 w-4"></i>
                  Role
                </label>
                <select
                  id="role"
                  name="role"
                  required
                  value={formData.role}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3.5 border-2 rounded-xl transition-all focus:outline-none focus:ring-3 appearance-none bg-white ${
                    errors.role
                      ? "border-red-300 focus:border-red-500 focus:ring-red-100"
                      : "border-gray-200 focus:border-cyan-500 focus:ring-cyan-100"
                  }`}
                >
                  <option value="" disabled>
                    Select your role
                  </option>
                  <option value="client">Client</option>
                  <option value="admin">Admin</option>
                  <option value="salesAgent">Sales Agent</option>
                </select>
                {errors.role && (
                  <div className="text-red-600 text-sm mt-2">{errors.role}</div>
                )}
              </motion.div>

              {isMailingAddressRequired && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.6 }}
                >
                  <label
                    htmlFor="mailingAddress"
                    className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2"
                  >
                    <i className="fas fa-map-marker-alt text-gray-500 w-4"></i>
                    Mailing Address
                  </label>
                  <textarea
                    id="mailingAddress"
                    name="mailingAddress"
                    placeholder="Enter your mailing address"
                    value={formData.mailingAddress}
                    onChange={handleInputChange}
                    rows="3"
                    className={`w-full px-4 py-3.5 border-2 rounded-xl transition-all focus:outline-none focus:ring-3 resize-vertical ${
                      errors.mailingAddress
                        ? "border-red-300 focus:border-red-500 focus:ring-red-100"
                        : "border-gray-200 focus:border-cyan-500 focus:ring-cyan-100"
                    }`}
                  />
                  {errors.mailingAddress && (
                    <div className="text-red-600 text-sm mt-2">
                      {errors.mailingAddress}
                    </div>
                  )}
                </motion.div>
              )}

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.7 }}
                className="space-y-4"
              >
                <div
                  className={`flex items-start gap-3 ${
                    errors.terms ? "text-red-600" : ""
                  }`}
                >
                  <input
                    type="checkbox"
                    id="terms"
                    name="terms"
                    required
                    checked={formData.terms}
                    onChange={handleInputChange}
                    className="w-4 h-4 text-cyan-500 rounded focus:ring-cyan-400 mt-1"
                  />
                  <label
                    htmlFor="terms"
                    className="text-sm text-gray-600 cursor-pointer leading-relaxed"
                  >
                    I agree to the{" "}
                    <a
                      href="/terms"
                      className="text-cyan-500 font-medium hover:underline"
                    >
                      Terms of Service
                    </a>{" "}
                    and{" "}
                    <a
                      href="/privacy"
                      className="text-cyan-500 font-medium hover:underline"
                    >
                      Privacy Policy
                    </a>
                  </label>
                </div>
                {errors.terms && (
                  <div className="text-red-600 text-sm">{errors.terms}</div>
                )}
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="newsletter"
                    name="newsletter"
                    checked={formData.newsletter}
                    onChange={handleInputChange}
                    className="w-4 h-4 text-cyan-500 rounded focus:ring-cyan-400 mt-1"
                  />
                  <label
                    htmlFor="newsletter"
                    className="text-sm text-gray-600 cursor-pointer"
                  >
                    Subscribe to our newsletter
                  </label>
                </div>
              </motion.div>

              <motion.button
                type="submit"
                disabled={isLoading}
                className={`w-full py-3.5 px-4 bg-cyan-500 text-white rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${
                  isLoading
                    ? "opacity-60 cursor-not-allowed"
                    : "hover:shadow-lg hover:-translate-y-0.5"
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {isLoading ? (
                  <>
                    <i className="fas fa-spinner animate-spin"></i>
                    Creating Account...
                  </>
                ) : (
                  <>
                    <i className="fas fa-user-plus"></i>
                    Sign Up
                  </>
                )}
              </motion.button>
            </form>
          </motion.div>
        )}

        {activeTab === "social-tab" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="space-y-4"
          >
            <motion.button
              onClick={() => handleSocialLogin("google")}
              className="w-full py-3.5 px-4 border-2 border-red-500 text-red-500 rounded-xl font-medium transition-all flex items-center justify-center gap-3 hover:bg-red-500 hover:text-white hover:shadow-md"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <i className="fab fa-google"></i>
              Continue with Google
            </motion.button>
            <motion.button
              onClick={() => handleSocialLogin("facebook")}
              className="w-full py-3.5 px-4 border-2 border-blue-600 text-blue-600 rounded-xl font-medium transition-all flex items-center justify-center gap-3 hover:bg-blue-600 hover:text-white hover:shadow-md"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <i className="fab fa-facebook-f"></i>
              Continue with Facebook
            </motion.button>
          </motion.div>
        )}

        <motion.div
          className="text-center mt-6 pt-6 border-t border-gray-200"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.8 }}
        >
          <p className="text-gray-600 text-sm">
            Already have an account?{" "}
            <a
              href="/login"
              className="text-cyan-500 font-medium hover:text-cyan-600 hover:underline transition-colors"
            >
              Log in here
            </a>
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
};

// ONLY ONE export statement
export default SignupComponent;
