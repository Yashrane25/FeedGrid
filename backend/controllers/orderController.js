import Stripe from "stripe";
import Order from "../models/Order.js";
import Restaurant from "../models/Restaurant.js";
import { getIO } from "../socket/index.js";

let stripe;

const getStripe = () => {
    if (!stripe) {
        stripe = new stripe(process.env.STRIPE_SECRET_KEY);
    }
    return stripe;
}

//Create Stripe PaymentIntent
export const createPaymentIntent = async (req, res) => {
    try {
        const { restaurantId, items, deliveryAddress, specialInstructions } = req.body;

        //Validate restaurant exists and is open
        const restaurant = await Restaurant.findById(restaurantId);
        if (!restaurant) {
            return res.status(404).json({ message: "Restaurant not found." });
        }
        if (!restaurant.isOpen) {
            return res.status(400).json({ message: "This restaurant is currently closed." });
        }

        //Refetch item prices from database
        const { MenuItem } = await import("../models/MenuItem.js");
        const menuItemIds = items.map((i) => i.menuItemId);
        const dbItems = await MenuItem.find({ _id: { $in: menuItemIds } });

        const itemMap = {};
        dbItems.forEach((item) => { itemMap[item._id.toString()] = item; });

        //Calculate subtotal using DB prices
        let subtotal = 0;
        const verifiedItems = items.map((item) => {
            const dbItem = itemMap[item.menuItemId];
            if (!dbItem) throw new Error(`Menu item ${item.menuItemId} not found`);
            subtotal += dbItem.price * item.quantity;
            return {
                menuItemId: dbItem._id,
                name: dbItem.name,
                price: dbItem.price,
                image: dbItem.image,
                isVeg: dbItem.isVeg,
                quantity: item.quantity,
            };
        });

        const deliveryFee = 30;
        const tax = Math.round(subtotal * 0.05);  //5% GST
        const totalAmount = subtotal + deliveryFee + tax;

        //Create Stripe PaymentIntent
        //amount must be in smallest currency unit (paise for INR)
        //So ₹100 = 10000 paise
        const paymentIntent = await getStripe().paymentIntents.create({
            amount: totalAmount * 100,  //Convert rupees to paise
            currency: "inr",
            //metadata is stored with the payment in Stripe's dashboard, We use it in the webhook to know which order this payment is for
            metadata: {
                customerId: req.user.id,
                restaurantId: restaurantId,
            },
        });

        //Temporarily store order data in the PaymentIntent metadata, webhook will use the paymentIntentId to find and create the order
        await stripe.paymentIntents.update(paymentIntent.id, {
            metadata: {
                customerId: req.user.id,
                restaurantId,
                itemsJson: JSON.stringify(verifiedItems),
                deliveryAddressJson: JSON.stringify(deliveryAddress),
                subtotal: subtotal.toString(),
                deliveryFee: deliveryFee.toString(),
                tax: tax.toString(),
                totalAmount: totalAmount.toString(),
                specialInstructions: specialInstructions || "",
            },
        });

        res.json({
            clientSecret: paymentIntent.client_secret,
            //Send amount breakdown to display on checkout page
            breakdown: { subtotal, deliveryFee, tax, totalAmount },
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

//Stripe Webhook
export const stripeWebhook = async (req, res) => {
    const sig = req.headers["stripe-signature"];

    let event;
    try {
        //stripe.webhooks.constructEvent verifies the signature using our webhook secret
        event = getStripe().webhooks.constructEvent(
            req.body,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET
        );
    } catch (err) {
        console.error("Webhook signature verification failed:", err.message);
        return res.status(400).json({ message: "Invalid webhook signature." });
    }

    if (event.type === "payment_intent.succeeded") {
        const paymentIntent = event.data.object;
        await handlePaymentSuccess(paymentIntent);
    }

    //respond 200 quickly Stripe will retry if it doesnt hear back in time
    res.json({ received: true });
};

//Called when payment succeeds
const handlePaymentSuccess = async (paymentIntent) => {
    try {
        //Check if order already exists for this payment 
        const existingOrder = await Order.findOne({
            stripePaymentIntentId: paymentIntent.id,
        });
        if (existingOrder) return;

        //Parse data we stored in metadata
        const {
            customerId, restaurantId,
            itemsJson, deliveryAddressJson,
            subtotal, deliveryFee, tax, totalAmount,
            specialInstructions,
        } = paymentIntent.metadata;

        const order = await Order.create({
            customer: customerId,
            restaurant: restaurantId,
            items: JSON.parse(itemsJson),
            deliveryAddress: JSON.parse(deliveryAddressJson),
            subtotal: parseFloat(subtotal),
            deliveryFee: parseFloat(deliveryFee),
            tax: parseFloat(tax),
            totalAmount: parseFloat(totalAmount),
            paymentStatus: "paid",
            paymentMethod: "stripe",
            stripePaymentIntentId: paymentIntent.id,
            specialInstructions,
        });

        //Notify restaurant dashboard in real time via Socket.io
        try {
            const io = getIO();
            io.to(`restaurant:${restaurantId}`).emit("order:new", {
                order: await order.populate("customer", "name phone"),
            });
        } catch (socketError) {
            console.error("Socket notification failed:", socketError.message);
        }

        console.log("Order created:", order._id);
    } catch (error) {
        console.error("handlePaymentSuccess error:", error);
    }
};

//GET ALL ORDERS for the logged in customer 
export const getMyOrders = async (req, res) => {
    try {
        const orders = await Order.find({ customer: req.user.id })
            .populate("restaurant", "name image address")
            .sort({ createdAt: -1 }); //Newest first

        res.json({ orders });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

//GET SINGLE ORDER
export const getOrderById = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate("customer", "name email phone")
            .populate("restaurant", "name image address phone")
            .populate("deliveryAgent", "name phone");

        if (!order) return res.status(404).json({ message: "Order not found." });

        //Authorization: only relevant parties can view the order
        const userId = req.user.id;
        const isCustomer = order.customer._id.toString() === userId;
        const isDeliveryAgent = order.deliveryAgent?._id.toString() === userId;
        const restaurant = await Restaurant.findById(order.restaurant._id);
        const isRestaurantOwner = restaurant?.owner.toString() === userId;
        const isAdmin = req.user.role === "admin";

        if (!isCustomer && !isDeliveryAgent && !isRestaurantOwner && !isAdmin) {
            return res.status(403).json({ message: "Access denied." });
        }

        res.json({ order });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

//UPDATE ORDER STATUS
export const updateOrderStatus = async (req, res) => {
    try {
        const { status, estimatedDeliveryTime } = req.body;
        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({ message: "Order not found." });
        }

        const validTransitions = {
            pending: ["confirmed", "cancelled"],
            confirmed: ["preparing", "cancelled"],
            preparing: ["out_for_delivery"],
            out_for_delivery: ["delivered"],
            delivered: [],
            cancelled: [],
        };

        if (!validTransitions[order.status]?.includes(status)) {
            return res.status(400).json({
                message: `Cannot transition from "${order.status}" to "${status}"`,
            });
        }

        order.status = status;
        order.statusTimestamps[status] = new Date();

        if (estimatedDeliveryTime) {
            order.estimatedDeliveryTime = estimatedDeliveryTime;
        }

        await order.save();

        try {
            const io = getIO();
            io.to(`order:${order._id}`).emit("order:statusUpdate", {
                orderId: order._id,
                status: order.status,
                estimatedDeliveryTime: order.estimatedDeliveryTime,
                timestamp: order.statusTimestamps[status],
            });
        } catch (socketError) {
            console.error("Socket emit failed:", socketError.message);
        }

        res.json({ message: "Status updated", order });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

//GET RESTAURANTS ORDERS 
export const getRestaurantOrders = async (req, res) => {
    try {
        const restaurant = await Restaurant.findOne({ owner: req.user.id });
        if (!restaurant) return res.status(404).json({ message: "Restaurant not found." });

        const { status } = req.query;

        const query = { restaurant: restaurant._id };
        if (status) query.status = status;

        const orders = await Order.find(query)
            .populate("customer", "name phone")
            .sort({ createdAt: -1 });

        res.json({ orders });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

//SUBMIT RATING
export const rateOrder = async (req, res) => {
    try {
        const { score, review } = req.body;
        const order = await Order.findOne({
            _id: req.params.id,
            customer: req.user.id,    //Only the customer who placed the order can rate it
            status: "delivered",    //Can only rate delivered orders
        });

        if (!order) {
            return res.status(404).json({ message: "Order not found or not yet delivered." });
        }

        if (order.rating?.score) {
            return res.status(400).json({ message: "You have already rated this order." });
        }

        order.rating = { score, review, ratedAt: new Date() };
        await order.save();

        //Recalculate restaurant's average rating using MongoDB aggregation pipeline
        //$match: only this restaurant's orders
        //$match rating.score exists: only rated orders
        //$group: calculate average and count
        const ratingData = await Order.aggregate([
            {
                $match: {
                    restaurant: order.restaurant,
                    "rating.score": { $exists: true },
                },
            },
            {
                $group: {
                    _id: "$restaurant",
                    avgRating: { $avg: "$rating.score" },
                    totalRatings: { $sum: 1 },
                },
            },
        ]);

        if (ratingData.length > 0) {
            await Restaurant.findByIdAndUpdate(order.restaurant, {
                rating: Math.round(ratingData[0].avgRating * 10) / 10,
                totalRatings: ratingData[0].totalRatings,
            });
        }

        res.json({ message: "Rating submitted. Thank you!" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

//REORDER
export const reorder = async (req, res) => {
    try {
        const previousOrder = await Order.findOne({
            _id: req.params.id,
            customer: req.user.id,
        });

        if (!previousOrder) {
            return res.status(404).json({ message: "Order not found." });
        }

        const restaurant = await Restaurant.findById(previousOrder.restaurant);
        if (!restaurant?.isOpen) {
            return res.status(400).json({ message: "Restaurant is currently closed." });
        }

        res.json({
            restaurantId: previousOrder.restaurant,
            restaurantName: restaurant.name,
            items: previousOrder.items,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};