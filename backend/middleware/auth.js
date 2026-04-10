/* Checks the JWT token sent by the user, verifies if the token is valid or not, If valid -> it extracts user info(id + role), It stores that info in req.user so protected routes can use it., Then it allows the request to continue */

import { verifyAccessToken } from "../config/jwt.js";

//checks if user is logged in (JWT authentication)
export const protect = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer")) {
        return res.status(401).json({ message: "Authentication required. Please log in to continue." });
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = verifyAccessToken(token);
        req.user = decoded;
        next();
    } catch (error) {
        if (error.name === "TokenExpiredError") {
            return res.status(401).json({ message: "Your session has expired. Please log in again." });
        }
        return res.status(401).json({ message: "Invalid or malformed token. Please log in again." });
    }
};


//Role-based access control middleware (authorization / roles)
export const restrictTo = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                message: "You do not have permission to access this resource."
            });
        }
        next();
    };
};