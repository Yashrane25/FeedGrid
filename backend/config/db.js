const mongoose = require("mongoose");

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI);
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    }
    catch (error) {
        console.log(`MongoDB Connection Error: ${error.message}`);
        process.exit(1); //Exit the Node.js process with failure code 1
    }
}

module.exports = connectDB;