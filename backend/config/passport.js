// passport.js (updated)
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const GoogleStrategy = require("passport-google-oauth2").Strategy;
const FacebookStrategy = require("passport-facebook").Strategy;
const bcrypt = require("bcryptjs");

module.exports = function (pool) {
  passport.use(
    new LocalStrategy(
      {
        usernameField: "email",
        passwordField: "password",
      },
      async (email, password, done) => {
        try {
          const [users] = await pool.execute(
            "SELECT * FROM users WHERE email = ? AND is_active = true",
            [email.toLowerCase()]
          );

          if (users.length === 0) {
            return done(null, false, { message: "Invalid email or password" });
          }

          const user = users[0];
          const isMatch = await bcrypt.compare(password, user.password_hash);

          if (!isMatch) {
            return done(null, false, { message: "Invalid email or password" });
          }

          await pool.execute(
            "UPDATE users SET last_login = NOW() WHERE id = ?",
            [user.id]
          );

          return done(null, user);
        } catch (error) {
          console.error("Local strategy error:", error);
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
          console.log("Google profile:", profile);
          const email = profile.emails?.[0]?.value?.toLowerCase();

          if (!email) {
            return done(null, false, {
              message: "No email provided by Google",
            });
          }

          const [users] = await pool.execute(
            "SELECT * FROM users WHERE email = ? OR google_id = ?",
            [email, profile.id]
          );

          if (users.length > 0) {
            console.log("Linking Google to existing user:", email);
            await pool.execute(
              "UPDATE users SET google_id = ?, role = 'client', last_login = NOW() WHERE id = ?",
              [profile.id, users[0].id]
            );
            const [updatedUsers] = await pool.execute(
              "SELECT * FROM users WHERE id = ?",
              [users[0].id]
            );
            return done(null, updatedUsers[0]);
          }

          const [result] = await pool.execute(
            `INSERT INTO users (name, email, google_id, role, is_active, last_login)
             VALUES (?, ?, ?, 'client', true, NOW())`,
            [profile.displayName || "Google User", email, profile.id]
          );

          const [newUsers] = await pool.execute(
            "SELECT * FROM users WHERE id = ?",
            [result.insertId]
          );

          return done(null, newUsers[0]);
        } catch (error) {
          console.error("Google strategy error:", error);
          return done(error);
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
          console.log("Facebook profile:", profile);
          const email =
            profile.emails?.[0]?.value?.toLowerCase() ||
            `facebook_${profile.id}@placeholder.local`;

          const [users] = await pool.execute(
            "SELECT * FROM users WHERE email = ? OR facebook_id = ?",
            [email, profile.id]
          );

          if (users.length > 0) {
            console.log("Linking Facebook to existing user:", email);
            await pool.execute(
              "UPDATE users SET facebook_id = ?, role = 'client', last_login = NOW() WHERE id = ?",
              [profile.id, users[0].id]
            );
            const [updatedUsers] = await pool.execute(
              "SELECT * FROM users WHERE id = ?",
              [users[0].id]
            );
            return done(null, updatedUsers[0]);
          }

          const [result] = await pool.execute(
            `INSERT INTO users (name, email, facebook_id, role, is_active, last_login)
             VALUES (?, ?, ?, 'client', true, NOW())`,
            [profile.displayName || "Facebook User", email, profile.id]
          );

          const [newUsers] = await pool.execute(
            "SELECT * FROM users WHERE id = ?",
            [result.insertId]
          );

          return done(null, newUsers[0]);
        } catch (error) {
          console.error("Facebook strategy error:", error);
          return done(error);
        }
      }
    )
  );

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id, done) => {
    try {
      const [users] = await pool.execute(
        "SELECT * FROM users WHERE id = ? AND is_active = true",
        [id]
      );
      done(null, users[0] || null);
    } catch (error) {
      console.error("Deserialize error:", error);
      done(error);
    }
  });

  return passport;
};
