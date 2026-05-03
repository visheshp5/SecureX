import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    password: {
      type: String,
      required: true
    },
    failedLoginAttempts: {
      type: Number,
      default: 0,
    },
    lockUntil: {
      type: Date,
      default: null,
    },
    lastLoginIP: {
      type: String,
      default: "",
    },
    lastLoginDevice: {
      type: String,
      default: "",
    },
    suspiciousLogin: {
      type: Boolean,
      default: false,
    },
    riskScore: {
      type: Number,
      default: 0,
    },
    lastUserAgent: {
      type: String,
      default: "",
    },
    verificationCode: {
      type: String,
      default: "",
    },
    verificationExpiry: {
      type: Date,
      default: null,
    },
    pendingDeviceId: {
      type: String,
      default: "",
    },
    trustedDevices: [
    {
      deviceId: String,
      fingerprint: String, // 🔥 NEW
      ip: String,
      userAgent: String,
      lastSeen: Date,
    },
  ],
    lastLocation: {
      city: { type: String, default: "" },
      country: { type: String, default: "" },
      lat: { type: Number, default: 0 },
      lon: { type: Number, default: 0 },
    },
    lastLoginTime: {
      type: Date,
      default: null,
    },
    activeSessions: [
    {
      deviceId: String,
      fingerprint: String,
      createdAt: Date,
      expiresAt: Date, // ADD THIS
    }
  ],
  refreshToken: {
    type: String,
    default: "",
  },
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);