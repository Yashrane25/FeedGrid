import User from "../models/User.js";
import { generateTokens, verifyRefreshToken } from "../config/jwt.js";

/* REGISTER  */
export const register = async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        //Check if email already exists before trying to create user to avoid duplicate key error.
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "An account with this email already exists." });
        }

        //password hashing happens automatically in our pre-save hook
        const user = await User.create({ name, email, password, role });

        //Generate access + refresh tokens(User is automatically logged in after register)
        const { accessToken } = generateTokens(res, user._id, user.role);

        res.status(201).json({
            message: "Your account has been created successfully.",
            accessToken,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
        });
    }
    catch (error) {
        res.status(500).json({ message: "Something went wrong. Please try again later." });
    }
}

/* LOGIN  */
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email }).select("+password");

        //invalid credentials
        if (!user) {
            return res.status(401).json({ message: "Invalid email or password." });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ message: "Invalid email or password." });
        }

        const { accessToken, refreshToken } = generateTokens(res, user._id, user.role);

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        res.status(200).json({
            message: "Welcome back! You’re now logged in.",
            accessToken,
            user: { id: user._id, name: user.name, email: user.email, role: user.role },
        });
    }
    catch (error) {
        res.status(500).json({ message: "Something went wrong. Please try again later." });
    }
};


/* REFRESH TOKEN */
//Called automatically by the frontend when access token expires
export const refreshToken = async (req, res) => {
    try {
        const token = req.cookies.refreshToken;
        if (!token) {
            return res.status(401).json({ message: "Your session has expired. Please log in again." });
        }

        const decoded = verifyRefreshToken(token);
        const user = await User.findById(decoded.id).select("+refreshToken");

        if (!user || user.refreshToken !== token) {
            return res.status(401).json({ message: "Your session has expired. Please log in again." });
        }

        const { accessToken } = generateTokens(res, user._id, user.role);
        res.json({ message: "Session refreshed successfully.", accessToken });
    }
    catch (error) {
        res.status(401).json({ message: "Your session has expired. Please log in again." });
    }
};


/* LOGOUT  */
export const logout = async (req, res) => {
    try {
        await User.findByIdAndUpdate(req.user.id, { refreshToken: null });

        res.clearCookie("refreshToken", { httpOnly: true, sameSite: "strict" });
        res.json({ message: "You have been logged out successfully." });
    }
    catch (error) {
        res.status(500).json({ message: "Something went wrong. Please try again later." });
    }
};