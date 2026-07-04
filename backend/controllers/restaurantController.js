const Restaurant = require("../models/Restaurant");
const MenuItem = require("../models/MenuItem");

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

        //Validate required fields
        if (!name || !cuisineType || !address || !phone) {
            return res.status(400).json({
                success: false,
                message: "Please provide name, cuisineType, address and phone",
            });
        }

        //Validate address fields
        if (!address.street || !address.city || !address.state || !address.pincode) {
            return res.status(400).json({
                success: false,
                message: "Please provide complete address: street, city, state, pincode",
            });
        }

        //Validate cuisineType is an array
        if (!Array.isArray(cuisineType) || cuisineType.length === 0) {
            return res.status(400).json({
                success: false,
                message: "cuisineType must be a non empty array of strings",
            });
        }

        //Check if owner already has a restaurant with same name
        const existingRestaurant = await Restaurant.findOne({
            owner: req.user._id,
            name: { $regex: new RegExp(`^${name}$`, "i") }, //case insensitive match
        });

        if (existingRestaurant) {
            return res.status(409).json({
                success: false,
                message: "You already have a restaurant with this name",
            });
        }

        //Build the restaurant object
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

        //Add optional fields if provided
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

        //Handle location coordinates
        //location should be { longitude, latitude } from the request
        //convert to GeoJSON format: { type: "Point", coordinates: [lng, lat] }
        if (location && location.longitude && location.latitude) {
            restaurantData.location = {
                type: "Point",
                coordinates: [
                    parseFloat(location.longitude),
                    parseFloat(location.latitude),
                ],
            };
        }

        //Create the restaurant
        const restaurant = await Restaurant.create(restaurantData);

        res.status(201).json({
            success: true,
            message:
                "Restaurant created successfully. Awaiting admin approval before it appears to customers.",
            restaurant,
        });
    } catch (error) {
        if (error.name === "ValidationError") {
            const messages = Object.values(error.errors).map((e) => e.message);
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

//GET ALL APPROVED RESTAURANTS (Browse)
const getAllRestaurants = async (req, res) => {
    try {
        const {
            city,
            cuisine,
            search,
            isOpen,
            page = 1,
            limit = 10,
            sort = "createdAt",
        } = req.query;

        //Build the filter object
        const filter = {
            isApproved: true,
            isActive: true,
        };

        //Add city filter if provided
        if (city) {
            filter["address.city"] = { $regex: city, $options: "i" };
        }

        //Add cuisine filter if provided
        if (cuisine) {
            filter.cuisineType = { $regex: cuisine, $options: "i" };
        }

        //Add open/closed filter if provided
        if (isOpen !== undefined) {
            filter.isOpen = isOpen === "true";
        }

        //Add text search if provided
        if (search) {
            filter.$text = { $search: search };
        }

        //Pagination calculations
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        //Build sort object
        let sortObj = {};
        if (sort === "rating") {
            sortObj = { averageRating: -1 }; //-1 = descending (highest first)
        } else if (sort === "deliveryTime") {
            sortObj = { deliveryTime: 1 }; //1 = ascending (fastest first)
        } else if (sort === "deliveryFee") {
            sortObj = { deliveryFee: 1 };
        } else {
            sortObj = { createdAt: -1 }; //Newest first by default
        }

        //Execute queries
        const [total, restaurants] = await Promise.all([
            Restaurant.countDocuments(filter),
            Restaurant.find(filter)
                .populate("owner", "name email phone")
                .select("-__v")
                .sort(sortObj)
                .skip(skip)
                .limit(limitNum),
        ]);

        res.status(200).json({
            success: true,
            count: restaurants.length,
            total,
            totalPages: Math.ceil(total / limitNum),
            currentPage: pageNum,
            restaurants,
        });
    } catch (error) {
        console.error("Get restaurants error:", error);
        res.status(500).json({
            success: false,
            message: "Server error while fetching restaurants",
        });
    }
};

//GET SINGLE RESTAURANT
const getRestaurantById = async (req, res) => {
    try {
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
            const isOwner =
                req.user && restaurant.owner._id.toString() === req.user._id.toString();
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

        res.status(200).json({
            success: true,
            restaurant,
            menu: menuByCategory,
            totalMenuItems: menuItems.length,
        });
    } catch (error) {
        //Handle invalid MongoDB ObjectId format
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

//GET OWNERS OWN RESTAURANTS
const getMyRestaurants = async (req, res) => {
    try {
        const restaurants = await Restaurant.find({ owner: req.user._id })
            .select("-__v")
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: restaurants.length,
            restaurants,
        });
    } catch (error) {
        console.error("Get my restaurants error:", error);
        res.status(500).json({
            success: false,
            message: "Server error while fetching your restaurants",
        });
    }
};

//UPDATE RESTAURANT 
const updateRestaurant = async (req, res) => {
    try {
        const restaurant = await Restaurant.findById(req.params.id);

        if (!restaurant) {
            return res.status(404).json({
                success: false,
                message: "Restaurant not found",
            });
        }

        //Authorization check
        if (restaurant.owner.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: "You are not authorized to update this restaurant",
            });
        }

        //Fields that owners are NOT allowed to change
        const protectedFields = ["owner", "isApproved", "averageRating", "totalRatings"];
        protectedFields.forEach((field) => delete req.body[field]);

        //Handle location update
        if (req.body.location && req.body.location.longitude && req.body.location.latitude) {
            req.body.location = {
                type: "Point",
                coordinates: [
                    parseFloat(req.body.location.longitude),
                    parseFloat(req.body.location.latitude),
                ],
            };
        }

        //Update the restaurant
        const updatedRestaurant = await Restaurant.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        ).select("-__v");

        res.status(200).json({
            success: true,
            message: "Restaurant updated successfully",
            restaurant: updatedRestaurant,
        });
    } catch (error) {
        if (error.name === "ValidationError") {
            const messages = Object.values(error.errors).map((e) => e.message);
            return res.status(400).json({ success: false, message: messages.join(", ") });
        }
        if (error.name === "CastError") {
            return res.status(400).json({ success: false, message: "Invalid restaurant ID" });
        }
        console.error("Update restaurant error:", error);
        res.status(500).json({ success: false, message: "Server error while updating restaurant" });
    }
};

//DELETE RESTAURANT
const deleteRestaurant = async (req, res) => {
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
                message: "You are not authorized to delete this restaurant",
            });
        }

        //Delete all menu items belonging to this restaurant first
        await MenuItem.deleteMany({ restaurant: req.params.id });

        //Delete the restaurant
        await Restaurant.findByIdAndDelete(req.params.id);

        res.status(200).json({
            success: true,
            message: "Restaurant and all its menu items deleted successfully",
        });
    } catch (error) {
        if (error.name === "CastError") {
            return res.status(400).json({ success: false, message: "Invalid restaurant ID" });
        }
        console.error("Delete restaurant error:", error);
        res.status(500).json({ success: false, message: "Server error while deleting restaurant" });
    }
};

//APPROVE RESTAURANT
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

        res.status(200).json({
            success: true,
            message: `Restaurant ${restaurant.isApproved ? "approved" : "unapproved"} successfully`,
            isApproved: restaurant.isApproved,
            restaurant,
        });
    } catch (error) {
        if (error.name === "CastError") {
            return res.status(400).json({ success: false, message: "Invalid restaurant ID" });
        }
        console.error("Approve restaurant error:", error);
        res.status(500).json({ success: false, message: "Server error while approving restaurant" });
    }
};

//TOGGLE OPEN/CLOSED
const toggleRestaurantStatus = async (req, res) => {
    try {
        const restaurant = await Restaurant.findById(req.params.id);

        if (!restaurant) {
            return res.status(404).json({
                success: false,
                message: "Restaurant not found",
            });
        }

        // Authorization check
        if (restaurant.owner.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: "You are not authorized to update this restaurant",
            });
        }

        restaurant.isOpen = !restaurant.isOpen;
        await restaurant.save({ validateBeforeSave: false });

        res.status(200).json({
            success: true,
            message: `Restaurant is now ${restaurant.isOpen ? "open" : "closed"}`,
            isOpen: restaurant.isOpen,
        });
    } catch (error) {
        if (error.name === "CastError") {
            return res.status(400).json({ success: false, message: "Invalid restaurant ID" });
        }
        console.error("Toggle restaurant error:", error);
        res.status(500).json({ success: false, message: "Server error while toggling status" });
    }
};







const getRestaurantReviews = async (req, res) => {
    try {
        const Order = require("../models/Order");

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

        //Rating distribution
        const distribution = await Order.aggregate([
            {
                $match: {
                    restaurant:
                        require("mongoose").Types.ObjectId.createFromHexString(
                            req.params.id
                        ),
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
    } catch (error) {
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