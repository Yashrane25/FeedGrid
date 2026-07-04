const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const Order = require("../models/Order");
const Restaurant = require("../models/Restaurant");
const Cart = require("../models/MenuItem");

const createPaymentIntent = async (req, res) => {
    try {
        const { items, restaurantId, deliveryAddress, customerNote } = req.body;

        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Cart is empty",
            });
        }

        if (!restaurantId) {
            return res.status(400).json({
                success: false,
                message: "Restaurant ID is required",
            });
        }

        if (
            !deliveryAddress ||
            !deliveryAddress.street ||
            !deliveryAddress.city ||
            !deliveryAddress.state ||
            !deliveryAddress.pincode
        ) {
            return res.status(400).json({
                success: false,
                message: "Complete delivery address is required",
            });
        }

        //Verify restaurant exists and is open
        const restaurant = await Restaurant.findById(restaurantId);

        if (!restaurant || !restaurant.isActive || !restaurant.isApproved) {
            return res.status(404).json({
                success: false,
                message: "Restaurant not found or unavailable",
            });
        }

        if (!restaurant.isOpen) {
            return res.status(400).json({
                success: false,
                message: "Restaurant is currently closed",
            });
        }

        //Server side price verification
        const MenuItem = require("../models/MenuItem");

        const itemIds = items.map((item) => item._id);
        const dbItems = await MenuItem.find({
            _id: { $in: itemIds },
            restaurant: restaurantId,
            isAvailable: true,
        });

        if (dbItems.length !== items.length) {
            return res.status(400).json({
                success: false,
                message:
                    "Some items are no longer available. Please refresh and try again.",
            });
        }

        //verified items array with DB prices
        const verifiedItems = items.map((cartItem) => {
            const dbItem = dbItems.find(
                (db) => db._id.toString() === cartItem._id
            );
            return {
                menuItem: dbItem._id,
                name: dbItem.name,
                price: dbItem.price,
                quantity: cartItem.quantity,
                image: dbItem.image,
            };
        });

        //Calculate totals server side
        const subtotal = verifiedItems.reduce(
            (sum, item) => sum + item.price * item.quantity,
            0
        );

        if (
            restaurant.minimumOrder > 0 &&
            subtotal < restaurant.minimumOrder
        ) {
            return res.status(400).json({
                success: false,
                message: `Minimum order amount is ₹${restaurant.minimumOrder}`,
            });
        }

        const deliveryFee = restaurant.deliveryFee || 0;
        const tax = Math.round(subtotal * 0.05); // 5% GST
        const total = subtotal + deliveryFee + tax;

        //Create Stripe PaymentIntent 
        const paymentIntent = await stripe.paymentIntents.create({
            amount: total * 100, //Convert rupees to paise
            currency: "INR",

            metadata: {
                customerId: req.user._id.toString(),
                restaurantId: restaurantId,
                restaurantName: restaurant.name,
            },

            automatic_payment_methods: {
                enabled: true,
            },
        });

        res.status(200).json({
            success: true,
            clientSecret: paymentIntent.client_secret,
            paymentIntentId: paymentIntent.id,
            amounts: {
                subtotal,
                deliveryFee,
                tax,
                total,
            },
            verifiedItems,
        });
    } catch (error) {
        console.error("Create payment intent error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to initialize payment",
        });
    }
};

module.exports = { createPaymentIntent };