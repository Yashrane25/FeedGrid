const express = require("express");
const router = express.Router();

const {
    getPlatformStats,
    getAnalytics,
    getAllRestaurantsAdmin,
    toggleRestaurantActive,
    getAllUsers,
    toggleUserActive,
    updateUserRole,
} = require("../controllers/adminController");

const { protect, restrictTo } = require("../middleware/authMiddleware");

//All admin routes require authentication and admin role
// Apply both middleware to every route in this file
router.use(protect);
router.use(restrictTo("admin"));

//Stats
router.get("/stats", getPlatformStats);
router.get("/analytics", getAnalytics);

//Restaurants
router.get("/restaurants", getAllRestaurantsAdmin);
router.patch("/restaurants/:id/active", toggleRestaurantActive);

//Users
router.get("/users", getAllUsers);
router.patch("/users/:id/active", toggleUserActive);
router.patch("/users/:id/role", updateUserRole);

module.exports = router;