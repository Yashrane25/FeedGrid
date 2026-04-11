import mongoose from "mongoose";

const restaurantSchema = new mongoose.Schema(
    {
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        name: {
            type: String,
            required: [true, "Restaurant name is required"],
            trim: true,
        },

        description: {
            type: String,
            trim: true,
            default: "",
        },

        //cuisine is an ARRAY because a restaurant can serve multiple types e.g. ["Indian", "Chinese"]
        cuisine: [
            {
                type: String,
                lowercase: true,
                trim: true,
            },
        ],

        address: {
            street: { type: String, required: true },
            city: { type: String, required: true },
            state: { type: String, required: true },
            pincode: { type: String, required: true },
        },

        //GeoJSON Point
        //coordinates: [longitude, latitude]
        location: {
            type: {
                type: String,
                enum: ["Point"],
                default: "Point",
            },
            coordinates: {
                type: [Number],
                default: [0, 0],
            },
        },

        phone: { type: String, trim: true },

        //Cloudinary returns a URL after upload we store just the URL
        image: {
            type: String,
            default: "",
        },

        //Average rating, update this whenever a new review is submitted
        rating: {
            type: Number,
            default: 0,
            min: 0,
            max: 5,
        },

        totalRatings: {
            type: Number,
            default: 0,
        },

        //owner toggles to stop accepting orders
        isOpen: {
            type: Boolean,
            default: true,
        },

        //Admin can deactivate a restaurant
        isActive: {
            type: Boolean,
            default: true,
        },

        deliveryTime: {
            type: Number,
            default: 30,
        },

        minimumOrder: {
            type: Number,
            default: 0,
        },
    },
    { timestamps: true }
);

//Create a geospatial index on the location field
restaurantSchema.index({ location: "2dsphere" });

//Text index for search allows full text search on name and cuisine
restaurantSchema.index({ name: "text", cuisine: "text" });

export default mongoose.model("Restaurant", restaurantSchema);