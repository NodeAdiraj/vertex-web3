const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["user", "organizer"], default: "user" },
  webauthn: {
    credentialId: { type: String, default: null },
    publicKey: { type: String, default: null },
  },
  walletAddress: { type: String },
  walletPrivateKey: { type: String },
});

module.exports = mongoose.model("User", userSchema);
