import express from "express";
import authMiddleware from '../middleware/authMiddleware.js';

import { loginLimiter } from "../middleware/rateLimiter.js";

import {
  signup,
  loginUser,
  verifyDevice,
  getTrustedDevices,
  revokeDevice,
  logoutUser,
} from "../controllers/authController.js";
const router = express.Router();

router.post("/signup", signup);
router.get("/trusted-devices", authMiddleware, getTrustedDevices);
router.post("/revoke-device", authMiddleware, revokeDevice);

router.post("/login", loginLimiter, loginUser); 
router.post("/verify-device", loginLimiter, verifyDevice);/////


router.get("/secure-dashboard", authMiddleware, (req, res) => {
  res.status(200).json({
    success: true,
    message: "Secure dashboard access granted",
    user: req.user,
  });
});

router.post("/logout", authMiddleware, logoutUser);

export default router;