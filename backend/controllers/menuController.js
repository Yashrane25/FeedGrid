const MenuItem = require("../models/MenuItem");
const Restaurant = require("../models/Restaurant");

const verifyRestaurantOwnership = async (restaurantId, userId) => {
    const restaurant = await Restaurant.findById(restaurantId);

    if (!restaurant) {
        return {
            restaurant: null,
            error: { status: 404, message: "Restaurant not found" },
        };
    }

    if (!restaurant.isActive) {
        return {
            restaurant: null,
            error: { status: 404, message: "Restaurant not found" },
        };
    }

    //Compare owner ID with loggedin user ID
    if (restaurant.owner.toString() !== userId.toString()) {
        return {
            restaurant: null,
            error: {
                status: 403,
                message: "You are not authorized to manage this restaurant's menu",
            },
        };
    }

    return { restaurant, error: null };
};


const addMenuItem = async (req, res) => {
    try {
        const { restaurantId } = req.params;

        const { error } = await verifyRestaurantOwnership(
            restaurantId,
            req.user._id
        );
        if (error) {
            return res.status(error.status).json({
                success: false,
                message: error.message,
            });
        }

        const {
            name,
            description,
            price,
            category,
            image,
            isVegetarian,
            isVegan,
            isNonVeg,
            isAvailable,
            preparationTime,
            spiceLevel,
            tags,
        } = req.body;

        if (!name || !price || !category) {
            return res.status(400).json({
                success: false,
                message: "Please provide name, price, and category",
            });
        }

        if (isNaN(price) || Number(price) < 1) {
            return res.status(400).json({
                success: false,
                message: "Price must be a number of at least 1",
            });
        }

        //Create the menu item
        const menuItem = await MenuItem.create({
            restaurant: restaurantId,
            name: name.trim(),
            description: description?.trim() || null,
            price: Number(price),
            category: category.trim(),
            image: image || null,
            isVegetarian: isVegetarian || false,
            isVegan: isVegan || false,
            isNonVeg: isNonVeg || false,
            isAvailable: isAvailable !== undefined ? isAvailable : true,
            preparationTime: preparationTime || 15,
            spiceLevel: spiceLevel || null,
            tags: tags || [],
        });

        res.status(201).json({
            success: true,
            message: "Menu item added successfully",
            menuItem,
        });
    } catch (error) {
        if (error.name === "ValidationError") {
            const messages = Object.values(error.errors).map((e) => e.message);
            return res.status(400).json({
                success: false,
                message: messages.join(", "),
            });
        }
        if (error.name === "CastError") {
            return res.status(400).json({
                success: false,
                message: "Invalid restaurant ID format",
            });
        }
        console.error("Add menu item error:", error);
        res.status(500).json({
            success: false,
            message: "Server error while adding menu item",
        });
    }
};

//get all menu items
const getMenuItems = async (req, res) => {
    try {
        const { restaurantId } = req.params;

        const restaurant = await Restaurant.findById(restaurantId).select(
            "name isApproved isActive"
        );

        if (!restaurant || !restaurant.isActive) {
            return res.status(404).json({
                success: false,
                message: "Restaurant not found",
            });
        }

        const { category, isVegetarian, isVegan, isNonVeg, available } = req.query;

        const filter = { restaurant: restaurantId };

        if (available !== "all") {
            filter.isAvailable = true;
        }

        if (category) {
            filter.category = { $regex: category, $options: "i" };
        }

        if (isVegetarian === "true") {
            filter.isVegetarian = true;
        }

        if (isVegan === "true") {
            filter.isVegan = true;
        }

        if (isNonVeg === "true") {
            filter.isNonVeg = true;
        }

        const menuItems = await MenuItem.find(filter)
            .select("-__v")
            .sort({ category: 1, name: 1 });

        const menuByCategory = menuItems.reduce((acc, item) => {
            const cat = item.category;
            if (!acc[cat]) {
                acc[cat] = [];
            }
            acc[cat].push(item);
            return acc;
        }, {});

        const categories = Object.keys(menuByCategory).sort();

        res.status(200).json({
            success: true,
            restaurantName: restaurant.name,
            totalItems: menuItems.length,
            categories,
            menuByCategory,
            menuItems,
        });
    } catch (error) {
        if (error.name === "CastError") {
            return res.status(400).json({
                success: false,
                message: "Invalid restaurant ID format",
            });
        }
        console.error("Get menu items error:", error);
        res.status(500).json({
            success: false,
            message: "Server error while fetching menu items",
        });
    }
};

//get single menu item
const getMenuItemById = async (req, res) => {
    try {
        const { restaurantId, itemId } = req.params;

        const menuItem = await MenuItem.findOne({
            _id: itemId,
            restaurant: restaurantId,
        }).select("-__v");

        if (!menuItem) {
            return res.status(404).json({
                success: false,
                message: "Menu item not found",
            });
        }

        res.status(200).json({
            success: true,
            menuItem,
        });
    } catch (error) {
        if (error.name === "CastError") {
            return res.status(400).json({
                success: false,
                message: "Invalid ID format",
            });
        }
        console.error("Get menu item error:", error);
        res.status(500).json({
            success: false,
            message: "Server error while fetching menu item",
        });
    }
};

const updateMenuItem = async (req, res) => {
    try {
        const { restaurantId, itemId } = req.params;

        const { error } = await verifyRestaurantOwnership(
            restaurantId,
            req.user._id
        );
        if (error) {
            return res.status(error.status).json({
                success: false,
                message: error.message,
            });
        }
        delete req.body.restaurant;

        //Validate price if it is being updated
        if (req.body.price !== undefined) {
            if (isNaN(req.body.price) || Number(req.body.price) < 1) {
                return res.status(400).json({
                    success: false,
                    message: "Price must be a number of at least 1",
                });
            }
            req.body.price = Number(req.body.price);
        }

        const updatedItem = await MenuItem.findOneAndUpdate(
            { _id: itemId, restaurant: restaurantId },
            req.body,
            { new: true, runValidators: true }
        ).select("-__v");

        if (!updatedItem) {
            return res.status(404).json({
                success: false,
                message: "Menu item not found",
            });
        }

        res.status(200).json({
            success: true,
            message: "Menu item updated successfully",
            menuItem: updatedItem,
        });
    } catch (error) {
        if (error.name === "ValidationError") {
            const messages = Object.values(error.errors).map((e) => e.message);
            return res.status(400).json({ success: false, message: messages.join(", ") });
        }
        if (error.name === "CastError") {
            return res.status(400).json({ success: false, message: "Invalid ID format" });
        }
        console.error("Update menu item error:", error);
        res.status(500).json({ success: false, message: "Server error while updating menu item" });
    }
};

const deleteMenuItem = async (req, res) => {
    try {
        const { restaurantId, itemId } = req.params;

        const { error } = await verifyRestaurantOwnership(
            restaurantId,
            req.user._id
        );
        if (error) {
            return res.status(error.status).json({
                success: false,
                message: error.message,
            });
        }

        //findOneAndDelete ensures we only delete an item that belongs
        const deletedItem = await MenuItem.findOneAndDelete({
            _id: itemId,
            restaurant: restaurantId,
        });

        if (!deletedItem) {
            return res.status(404).json({
                success: false,
                message: "Menu item not found",
            });
        }

        res.status(200).json({
            success: true,
            message: "Menu item deleted successfully",
        });
    } catch (error) {
        if (error.name === "CastError") {
            return res.status(400).json({ success: false, message: "Invalid ID format" });
        }
        console.error("Delete menu item error:", error);
        res.status(500).json({ success: false, message: "Server error while deleting menu item" });
    }
};


const toggleMenuItemAvailability = async (req, res) => {
    try {
        const { restaurantId, itemId } = req.params;

        const { error } = await verifyRestaurantOwnership(
            restaurantId,
            req.user._id
        );
        if (error) {
            return res.status(error.status).json({
                success: false,
                message: error.message,
            });
        }

        const menuItem = await MenuItem.findOne({
            _id: itemId,
            restaurant: restaurantId,
        });

        if (!menuItem) {
            return res.status(404).json({
                success: false,
                message: "Menu item not found",
            });
        }

        menuItem.isAvailable = !menuItem.isAvailable;
        await menuItem.save({ validateBeforeSave: false });

        res.status(200).json({
            success: true,
            message: `${menuItem.name} is now ${menuItem.isAvailable ? "available" : "unavailable"}`,
            isAvailable: menuItem.isAvailable,
            menuItem,
        });
    } catch (error) {
        if (error.name === "CastError") {
            return res.status(400).json({ success: false, message: "Invalid ID format" });
        }
        console.error("Toggle menu item error:", error);
        res.status(500).json({ success: false, message: "Server error while toggling menu item" });
    }
};

// Used by the frontend to build category filter tabs
const getMenuCategories = async (req, res) => {
    try {
        const { restaurantId } = req.params;

        const restaurant = await Restaurant.findById(restaurantId).select("name isActive");
        if (!restaurant || !restaurant.isActive) {
            return res.status(404).json({
                success: false,
                message: "Restaurant not found",
            });
        }

        const categories = await MenuItem.distinct("category", {
            restaurant: restaurantId,
            isAvailable: true,
        });

        categories.sort();

        res.status(200).json({
            success: true,
            restaurantName: restaurant.name,
            categories,
            count: categories.length,
        });
    } catch (error) {
        if (error.name === "CastError") {
            return res.status(400).json({ success: false, message: "Invalid restaurant ID format" });
        }
        console.error("Get categories error:", error);
        res.status(500).json({ success: false, message: "Server error while fetching categories" });
    }
};

module.exports = {
    addMenuItem,
    getMenuItems,
    getMenuItemById,
    updateMenuItem,
    deleteMenuItem,
    toggleMenuItemAvailability,
    getMenuCategories,
};