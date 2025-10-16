// routes/auth.js
module.exports = function (passport) {
  const express = require("express");
  const router = express.Router();

  // Google OAuth
  router.get(
    "/google",
    (req, res, next) => {
      console.log("Google OAuth initiated");
      const redirectUrl = req.query.redirectUrl || "http://localhost:3000";
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
      failureRedirect: "http://localhost:3000/signup?error=auth_failed",
    }),
    (req, res) => {
      console.log("Google OAuth successful, redirecting user");
      const user = req.user;
      const redirectUrl = req.session.redirectUrl || "http://localhost:3000";

      // Determine final redirect URL based on role
      const finalRedirectUrl =
        user.role === "admin"
          ? `${redirectUrl}/admin`
          : user.role === "salesAgent"
          ? `${redirectUrl}/sales`
          : `${redirectUrl}/client`;

      console.log(`Redirecting ${user.role} to: ${finalRedirectUrl}`);
      res.redirect(finalRedirectUrl);
    }
  );

  // Facebook OAuth
  router.get(
    "/facebook",
    (req, res, next) => {
      console.log("Facebook OAuth initiated");
      const redirectUrl = req.query.redirectUrl || "http://localhost:3000";
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
      failureRedirect: "http://localhost:3000/signup?error=auth_failed",
    }),
    (req, res) => {
      console.log("Facebook OAuth successful, redirecting user");
      const user = req.user;
      const redirectUrl = req.session.redirectUrl || "http://localhost:3000";

      const finalRedirectUrl =
        user.role === "admin"
          ? `${redirectUrl}/admin`
          : user.role === "salesAgent"
          ? `${redirectUrl}/sales`
          : `${redirectUrl}/client`;

      console.log(`Redirecting ${user.role} to: ${finalRedirectUrl}`);
      res.redirect(finalRedirectUrl);
    }
  );

  return router;
};
