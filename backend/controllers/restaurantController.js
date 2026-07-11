const Restaurant = require("../models/Restaurant");
const MenuItem = require("../models/MenuItem");
const {
    getCache,
    setCache,
    deleteCache,
    deleteCachePattern,
} = require("../config/redis");

//Centralized cache key naming
const CACHE_KEYS = {
    restaurantList: (query) => `restaurants:list:${JSON.stringify(query)}`,
    restaurantDetail: (id) => `restaurants:detail:${id}`,
    restaurantMenu: (id) => `restaurants:menu:${id}`,
    restaurantCategories: (id) => `restaurants:categories:${id}`,
};

const TTL = {
    list: 5 * 60,
    detail: 10 * 60,
    menu: 10 * 60,
};

const createRestaurant = async (req, res) => {
    try {
        const {
            name,
            description,
            cuisineType,
            address,
            location,
            phone,
            email,
            openingHours,
            deliveryTime,
            minimumOrder,
            deliveryFee,
        } = req.body;

        if (!name || !cuisineType || !address || !phone) {
            return res.status(400).json({
                success: false,
                message:
                    "Please provide name, cuisineType, address, and phone",
            });
        }

        if (!address.street || !address.city || !address.state || !address.pincode) {
            return res.status(400).json({
                success: false,
                message:
                    "Please provide complete address: street, city, state, pincode",
            });
        }

        if (!Array.isArray(cuisineType) || cuisineType.length === 0) {
            return res.status(400).json({
                success: false,
                message: "cuisineType must be a non-empty array of strings",
            });
        }

        const existingRestaurant = await Restaurant.findOne({
            owner: req.user._id,
            name: { $regex: new RegExp(`^${name}$`, "i") },
        });

        if (existingRestaurant) {
            return res.status(409).json({
                success: false,
                message: "You already have a restaurant with this name",
            });
        }

        const restaurantData = {
            owner: req.user._id,
            name: name.trim(),
            description: description?.trim() || null,
            cuisineType: cuisineType.map((c) => c.trim()),
            address: {
                street: address.street.trim(),
                city: address.city.trim(),
                state: address.state.trim(),
                pincode: address.pincode.trim(),
            },
            phone: phone.trim(),
            email: email?.toLowerCase().trim() || null,
        };

        if (openingHours) {
            restaurantData.openingHours = openingHours;
        }

        if (deliveryTime !== undefined) {
            restaurantData.deliveryTime = deliveryTime;
        }

        if (minimumOrder !== undefined) {
            restaurantData.minimumOrder = minimumOrder;
        }

        if (deliveryFee !== undefined) {
            restaurantData.deliveryFee = deliveryFee;
        }

        if (location && location.longitude && location.latitude) {
            restaurantData.location = {
                type: "Point",
                coordinates: [
                    parseFloat(location.longitude),
                    parseFloat(location.latitude),
                ],
            };
        }

        const restaurant = await Restaurant.create(restaurantData);
        await deleteCachePattern("restaurants:list:*");
        res.status(201).json({
            success: true,
            message: "Restaurant created successfully. Awaiting admin approval before it appears to customers.",
            restaurant,
        });
    } catch (error) {
        if (error.name === "ValidationError") {
            const messages = Object.values(error.errors).map(
                (e) => e.message
            );
            return res.status(400).json({
                success: false,
                message: messages.join(", "),
            });
        }
        console.error("Create restaurant error:", error);
        res.status(500).json({
            success: false,
            message: "Server error while creating restaurant",
        });
    }
};

const getAllRestaurants = async (req, res) => {
    try {
        const cacheKey = CACHE_KEYS.restaurantList(req.query);
        const cached = await getCache(cacheKey);

        if (cached) {
            return res.status(200).json({ ...cached, fromCache: true });
        }

        const {
            city,
            cuisine,
            search,
            isOpen,
            page = 1,
            limit = 10,
            sort = "createdAt",
        } = req.query;

        const filter = {
            isApproved: true,
            isActive: true,
        };

        if (city) {
            filter["address.city"] = { $regex: city, $options: "i" };
        }

        if (cuisine) {
            filter.cuisineType = { $regex: cuisine, $options: "i" };
        }

        if (isOpen !== undefined) {
            filter.isOpen = isOpen === "true";
        }

        if (search) {
            filter.$text = { $search: search };
        }

        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;
        let sortObj = {};

        if (sort === "rating") {
            sortObj = { averageRating: -1 };
        }
        else if (sort === "deliveryTime") {
            sortObj = { deliveryTime: 1 };
        }
        else if (sort === "deliveryFee") {
            sortObj = { deliveryFee: 1 };
        }
        else {
            sortObj = { createdAt: -1 };
        }

        const [total, restaurants] = await Promise.all([
            Restaurant.countDocuments(filter),
            Restaurant.find(filter)
                .populate("owner", "name email phone")
                .select("-__v")
                .sort(sortObj)
                .skip(skip)
                .limit(limitNum),
        ]);

        const responseData = {
            success: true,
            count: restaurants.length,
            total,
            totalPages: Math.ceil(total / limitNum),
            currentPage: pageNum,
            restaurants,
        };

        //Cache the response
        await setCache(cacheKey, responseData, TTL.list);
        res.status(200).json(responseData);
    }
    catch (error) {
        console.error("Get restaurants error:", error);
        res.status(500).json({
            success: false,
            message: "Server error while fetching restaurants",
        });
    }
};

//get single restaurent
const getRestaurantById = async (req, res) => {
    try {
        const cacheKey = CACHE_KEYS.restaurantDetail(req.params.id);
        const cached = await getCache(cacheKey);
        if (cached) {
            return res.status(200).json({ ...cached, fromCache: true });
        }

        const restaurant = await Restaurant.findById(req.params.id)
            .populate("owner", "name email phone")
            .select("-__v");

        if (!restaurant) {
            return res.status(404).json({
                success: false,
                message: "Restaurant not found",
            });
        }

        if (!restaurant.isApproved || !restaurant.isActive) {
            const isOwner = req.user && restaurant.owner._id.toString() === req.user._id.toString();
            const isAdmin = req.user && req.user.role === "admin";

            if (!isOwner && !isAdmin) {
                return res.status(404).json({
                    success: false,
                    message: "Restaurant not found",
                });
            }
        }

        const menuItems = await MenuItem.find({
            restaurant: req.params.id,
            isAvailable: true,
        }).select("-__v");

        const menuByCategory = menuItems.reduce((acc, item) => {
            const category = item.category;
            if (!acc[category]) {
                acc[category] = [];
            }
            acc[category].push(item);
            return acc;
        }, {});

        const responseData = {
            success: true,
            restaurant,
            menu: menuByCategory,
            totalMenuItems: menuItems.length,
        };

        await setCache(cacheKey, responseData, TTL.detail);

        res.status(200).json(responseData);
    } catch (error) {
        if (error.name === "CastError") {
            return res.status(400).json({
                success: false,
                message: "Invalid restaurant ID format",
            });
        }
        console.error("Get restaurant error:", error);
        res.status(500).json({
            success: false,
            message: "Server error while fetching restaurant",
        });
    }
};

const getMyRestaurants = async (req, res) => {
    try {
        const restaurants = await Restaurant.find({
            owner: req.user._id,
        })
            .select("-__v")
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: restaurants.length,
            restaurants,
        });
    }
    catch (error) {
        console.error("Get my restaurants error:", error);
        res.status(500).json({
            success: false,
            message: "Server error while fetching your restaurants",
        });
    }
};

const updateRestaurant = async (req, res) => {
    try {
        const restaurant = await Restaurant.findById(req.params.id);

        if (!restaurant) {
            return res.status(404).json({
                success: false,
                message: "Restaurant not found",
            });
        }

        if (
            restaurant.owner.toString() !== req.user._id.toString()
        ) {
            return res.status(403).json({
                success: false,
                message: "You are not authorized to update this restaurant",
            });
        }

        const protectedFields = [
            "owner",
            "isApproved",
            "averageRating",
            "totalRatings",
        ];
        protectedFields.forEach((field) => delete req.body[field]);

        if (
            req.body.location &&
            req.body.location.longitude &&
            req.body.location.latitude
        ) {
            req.body.location = {
                type: "Point",
                coordinates: [
                    parseFloat(req.body.location.longitude),
                    parseFloat(req.body.location.latitude),
                ],
            };
        }

        const updatedRestaurant = await Restaurant.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        ).select("-__v");

        //Invalidate this restaurants cache entries
        await deleteCache(CACHE_KEYS.restaurantDetail(req.params.id));
        await deleteCachePattern("restaurants:list:*");

        res.status(200).json({
            success: true,
            message: "Restaurant updated successfully",
            restaurant: updatedRestaurant,
        });
    }
    catch (error) {
        if (error.name === "ValidationError") {
            const messages = Object.values(error.errors).map(
                (e) => e.message
            );
            return res.status(400).json({ success: false, message: messages.join(", ") });
        }
        if (error.name === "CastError") {
            return res
                .status(400)
                .json({ success: false, message: "Invalid restaurant ID" });
        }
        console.error("Update restaurant error:", error);
        res.status(500).json({
            success: false,
            message: "Server error while updating restaurant",
        });
    }
};

const deleteRestaurant = async (req, res) => {
    try {
        const restaurant = await Restaurant.findById(req.params.id);

        if (!restaurant) {
            return res.status(404).json({
                success: false,
                message: "Restaurant not found",
            });
        }

        if (
            restaurant.owner.toString() !== req.user._id.toString()
        ) {
            return res.status(403).json({
                success: false,
                message: "You are not authorized to delete this restaurant",
            });
        }

        await MenuItem.deleteMany({ restaurant: req.params.id });
        await Restaurant.findByIdAndDelete(req.params.id);

        await deleteCache(CACHE_KEYS.restaurantDetail(req.params.id));
        await deleteCache(CACHE_KEYS.restaurantMenu(req.params.id));
        await deleteCachePattern("restaurants:list:*");

        res.status(200).json({
            success: true,
            message:
                "Restaurant and all its menu items deleted successfully",
        });
    }
    catch (error) {
        if (error.name === "CastError") {
            return res.status(400).json({ success: false, message: "Invalid restaurant ID" });
        }
        console.error("Delete restaurant error:", error);
        res.status(500).json({
            success: false,
            message: "Server error while deleting restaurant",
        });
    }
};

const approveRestaurant = async (req, res) => {
    try {
        const restaurant = await Restaurant.findById(req.params.id);

        if (!restaurant) {
            return res.status(404).json({
                success: false,
                message: "Restaurant not found",
            });
        }

        restaurant.isApproved = !restaurant.isApproved;
        await restaurant.save({ validateBeforeSave: false });

        await deleteCache(CACHE_KEYS.restaurantDetail(req.params.id));
        await deleteCachePattern("restaurants:list:*");

        res.status(200).json({
            success: true,
            message: `Restaurant ${restaurant.isApproved ? "approved" : "unapproved"
                } successfully`,
            isApproved: restaurant.isApproved,
            restaurant,
        });
    }
    catch (error) {
        if (error.name === "CastError") {
            return res
                .status(400)
                .json({ success: false, message: "Invalid restaurant ID" });
        }
        console.error("Approve restaurant error:", error);
        res.status(500).json({
            success: false,
            message: "Server error while approving restaurant",
        });
    }
};

//toggle open/closed
const toggleRestaurantStatus = async (req, res) => {
    try {
        const restaurant = await Restaurant.findById(req.params.id);

        if (!restaurant) {
            return res.status(404).json({
                success: false,
                message: "Restaurant not found",
            });
        }

        if (restaurant.owner.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: "You are not authorized to update this restaurant",
            });
        }

        restaurant.isOpen = !restaurant.isOpen;
        await restaurant.save({ validateBeforeSave: false });

        await deleteCache(CACHE_KEYS.restaurantDetail(req.params.id));
        await deleteCachePattern("restaurants:list:*");

        res.status(200).json({
            success: true,
            message: `Restaurant is now ${restaurant.isOpen ? "open" : "closed"
                }`,
            isOpen: restaurant.isOpen,
        });
    }
    catch (error) {
        if (error.name === "CastError") {
            return res
                .status(400)
                .json({ success: false, message: "Invalid restaurant ID" });
        }
        console.error("Toggle restaurant error:", error);
        res.status(500).json({
            success: false,
            message: "Server error while toggling status",
        });
    }
};

const getRestaurantReviews = async (req, res) => {
    try {
        const Order = require("../models/Order");
        const mongoose = require("mongoose");

        const { page = 1, limit = 10 } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const reviews = await Order.find({
            restaurant: req.params.id,
            status: "delivered",
            "rating.score": { $exists: true, $ne: null },
        })
            .populate("customer", "name avatar")
            .select("rating createdAt customer items")
            .sort({ "rating.createdAt": -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Order.countDocuments({
            restaurant: req.params.id,
            status: "delivered",
            "rating.score": { $exists: true, $ne: null },
        });

        const distribution = await Order.aggregate([
            {
                $match: {
                    restaurant: new mongoose.Types.ObjectId(req.params.id),
                    status: "delivered",
                    "rating.score": { $exists: true, $ne: null },
                },
            },
            {
                $group: {
                    _id: "$rating.score",
                    count: { $sum: 1 },
                },
            },
            { $sort: { _id: -1 } },
        ]);

        res.status(200).json({
            success: true,
            total,
            totalPages: Math.ceil(total / parseInt(limit)),
            currentPage: parseInt(page),
            reviews,
            distribution,
        });
    }
    catch (error) {
        if (error.name === "CastError") {
            return res.status(400).json({
                success: false,
                message: "Invalid restaurant ID",
            });
        }
        console.error("Get reviews error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch reviews",
        });
    }
};

module.exports = {
    createRestaurant,
    getAllRestaurants,
    getRestaurantById,
    getMyRestaurants,
    updateRestaurant,
    deleteRestaurant,
    approveRestaurant,
    toggleRestaurantStatus,
    getRestaurantReviews,
};