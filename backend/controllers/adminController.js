const User = require("../models/User");
const Restaurant = require("../models/Restaurant");
const Order = require("../models/Order");

const getPlatformStats = async (req, res) => {
    try {
        const [
            totalUsers,
            totalRestaurants,
            pendingRestaurants,
            totalOrders,
            deliveredOrders,
            totalCustomers,
            totalOwners,
            totalAgents,
        ] = await Promise.all([
            User.countDocuments({ isActive: true }),
            Restaurant.countDocuments({ isActive: true }),
            Restaurant.countDocuments({ isApproved: false, isActive: true }),
            Order.countDocuments(),
            Order.countDocuments({ status: "delivered" }),
            User.countDocuments({ role: "customer", isActive: true }),
            User.countDocuments({
                role: "restaurant_owner",
                isActive: true,
            }),
            User.countDocuments({
                role: "delivery_agent",
                isActive: true,
            }),
        ]);

        const revenueResult = await Order.aggregate([
            { $match: { status: "delivered", paymentStatus: "paid" } },
            { $group: { _id: null, totalRevenue: { $sum: "$total" } } },
        ]);

        const totalRevenue =
            revenueResult.length > 0
                ? revenueResult[0].totalRevenue
                : 0;

        const recentOrders = await Order.find()
            .populate("customer", "name")
            .populate("restaurant", "name")
            .sort({ createdAt: -1 })
            .limit(5)
            .select("status total createdAt customer restaurant");

        res.status(200).json({
            success: true,
            stats: {
                totalUsers,
                totalRestaurants,
                pendingRestaurants,
                totalOrders,
                deliveredOrders,
                totalRevenue,
                totalCustomers,
                totalOwners,
                totalAgents,
            },
            recentOrders,
        });
    } catch (error) {
        console.error("Get stats error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch platform statistics",
        });
    }
};

const getAnalytics = async (req, res) => {
    try {
        const { days = 7 } = req.query;
        const daysNum = parseInt(days);

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - daysNum);
        startDate.setHours(0, 0, 0, 0);

        const dailyData = await Order.aggregate([
            {
                $match: {
                    createdAt: { $gte: startDate },
                    paymentStatus: "paid",
                },
            },
            {
                $group: {
                    _id: {
                        $dateToString: {
                            format: "%Y-%m-%d",
                            date: "$createdAt",
                        },
                    },
                    revenue: { $sum: "$total" },
                    orders: { $sum: 1 },
                },
            },
            { $sort: { _id: 1 } },
        ]);

        const filledDailyData = [];
        for (let i = daysNum - 1; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split("T")[0];

            const existing = dailyData.find((d) => d._id === dateStr);

            filledDailyData.push({
                date: dateStr,
                label: date.toLocaleDateString("en-IN", {
                    month: "short",
                    day: "numeric",
                }),
                revenue: existing?.revenue || 0,
                orders: existing?.orders || 0,
            });
        }

        const statusBreakdown = await Order.aggregate([
            {
                $group: {
                    _id: "$status",
                    count: { $sum: 1 },
                },
            },
            { $sort: { count: -1 } },
        ]);

        const statusData = statusBreakdown.map((item) => ({
            name: item._id.replace(/_/g, " "),
            value: item.count,
            status: item._id,
        }));

        const topRestaurants = await Order.aggregate([
            {
                $match: {
                    status: "delivered",
                    paymentStatus: "paid",
                },
            },
            {
                $group: {
                    _id: "$restaurant",
                    revenue: { $sum: "$total" },
                    orders: { $sum: 1 },
                },
            },
            { $sort: { revenue: -1 } },
            { $limit: 5 },
            {
                $lookup: {
                    from: "restaurants",
                    localField: "_id",
                    foreignField: "_id",
                    as: "restaurant",
                },
            },
            { $unwind: "$restaurant" },
            {
                $project: {
                    name: "$restaurant.name",
                    revenue: 1,
                    orders: 1,
                },
            },
        ]);

        const userRegistrations = await User.aggregate([
            {
                $match: {
                    createdAt: { $gte: startDate },
                },
            },
            {
                $group: {
                    _id: {
                        $dateToString: {
                            format: "%Y-%m-%d",
                            date: "$createdAt",
                        },
                    },
                    count: { $sum: 1 },
                },
            },
            { $sort: { _id: 1 } },
        ]);

        const filledUserData = filledDailyData.map((day) => {
            const existing = userRegistrations.find(
                (u) => u._id === day.date
            );
            return {
                ...day,
                newUsers: existing?.count || 0,
            };
        });

        const periodRevenue = filledDailyData.reduce(
            (sum, d) => sum + d.revenue,
            0
        );
        const periodOrders = filledDailyData.reduce(
            (sum, d) => sum + d.orders,
            0
        );

        res.status(200).json({
            success: true,
            analytics: {
                dailyData: filledUserData,
                statusData,
                topRestaurants,
                summary: {
                    periodRevenue,
                    periodOrders,
                    avgOrderValue:
                        periodOrders > 0
                            ? Math.round(periodRevenue / periodOrders)
                            : 0,
                    days: daysNum,
                },
            },
        });
    } catch (error) {
        console.error("Get analytics error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch analytics data",
        });
    }
};

const getAllRestaurantsAdmin = async (req, res) => {
    try {
        const {
            status,
            isActive,
            search,
            page = 1,
            limit = 15,
        } = req.query;

        const filter = {};
        if (status === "approved") filter.isApproved = true;
        if (status === "pending") filter.isApproved = false;
        if (isActive === "true") filter.isActive = true;
        if (isActive === "false") filter.isActive = false;
        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: "i" } },
                { "address.city": { $regex: search, $options: "i" } },
            ];
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [total, restaurants] = await Promise.all([
            Restaurant.countDocuments(filter),
            Restaurant.find(filter)
                .populate("owner", "name email phone")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .select("-__v"),
        ]);

        res.status(200).json({
            success: true,
            total,
            totalPages: Math.ceil(total / parseInt(limit)),
            currentPage: parseInt(page),
            restaurants,
        });
    } catch (error) {
        console.error("Admin get restaurants error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch restaurants",
        });
    }
};

const toggleRestaurantActive = async (req, res) => {
    try {
        const restaurant = await Restaurant.findById(req.params.id);

        if (!restaurant) {
            return res.status(404).json({
                success: false,
                message: "Restaurant not found",
            });
        }

        restaurant.isActive = !restaurant.isActive;
        await restaurant.save({ validateBeforeSave: false });

        res.status(200).json({
            success: true,
            message: `Restaurant ${restaurant.isActive ? "activated" : "deactivated"
                } successfully`,
            isActive: restaurant.isActive,
        });
    } catch (error) {
        if (error.name === "CastError") {
            return res
                .status(400)
                .json({ success: false, message: "Invalid restaurant ID" });
        }
        console.error("Toggle restaurant active error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to toggle restaurant status",
        });
    }
};

const getAllUsers = async (req, res) => {
    try {
        const {
            role,
            isActive,
            search,
            page = 1,
            limit = 15,
        } = req.query;

        const filter = {};
        if (role) filter.role = role;
        if (isActive === "true") filter.isActive = true;
        if (isActive === "false") filter.isActive = false;
        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: "i" } },
                { email: { $regex: search, $options: "i" } },
            ];
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [total, users] = await Promise.all([
            User.countDocuments(filter),
            User.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .select("-__v -refreshToken"),
        ]);

        res.status(200).json({
            success: true,
            total,
            totalPages: Math.ceil(total / parseInt(limit)),
            currentPage: parseInt(page),
            users,
        });
    } catch (error) {
        console.error("Admin get users error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch users",
        });
    }
};

const toggleUserActive = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res
                .status(404)
                .json({ success: false, message: "User not found" });
        }

        if (user._id.toString() === req.user._id.toString()) {
            return res.status(400).json({
                success: false,
                message: "You cannot deactivate your own account",
            });
        }

        user.isActive = !user.isActive;
        await user.save({ validateBeforeSave: false });

        res.status(200).json({
            success: true,
            message: `User ${user.isActive ? "activated" : "deactivated"
                } successfully`,
            isActive: user.isActive,
        });
    } catch (error) {
        if (error.name === "CastError") {
            return res
                .status(400)
                .json({ success: false, message: "Invalid user ID" });
        }
        console.error("Toggle user active error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to toggle user status",
        });
    }
};

const updateUserRole = async (req, res) => {
    try {
        const { role } = req.body;
        const validRoles = [
            "customer",
            "restaurant_owner",
            "delivery_agent",
            "admin",
        ];

        if (!role || !validRoles.includes(role)) {
            return res.status(400).json({
                success: false,
                message: `Role must be one of: ${validRoles.join(", ")}`,
            });
        }

        if (req.params.id === req.user._id.toString()) {
            return res.status(400).json({
                success: false,
                message: "You cannot change your own role",
            });
        }

        const user = await User.findByIdAndUpdate(
            req.params.id,
            { role },
            { new: true }
        ).select("-__v -refreshToken");

        if (!user) {
            return res
                .status(404)
                .json({ success: false, message: "User not found" });
        }

        res.status(200).json({
            success: true,
            message: `User role updated to ${role}`,
            user,
        });
    } catch (error) {
        if (error.name === "CastError") {
            return res
                .status(400)
                .json({ success: false, message: "Invalid user ID" });
        }
        console.error("Update user role error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to update user role",
        });
    }
};

module.exports = {
    getPlatformStats,
    getAnalytics,
    getAllRestaurantsAdmin,
    toggleRestaurantActive,
    getAllUsers,
    toggleUserActive,
    updateUserRole,
};