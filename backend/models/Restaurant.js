const mongoose = require("mongoose");

const restaurantSchema = new mongoose.Schema(
    {
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: [true, "Restaurant must have an owner"],
        },

        name: {
            type: String,
            required: [true, "Restaurant name is required"],
            trim: true,
            minlength: [2, "Name must be at least 2 characters"],
            maxlength: [100, "Name cannot exceed 100 characters"],
        },

        description: {
            type: String,
            trim: true,
            maxlength: [500, "Description cannot exceed 500 characters"],
            default: null,
        },

        cuisineType: {
            type: [String],
            required: [true, "At least one cuisine type is required"],
            validate: {
                validator: function (arr) {
                    return arr.length > 0;
                },
                message: "Please specify at least one cuisine type",
            },
        },

        address: {
            street: {
                type: String,
                required: [true, "Street address is required"],
                trim: true,
            },
            city: {
                type: String,
                required: [true, "City is required"],
                trim: true,
            },
            state: {
                type: String,
                required: [true, "State is required"],
                trim: true,
            },
            pincode: {
                type: String,
                required: [true, "Pincode is required"],
                trim: true,
            },
        },

        location: {
            type: {
                type: String,
                enum: ["Point"], //Must always be "Point" for a single location
                default: "Point",
            },
            coordinates: {
                type: [Number], //[longitude, latitude]
                default: [0, 0],
            },
        },

        images: {
            type: [String],
            default: [],
        },

        phone: {
            type: String,
            trim: true,
            required: [true, "Restaurant phone number is required"],
        },

        email: {
            type: String,
            trim: true,
            lowercase: true,
            default: null,
        },

        openingHours: {
            open: {
                type: String,
                default: "09:00",
            },
            close: {
                type: String,
                default: "23:00",
            },
        },

        isOpen: {
            type: Boolean,
            default: true,
        },

        isApproved: {
            type: Boolean,
            default: false,
        },

        isActive: {
            type: Boolean,
            default: true,
        },

        deliveryTime: {
            type: Number,
            default: 30,
            min: [5, "Delivery time must be at least 5 minutes"],
            max: [120, "Delivery time cannot exceed 120 minutes"],
        },

        minimumOrder: {
            type: Number,
            default: 0,
            min: [0, "Minimum order cannot be negative"],
        },

        deliveryFee: {
            type: Number,
            default: 0,
            min: [0, "Delivery fee cannot be negative"],
        },

        averageRating: {
            type: Number,
            default: 0,
            min: 0,
            max: 5,
        },
        totalRatings: {
            type: Number,
            default: 0,
        },
    },
    {
        timestamps: true,
    }
);

//INDEXES
restaurantSchema.index({ location: "2dsphere" });
restaurantSchema.index({ owner: 1 });
restaurantSchema.index({ "address.city": 1, isApproved: 1, isActive: 1 });
restaurantSchema.index({ cuisineType: 1 });
restaurantSchema.index({ name: "text", description: "text" });

const Restaurant = mongoose.model("Restaurant", restaurantSchema);
module.exports = Restaurant;