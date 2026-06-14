import express from "express";
import {
    createPaymentIntent,
    stripeWebhook,
    getMyOrders,
    getOrderById,
    updateOrderStatus,
    getRestaurantOrders,
    rateOrder,
    reorder,
} from "../controllers/orderController.js";
import { protect, restrictTo } from "../middleware/auth.js";

const router = express.Router();

router.post(
    "/webhook",
    express.raw({ type: "application/json" }),
    stripeWebhook
);

router.use(protect);

router.post("/create-intent", createPaymentIntent);
router.get("/my-orders", getMyOrders);
router.get("/:id", getOrderById);
router.post("/:id/rate", rateOrder);
router.post("/:id/reorder", reorder);

//Restaurant owner actions
router.patch(
    "/:id/status",
    restrictTo("restaurant_owner", "delivery_agent", "admin"),
    updateOrderStatus
);

//Restaurant dashboard
router.get(
    "/restaurant/all",
    restrictTo("restaurant_owner"),
    getRestaurantOrders
);

export default router;