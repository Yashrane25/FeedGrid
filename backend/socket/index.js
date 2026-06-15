import { Server } from "socket.io";
import jwt from "jsonwebtoken";

//store the io instance here so any controller can call getIO() and emit events without needing to pass io around everywhere
let io;

export const initSocket = (httpServer) => {
    io = new Server(httpServer, {
        cors: {
            origin: process.env.FRONTEND_URL || "http://localhost:5173",
            credentials: true,
            methods: ["GET", "POST"],
        },
        pingTimeout: 60000,   //wait 60sec for a pong before closing the connection
        pingInterval: 25000,  //send a ping every 25sec to check if client is still alive
    });

    //unauthenticated users cannot connect to our socket server at all
    io.use((socket, next) => {
        const token = socket.handshake.auth?.token?.replace("Bearer ", "");

        if (!token) {
            socket.user = null;
            return next();
        }

        try {
            const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
            socket.user = { id: decoded.id, role: decoded.role };
            next();
        } catch (error) {
            socket.user = null;
            next();
        }
    });

    //Connection Handler, runs every time a browser connects to our Socket.io server
    io.on("connection", (socket) => {
        console.log(`Socket connected: ${socket.id} | User: ${socket.user?.id || "guest"}`);

        //JOIN ORDER ROOM
        socket.on("join:order", (orderId) => {
            if (!orderId) {
                return;
            }
            const room = `order:${orderId}`;
            socket.join(room);
            console.log(`Socket ${socket.id} joined room: ${room}`);
        });

        //LEAVE ORDER ROOM, Called when customer navigates away from tracking page
        socket.on("leave:order", (orderId) => {
            socket.leave(`order:${orderId}`);
        });

        //JOIN RESTAURANT ROOM
        socket.on("join:restaurant", (restaurantId) => {
            if (!restaurantId) {
                return;
            }
            //Only restaurant_owner role can join restaurant rooms
            if (socket.user?.role !== "restaurant_owner") {
                return;
            }
            socket.join(`restaurant:${restaurantId}`);
            console.log(`Restaurant owner joined: restaurant:${restaurantId}`);
        });

        //DELIVERY AGENT: EMIT LOCATION
        socket.on("agent:location", ({ orderId, lat, lng }) => {
            if (!orderId || lat === undefined || lng === undefined) {
                return;
            }

            //Only delivery agents can emit location updates
            if (socket.user?.role !== "delivery_agent") {

            }

            //Validate coordinates are reasonable numbers
            if (typeof lat !== "number" || typeof lng !== "number") {
                return;
            }
            if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
                return;
            }

            //Broadcast to the order room — customer's map will update
            io.to(`order:${orderId}`).emit("location:update", {
                lat,
                lng,
                timestamp: new Date().toISOString(),
            });
        });

        //STATUS UPDATE via Socket (alternative to HTTP)
        socket.on("order:updateStatus", async ({ orderId, status }) => {
            if (!socket.user) {
                return;
            }
            if (!["restaurant_owner", "delivery_agent", "admin"].includes(socket.user.role)) {
                return;
            }

            try {
                //Dynamically import to avoid circular dependency issues
                const { default: Order } = await import("../models/Order.js");

                const validTransitions = {
                    pending: ["confirmed", "cancelled"],
                    confirmed: ["preparing", "cancelled"],
                    preparing: ["out_for_delivery"],
                    out_for_delivery: ["delivered"],
                    delivered: [],
                    cancelled: [],
                };

                const order = await Order.findById(orderId);
                if (!order) {
                    return;
                }

                if (!validTransitions[order.status]?.includes(status)) {
                    return;
                }

                order.status = status;
                order.statusTimestamps[status] = new Date();
                await order.save();

                //Broadcast to everyone in the order room
                io.to(`order:${orderId}`).emit("order:statusUpdate", {
                    orderId,
                    status,
                    timestamp: order.statusTimestamps[status],
                });

                //If order is now out for delivery, also notify the specific order room
                //so the customer knows to open the tracking map
                if (status === "out_for_delivery") {
                    io.to(`order:${orderId}`).emit("order:agentAssigned", {
                        orderId,
                        message: "Your delivery agent is on the way!",
                    });
                }

                console.log(`Order ${orderId} status updated to ${status}`);
            } catch (error) {
                console.error("Socket status update error:", error.message);
                socket.emit("error", { message: "Failed to update order status." });
            }
        });

        //Socket.io automatically removes the socket from all rooms on disconnect
        socket.on("disconnect", (reason) => {
            console.log(`Socket disconnected: ${socket.id} | Reason: ${reason}`);
        });
    });

    return io;
};

//getIO() is called from controllers to emit events
export const getIO = () => {
    if (!io) {
        throw new Error("Socket.io not initialized. Call initSocket() first.");
    }
    return io;
};