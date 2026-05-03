import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import crypto from "crypto";

// 🔐 HASH FUNCTION
const hashFingerprint = (fp) => {
  return crypto.createHash("sha256").update(fp).digest("hex");
};

// ================= SIGNUP =================
export const signup = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields required" });
    }

    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: "User exists" });

    const hashedPassword = await bcrypt.hash(password, 10);

    await User.create({ name, email, password: hashedPassword });

    res.json({ success: true, message: "Signup successful" });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ================= LOGIN =================
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const deviceId = req.headers["x-device-id"];
    const rawFp = req.headers["x-device-fingerprint"];

    if (!deviceId || !rawFp) {
      return res.status(400).json({ message: "Device info missing" });
    }

    const fingerprint = hashFingerprint(rawFp);

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "User not found" });

    // 🔒 LOCK CHECK
    if (user.lockUntil && user.lockUntil > Date.now()) {
      return res.status(403).json({ message: "Account locked" });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      user.failedLoginAttempts++;
      if (user.failedLoginAttempts >= 5) {
        user.lockUntil = Date.now() + 15 * 60 * 1000;
      }
      await user.save();
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // RESET
    user.failedLoginAttempts = 0;
    user.lockUntil = null;

    // 🧠 RISK ENGINE
    let riskScore = 0;

    const device = user.trustedDevices.find(
      (d) => d.deviceId === deviceId
    );

    if (!device) riskScore += 50;
    else if (device.fingerprint !== fingerprint) riskScore += 25;

    user.riskScore = riskScore;

    // 🚨 OTP FLOW
    if (riskScore >= 50) {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();

      user.verificationCode = otp;
      user.verificationExpiry = Date.now() + 5 * 60 * 1000;
      user.pendingDeviceId = deviceId;

      await user.save();

      console.log("🔐 OTP:", otp);

      return res.json({
        success: true,
        requiresVerification: true,
      });
    }

    // ✅ SAFE LOGIN
    user.suspiciousLogin = false;

    // ✅ TRUST DEVICE
    const existingDevice = user.trustedDevices.find(
      (d) => d.deviceId === deviceId
    );

    if (existingDevice) {
      existingDevice.fingerprint = fingerprint;
      existingDevice.lastSeen = new Date();
    } else {
      user.trustedDevices.push({
        deviceId,
        fingerprint,
        lastSeen: new Date(),
      });
    }

    // 🔥 CLEAN OLD SESSION
    user.activeSessions = user.activeSessions.filter(
      (s) =>
        !(
          s.deviceId === deviceId &&
          s.fingerprint === fingerprint
        )
    );

    // 🔥 ADD SESSION
    user.activeSessions.push({
      deviceId,
      fingerprint,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    await user.save();

    // 🔐 TOKEN
    const token = jwt.sign(
      { id: user._id, deviceId, fingerprint },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );

    res.cookie("accessToken", token, {
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
    });

    res.json({ success: true });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ================= VERIFY DEVICE =================
export const verifyDevice = async (req, res) => {
  try {
    const { email, code } = req.body;

    const deviceId = req.headers["x-device-id"];
    const rawFp = req.headers["x-device-fingerprint"];

    if (!deviceId || !rawFp) {
      return res.status(400).json({ message: "Device info missing" });
    }

    const fingerprint = hashFingerprint(rawFp);

    const user = await User.findOne({ email });

    if (
      !user ||
      user.verificationCode !== code ||
      user.verificationExpiry < Date.now()
    ) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    // ✅ RESET FLAGS
    user.suspiciousLogin = false;
    user.failedLoginAttempts = 0;
    user.riskScore = 0;

    // ✅ TRUST DEVICE
    const existingDevice = user.trustedDevices.find(
      (d) => d.deviceId === deviceId
    );

    if (existingDevice) {
      existingDevice.fingerprint = fingerprint;
      existingDevice.lastSeen = new Date();
    } else {
      user.trustedDevices.push({
        deviceId,
        fingerprint,
        lastSeen: new Date(),
      });
    }

    // 🔥 CLEAN OLD SESSION
    user.activeSessions = user.activeSessions.filter(
      (s) =>
        !(
          s.deviceId === deviceId &&
          s.fingerprint === fingerprint
        )
    );

    // 🔥 ADD SESSION
    user.activeSessions.push({
      deviceId,
      fingerprint,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    // 🔐 CLEAR OTP
    user.verificationCode = null;
    user.verificationExpiry = null;
    user.pendingDeviceId = null;

    await user.save();

    // 🔐 TOKEN
    const token = jwt.sign(
      { id: user._id, deviceId, fingerprint },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );

    res.cookie("accessToken", token, {
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
    });

    res.json({ success: true });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ================= LOGOUT =================
export const logoutUser = async (req, res) => {
  try {
    const deviceId = req.headers["x-device-id"];
    const rawFp = req.headers["x-device-fingerprint"];

    if (!deviceId || !rawFp) {
      return res.status(400).json({ message: "Device info missing" });
    }

    const fingerprint = hashFingerprint(rawFp);

    const user = await User.findById(req.user._id);

    user.activeSessions = user.activeSessions.filter(
      (s) =>
        !(
          s.deviceId === deviceId &&
          s.fingerprint === fingerprint
        )
    );

    await user.save();

    res.clearCookie("accessToken");

    res.json({ success: true, message: "Logged out" });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ================= DEVICES =================
export const getTrustedDevices = async (req, res) => {
  res.json({
    success: true,
    devices: req.user.trustedDevices,
  });
};

export const revokeDevice = async (req, res) => {
  const { deviceId } = req.body;

  const user = req.user;

  user.trustedDevices = user.trustedDevices.filter(
    (d) => d.deviceId !== deviceId
  );

  user.activeSessions = user.activeSessions.filter(
    (s) => s.deviceId !== deviceId
  );

  await user.save();

  res.json({ success: true });
};