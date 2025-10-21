exports.ensureAuthenticated = (req, res, next) => {
  console.log("ensureAuthenticated: isAuthenticated:", req.isAuthenticated());
  console.log("ensureAuthenticated: User ID:", req.user?.id);

  if (req.isAuthenticated() && req.user) {
    return next();
  }

  console.log("ensureAuthenticated: Authentication failed");

  // For API routes, return JSON instead of redirect
  if (req.path.startsWith("/api/")) {
    return res.status(401).json({ message: "Unauthorized. Please log in." });
  }

  // For view routes, redirect to login
  res.redirect("/login");
};

/**
 * Ensure user is a Client
 */
exports.ensureClient = (req, res, next) => {
  if (req.isAuthenticated() && req.user && req.user.role === "client") {
    return next();
  }

  // For API routes, return JSON instead of redirect
  if (req.path.startsWith("/api/")) {
    return res
      .status(403)
      .json({ message: "Access denied. Client privileges required." });
  }

  // For view routes, redirect to home
  res.redirect("/");
};

/**
 * Ensure user is a Sales Agent
 */
exports.ensureSalesAgent = (req, res, next) => {
  if (req.isAuthenticated() && req.user && req.user.role === "salesAgent") {
    return next();
  }

  // For API routes, return JSON instead of redirect
  if (req.path.startsWith("/api/")) {
    return res
      .status(403)
      .json({ message: "Access denied. Sales Agent privileges required." });
  }

  // For view routes, redirect to home
  res.redirect("/");
};

/**
 * Ensure user is an Admin
 */
exports.ensureAdmin = (req, res, next) => {
  console.log(
    "ensureAdmin: Checking admin privileges for user:",
    req.user?.id,
    "Role:",
    req.user?.role
  );

  if (req.isAuthenticated() && req.user && req.user.role === "admin") {
    return next();
  }

  console.log("ensureAdmin: Admin access denied");

  // For API routes, return JSON instead of redirect
  if (req.path.startsWith("/api/")) {
    return res
      .status(403)
      .json({ message: "Access denied. Admin privileges required." });
  }

  // For view routes, redirect to home
  res.redirect("/");
};

/**
 * Optional: Combined role checker for multiple roles
 */
exports.ensureRoles = (roles) => {
  return (req, res, next) => {
    if (req.isAuthenticated() && req.user && roles.includes(req.user.role)) {
      return next();
    }

    // For API routes, return JSON instead of redirect
    if (req.path.startsWith("/api/")) {
      return res.status(403).json({
        message: `Access denied. Required roles: ${roles.join(", ")}`,
      });
    }

    // For view routes, redirect to home
    res.redirect("/");
  };
};
