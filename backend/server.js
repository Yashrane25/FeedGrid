require("dotenv").config();

const express = require("express");
const http = require("http");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const mongoSanitize = require("express-mongo-sanitize");

const connectDB = require("./config/db");
const { initRedis } = require("./config/redis");
const { initSocket } = require("./socket/socketServer");

const { authLimiter, apiLimiter, paymentLimiter } = require("./middleware/rateLimitMiddleware");

const authRoutes = require("./routes/authRoutes");
const restaurantRoutes = require("./routes/restaurantRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const orderRoutes = require("./routes/orderRoutes");
const adminRoutes = require("./routes/adminRoutes");
const imageRoutes = require("./routes/imageRoutes");

const app = express();

connectDB();
initRedis(); //Redis connection  


// Helmet sets secure HTTP response headers
app.use(
    helmet({
        crossOriginResourcePolicy: { policy: "cross-origin" },
        contentSecurityPolicy: false,
    })
);

//mongoSanitize is not supporting on and above express 5
// app.use(mongoSanitize());

//limit: "10kb" reject request bodies larger than 10kb prevents large payload DoS attacks
app.use(express.json({ limit: "10kb" }));

app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(
    cors({
        origin: process.env.CLIENT_URL || "http://localhost:5173",
        credentials: true,
    })
);

//General API rate limit applied to all /api routes
app.use("/api", apiLimiter);

//ROUTES
app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "Food Delivery API is running",
        version: "1.0.0",
    });
});

app.get("/api/health", (req, res) => {
    res.json({
        success: true,
        message: "API is healthy and database is connected",
    });
});

app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/payments", paymentLimiter, paymentRoutes);
app.use("/api/restaurants", restaurantRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api", imageRoutes);

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

//HTTP SERVER + SOCKET.IO
const httpServer = http.createServer(app);
initSocket(httpServer);

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Socket.io ready for real-time connections`);
});