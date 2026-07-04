const express = require("express");
const router = express.Router();

const {
    createOrder,
    getMyOrders,
    getOrderById,
    getRestaurantOrders,
    updateOrderStatus,
    assignAgent,
    updateAgentLocation,
    getAvailableOrders,
    getAgentActiveOrder,
    rateOrder,
} = require("../controllers/orderController");

const { protect, restrictTo } = require("../middleware/authMiddleware");

//Customer routes
router.get("/my", protect, restrictTo("customer"), getMyOrders);
router.post("/", protect, restrictTo("customer"), createOrder);

// Delivery agent routes
router.get(
    "/available",
    protect,
    restrictTo("delivery_agent"),
    getAvailableOrders
);

router.get(
    "/agent/active",
    protect,
    restrictTo("delivery_agent"),
    getAgentActiveOrder
);

//Shared routes
router.get("/:id", protect, getOrderById);

router.get(
    "/restaurant/:restaurantId",
    protect,
    restrictTo("restaurant_owner"),
    getRestaurantOrders
);

router.patch(
    "/:id/status",
    protect,
    restrictTo("restaurant_owner", "delivery_agent", "admin"),
    updateOrderStatus
);

router.patch(
    "/:id/assign-agent",
    protect,
    restrictTo("delivery_agent"),
    assignAgent
);

router.patch(
    "/:id/location",
    protect,
    restrictTo("delivery_agent"),
    updateAgentLocation
);

router.post(
    "/:id/rate",
    protect,
    restrictTo("customer"),
    rateOrder
);

module.exports = router;