import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../models/User.js";

// dotenv.config({ path: "../.env" });
dotenv.config();
console.log("MONGO_URI:", process.env.MONGO_URI);

const createAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to MongoDB");

        //Check if admin already exists
        const existing = await User.findOne({ role: "admin" });
        if (existing) {
            console.log("Admin already exists:", existing.email);
            process.exit(0);
        }

        const admin = await User.create({
            name: "Admin",
            email: "admin@feedgrid.com",
            password: "Admin@123456",
            role: "admin",
        });

        console.log("Admin created successfully!");
        console.log("Email:   ", admin.email);
        console.log("Password: Admin@123456");
        console.log("Change this password after first login.");
        process.exit(0);
    } catch (error) {
        console.error("Error creating admin:", error.message);
        process.exit(1);
    }
};

createAdmin();