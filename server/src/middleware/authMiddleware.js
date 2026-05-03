import jwt from "jsonwebtoken";
import User from "../models/User.js";
import crypto from "crypto";

import { io } from "../server.js";

const hashFingerprint = (fp) => {
  return crypto.createHash("sha256").update(fp).digest("hex");
};

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.cookies.accessToken;

    if (!token) {
      return res.status(401).json({ message: "No token" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const deviceId = req.headers["x-device-id"];
    const rawFp = req.headers["x-device-fingerprint"];

    if (!rawFp || !deviceId) {
      return res.status(400).json({
        message: "Device info missing",
      });
    }

    const fingerprint = hashFingerprint(rawFp);

    // 🔥 FETCH USER ONCE
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // 🚨 HIJACK DETECTION + REVOCATION
    if (
      decoded.deviceId !== deviceId ||
      decoded.fingerprint !== fingerprint
    ) {
      user.activeSessions = [];
      user.suspiciousLogin = true;
      await user.save();

      // 🚨 REAL-TIME ALERT
      io.emit("security-alert", {
        type: "HIJACK_ATTEMPT",
        message: "🚨 Session hijack attempt detected",
        time: new Date(),
      });

      return res.status(401).json({
        hijackDetected: true,
        message: "Session revoked due to hijack attempt",
      });
    }

    // 🔐 SESSION VALIDATION
    const validSession = user.activeSessions.some(
      (s) =>
        s.deviceId === deviceId &&
        s.fingerprint === fingerprint &&
        (!s.expiresAt || s.expiresAt > new Date())
    );

    if (!validSession) {
      return res.status(401).json({
        message: "Session expired or invalid",
      });
    }

    req.user = user;
    next();

  } catch (err) {
    return res.status(401).json({
      message: "Invalid or expired token",
    });
  }
};

export default authMiddleware;