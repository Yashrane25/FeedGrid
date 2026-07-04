const mongoose = require("mongoose");

const menuItemSchema = new mongoose.Schema(
    {
        restaurant: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Restaurant",
            required: [true, "Menu item must belong to a restaurant"],
        },

        name: {
            type: String,
            required: [true, "Item name is required"],
            trim: true,
            maxlength: [100, "Item name cannot exceed 100 characters"],
        },

        description: {
            type: String,
            trim: true,
            maxlength: [300, "Description cannot exceed 300 characters"],
            default: null,
        },

        price: {
            type: Number,
            required: [true, "Price is required"],
            min: [1, "Price must be at least ₹1"],
        },

        category: {
            type: String,
            required: [true, "Category is required"],
            trim: true,
        },

        image: {
            type: String,
            default: null,
        },

        isVegetarian: {
            type: Boolean,
            default: false,
        },

        isVegan: {
            type: Boolean,
            default: false,
        },

        //new ADDED
        isNonVeg: {
            type: Boolean,
            default: false,
        },

        isAvailable: {
            type: Boolean,
            default: true,
        },

        preparationTime: {
            type: Number,
            default: 15,
            min: [1, "Preparation time must be at least 1 minute"],
        },

        spiceLevel: {
            type: String,
            enum: {
                values: ["mild", "medium", "hot", "extra_hot", null],
                message: "{VALUE} is not a valid spice level",
            },
            default: null,
        },

        tags: {
            type: [String],
            default: [],
        },
    },
    {
        timestamps: true,
    }
);

//INDEXES
menuItemSchema.index({ restaurant: 1 });
menuItemSchema.index({ restaurant: 1, category: 1 });
menuItemSchema.index({ restaurant: 1, isAvailable: 1 });
menuItemSchema.index({ name: "text", description: "text" });

const MenuItem = mongoose.model("MenuItem", menuItemSchema);
module.exports = MenuItem;