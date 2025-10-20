const { DataTypes } = require("sequelize");
const bcrypt = require("bcryptjs");

module.exports = (sequelize) => {
  const User = sequelize.define(
    "User",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
          isEmail: true,
        },
      },
      password: {
        type: DataTypes.STRING,
        allowNull: true, // Null for social logins
      },
      google_id: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true,
      },
      facebook_id: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true,
      },
      role: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "client",
        validate: {
          isIn: [["client", "admin", "salesAgent"]],
        },
      },
      mailingAddress: {
        type: DataTypes.STRING,
        allowNull: true, // Required for clients, null for social logins
      },
      newsletter: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        defaultValue: false,
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      avatar: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: "Users",
      timestamps: true,
      hooks: {
        beforeSave: async (user) => {
          if (user.changed("password") && user.password) {
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(user.password, salt);
          }
        },
      },
    }
  );

  User.prototype.verifyPassword = async function (password) {
    if (!this.password) return false;
    return await bcrypt.compare(password, this.password);
  };

  User.findOrCreateSocialUser = async (profile, provider) => {
    console.log(
      `findOrCreateSocialUser: Processing ${provider} profile:`,
      profile.id
    );
    let user;
    const email =
      profile.emails && profile.emails[0] ? profile.emails[0].value : null;
    const displayName = profile.displayName || profile.name;

    if (provider === "google") {
      user = await User.findOne({
        where: { google_id: profile.id },
      });

      if (!user && email) {
        user = await User.findOne({
          where: { email: email.toLowerCase() },
        });
      }

      if (!user) {
        user = await User.create({
          name: displayName,
          email: email ? email.toLowerCase() : `${profile.id}@${provider}.com`,
          google_id: profile.id,
          avatar:
            profile.photos && profile.photos[0]
              ? profile.photos[0].value
              : null,
          isActive: true,
          role: "client", // Default role for social logins
        });
        console.log(
          `findOrCreateSocialUser: Created new user for ${provider}, ID:`,
          user.id
        );
      } else if (!user.google_id) {
        await user.update({ google_id: profile.id });
        console.log(
          `findOrCreateSocialUser: Linked ${provider} ID to existing user, ID:`,
          user.id
        );
      }
    } else if (provider === "facebook") {
      user = await User.findOne({
        where: { facebook_id: profile.id },
      });

      if (!user && email) {
        user = await User.findOne({
          where: { email: email.toLowerCase() },
        });
      }

      if (!user) {
        user = await User.create({
          name: displayName,
          email: email ? email.toLowerCase() : `${profile.id}@${provider}.com`,
          facebook_id: profile.id,
          avatar:
            profile.photos && profile.photos[0]
              ? profile.photos[0].value
              : null,
          isActive: true,
          role: "client", // Default role for social logins
        });
        console.log(
          `findOrCreateSocialUser: Created new user for ${provider}, ID:`,
          user.id
        );
      } else if (!user.facebook_id) {
        await user.update({ facebook_id: profile.id });
        console.log(
          `findOrCreateSocialUser: Linked ${provider} ID to existing user, ID:`,
          user.id
        );
      }
    }

    return user;
  };

  return User;
};
