import express from "express";
import {
    createRestaurant,
    getAllRestaurants,
    getRestaurant,
    updateRestaurant,
    toggleRestaurantStatus,
    addMenuItem,
    updateMenuItem,
    deleteMenuItem,
    getMyRestaurant,
} from "../controllers/restaurantController.js";
import { protect, restrictTo } from "../middleware/auth.js";
import { upload } from "../config/cloudinary.js";

const router = express.Router();

//publlic routes, no login required
router.get("/", getAllRestaurants);
router.get("/:id", getRestaurant);

//Owner routes, must be login and owner,
// router.get("/owner/me", getMyRestaurant);
// router.post("/", upload.single("image"), createRestaurant);
// router.put("/:id", upload.single("image"), updateRestaurant);
// router.patch("/:id/toggle", toggleRestaurantStatus);

// //Menu item routes, :id is the restaurant id and :itemId is the menu item id
// router.post("/:id/menu", upload.single("image"), addMenuItem);
// router.put("/:id/menu/:itemId", upload.single("image"), updateMenuItem);
// router.delete("/:id/menu/:itemId", deleteMenuItem);


//Owner routes
router.get(
    "/owner/me",
    protect,
    restrictTo("restaurant_owner"),
    getMyRestaurant
);

router.post(
    "/",
    protect,
    restrictTo("restaurant_owner"),
    upload.single("image"),
    createRestaurant
);

router.put(
    "/:id",
    protect,
    restrictTo("restaurant_owner"),
    upload.single("image"),
    updateRestaurant
);

router.patch(
    "/:id/toggle",
    protect,
    restrictTo("restaurant_owner"),
    toggleRestaurantStatus
);

//Menu item routes
router.post(
    "/:id/menu",
    protect,
    restrictTo("restaurant_owner"),
    upload.single("image"),
    addMenuItem
);

router.put(
    "/:id/menu/:itemId",
    protect,
    restrictTo("restaurant_owner"),
    upload.single("image"),
    updateMenuItem
);

router.delete(
    "/:id/menu/:itemId",
    protect,
    restrictTo("restaurant_owner"),
    deleteMenuItem
);

export default router;