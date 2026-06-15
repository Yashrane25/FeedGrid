import User from "../models/User.js";
import Restaurant from "../models/Restaurant.js";
import Order from "../models/Order.js";

export const getDashboardStats = async (req, res) => {
    try {
        const now = new Date();

        //Start of today at midnight
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        //Start of this month
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

        //Start of last month (for comparison)
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0); //Day 0 = last day of prev month

        const [
            totalUsers,
            totalRestaurants,
            totalOrders,
            todayOrders,
            monthRevenue,
            lastMonthRevenue,
            ordersByStatus,
            recentOrders,
        ] = await Promise.all([
            //Count all users
            User.countDocuments(),

            //Count active restaurants
            Restaurant.countDocuments({ isActive: true }),

            //Count all orders
            Order.countDocuments(),

            //Count todays orders
            Order.countDocuments({ createdAt: { $gte: todayStart } }),

            //Sum revenue for this month (only delivered orders not pending/cancelled)
            //$sum in aggregation adds up all values of a field across documents
            Order.aggregate([
                {
                    $match: {
                        createdAt: { $gte: monthStart },
                        paymentStatus: "paid",
                    },
                },
                {
                    $group: {
                        _id: null,                      //null = group ALL documents together
                        total: { $sum: "$totalAmount" },  //Sum the totalAmount field
                        count: { $sum: 1 },               //Count documents
                    },
                },
            ]),

            //Same but for last month to calculate growth %
            Order.aggregate([
                {
                    $match: {
                        createdAt: { $gte: lastMonthStart, $lte: lastMonthEnd },
                        paymentStatus: "paid",
                    },
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: "$totalAmount" },
                    },
                },
            ]),

            //Count orders grouped by status
            Order.aggregate([
                { $group: { _id: "$status", count: { $sum: 1 } } },
            ]),

            //Last 10 orders with customer and restaurant names populated
            Order.find()
                .populate("customer", "name email")
                .populate("restaurant", "name")
                .sort({ createdAt: -1 })
                .limit(10),
        ]);

        //Calculate month over month revenue growth percentage
        const thisMonthTotal = monthRevenue[0]?.total || 0;
        const lastMonthTotal = lastMonthRevenue[0]?.total || 0;
        const revenueGrowth = lastMonthTotal === 0
            ? 100
            : Math.round(((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100);

        //Convert ordersByStatus array to a map for easier frontend consumption
        const statusMap = {};
        ordersByStatus.forEach((s) => { statusMap[s._id] = s.count; });

        res.json({
            stats: {
                totalUsers,
                totalRestaurants,
                totalOrders,
                todayOrders,
                monthRevenue: thisMonthTotal,
                revenueGrowth,
            },
            ordersByStatus: statusMap,
            recentOrders,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

//REVENUE CHART DATA, Returns daily revenue for the last N days used to render the line chart.
export const getRevenueChart = async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 30; //last 30 days

        //Calculate the start date: today minus `days` days
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        startDate.setHours(0, 0, 0, 0); //Start of that day

        const data = await Order.aggregate([
            //Stage 1: Only include paid orders in our date range
            {
                $match: {
                    createdAt: { $gte: startDate },
                    paymentStatus: "paid",
                },
            },
            //Stage 2: Group by date string, This groups all orders placed on the same calendar day together
            {
                $group: {
                    _id: {
                        $dateToString: {
                            format: "%Y-%m-%d",
                            date: "$createdAt",
                        },
                    },
                    revenue: { $sum: "$totalAmount" },
                    orderCount: { $sum: 1 },
                    avgOrder: { $avg: "$totalAmount" },
                },
            },
            //Stage 3: Sort by date ascending (left to right on the chart)
            { $sort: { _id: 1 } },
            //Stage 4: Rename _id to "date" for cleaner frontend consumption
            {
                $project: {
                    _id: 0,
                    date: "$_id",
                    revenue: { $round: ["$revenue", 2] },
                    orderCount: 1,
                    avgOrder: { $round: ["$avgOrder", 2] },
                },
            },
        ]);

        res.json({ data, days });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

//TOP RESTAURANTS BY REVENUE
export const getTopRestaurants = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;

        const data = await Order.aggregate([
            //Only count paid orders
            { $match: { paymentStatus: "paid" } },

            //Group by restaurant, summing revenue and counting orders
            {
                $group: {
                    _id: "$restaurant",
                    totalRevenue: { $sum: "$totalAmount" },
                    orderCount: { $sum: 1 },
                    avgRating: { $avg: "$rating.score" },
                },
            },

            //It looks up each _id in the "restaurants" collection
            {
                $lookup: {
                    from: "restaurants",  //Collection name 
                    localField: "_id",          //Field in current pipeline
                    foreignField: "_id",          //Field in the restaurants collection
                    as: "restaurantInfo", //Name of the new array field added to each document
                },
            },

            //$unwind flattens the restaurantInfo arra
            { $unwind: "$restaurantInfo" },

            //Only include active restaurants
            { $match: { "restaurantInfo.isActive": true } },

            //Sort by revenue descending — top earners first
            { $sort: { totalRevenue: -1 } },

            { $limit: limit },

            //Shape the output
            {
                $project: {
                    _id: 0,
                    restaurantId: "$_id",
                    name: "$restaurantInfo.name",
                    image: "$restaurantInfo.image",
                    cuisine: "$restaurantInfo.cuisine",
                    totalRevenue: { $round: ["$totalRevenue", 2] },
                    orderCount: 1,
                    avgRating: { $round: ["$avgRating", 1] },
                },
            },
        ]);

        res.json({ data });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

//ALL RESTAURANTS (with their order stats) 
export const getAllRestaurants = async (req, res) => {
    try {
        const { page = 1, limit = 20, search } = req.query;

        const query = {};
        if (search) query.$text = { $search: search };

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [restaurants, total] = await Promise.all([
            Restaurant.find(query)
                .populate("owner", "name email")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit)),
            Restaurant.countDocuments(query),
        ]);

        //For each restaurant, get their order count
        const restaurantIds = restaurants.map((r) => r._id);
        const orderStats = await Order.aggregate([
            { $match: { restaurant: { $in: restaurantIds } } },
            {
                $group: {
                    _id: "$restaurant",
                    orderCount: { $sum: 1 },
                    totalRevenue: { $sum: "$totalAmount" },
                },
            },
        ]);

        //Build a lookup map: { restaurantId: { orderCount, totalRevenue } }
        const statsMap = {};
        orderStats.forEach((s) => { statsMap[s._id.toString()] = s; });

        //Merge stats into each restaurant object
        const enriched = restaurants.map((r) => ({
            ...r.toObject(),
            orderCount: statsMap[r._id.toString()]?.orderCount || 0,
            totalRevenue: statsMap[r._id.toString()]?.totalRevenue || 0,
        }));

        res.json({ restaurants: enriched, total, page: parseInt(page) });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

//TOGGLE RESTAURANT ACTIVE STATUS
export const toggleRestaurantActive = async (req, res) => {
    try {
        const restaurant = await Restaurant.findById(req.params.id);
        if (!restaurant) return res.status(404).json({ message: "Restaurant not found." });

        restaurant.isActive = !restaurant.isActive;
        await restaurant.save();

        res.json({
            message: `Restaurant ${restaurant.isActive ? "activated" : "deactivated"}`,
            isActive: restaurant.isActive,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

//ALL USERS
export const getAllUsers = async (req, res) => {
    try {
        const { role, page = 1, limit = 20 } = req.query;

        const query = {};
        if (role) query.role = role;

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [users, total] = await Promise.all([
            User.find(query)
                .select("-password -refreshToken")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit)),
            User.countDocuments(query),
        ]);

        res.json({ users, total, page: parseInt(page) });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

//USER REGISTRATION TREND (last 30 days)
export const getUserTrend = async (req, res) => {
    try {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
        startDate.setHours(0, 0, 0, 0);

        const data = await User.aggregate([
            { $match: { createdAt: { $gte: startDate } } },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    count: { $sum: 1 },
                },
            },
            { $sort: { _id: 1 } },
            { $project: { _id: 0, date: "$_id", count: 1 } },
        ]);

        res.json({ data });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

//ALL ORDERS (admin view)
export const getAllOrders = async (req, res) => {
    try {
        const {
            status, page = 1, limit = 20,
            startDate, endDate,
        } = req.query;

        const query = {};
        if (status) query.status = status;
        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = new Date(startDate);
            if (endDate) query.createdAt.$lte = new Date(endDate);
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [orders, total] = await Promise.all([
            Order.find(query)
                .populate("customer", "name email")
                .populate("restaurant", "name")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit)),
            Order.countDocuments(query),
        ]);

        res.json({ orders, total, page: parseInt(page) });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

//BAN / UNBAN USER
export const toggleUserBan = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: "User not found." });
        if (user.role === "admin") {
            return res.status(400).json({ message: "Cannot ban an admin account." });
        }

        //Toggle isBanned, if undefined (old docs) it becomes true on first ban
        user.isBanned = !user.isBanned;
        await user.save({ validateBeforeSave: false });

        res.json({
            message: `User ${user.isBanned ? "banned" : "unbanned"} successfully`,
            isBanned: user.isBanned,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};