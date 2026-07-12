const express = require("express");
const router = express.Router({ mergeParams: true });

const {
    uploadRestaurantImages,
    deleteRestaurantImage,
    uploadMenuItemImage,
    deleteMenuItemImage,
} = require("../controllers/imageController");

//Import upload middleware
const {
    uploadRestaurantImages: restaurantUploadMiddleware,
    uploadMenuItemImage: menuItemUploadMiddleware,
} = require("../middleware/upload");

const {
    protect,
    restrictTo,
} = require("../middleware/authMiddleware");

//Restaurent image routes
router.post(
    "/restaurants/:id/images",
    protect,
    restrictTo("restaurant_owner"),
    restaurantUploadMiddleware.array("images", 3),
    uploadRestaurantImages
);

router.delete(
    "/restaurants/:id/images",
    protect,
    restrictTo("restaurant_owner"),
    deleteRestaurantImage
);

//Menu item image routes
router.post(
    "/restaurants/:restaurantId/menu/:itemId/image",
    protect,
    restrictTo("restaurant_owner"),
    menuItemUploadMiddleware.single("image"),
    uploadMenuItemImage
);

router.delete(
    "/restaurants/:restaurantId/menu/:itemId/image",
    protect,
    restrictTo("restaurant_owner"),
    deleteMenuItemImage
);

module.exports = router;