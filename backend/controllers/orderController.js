const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const Order = require("../models/Order");
const Restaurant = require("../models/Restaurant");
const MenuItem = require("../models/MenuItem");
const {
    emitNewOrder,
    emitOrderStatusUpdate,
    emitOrderUpdateToRestaurant,
} = require("../socket/socketEvents");

const createOrder = async (req, res) => {
    try {
        const {
            restaurantId,
            items,
            deliveryAddress,
            customerNote,
            stripePaymentIntentId,
            amounts,
        } = req.body;

        if (
            !restaurantId ||
            !items ||
            !deliveryAddress ||
            !stripePaymentIntentId
        ) {
            return res.status(400).json({
                success: false,
                message: "Missing required order fields",
            });
        }

        const paymentIntent = await stripe.paymentIntents.retrieve(
            stripePaymentIntentId
        );

        if (paymentIntent.status !== "succeeded") {
            return res.status(400).json({
                success: false,
                message: `Payment not completed. Status: ${paymentIntent.status}`,
            });
        }

        if (
            paymentIntent.metadata.customerId !== req.user._id.toString()
        ) {
            return res.status(403).json({
                success: false,
                message: "Payment verification failed",
            });
        }

        const existingOrder = await Order.findOne({
            stripePaymentIntentId,
        });

        if (existingOrder) {
            return res.status(200).json({
                success: true,
                message: "Order already exists",
                order: existingOrder,
            });
        }

        const restaurant = await Restaurant.findById(restaurantId);
        if (!restaurant) {
            return res.status(404).json({
                success: false,
                message: "Restaurant not found",
            });
        }

        const order = await Order.create({
            customer: req.user._id,
            restaurant: restaurantId,
            items: items.map((item) => ({
                menuItem: item.menuItem,
                name: item.name,
                price: item.price,
                quantity: item.quantity,
                image: item.image || null,
            })),
            subtotal: amounts.subtotal,
            deliveryFee: amounts.deliveryFee,
            tax: amounts.tax,
            total: amounts.total,
            deliveryAddress: {
                street: deliveryAddress.street,
                city: deliveryAddress.city,
                state: deliveryAddress.state,
                pincode: deliveryAddress.pincode,
            },
            customerNote: customerNote || null,
            paymentMethod: "stripe",
            paymentStatus: "paid",
            stripePaymentIntentId,
            status: "placed",
            statusHistory: [
                {
                    status: "placed",
                    timestamp: new Date(),
                    note: "Order placed successfully",
                },
            ],
        });

        await order.populate("restaurant", "name phone address");
        await order.populate("customer", "name email phone");

        //emit socket event
        emitNewOrder(restaurantId, order);

        res.status(201).json({
            success: true,
            message: "Order placed successfully",
            order,
        });
    } catch (error) {
        console.error("Create order error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to create order",
        });
    }
};

//get customers order
const getMyOrders = async (req, res) => {
    try {
        const orders = await Order.find({ customer: req.user._id })
            .populate("restaurant", "name images address")
            .sort({ createdAt: -1 })
            .select("-__v");

        res.status(200).json({
            success: true,
            count: orders.length,
            orders,
        });
    } catch (error) {
        console.error("Get my orders error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch orders",
        });
    }
};

//get single order
const getOrderById = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate("customer", "name email phone")
            .populate("restaurant", "name images address phone")
            .populate("deliveryAgent", "name phone")
            .select("-__v");

        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Order not found",
            });
        }

        const isCustomer =
            order.customer._id.toString() === req.user._id.toString();
        const isAdmin = req.user.role === "admin";
        const isDeliveryAgent =
            order.deliveryAgent &&
            order.deliveryAgent._id.toString() === req.user._id.toString();

        let isRestaurantOwner = false;
        if (req.user.role === "restaurant_owner") {
            const restaurant = await Restaurant.findOne({
                _id: order.restaurant._id,
                owner: req.user._id,
            });
            isRestaurantOwner = !!restaurant;
        }

        if (
            !isCustomer &&
            !isAdmin &&
            !isDeliveryAgent &&
            !isRestaurantOwner
        ) {
            return res.status(403).json({
                success: false,
                message: "Not authorized to view this order",
            });
        }

        res.status(200).json({
            success: true,
            order,
        });
    } catch (error) {
        if (error.name === "CastError") {
            return res.status(400).json({
                success: false,
                message: "Invalid order ID",
            });
        }
        console.error("Get order error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch order",
        });
    }
};

const getRestaurantOrders = async (req, res) => {
    try {
        const restaurant = await Restaurant.findOne({
            _id: req.params.restaurantId,
            owner: req.user._id,
        });

        if (!restaurant) {
            return res.status(403).json({
                success: false,
                message: "Not authorized to view these orders",
            });
        }

        const { status, page = 1, limit = 20 } = req.query;
        const filter = { restaurant: req.params.restaurantId };
        if (status) filter.status = status;

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [total, orders] = await Promise.all([
            Order.countDocuments(filter),
            Order.find(filter)
                .populate("customer", "name phone")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .select("-__v"),
        ]);

        res.status(200).json({
            success: true,
            count: orders.length,
            total,
            orders,
        });
    } catch (error) {
        console.error("Get restaurant orders error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch restaurant orders",
        });
    }
};

const updateOrderStatus = async (req, res) => {
    try {
        const { status, note } = req.body;

        const validStatuses = [
            "confirmed",
            "preparing",
            "ready_for_pickup",
            "out_for_delivery",
            "delivered",
            "cancelled",
        ];

        if (!status || !validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
            });
        }

        const order = await Order.findById(req.params.id)
            .populate("customer", "name email phone")
            .populate("restaurant", "name images address phone owner");

        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Order not found",
            });
        }

        const restaurantStatuses = [
            "confirmed",
            "preparing",
            "ready_for_pickup",
            "cancelled",
        ];
        const agentStatuses = ["out_for_delivery", "delivered"];

        if (
            req.user.role === "restaurant_owner" &&
            !restaurantStatuses.includes(status)
        ) {
            return res.status(403).json({
                success: false,
                message: `Restaurant owners can only set status to: ${restaurantStatuses.join(", ")}`,
            });
        }

        if (
            req.user.role === "delivery_agent" &&
            !agentStatuses.includes(status)
        ) {
            return res.status(403).json({
                success: false,
                message: `Delivery agents can only set status to: ${agentStatuses.join(", ")}`,
            });
        }

        order.status = status;
        order.statusHistory.push({
            status,
            timestamp: new Date(),
            updatedBy: req.user._id,
            note: note || null,
        });

        await order.save({ validateBeforeSave: false });

        emitOrderStatusUpdate(order.customer._id, order);
        emitOrderUpdateToRestaurant(order.restaurant._id, order);

        res.status(200).json({
            success: true,
            message: `Order status updated to ${status}`,
            order,
        });
    } catch (error) {
        if (error.name === "CastError") {
            return res.status(400).json({
                success: false,
                message: "Invalid order ID",
            });
        }
        console.error("Update order status error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to update order status",
        });
    }
};

//assign agent to order
const assignAgent = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate("customer", "name email phone")
            .populate("restaurant", "name address phone owner");

        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Order not found",
            });
        }

        if (order.status !== "ready_for_pickup") {
            return res.status(400).json({
                success: false,
                message: `Cannot accept order with status: ${order.status}. Order must be ready_for_pickup.`,
            });
        }

        if (order.deliveryAgent) {
            return res.status(400).json({
                success: false,
                message: "This order is already assigned to a delivery agent",
            });
        }

        order.deliveryAgent = req.user._id;
        order.status = "out_for_delivery";
        order.estimatedDeliveryTime = 30; //Default 30 min ETA
        order.statusHistory.push({
            status: "out_for_delivery",
            timestamp: new Date(),
            updatedBy: req.user._id,
            note: "Picked up by delivery agent",
        });

        await order.save({ validateBeforeSave: false });

        await order.populate("deliveryAgent", "name phone");

        //Notify customer and restaurant via socket
        emitOrderStatusUpdate(order.customer._id, order);
        emitOrderUpdateToRestaurant(order.restaurant._id, order);

        res.status(200).json({
            success: true,
            message: "Order accepted. You are now the delivery agent.",
            order,
        });
    } catch (error) {
        if (error.name === "CastError") {
            return res
                .status(400)
                .json({ success: false, message: "Invalid order ID" });
        }
        console.error("Assign agent error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to accept order",
        });
    }
};

const updateAgentLocation = async (req, res) => {
    try {
        const { latitude, longitude } = req.body;

        if (!latitude || !longitude) {
            return res.status(400).json({
                success: false,
                message: "latitude and longitude are required",
            });
        }

        const order = await Order.findById(req.params.id).select(
            "deliveryAgent status customer restaurant deliveryLocation"
        );

        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Order not found",
            });
        }

        //Only the assigned agent can update location
        if (
            !order.deliveryAgent ||
            order.deliveryAgent.toString() !== req.user._id.toString()
        ) {
            return res.status(403).json({
                success: false,
                message: "You are not the assigned delivery agent for this order",
            });
        }

        if (order.status !== "out_for_delivery") {
            return res.status(400).json({
                success: false,
                message: "Location updates only allowed for orders out for delivery",
            });
        }

        //Update the location in GeoJSON format
        order.deliveryLocation = {
            type: "Point",
            coordinates: [parseFloat(longitude), parseFloat(latitude)],
        };

        await order.save({ validateBeforeSave: false });

        //Emit location update to the customer via socket
        try {
            const { getIO } = require("../socket/socketServer");
            const io = getIO();
            io.to(`user_${order.customer}`).emit("agent_location_update", {
                orderId: order._id,
                location: {
                    latitude: parseFloat(latitude),
                    longitude: parseFloat(longitude),
                },
            });
            io.to(`order_${order._id}`).emit("agent_location_update", {
                orderId: order._id,
                location: {
                    latitude: parseFloat(latitude),
                    longitude: parseFloat(longitude),
                },
            });
        } catch (socketError) {
            console.error("Socket emit error (location):", socketError.message);
        }

        res.status(200).json({
            success: true,
            message: "Location updated",
        });
    } catch (error) {
        if (error.name === "CastError") {
            return res
                .status(400)
                .json({ success: false, message: "Invalid order ID" });
        }
        console.error("Update location error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to update location",
        });
    }
};

//Returns all ready for pickup orders with no agent assigned yet
const getAvailableOrders = async (req, res) => {
    try {
        const orders = await Order.find({
            status: "ready_for_pickup",
            deliveryAgent: null,
        })
            .populate("restaurant", "name address phone")
            .populate("customer", "name phone")
            .sort({ createdAt: -1 })
            .select("-__v");

        res.status(200).json({
            success: true,
            count: orders.length,
            orders,
        });
    } catch (error) {
        console.error("Get available orders error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch available orders",
        });
    }
};

//Returns the current active delivery (out for delivery) for this agent
const getAgentActiveOrder = async (req, res) => {
    try {
        const order = await Order.findOne({
            deliveryAgent: req.user._id,
            status: "out_for_delivery",
        })
            .populate("restaurant", "name address phone location")
            .populate("customer", "name phone")
            .select("-__v");

        res.status(200).json({
            success: true,
            order: order || null,
        });
    } catch (error) {
        console.error("Get agent active order error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch active order",
        });
    }
};


//Can only rate a delivered order and only once
const rateOrder = async (req, res) => {
    try {
        const { score, review } = req.body;

        //Validate score
        if (!score || score < 1 || score > 5) {
            return res.status(400).json({
                success: false,
                message: "Rating score must be between 1 and 5",
            });
        }

        const order = await Order.findById(req.params.id);

        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Order not found",
            });
        }

        //Verify the customer owns this order
        if (order.customer.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: "You can only rate your own orders",
            });
        }

        //Only delivered orders can be rated
        if (order.status !== "delivered") {
            return res.status(400).json({
                success: false,
                message: "You can only rate delivered orders",
            });
        }

        //Prevent double rating
        if (order.rating && order.rating.score) {
            return res.status(400).json({
                success: false,
                message: "You have already rated this order",
            });
        }

        //Save rating on the order
        order.rating = {
            score: Number(score),
            review: review?.trim() || null,
            createdAt: new Date(),
        };

        await order.save({ validateBeforeSave: false });

        //Update restaurant's average rating via aggregation
        const Restaurant = require("../models/Restaurant");
        const aggregationResult = await Order.aggregate([
            {
                $match: {
                    restaurant: order.restaurant,
                    status: "delivered",
                    "rating.score": { $exists: true, $ne: null },
                },
            },
            //Group all matching orders and calculate average score and count total ratings
            {
                $group: {
                    _id: null,
                    averageRating: { $avg: "$rating.score" },
                    totalRatings: { $sum: 1 },
                },
            },
        ]);

        if (aggregationResult.length > 0) {
            const { averageRating, totalRatings } = aggregationResult[0];
            await Restaurant.findByIdAndUpdate(order.restaurant, {
                averageRating: Math.round(averageRating * 10) / 10,
                totalRatings,
            });
        }

        res.status(200).json({
            success: true,
            message: "Thank you for your rating!",
            rating: order.rating,
        });
    } catch (error) {
        if (error.name === "CastError") {
            return res.status(400).json({
                success: false,
                message: "Invalid order ID",
            });
        }
        console.error("Rate order error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to submit rating",
        });
    }
};

module.exports = {
    createOrder,
    getMyOrders,
    getOrderById,
    getRestaurantOrders,
    updateOrderStatus,
    assignAgent,
    updateAgentLocation,
    getAvailableOrders,
    getAgentActiveOrder,
    rateOrder,
};