const User = require("../models/User");
const { sendTokenResponse } = require("../utils/generateTokens");
const jwt = require("jsonwebtoken");

const register = async (req, res, next) => {
    try {
        const { name, email, password, role, phone } = req.body;

        //Input validation
        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "Please provide name, email and password",
            });
        }

        //Check for existing user
        const existingUser = await User.findOne({ email: email.toLowerCase() });

        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "An account with this email already exists",
            });
        }

        //Prevent admin self registration
        const allowedRoles = ["customer", "restaurant_owner", "delivery_agent"];
        const userRole = allowedRoles.includes(role) ? role : "customer";

        //Create the user
        const user = await User.create({
            name: name.trim(),
            email: email.toLowerCase().trim(),
            password,
            role: userRole,
            phone: phone || null,
        });

        //Send response with tokens
        await sendTokenResponse(user, 201, res);

    } catch (error) {
        if (error.name === "ValidationError") {
            const messages = Object.values(error.errors).map((e) => e.message);
            return res.status(400).json({
                success: false,
                message: messages.join(", "),
            });
        }

        console.error("Register error:", error);
        res.status(500).json({
            success: false,
            message: "Server error during registration",
        });
    }
};


const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        //Input validation
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Please provide email and password",
            });
        }

        //Find user and explicitly include password
        const user = await User.findOne({ email: email.toLowerCase() }).select(
            "+password"
        );

        //Check user exists
        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password",
            });
        }

        //Check account is active
        if (!user.isActive) {
            return res.status(403).json({
                success: false,
                message: "Your account has been deactivated. Please contact support.",
            });
        }

        //Verify password
        const isPasswordCorrect = await user.comparePassword(password);

        if (!isPasswordCorrect) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password",
            });
        }

        //Send response with tokens
        await sendTokenResponse(user, 200, res);

    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({
            success: false,
            message: "Server error during login",
        });
    }
};


const logout = async (req, res) => {
    try {
        //Clear refresh token from database
        await User.findByIdAndUpdate(req.user.id, { refreshToken: null });

        //Clear the HttpOnly cookie
        res
            .status(200)
            .cookie("refreshToken", "", {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
                maxAge: 0,
            })
            .json({
                success: true,
                message: "Logged out successfully",
            });
    } catch (error) {
        console.error("Logout error:", error);
        res.status(500).json({
            success: false,
            message: "Server error during logout",
        });
    }
};


const refreshToken = async (req, res) => {
    try {
        //Read refresh token from HttpOnly cookie
        const token = req.cookies.refreshToken;

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "No refresh token found. Please login again.",
            });
        }

        //Verify the token is valid and not expired
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
        } catch (err) {
            return res.status(401).json({
                success: false,
                message: "Refresh token is invalid or expired. Please login again.",
            });
        }

        //Find user and verify stored token matches
        const user = await User.findById(decoded.id).select("+refreshToken");

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "User not found. Please login again.",
            });
        }

        //Token rotation security check
        if (user.refreshToken !== token) {
            return res.status(401).json({
                success: false,
                message: "Refresh token mismatch. Please login again.",
            });
        }

        if (!user.isActive) {
            return res.status(403).json({
                success: false,
                message: "Account deactivated.",
            });
        }

        //Issue new tokens
        await sendTokenResponse(user, 200, res);

    } catch (error) {
        console.error("Refresh token error:", error);
        res.status(500).json({
            success: false,
            message: "Server error during token refresh",
        });
    }
};

//GET CURRENT USER
const getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        res.status(200).json({
            success: true,
            user,
        });
    } catch (error) {
        console.error("Get me error:", error);
        res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};

module.exports = { register, login, logout, refreshToken, getMe };