// src/pages/Landing.jsx
import { useState, useEffect, Component } from "react";
import { motion } from "framer-motion";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Stars } from "@react-three/drei";
import * as THREE from "three";
import { ParametricGeometry } from "three/examples/jsm/geometries/ParametricGeometry.js";
import { extend } from "@react-three/fiber";

// Extend ParametricGeometry for use in R3F
extend({ ParametricGeometry });

class ErrorBoundary extends Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="text-center text-red-500 p-4">
          <p>Error rendering 3D background: {this.state.error.message}</p>
          <p>
            Please try refreshing the page or check your browser's WebGL
            support.
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}

const Landing = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const slides = [
    { image: "/Images/t1.jpg" },
    { image: "/Images/t2.jpg" },
    { image: "/Images/t3.jpg" },
    { image: "/Images/cat.jpeg" },
    { image: "/Images/t5.jpg" },
  ];

  const collections = [
    {
      image: "/Images/china.webp",
      location: "Dubai",
      title: "Dubai Collection",
      description: "Luxury fashion hub with exquisite craftsmanship",
      specialty: "Premium Suits & Formal Wear",
    },
    {
      image: "/Images/london.webp",
      location: "London",
      title: "London Collection",
      description: "Traditional British tailoring meets modern style",
      specialty: "Tailored Jackets & Coats",
    },
    {
      image: "/Images/ship.webp",
      location: "China",
      title: "China Collection",
      description: "Innovative designs with quality materials",
      specialty: "Casual Wear & Accessories",
    },
  ];

  useEffect(() => {
    console.log("Current slide:", currentSlide);
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [currentSlide]);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  // Three.js Architectural Scene Component
  const ArchitecturalScene = () => {
    return (
      <>
        <ambientLight intensity={0.4} />
        <pointLight position={[10, 10, 10]} intensity={0.8} />
        <mesh rotation={[0, 0.5, 0]}>
          <parametricGeometry
            args={[
              (u, v, target) => {
                const x =
                  Math.sin(u * Math.PI * 2) * (2 + Math.cos(v * Math.PI * 2));
                const y =
                  Math.cos(u * Math.PI * 2) * (2 + Math.cos(v * Math.PI * 2));
                const z = v * 3;
                target.set(x * 1.5, y * 1.5, z);
              },
              16,
              16,
            ]}
          />
          <meshStandardMaterial
            color="#FFD700"
            metalness={0.7}
            roughness={0.3}
            transparent
            opacity={0.4}
            side={THREE.DoubleSide}
          />
        </mesh>
        <Stars
          radius={80}
          depth={40}
          count={1000}
          factor={3}
          saturation={0}
          fade
        />
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          autoRotate
          autoRotateSpeed={0.3}
        />
      </>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Three.js Background */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <ErrorBoundary>
          <Canvas camera={{ position: [0, 0, 8], fov: 60 }}>
            <ArchitecturalScene />
          </Canvas>
        </ErrorBoundary>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.3 }}
          transition={{ duration: 2 }}
          className="absolute inset-0 bg-gradient-to-br from-gray-900/50 to-blue-900/50"
        />
      </div>

      {/* Professional Navbar */}
      <nav className="bg-gray-900/95 backdrop-blur-xl shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              className="flex items-center space-x-3"
            >
              <img
                src="/Images/logo1.png"
                alt="Kings Collections Logo"
                className="h-14 rounded-lg"
              />
              <span className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600">
                Kings Collections
              </span>
            </motion.div>
            <div className="hidden md:flex items-center space-x-8">
              {["home", "collections", "about", "reviews"].map(
                (item, index) => (
                  <motion.a
                    key={item}
                    href={`#${item}`}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    className="text-gray-200 hover:text-yellow-400 font-semibold transition-colors duration-300 relative group"
                  >
                    {item.charAt(0).toUpperCase() + item.slice(1)}
                    <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-yellow-400 transition-all duration-300 group-hover:w-full"></span>
                  </motion.a>
                )
              )}
              <motion.a
                href="/login"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="border-2 border-yellow-400 text-yellow-400 px-6 py-2 rounded-lg font-semibold hover:bg-yellow-400 hover:text-gray-900 transition-all duration-300"
              >
                Login
              </motion.a>
              <motion.a
                href="/signup"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.5 }}
                className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-gray-900 px-6 py-2 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
              >
                Sign Up
              </motion.a>
            </div>
            <motion.button
              className="md:hidden p-2"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              whileTap={{ scale: 0.9 }}
            >
              <div
                className={`w-6 h-0.5 bg-yellow-400 transition-all duration-300 ${
                  isMobileMenuOpen ? "rotate-45 translate-y-1.5" : ""
                }`}
              ></div>
              <div
                className={`w-6 h-0.5 bg-yellow-400 my-1.5 transition-all duration-300 ${
                  isMobileMenuOpen ? "opacity-0" : ""
                }`}
              ></div>
              <div
                className={`w-6 h-0.5 bg-yellow-400 transition-all duration-300 ${
                  isMobileMenuOpen ? "-rotate-45 -translate-y-1.5" : ""
                }`}
              ></div>
            </motion.button>
          </div>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="md:hidden bg-gray-900/95 backdrop-blur-xl border-t border-yellow-400/20 py-4 space-y-4"
            >
              {["home", "collections", "about", "reviews"].map((item) => (
                <a
                  key={item}
                  href={`#${item}`}
                  className="block text-gray-200 hover:text-yellow-400 font-semibold transition-colors duration-300 px-4"
                >
                  {item.charAt(0).toUpperCase() + item.slice(1)}
                </a>
              ))}
              <a
                href="/login"
                className="block border-2 border-yellow-400 text-yellow-400 px-4 py-2 rounded-lg font-semibold text-center hover:bg-yellow-400 hover:text-gray-900 transition-all duration-300 mx-4"
              >
                Login
              </a>
              <a
                href="/signup"
                className="block bg-gradient-to-r from-yellow-400 to-yellow-600 text-gray-900 px-4 py-2 rounded-lg font-semibold text-center shadow-lg hover:shadow-xl transition-all duration-300 mx-4"
              >
                Sign Up
              </a>
            </motion.div>
          )}
        </div>
      </nav>

      {/* Enhanced Hero Section (Carousel) */}
      <section
        id="home"
        className="relative h-[70vh] md:h-[80vh] rounded-b-3xl overflow-hidden mb-12"
      >
        {slides.map((slide, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: 100 }}
            animate={{
              opacity: index === currentSlide ? 1 : 0,
              x: index === currentSlide ? 0 : 100,
            }}
            transition={{ duration: 1, ease: "easeInOut" }}
            className="absolute inset-0"
          >
            <motion.img
              src={slide.image}
              alt={`Slide ${index + 1}`}
              className="w-full h-full object-cover"
              initial={{ scale: 1.2 }}
              animate={{ scale: 1 }}
              transition={{
                duration: 10,
                ease: "easeOut",
                repeat: Infinity,
                repeatType: "reverse",
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-gray-900/70 to-blue-900/50"></div>
          </motion.div>
        ))}
        <div className="absolute top-1/2 left-4 right-4 transform -translate-y-1/2 flex justify-between z-10">
          <motion.button
            onClick={prevSlide}
            className="bg-white/20 border-2 border-white/40 text-white w-12 h-12 rounded-full backdrop-blur-xl hover:bg-yellow-400/30 hover:border-yellow-400/50 transition-all duration-300"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <svg
              className="w-6 h-6 mx-auto"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <polyline points="15,18 9,12 15,6"></polyline>
            </svg>
          </motion.button>
          <motion.button
            onClick={nextSlide}
            className="bg-white/20 border-2 border-white/40 text-white w-12 h-12 rounded-full backdrop-blur-xl hover:bg-yellow-400/30 hover:border-yellow-400/50 transition-all duration-300"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <svg
              className="w-6 h-6 mx-auto"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <polyline points="9,18 15,12 9,6"></polyline>
            </svg>
          </motion.button>
        </div>
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex space-x-3 z-10">
          {slides.map((_, index) => (
            <motion.button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`w-4 h-4 rounded-full transition-all duration-300 ${
                index === currentSlide
                  ? "bg-yellow-400 border-2 border-white/50 scale-125"
                  : "bg-white/40 border-2 border-transparent"
              }`}
              whileHover={{ scale: 1.2 }}
            ></motion.button>
          ))}
        </div>
      </section>

      {/* Video Section */}
      <motion.section
        id="video"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.2, ease: "easeOut" }}
        className="py-16 bg-white/80 backdrop-blur-lg rounded-3xl mx-4 md:mx-8 lg:mx-16 mb-12 shadow-2xl overflow-hidden relative"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/60 to-purple-50/60 opacity-50"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Experience Our Craft
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              A glimpse into the artistry of Kings Collections
            </p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.5 }}
            className="w-full max-w-4xl aspect-video rounded-2xl overflow-hidden shadow-xl mx-auto"
          >
            <iframe
              width="100%"
              height="100%"
              src="https://www.youtube.com/embed/lArRnoMhX9I"
              title="Louis Vuitton Men's Spring-Summer 2026 Show"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            ></iframe>
          </motion.div>
        </div>
      </motion.section>

      {/* Collections Section */}
      <section id="collections" className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Global Collections
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Discover premium men's fashion from the world's fashion capitals
            </p>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {collections.map((collection, index) => (
              <motion.div
                key={index}
                className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 overflow-hidden group"
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: index * 0.2 }}
              >
                <div className="relative h-64 overflow-hidden">
                  <img
                    src={collection.image}
                    alt={collection.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm px-4 py-2 rounded-full flex items-center space-x-2 text-sm font-semibold text-gray-900">
                    <svg
                      className="w-4 h-4 text-yellow-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                    <span>{collection.location}</span>
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">
                    {collection.title}
                  </h3>
                  <p className="text-gray-600 mb-4 leading-relaxed">
                    {collection.description}
                  </p>
                  <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl p-4 mb-6">
                    <p className="text-sm">
                      <strong className="text-gray-900">Specialty: </strong>
                      <span className="text-gray-700">
                        {collection.specialty}
                      </span>
                    </p>
                  </div>
                  <motion.button
                    className="w-full bg-gradient-to-r from-gray-900 to-blue-900 text-white py-4 rounded-xl font-bold text-lg hover:shadow-xl transition-all duration-300"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Explore Collection
                  </motion.button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Refined Footer */}
      <footer className="bg-gray-800 text-gray-200 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <motion.div
              className="md:col-span-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <div className="flex items-center space-x-3 mb-6">
                <img
                  src="/Images/logo1.png"
                  alt="Kings Collections Logo"
                  className="h-12 rounded-lg"
                />
                <span className="text-2xl font-bold text-yellow-400">
                  Kings Collections
                </span>
              </div>
              <p className="text-gray-400 leading-relaxed mb-6 max-w-md">
                Premium men's fashion from around the world. Quality, style, and
                authenticity in every piece.
              </p>
              <div className="flex space-x-4">
                {["f", "t", "in"].map((social, index) => (
                  <motion.a
                    key={index}
                    href="#"
                    className="w-12 h-12 bg-gray-700/50 border-2 border-gray-600/50 rounded-xl flex items-center justify-center text-gray-200 font-bold hover:bg-yellow-400 hover:text-gray-900 hover:border-yellow-400 transition-all duration-300"
                    whileHover={{ scale: 1.1 }}
                  >
                    {social}
                  </motion.a>
                ))}
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              <h3 className="text-lg font-bold text-yellow-400 mb-4">
                Quick Links
              </h3>
              <ul className="space-y-3">
                {["Home", "Collections", "About Us", "Reviews"].map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="text-gray-400 hover:text-yellow-400 transition-colors duration-300"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              <h3 className="text-lg font-bold text-yellow-400 mb-4">
                Support
              </h3>
              <ul className="space-y-3">
                {["Contact Us", "Size Guide", "Shipping Info", "Returns"].map(
                  (link) => (
                    <li key={link}>
                      <a
                        href="#"
                        className="text-gray-400 hover:text-yellow-400 transition-colors duration-300"
                      >
                        {link}
                      </a>
                    </li>
                  )
                )}
              </ul>
            </motion.div>
          </div>
          <motion.div
            className="border-t border-gray-700 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
          >
            <p className="text-gray-400">
              © 2025 Kings Collections. All rights reserved.
            </p>
            <div className="flex space-x-6">
              {["Privacy Policy", "Terms of Service", "Cookie Policy"].map(
                (link) => (
                  <a
                    key={link}
                    href="#"
                    className="text-gray-400 hover:text-yellow-400 transition-colors duration-300 text-sm"
                  >
                    {link}
                  </a>
                )
              )}
            </div>
          </motion.div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
