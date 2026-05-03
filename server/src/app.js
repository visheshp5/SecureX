import express from "express";
import cors from "cors";
import helmet from "helmet";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";

import cookieParser from "cookie-parser";


const app = express();

app.use(cookieParser());

app.use(cors({
  origin: "http://localhost:5173",
  credentials: true,
}));
app.use(helmet());
app.use(express.json());


app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "🚀 SecureX backend is running",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);

export default app;