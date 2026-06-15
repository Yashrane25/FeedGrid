import dotenv from "dotenv";
dotenv.config();

import express from "express"
import mongoose from "mongoose"
// import dotenv, { config } from "dotenv"
import cors from "cors";
import cookieParser from "cookie-parser";
import { createServer } from "http";  //Nodes built in HTTP module
import { initSocket } from "./socket/index.js"; //socket.io setup
import authRoutes from "./routes/authRoutes.js";
import restaurantRoutes from "./routes/restaurantRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

//Middleware 
app.use(cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
}));


app.use(cookieParser());

//raw body only for webhook route
app.use("/api/orders/webhook", express.raw({ type: "application/json" }));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));


//Routes 
app.use("/api/auth", authRoutes);
app.use("/api/restaurants", restaurantRoutes);
app.use("/api/orders", orderRoutes);


//HTTP Server + Socket.io
const httpServer = createServer(app);
initSocket(httpServer);

//DB + Server start
mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log("MongoDB connected");

        httpServer.listen(PORT, () =>
            console.log(`Server running on ${PORT}`)
        );
    })
    .catch((err) => console.error("MongoDB error", err));