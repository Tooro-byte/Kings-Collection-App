// userAuth.js (updated)
const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const Joi = require("joi");

// Joi schemas
const emailSchema = Joi.object({
  name: Joi.string().min(2).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  confirmPassword: Joi.string().valid(Joi.ref("password")).required(),
  role: Joi.string().valid("client", "admin", "salesAgent").required(),
  mailingAddress: Joi.when("role", {
    is: "client",
    then: Joi.string().required(),
    otherwise: Joi.string().allow("", null),
  }),
  terms: Joi.boolean().valid(true).required(),
  newsletter: Joi.boolean().default(false),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

// Token verification middleware (optional, if needed for API calls)
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split("Bearer ")[1];
  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }
  // Add token verification logic here (e.g., JWT or check against user ID in DB)
  // For now, assume session-based auth via passport
  next();
};

// Email signup
router.post("/signup/email", async (req, res) => {
  try {
    const { error, value } = emailSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        message: error.details.map((detail) => detail.message).join(", "),
      });
    }

    const { name, email, password, role, mailingAddress, newsletter } = value;
    const pool = req.app.locals.pool;

    // Check if user exists
    const [existingUsers] = await pool.execute(
      "SELECT id FROM users WHERE email = ?",
      [email.toLowerCase()]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({
        message: "A user with this email is already registered",
      });
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Insert user
    const [result] = await pool.execute(
      `INSERT INTO users (name, email, password_hash, role, mailing_address, newsletter) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        name,
        email.toLowerCase(),
        passwordHash,
        role,
        mailingAddress,
        newsletter,
      ]
    );

    // Get the created user
    const [users] = await pool.execute("SELECT * FROM users WHERE id = ?", [
      result.insertId,
    ]);

    const user = users[0];

    // Log in the user
    req.login(user, (err) => {
      if (err) {
        console.error("Login after signup error:", err);
        return res
          .status(500)
          .json({ message: "Error logging in after signup" });
      }

      const redirectUrl =
        user.role === "admin"
          ? "/admin"
          : user.role === "salesAgent"
          ? "/sales"
          : "/client";

      res.status(201).json({
        redirectUrl,
        message: "Account created successfully",
        token: user.id, // Include token for frontend
      });
    });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ message: "Server error during signup" });
  }
});

// Login route for JSON API
router.post("/login", (req, res, next) => {
  const { error } = loginSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      message: error.details.map((detail) => detail.message).join(", "),
    });
  }

  const passport = req.app.get("passport");

  passport.authenticate("local", (err, user, info) => {
    if (err) {
      console.error("Auth error:", err);
      return res.status(500).json({ message: "Server error during login" });
    }

    if (!user) {
      return res.status(401).json({
        message: info?.message || "Invalid email or password",
      });
    }

    req.login(user, (err) => {
      if (err) {
        return res.status(500).json({ message: "Server error during login" });
      }

      const redirectUrl =
        user.role === "admin"
          ? "/admin"
          : user.role === "salesAgent"
          ? "/sales"
          : "/client";

      res.json({
        redirectUrl,
        message: "Login successful",
        token: user.id,
      });
    });
  })(req, res, next);
});

// Traditional form login for Pug templates
router.post("/login-form", (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.redirect("/login?error=Email and password are required");
  }

  const passport = req.app.get("passport");

  passport.authenticate("local", (err, user, info) => {
    if (err) {
      console.error("Auth error:", err);
      return res.redirect("/login?error=Server error during login");
    }

    if (!user) {
      return res.redirect(
        `/login?error=${encodeURIComponent(
          info?.message || "Invalid email or password"
        )}`
      );
    }

    req.login(user, (err) => {
      if (err) {
        return res.redirect("/login?error=Server error during login");
      }

      const redirectUrl =
        user.role === "admin"
          ? "/admin"
          : user.role === "salesAgent"
          ? "/sales"
          : "/client";

      res.redirect(`http://localhost:5173${redirectUrl}`);
    });
  })(req, res, next);
});

// Logout
router.post("/logout", (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ message: "Error logging out" });
    }
    res.json({ message: "Logged out successfully" });
  });
});

// Get current user
router.get("/me", verifyToken, (req, res) => {
  if (req.isAuthenticated()) {
    const { password_hash, ...userWithoutPassword } = req.user;
    res.json({ user: userWithoutPassword });
  } else {
    res.status(401).json({ message: "Not authenticated" });
  }
});

module.exports = router;
