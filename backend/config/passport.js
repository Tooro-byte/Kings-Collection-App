// config/passport.js
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth2").Strategy;
const FacebookStrategy = require("passport-facebook").Strategy;
const LocalStrategy = require("passport-local").Strategy;
const bcrypt = require("bcryptjs");

module.exports = function (pool) {
  // Local Strategy for email/password
  passport.use(
    new LocalStrategy(
      {
        usernameField: "email",
        passwordField: "password",
      },
      async (email, password, done) => {
        try {
          console.log("Local strategy attempt for:", email);

          const [users] = await pool.execute(
            "SELECT * FROM users WHERE email = ? AND is_active = TRUE",
            [email.toLowerCase()]
          );

          if (users.length === 0) {
            console.log("No user found with email:", email);
            return done(null, false, { message: "Invalid email or password" });
          }

          const user = users[0];

          if (!user.password_hash) {
            console.log("User has no password (social login):", email);
            return done(null, false, {
              message: "Please use social login for this account",
            });
          }

          const isValidPassword = await bcrypt.compare(
            password,
            user.password_hash
          );

          if (!isValidPassword) {
            console.log("Invalid password for:", email);
            return done(null, false, { message: "Invalid email or password" });
          }

          // Update last login
          await pool.execute(
            "UPDATE users SET last_login = NOW() WHERE id = ?",
            [user.id]
          );

          console.log("Local login successful for:", email);
          return done(null, user);
        } catch (error) {
          console.error("Local strategy error:", error);
          return done(error);
        }
      }
    )
  );

  // Google Strategy - UPDATED CALLBACK URL
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          callbackURL: "http://localhost:3005/api/auth/google/callback",
          passReqToCallback: true,
        },
        async (request, accessToken, refreshToken, profile, done) => {
          try {
            console.log("Google OAuth profile:", profile.id);

            const email = profile.emails[0].value.toLowerCase();
            const name = profile.displayName;

            // Check if user exists by Google ID
            let [users] = await pool.execute(
              "SELECT * FROM users WHERE google_id = ?",
              [profile.id]
            );

            if (users.length > 0) {
              console.log("Found user by Google ID:", email);
              await pool.execute(
                "UPDATE users SET last_login = NOW() WHERE id = ?",
                [users[0].id]
              );
              return done(null, users[0]);
            }

            // Check if user exists by email
            [users] = await pool.execute(
              "SELECT * FROM users WHERE email = ?",
              [email]
            );

            if (users.length > 0) {
              console.log("Linking Google to existing user:", email);
              await pool.execute(
                "UPDATE users SET google_id = ?, last_login = NOW() WHERE id = ?",
                [profile.id, users[0].id]
              );
              return done(null, users[0]);
            }

            // Create new user
            console.log("Creating new Google user:", email);
            const [result] = await pool.execute(
              `INSERT INTO users (name, email, google_id, role, last_login) 
               VALUES (?, ?, ?, 'client', NOW())`,
              [name, email, profile.id]
            );

            const [newUsers] = await pool.execute(
              "SELECT * FROM users WHERE id = ?",
              [result.insertId]
            );

            console.log("New Google user created:", newUsers[0].email);
            return done(null, newUsers[0]);
          } catch (error) {
            console.error("Google strategy error:", error);
            return done(error);
          }
        }
      )
    );
  } else {
    console.warn("Google OAuth disabled - missing credentials");
  }

  // Facebook Strategy - UPDATED CALLBACK URL
  if (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET) {
    passport.use(
      new FacebookStrategy(
        {
          clientID: process.env.FACEBOOK_APP_ID,
          clientSecret: process.env.FACEBOOK_APP_SECRET,
          callbackURL: "http://localhost:3005/api/auth/facebook/callback",
          profileFields: ["id", "emails", "displayName"],
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            console.log("Facebook OAuth profile:", profile.id);

            const email =
              profile.emails?.[0]?.value ||
              `facebook_${profile.id}@placeholder.local`;
            const name = profile.displayName;

            // Check if user exists by Facebook ID
            let [users] = await pool.execute(
              "SELECT * FROM users WHERE facebook_id = ?",
              [profile.id]
            );

            if (users.length > 0) {
              console.log("Found user by Facebook ID:", email);
              await pool.execute(
                "UPDATE users SET last_login = NOW() WHERE id = ?",
                [users[0].id]
              );
              return done(null, users[0]);
            }

            // Check if user exists by email
            [users] = await pool.execute(
              "SELECT * FROM users WHERE email = ?",
              [email]
            );

            if (users.length > 0) {
              console.log("Linking Facebook to existing user:", email);
              await pool.execute(
                "UPDATE users SET facebook_id = ?, last_login = NOW() WHERE id = ?",
                [profile.id, users[0].id]
              );
              return done(null, users[0]);
            }

            // Create new user
            console.log("Creating new Facebook user:", email);
            const [result] = await pool.execute(
              `INSERT INTO users (name, email, facebook_id, role, last_login) 
               VALUES (?, ?, ?, 'client', NOW())`,
              [name, email, profile.id]
            );

            const [newUsers] = await pool.execute(
              "SELECT * FROM users WHERE id = ?",
              [result.insertId]
            );

            console.log("New Facebook user created:", newUsers[0].email);
            return done(null, newUsers[0]);
          } catch (error) {
            console.error("Facebook strategy error:", error);
            return done(error);
          }
        }
      )
    );
  } else {
    console.warn("Facebook OAuth disabled - missing credentials");
  }

  // Serialize user
  passport.serializeUser((user, done) => {
    console.log("Serializing user:", user.id);
    done(null, user.id);
  });

  // Deserialize user
  passport.deserializeUser(async (id, done) => {
    try {
      console.log("Deserializing user:", id);
      const [users] = await pool.execute("SELECT * FROM users WHERE id = ?", [
        id,
      ]);

      if (users.length === 0) {
        console.error("User not found during deserialization:", id);
        return done(new Error("User not found"));
      }

      done(null, users[0]);
    } catch (error) {
      console.error("Deserialization error:", error);
      done(error);
    }
  });

  return passport;
};
