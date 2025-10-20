const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");

module.exports = function (passport) {
  // List of allowed redirect origins
  const allowedOrigins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://localhost:3005",
    // Add production URLs here
  ];

  // Validate redirect URL
  const validateRedirectUrl = (url) => {
    try {
      const parsedUrl = new URL(url);
      return allowedOrigins.includes(parsedUrl.origin)
        ? url
        : "http://localhost:5173";
    } catch (error) {
      console.error("Invalid redirect URL:", url, error.message);
      return "http://localhost:5173";
    }
  };

  // Generate JWT token
  const generateToken = (user) => {
    return jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "1d" }
    );
  };

  // Google OAuth
  router.get(
    "/google",
    (req, res, next) => {
      console.log("Google OAuth initiated");
      const redirectUrl = validateRedirectUrl(
        req.query.redirectUrl || "http://localhost:5173"
      );
      req.session.redirectUrl = redirectUrl;
      next();
    },
    passport.authenticate("google", {
      scope: ["profile", "email"],
    })
  );

  router.get(
    "/google/callback",
    passport.authenticate("google", {
      failureRedirect: "http://localhost:5173/login?error=auth_failed",
      failureMessage: true,
    }),
    (req, res) => {
      console.log("Google OAuth successful, redirecting user");
      const user = req.user;
      const redirectUrl = validateRedirectUrl(
        req.session.redirectUrl || "http://localhost:5173"
      );
      const baseUrl = redirectUrl.endsWith("/")
        ? redirectUrl
        : `${redirectUrl}/`;
      const token = generateToken(user);
      const finalRedirectUrl = `${baseUrl}client?token=${token}`;
      console.log(`Redirecting ${user.role} to: ${finalRedirectUrl}`);
      res.redirect(finalRedirectUrl);
    }
  );

  // Facebook OAuth
  router.get(
    "/facebook",
    (req, res, next) => {
      console.log("Facebook OAuth initiated");
      const redirectUrl = validateRedirectUrl(
        req.query.redirectUrl || "http://localhost:5173"
      );
      req.session.redirectUrl = redirectUrl;
      next();
    },
    passport.authenticate("facebook", {
      scope: ["public_profile", "email"],
    })
  );

  router.get(
    "/facebook/callback",
    passport.authenticate("facebook", {
      failureRedirect: "http://localhost:5173/login?error=auth_failed",
      failureMessage: true,
    }),
    (req, res) => {
      console.log("Facebook OAuth successful, redirecting user");
      const user = req.user;
      const redirectUrl = validateRedirectUrl(
        req.session.redirectUrl || "http://localhost:5173"
      );
      const baseUrl = redirectUrl.endsWith("/")
        ? redirectUrl
        : `${redirectUrl}/`;
      const token = generateToken(user);
      const finalRedirectUrl = `${baseUrl}client?token=${token}`;
      console.log(`Redirecting ${user.role} to: ${finalRedirectUrl}`);
      res.redirect(finalRedirectUrl);
    }
  );

  return router;
};
