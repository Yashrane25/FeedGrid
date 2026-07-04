const jwt = require("jsonwebtoken");
const User = require("../models/User");

//PROTECT MIDDLEWARE
const protect = async (req, res, next) => {
    try {
        let token;

        //Extract token from Authorization header
        if (
            req.headers.authorization &&
            req.headers.authorization.startsWith("Bearer ")
        ) {
            token = req.headers.authorization.split(" ")[1];
        }

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Access denied. No token provided.",
            });
        }

        // //TEMPORARY for testing
        // console.log("AUTH HEADER:", req.headers.authorization);
        // console.log("TOKEN:", token);
        // console.log("JWT_ACCESS_SECRET:", process.env.JWT_ACCESS_SECRET);

        // try {
        //     const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
        //     console.log("DECODED:", decoded);
        // } catch (error) {
        //     console.error("JWT VERIFY ERROR:", error);
        //     throw error;
        // }

        //Verify the token
        const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

        //Fetch user from database
        const user = await User.findById(decoded.id);

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "User belonging to this token no longer exists.",
            });
        }

        if (!user.isActive) {
            return res.status(403).json({
                success: false,
                message: "Your account has been deactivated.",
            });
        }

        //Attach user to request
        req.user = user;

        //Pass to the next function
        next();

    } catch (error) {
        //jwt.verify() throws specific error types
        if (error.name === "JsonWebTokenError") {
            return res.status(401).json({
                success: false,
                message: "Invalid token.",
            });
        }
        if (error.name === "TokenExpiredError") {
            return res.status(401).json({
                success: false,
                message: "Token expired. Please refresh your session.",
            });
        }

        console.error("Auth middleware error:", error);
        res.status(500).json({
            success: false,
            message: "Server error during authentication",
        });
    }
};

//ROLE MIDDLEWARE
const restrictTo = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                //403 Forbidden — authenticated but not authorized
                success: false,
                message: `Access denied. This route is restricted to: ${roles.join(", ")}`,
            });
        }
        next();
    };
};

module.exports = { protect, restrictTo };