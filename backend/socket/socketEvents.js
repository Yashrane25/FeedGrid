const { getIO } = require("./socketServer");

//emit new order to restaurent
const emitNewOrder = (restaurantId, order) => {
    try {
        const io = getIO();
        io.to(`restaurant_${restaurantId}`).emit("new_order", {
            message: "New order received!",
            order,
        });
        console.log(`Emitted new_order to restaurant_${restaurantId}`);
    } catch (error) {
        console.error("Socket emit error (new_order):", error.message);
    }
};

//emit order status update to customer
const emitOrderStatusUpdate = (customerId, order) => {
    try {
        const io = getIO();
        io.to(`user_${customerId}`).emit("order_status_update", {
            message: `Your order status changed to ${order.status}`,
            order,
        });

        io.to(`order_${order._id}`).emit("order_status_update", {
            message: `Order status changed to ${order.status}`,
            order,
        });

        console.log(
            `Emitted order_status_update to user_${customerId} and order_${order._id}`
        );
    } catch (error) {
        console.error(
            "Socket emit error (order_status_update):",
            error.message
        );
    }
};

//emit order update to restaurant
const emitOrderUpdateToRestaurant = (restaurantId, order) => {
    try {
        const io = getIO();
        io.to(`restaurant_${restaurantId}`).emit("order_updated", {
            order,
        });
    } catch (error) {
        console.error(
            "Socket emit error (order_updated):",
            error.message
        );
    }
};

module.exports = {
    emitNewOrder,
    emitOrderStatusUpdate,
    emitOrderUpdateToRestaurant,
};