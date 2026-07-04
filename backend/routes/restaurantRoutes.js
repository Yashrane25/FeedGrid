const express = require("express");
const router = express.Router();

const {
    createRestaurant,
    getAllRestaurants,
    getRestaurantById,
    getMyRestaurants,
    updateRestaurant,
    deleteRestaurant,
    approveRestaurant,
    toggleRestaurantStatus,
    getRestaurantReviews,
} = require("../controllers/restaurantController");

const { protect, restrictTo } = require("../middleware/authMiddleware");
const menuRouter = require("./menuRoutes");

router.use("/:restaurantId/menu", menuRouter);


//PUBLIC ROUTES
router.get("/", getAllRestaurants);


//PRIVATE ROUTES
router.get(
    "/my",
    protect,
    restrictTo("restaurant_owner", "admin"),
    getMyRestaurants
);

router.post(
    "/",
    protect,
    restrictTo("restaurant_owner"),
    createRestaurant
);

router.get("/:id", getRestaurantById);
router.get("/:id/reviews", getRestaurantReviews);


router.put(
    "/:id",
    protect,
    restrictTo("restaurant_owner"),
    updateRestaurant
);

router.delete(
    "/:id",
    protect,
    restrictTo("restaurant_owner"),
    deleteRestaurant
);

router.patch(
    "/:id/approve",
    protect,
    restrictTo("admin"),
    approveRestaurant
);

router.patch(
    "/:id/toggle",
    protect,
    restrictTo("restaurant_owner"),
    toggleRestaurantStatus
);

module.exports = router;