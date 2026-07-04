require("dotenv").config();

const express = require("express");
const http = require("http");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const connectDB = require("./config/db");
const { initSocket } = require("./socket/socketServer");

const authRoutes = require("./routes/authRoutes");
const restaurantRoutes = require("./routes/restaurantRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const orderRoutes = require("./routes/orderRoutes");
const adminRoutes = require("./routes/adminRoutes");

const app = express();

connectDB();

//MIDDLEWARE 
//Parse incoming JSON request bodies (e.g. when React sends { email, password })
app.use(express.json());
app.use(express.urlencoded({ extended: true })); //Parse URL-encoded bodies (form submissions)
app.use(cookieParser()); //Allow cookies to be read from requests


//Configure CORS - which frontend origins are allowed to call this API
app.use(
    cors({
        origin: process.env.CLIENT_URL || "http://localhost:5173",
        credentials: true, //Allow cookies to be sent cross-origin
    })
);

//ROOT ROUTE
app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "FeedGrid API is running",
        version: "1.0.0",
    });
});

//API HEALTH CHECK
app.get("/api/health", (req, res) => {
    res.json({
        success: true,
        message: "API is healthy and database is connected",
    });
});

//Mount auth routes - all routes in authRoutes.js are prefixed with /api/auth
app.use("/api/auth", authRoutes);
app.use("/api/restaurants", restaurantRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/admin", adminRoutes);


//404 HANDLER
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: `Route ${req.originalUrl} not found`,
    });
});

//GLOBAL ERROR HANDLER
app.use((err, req, res, next) => {
    console.error("Global Error:", err.message);

    res.status(err.statusCode || 500).json({
        success: false,
        message: err.message || "Internal Server Error",
    });
});

//create HTTP server
const httpServer = http.createServer(app);
//Iniatialize socket.io
initSocket(httpServer);


//START SERVER
const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log("Socket.io ready for real time connections");
});