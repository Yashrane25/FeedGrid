const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Name is required"],
            trim: true,
            minlength: [2, "Name must be at least 2 characters"],
            maxlength: [50, "Name cannot exceed 50 characters"],
        },

        email: {
            type: String,
            required: [true, "Email is required"],
            unique: true,
            lowercase: true,
            trim: true,
            match: [
                /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
                "Please enter a valid email address",
            ],
        },

        password: {
            type: String,
            required: [true, "Password is required"],
            minlength: [6, "Password must be at least 6 characters"],
            select: false,
        },

        role: {
            type: String,
            enum: {
                values: ["customer", "restaurant_owner", "delivery_agent", "admin"],
                message: "{VALUE} is not a valid role",
            },
            default: "customer",
        },

        phone: {
            type: String,
            trim: true,
            default: null,
        },

        address: {
            street: { type: String, trim: true, default: null },
            city: { type: String, trim: true, default: null },
            state: { type: String, trim: true, default: null },
            pincode: { type: String, trim: true, default: null },
        },

        avatar: {
            type: String,
            default: null,
        },

        isActive: {
            type: Boolean,
            default: true,
        },

        refreshToken: {
            type: String,
            default: null,
            select: false,
        },
    },

    {
        timestamps: true,
    }
);

userSchema.index({ role: 1 });
userSchema.index({ role: 1, isActive: 1 });

userSchema.pre("save", async function () {
    if (!this.isModified("password")) {
        return;
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.comparePassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model("User", userSchema);
module.exports = User;