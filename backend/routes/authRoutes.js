const express = require("express");
const router = express.Router();

const {
    register,
    login,
    logout,
    refreshToken,
    getMe,
} = require("../controllers/authController");

const { protect } = require("../middleware/authMiddleware");

//Public routes - no authentication needed
router.post("/register", register);
router.post("/login", login);
router.post("/refresh-token", refreshToken);

//Private routes - must be logged in
router.post("/logout", protect, logout);
router.get("/me", protect, getMe);

module.exports = router;