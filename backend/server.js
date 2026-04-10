/* Backend entry point, starts everything */

import express from "express"
import mongoose from "mongoose"
import dotenv, { config } from "dotenv"
import cors from "cors";
import cookieParser from "cookie-parser";
import { createServer } from "http";  // Node's built-in HTTP module
import { initSocket } from "./socket/index.js"; //socket.io setup
import authRoutes from "./routes/authRoutes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

//Middleware 
app.use(cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

//Routes 
app.use("/api/auth", authRoutes);


//DB Connection
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("MongoDB connected"))
    .catch((err) => console.error("MongoDB error", err));


//HTTP Server + Socket.io
const httpServer = createServer(app);
initSocket(httpServer);

httpServer.listen(PORT, () => console.log(`Server is running on port: ${PORT}`));