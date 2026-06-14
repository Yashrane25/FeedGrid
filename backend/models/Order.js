import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema({
    menuItemId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "MenuItem",
    },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    image: { type: String, default: "" },
    isVeg: { type: Boolean, default: true },
    quantity: { type: Number, required: true, min: 1 },
});

const orderSchema = new mongoose.Schema(
    {
        customer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        restaurant: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Restaurant",
            required: true,
        },

        items: [orderItemSchema],

        deliveryAddress: {
            street: { type: String, required: true },
            city: { type: String, required: true },
            state: { type: String, required: true },
            pincode: { type: String, required: true },
        },

        subtotal: { type: Number, required: true },
        deliveryFee: { type: Number, default: 30 },
        tax: { type: Number, default: 0 },
        totalAmount: { type: Number, required: true },

        //Order Status State Machine, Each state maps to a Socket.io event
        status: {
            type: String,
            enum: [
                "pending",          //Order placed, payment done, waiting for restaurant
                "confirmed",        //Restaurant accepted the order
                "preparing",        //Kitchen is preparing
                "out_for_delivery", //Delivery agent picked up
                "delivered",        //Customer received
                "cancelled",        //Cancelled by restaurant or customer
            ],
            default: "pending",
        },

        //Payment
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

        //Stripe PaymentIntent ID stored to issue refunds if needed
        stripePaymentIntentId: {
            type: String,
            default: "",
        },

        //Delivery Agent
        deliveryAgent: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },

        //Estimated delivery time in minutes (set when restaurant confirms)
        estimatedDeliveryTime: {
            type: Number,
            default: 30,
        },

        //Actual timestamps for each status change
        statusTimestamps: {
            confirmed: { type: Date },
            preparing: { type: Date },
            out_for_delivery: { type: Date },
            delivered: { type: Date },
            cancelled: { type: Date },
        },

        //Rating
        rating: {
            score: { type: Number, min: 1, max: 5 },
            review: { type: String, trim: true },
            ratedAt: { type: Date },
        },

        //Special instructions from customer
        specialInstructions: {
            type: String,
            trim: true,
            default: "",
        },
    },
    { timestamps: true }
);

//Index for fast queries
orderSchema.index({ customer: 1, createdAt: -1 });
orderSchema.index({ restaurant: 1, createdAt: -1 });
orderSchema.index({ status: 1 });

export default mongoose.model("Order", orderSchema);