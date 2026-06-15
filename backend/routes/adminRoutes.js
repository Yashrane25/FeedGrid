import express from "express";
import {
    getDashboardStats,
    getRevenueChart,
    getTopRestaurants,
    getAllRestaurants,
    toggleRestaurantActive,
    getAllUsers,
    getUserTrend,
    getAllOrders,
    toggleUserBan,
} from "../controllers/adminController.js";
import { protect, restrictTo } from "../middleware/auth.js";

const router = express.Router();

//ALL admin routes require login AND admin role
//router.use() applies middleware to every route defined after it in this file
router.use(protect, restrictTo("admin"));

router.get("/stats", getDashboardStats);
router.get("/revenue-chart", getRevenueChart);
router.get("/top-restaurants", getTopRestaurants);
router.get("/restaurants", getAllRestaurants);
router.patch("/restaurants/:id/toggle", toggleRestaurantActive);
router.get("/users", getAllUsers);
router.get("/users/trend", getUserTrend);
router.get("/orders", getAllOrders);
router.patch("/users/:id/ban", toggleUserBan);

export default router;