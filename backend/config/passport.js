const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const GoogleStrategy = require("passport-google-oauth2").Strategy;
const FacebookStrategy = require("passport-facebook").Strategy;

module.exports = function (sequelize) {
  const User = require("../models/userModel")(sequelize);

  // LocalStrategy for email/password login
  passport.use(
    new LocalStrategy(
      {
        usernameField: "email",
        passwordField: "password",
      },
      async (email, password, done) => {
        try {
          console.log("LocalStrategy: Attempting login for email:", email);
          const user = await User.findOne({
            where: { email: email.toLowerCase() },
          });
          if (!user) {
            console.log("LocalStrategy: User not found for email:", email);
            return done(null, false, { message: "Invalid email or password" });
          }
          const isValidPassword = await user.verifyPassword(password);
          if (!isValidPassword) {
            console.log("LocalStrategy: Invalid password for email:", email);
            return done(null, false, { message: "Invalid email or password" });
          }
          if (!user.isActive) {
            console.log("LocalStrategy: User is inactive, ID:", user.id);
            return done(null, false, { message: "Account is inactive" });
          }
          console.log("LocalStrategy: Login successful, ID:", user.id);
          await user.update({ lastLogin: new Date() });
          return done(null, user);
        } catch (error) {
          console.error("LocalStrategy error:", error.message, error.stack);
          return done(error);
        }
      }
    )
  );

  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: "http://localhost:3005/api/auth/google/callback",
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          console.log(
            "GoogleStrategy: Profile received:",
            JSON.stringify(profile, null, 2)
          );
          const user = await User.findOrCreateSocialUser(profile, "google");
          if (!user) {
            console.log(
              "GoogleStrategy: Failed to find or create user for profile ID:",
              profile.id
            );
            return done(null, false, {
              message: "Failed to process Google login",
            });
          }
          console.log(
            "GoogleStrategy: User processed, ID:",
            user.id,
            "Email:",
            user.email
          );
          await user.update({ lastLogin: new Date() });
          return done(null, user);
        } catch (error) {
          console.error("GoogleStrategy error:", error.message, error.stack);
          return done(null, false, {
            message: "Failed to process Google login: Database error",
          });
        }
      }
    )
  );

  passport.use(
    new FacebookStrategy(
      {
        clientID: process.env.FACEBOOK_APP_ID,
        clientSecret: process.env.FACEBOOK_APP_SECRET,
        callbackURL: "http://localhost:3005/api/auth/facebook/callback",
        profileFields: ["id", "displayName", "emails"],
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          console.log(
            "FacebookStrategy: Profile received:",
            JSON.stringify(profile, null, 2)
          );
          const user = await User.findOrCreateSocialUser(profile, "facebook");
          if (!user) {
            console.log(
              "FacebookStrategy: Failed to find or create user for profile ID:",
              profile.id
            );
            return done(null, false, {
              message: "Failed to process Facebook login",
            });
          }
          console.log(
            "FacebookStrategy: User processed, ID:",
            user.id,
            "Email:",
            user.email
          );
          await user.update({ lastLogin: new Date() });
          return done(null, user);
        } catch (error) {
          console.error("FacebookStrategy error:", error.message, error.stack);
          return done(null, false, {
            message: "Failed to process Facebook login: Database error",
          });
        }
      }
    )
  );

  passport.serializeUser((user, done) => {
    console.log("Serializing user, ID:", user.id);
    done(null, user.id);
  });

  passport.deserializeUser(async (id, done) => {
    try {
      console.log("Deserializing user, ID:", id);
      const user = await User.findOne({
        where: { id, isActive: true },
      });
      if (!user) {
        console.log("Deserialize: User not found or inactive, ID:", id);
        return done(null, false);
      }
      console.log("Deserialize: User found, ID:", user.id, "Name:", user.name);
      done(null, user);
    } catch (error) {
      console.error("Deserialize error:", error.message, error.stack);
      done(null, false);
    }
  });

  return passport;
};
