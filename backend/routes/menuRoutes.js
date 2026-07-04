const express = require("express");
const router = express.Router({ mergeParams: true }); //mergeParams: true is for nested routes

const {
    addMenuItem,
    getMenuItems,
    getMenuItemById,
    updateMenuItem,
    deleteMenuItem,
    toggleMenuItemAvailability,
    getMenuCategories,
} = require("../controllers/menuController");

const { protect, restrictTo } = require("../middleware/authMiddleware");

//public routes
router.get("/categories", getMenuCategories);
router.get("/", getMenuItems);
router.get("/:itemId", getMenuItemById);


//private routes
router.post(
    "/",
    protect,
    restrictTo("restaurant_owner"),
    addMenuItem
);

router.put(
    "/:itemId",
    protect,
    restrictTo("restaurant_owner"),
    updateMenuItem
);

router.delete(
    "/:itemId",
    protect,
    restrictTo("restaurant_owner"),
    deleteMenuItem
);

router.patch(
    "/:itemId/toggle",
    protect,
    restrictTo("restaurant_owner"),
    toggleMenuItemAvailability
);

module.exports = router;