const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

//This variable holds the Socket.io server instance
let io;

const initSocket = (httpServer) => {
    io = new Server(httpServer, {
        cors: {
            origin: process.env.CLIENT_URL || "http://localhost:5173",
            credentials: true,
        },
    });

    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth.token;

            if (!token) {
                return next(new Error("Authentication required"));
            }

            const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
            const user = await User.findById(decoded.id).select(
                "name role isActive"
            );

            if (!user || !user.isActive) {
                return next(new Error("User not found or inactive"));
            }

            socket.userId = decoded.id;
            socket.userRole = user.role;
            socket.userName = user.name;

            next();
        } catch (error) {
            next(new Error("Invalid or expired token"));
        }
    });

    //Runs every time a client successfully connects
    io.on("connection", (socket) => {
        console.log(
            `Socket connected: ${socket.userName} (${socket.userRole}) - ${socket.id}`
        );

        //join role base room
        socket.join(`user_${socket.userId}`);

        //restaurant room for owner
        socket.on("join_restaurant_room", (restaurantId) => {
            if (socket.userRole !== "restaurant_owner") return;
            socket.join(`restaurant_${restaurantId}`);
            console.log(
                `${socket.userName} joined room: restaurant_${restaurantId}`
            );
        });

        socket.on("leave_restaurant_room", (restaurantId) => {
            socket.leave(`restaurant_${restaurantId}`);
            console.log(
                `${socket.userName} left room: restaurant_${restaurantId}`
            );
        });

        //order room for tracking a specific order
        socket.on("join_order_room", (orderId) => {
            socket.join(`order_${orderId}`);
            console.log(
                `${socket.userName} joined room: order_${orderId}`
            );
        });

        socket.on("leave_order_room", (orderId) => {
            socket.leave(`order_${orderId}`);
        });

        socket.on("disconnect", () => {
            console.log(
                `Socket disconnected: ${socket.userName} - ${socket.id}`
            );
        });
    });

    return io;
};

const getIO = () => {
    if (!io) {
        throw new Error("Socket.io not initialized. Call initSocket first.");
    }
    return io;
};

module.exports = { initSocket, getIO };