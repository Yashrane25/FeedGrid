const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
    {
        customer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: [true, "Order must have a customer"],
        },

        restaurant: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Restaurant",
            required: [true, "Order must have a restaurant"],
        },

        deliveryAgent: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },

        items: [
            {
                menuItem: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "MenuItem",
                },
                name: {
                    type: String,
                    required: true,
                },
                price: {
                    type: Number,
                    required: true,
                },
                quantity: {
                    type: Number,
                    required: true,
                    min: 1,
                },
                image: {
                    type: String,
                    default: null,
                },
            },
        ],

        subtotal: {
            type: Number,
            required: true,
            min: 0,
        },
        deliveryFee: {
            type: Number,
            required: true,
            min: 0,
            default: 0,
        },
        tax: {
            type: Number,
            required: true,
            min: 0,
            default: 0,
        },
        total: {
            type: Number,
            required: true,
            min: 0,
        },

        status: {
            type: String,
            enum: {
                values: [
                    "placed",        //Customer paid, order created
                    "confirmed",     //Restaurant confirmed the order
                    "preparing",     //Restaurant is preparing the food
                    "ready_for_pickup", //Food ready, waiting for delivery agent
                    "out_for_delivery", //Delivery agent picked up
                    "delivered",     //Customer received the order
                    "cancelled",     //Order was cancelled
                ],
                message: "{VALUE} is not a valid order status",
            },
            default: "placed",
        },

        statusHistory: [
            {
                status: {
                    type: String,
                    required: true,
                },
                timestamp: {
                    type: Date,
                    default: Date.now,
                },
                updatedBy: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "User",
                    default: null,
                },
                note: {
                    type: String,
                    default: null,
                },
            },
        ],

        deliveryAddress: {
            street: { type: String, required: true },
            city: { type: String, required: true },
            state: { type: String, required: true },
            pincode: { type: String, required: true },
        },

        //payment
        paymentMethod: {
            type: String,
            enum: ["stripe", "cod"],
            default: "stripe",
        },
        paymentStatus: {
            type: String,
            enum: ["pending", "paid", "failed", "refunded"],
            default: "pending",
        },
        //Stripe PaymentIntent ID used to verify payment on the backend and to issue refunds later if needed
        stripePaymentIntentId: {
            type: String,
            default: null,
        },

        //delivery tracking
        deliveryLocation: {
            type: {
                type: String,
                enum: ["Point"],
                default: "Point",
            },
            coordinates: {
                type: [Number], //[longitude, latitude]
                default: [0, 0],
            },
        },

        //ETA in minutes updated during delivery
        estimatedDeliveryTime: {
            type: Number,
            default: null,
        },

        customerNote: {
            type: String,
            trim: true,
            maxlength: [300, "Note cannot exceed 300 characters"],
            default: null,
        },

        rating: {
            score: { type: Number, min: 1, max: 5, default: null },
            review: { type: String, default: null },
            createdAt: { type: Date, default: null },
        },
    },
    {
        timestamps: true,
    }
);


orderSchema.index({ customer: 1, createdAt: -1 });
orderSchema.index({ restaurant: 1, createdAt: -1 });
orderSchema.index({ deliveryAgent: 1, status: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ stripePaymentIntentId: 1 });

//orderNumber 
orderSchema.virtual("orderNumber").get(function () {
    return `#${this._id.toString().slice(-6).toUpperCase()}`;
});

//Make virtuals appear in JSON output
orderSchema.set("toJSON", { virtuals: true });
orderSchema.set("toObject", { virtuals: true });

const Order = mongoose.model("Order", orderSchema);
module.exports = Order;