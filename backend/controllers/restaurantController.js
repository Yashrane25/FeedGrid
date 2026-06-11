import Restaurant from "../models/Restaurant.js";
import MenuItem from "../models/MenuItem.js";
import User from "../models/User.js";

/* CREATE RESTAURANT */
//Only restaurant owner can call this 
export const createRestaurant = async (req, res) => {
    try {
        const existing = await Restaurant.findOne({ owner: req.user.id });
        if (existing) {
            return res.status(400).json({ message: "You already have a restaurant." });
        }

        const {
            name, description, cuisine, phone,
            street, city, state, pincode,
            lat, lng,               //Frontend sends coordinates from browser geolocation
            deliveryTime, minimumOrder,
        } = req.body;

        const restaurant = await Restaurant.create({
            owner: req.user.id,
            name,
            description,
            cuisine: cuisine ? cuisine.split(",").map((c) => c.trim()) : [],
            phone,
            address: { street, city, state, pincode },
            //GeoJSON format: coordinates are [longitude, latitude]
            location: {
                type: "Point",
                coordinates: [parseFloat(lng) || 0, parseFloat(lat) || 0],
            },
            image: req.file ? req.file.path : "",
            deliveryTime: deliveryTime || 30,
            minimumOrder: minimumOrder || 0,
        });
        await User.findByIdAndUpdate(req.user.id, { restaurant: restaurant._id });
        res.status(201).json({ message: "Restaurant created successfully", restaurant });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};


/* GET ALL RESTAURANTS (Customer browsing) */
export const getAllRestaurants = async (req, res) => {
    try {
        const {
            search,
            cuisine,
            sort,
            page = 1,
            limit = 12,
        } = req.query;

        const query = { isActive: true };

        if (search) {
            query.$text = { $search: search };
        }

        if (cuisine) {
            query.cuisine = { $in: cuisine.split(",").map((c) => c.toLowerCase().trim()) };
        }

        let sortObj = { createdAt: -1 }; //newest first
        if (sort === "rating") {
            sortObj = { rating: -1 };
        }
        if (sort === "deliveryTime") {
            sortObj = { deliveryTime: 1 };
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [restaurants, total] = await Promise.all([
            Restaurant.find(query)
                .sort(sortObj)
                .skip(skip)
                .limit(parseInt(limit))
                .select("-__v"),
            Restaurant.countDocuments(query),
        ]);

        res.json({
            restaurants,
            pagination: {
                total,
                page: parseInt(page),
                pages: Math.ceil(total / parseInt(limit)),
            },
        });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};


/* GET SINGLE RESTAURANT with its menu */
export const getRestaurant = async (req, res) => {
    try {
        const restaurant = await Restaurant.findById(req.params.id).populate(
            "owner",
            "name email phone"
        );

        if (!restaurant) {
            return res.status(404).json({ message: "Restaurant not found." });
        }

        const menuItems = await MenuItem.find({
            restaurant: req.params.id,
            isAvailable: true,
        });

        const menu = menuItems.reduce((acc, item) => {
            if (!acc[item.category]) {
                acc[item.category] = [];
            }
            acc[item.category].push(item);
            return acc;
        }, {});

        res.json({ restaurant, menu });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


/* UPDATE RESTAURANT (owner only) */
export const updateRestaurant = async (req, res) => {
    try {
        const restaurant = await Restaurant.findOne({
            _id: req.params.id,
            owner: req.user.id,
        });

        if (!restaurant) {
            return res.status(404).json({ message: "Restaurant not found or unauthorized." });
        }

        const updates = { ...req.body };

        if (updates.cuisine) {
            updates.cuisine = updates.cuisine.split(",").map((c) => c.trim());
        }

        if (updates.street || updates.city || updates.state || updates.pincode) {
            updates.address = {
                street: updates.street || restaurant.address.street,
                city: updates.city || restaurant.address.city,
                state: updates.state || restaurant.address.state,
                pincode: updates.pincode || restaurant.address.pincode,
            };
        }

        if (req.file) {
            updates.image = req.file.path;
        }

        const updated = await Restaurant.findByIdAndUpdate(
            req.params.id,
            updates,
            { new: true, runValidators: true }
        );

        res.json({ message: "Restaurant updated", restaurant: updated });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


/* TOGGLE OPEN/CLOSED */
export const toggleRestaurantStatus = async (req, res) => {
    try {
        const restaurant = await Restaurant.findOne({
            _id: req.params.id,
            owner: req.user.id,
        });
        if (!restaurant) {
            return res.status(404).json({ message: "Not found." });
        }

        restaurant.isOpen = !restaurant.isOpen;
        await restaurant.save();

        res.json({
            message: `Restaurant is now ${restaurant.isOpen ? "OPEN" : "CLOSED"}`,
            isOpen: restaurant.isOpen,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


/* ADD MENU ITEM */
export const addMenuItem = async (req, res) => {
    try {
        const restaurant = await Restaurant.findOne({
            _id: req.params.id,
            owner: req.user.id,
        });
        if (!restaurant) {
            return res.status(403).json({ message: "Unauthorized." });
        }

        const { name, description, price, category, isVeg } = req.body;

        const item = await MenuItem.create({
            restaurant: req.params.id,
            name,
            description,
            price: parseFloat(price),
            category,
            isVeg: isVeg === "true" || isVeg === true,
            image: req.file ? req.file.path : "",
        });

        res.status(201).json({ message: "Menu item added", item });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


/* UPDATE MENU ITEM */
export const updateMenuItem = async (req, res) => {
    try {
        const item = await MenuItem.findById(req.params.itemId);
        if (!item) {
            return res.status(404).json({ message: "Item not found." });
        }

        const restaurant = await Restaurant.findOne({
            _id: item.restaurant,
            owner: req.user.id,
        });
        if (!restaurant) {
            return res.status(403).json({ message: "Unauthorized." });
        }

        const updates = { ...req.body };
        if (updates.price) {
            updates.price = parseFloat(updates.price);
        }
        if (req.file) {
            updates.image = req.file.path;
        }

        const updated = await MenuItem.findByIdAndUpdate(
            req.params.itemId,
            updates,
            { new: true, runValidators: true }
        );

        res.json({ message: "Item updated", item: updated });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


/* DELETE MENU ITEM */
export const deleteMenuItem = async (req, res) => {
    try {
        const item = await MenuItem.findById(req.params.itemId);
        if (!item) {
            return res.status(404).json({ message: "Item not found." });
        }

        const restaurant = await Restaurant.findOne({
            _id: item.restaurant,
            owner: req.user.id,
        });
        if (!restaurant) {
            return res.status(403).json({ message: "Unauthorized." });
        }

        await MenuItem.findByIdAndDelete(req.params.itemId);
        res.json({ message: "Item deleted successfully." });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


/* GET OWNER'S RESTAURANT (for dashboard) */
export const getMyRestaurant = async (req, res) => {
    try {
        const restaurant = await Restaurant.findOne({ owner: req.user.id });
        if (!restaurant) {
            return res.status(404).json({ message: "You have not created a restaurant yet." });
        }

        const menuItems = await MenuItem.find({ restaurant: restaurant._id });

        // Group by category same as above
        const menu = menuItems.reduce((acc, item) => {
            if (!acc[item.category]) {
                acc[item.category] = [];
            }
            acc[item.category].push(item);
            return acc;
        }, {});

        res.json({ restaurant, menu });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};