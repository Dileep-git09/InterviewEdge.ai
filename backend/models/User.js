const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    // Bumped on password change or an explicit "log out everywhere" request.
    // Every JWT embeds the tokenVersion it was issued with; `protect` rejects
    // a token whose version doesn't match the user's current one.
    tokenVersion: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", UserSchema);
