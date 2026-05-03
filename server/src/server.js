import dotenv from "dotenv";
dotenv.config();

import app from "./app.js";
import connectDB from "./config/db.js";

// 🔥 NEW IMPORTS
import http from "http";
import { Server } from "socket.io";

connectDB();

const PORT = process.env.PORT || 5000;

// 🔥 CREATE HTTP SERVER
const server = http.createServer(app);

// 🔥 ATTACH SOCKET.IO
export const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    credentials: true,
  },
});

// 🔥 START SERVER
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});