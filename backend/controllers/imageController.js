const cloudinary = require("../config/cloudinary");
const Restaurant = require("../models/Restaurant");
const MenuItem = require("../models/MenuItem");
const {
    deleteCache,
    deleteCachePattern,
} = require("../config/redis");

//uplode buffer to cloudinary
const uploadBufferToCloudinary = (
    buffer,
    folder,
    transformation = []
) => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder,
                transformation,
                resource_type: "image",
                fetch_format: "auto",
                quality: "auto",
            },
            (error, result) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(result);
                }
            }
        );

        const { Readable } = require("stream");

        const readableStream = new Readable();
        readableStream.push(buffer);
        readableStream.push(null);
        readableStream.pipe(uploadStream);
    });
};

//need the public_id to delete an image from Cloudinary.
const getPublicIdFromUrl = (url) => {
    try {
        const parts = url.split("/");
        const uploadIndex = parts.indexOf("upload");

        if (uploadIndex === -1) {
            return null;
        }

        const afterUpload = parts.slice(uploadIndex + 1);
        const withoutVersion = /^v\d+$/.test(afterUpload[0]) ? afterUpload.slice(1) : afterUpload;
        const publicIdWithExt = withoutVersion.join("/");
        const publicId = publicIdWithExt.replace(/\.[^/.]+$/, "");
        return publicId;
    }
    catch (error) {
        console.error("Failed to extract public_id from URL:", error);
        return null;
    }
};


//Each file has: { buffer, originalname, mimetype, size }
const uploadRestaurantImages = async (req, res) => {
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
                message: "Not authorized to update this restaurant",
            });
        }

        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Please select at least one image to upload",
            });
        }

        const totalAfter =
            restaurant.images.length + req.files.length;

        if (totalAfter > 5) {
            return res.status(400).json({
                success: false,
                message: `Maximum 5 images allowed. You currently have ${restaurant.images.length} image(s). You can add ${5 - restaurant.images.length} more.`,
            });
        }

        const uploadPromises = req.files.map((file) =>
            uploadBufferToCloudinary(
                file.buffer,
                "feedgrid/restaurants",
                [
                    {
                        width: 1200,
                        height: 800,
                        crop: "limit",
                        quality: "auto",
                    },
                ]
            )
        );

        const uploadResults = await Promise.all(uploadPromises);

        const newImageUrls = uploadResults.map(
            (result) => result.secure_url
        );

        restaurant.images = [...restaurant.images, ...newImageUrls];
        await restaurant.save({ validateBeforeSave: false });
        await deleteCache(`restaurants:detail:${req.params.id}`);
        await deleteCachePattern("restaurants:list:*");

        res.status(200).json({
            success: true,
            message: `${newImageUrls.length} image(s) uploaded successfully`,
            images: restaurant.images,
        });
    } catch (error) {
        console.error("Upload restaurant images error:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to upload images",
        });
    }
};

const deleteRestaurantImage = async (req, res) => {
    try {
        const { imageUrl } = req.body;

        if (!imageUrl) {
            return res.status(400).json({
                success: false,
                message: "imageUrl is required in request body",
            });
        }

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
                message: "Not authorized to update this restaurant",
            });
        }

        if (!restaurant.images.includes(imageUrl)) {
            return res.status(404).json({
                success: false,
                message: "Image not found on this restaurant",
            });
        }

        const publicId = getPublicIdFromUrl(imageUrl);

        if (publicId) {
            const deleteResult = await cloudinary.uploader.destroy(publicId);

            if (deleteResult.result !== "ok" && deleteResult.result !== "not found") {
                console.warn(
                    "Cloudinary delete returned unexpected result:",
                    deleteResult
                );
            }
        }

        restaurant.images = restaurant.images.filter(
            (img) => img !== imageUrl
        );
        await restaurant.save({ validateBeforeSave: false });

        await deleteCache(`restaurants:detail:${req.params.id}`);
        await deleteCachePattern("restaurants:list:*");

        res.status(200).json({
            success: true,
            message: "Image deleted successfully",
            images: restaurant.images,
        });
    } catch (error) {
        console.error("Delete restaurant image error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to delete image",
        });
    }
};

const uploadMenuItemImage = async (req, res) => {
    try {
        const { restaurantId, itemId } = req.params;
        const restaurant = await Restaurant.findById(restaurantId);

        if (!restaurant) {
            return res.status(404).json({
                success: false,
                message: "Restaurant not found",
            });
        }

        if (restaurant.owner.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: "Not authorized",
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

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "Please select an image to upload",
            });
        }

        if (menuItem.image) {
            const oldPublicId = getPublicIdFromUrl(menuItem.image);
            if (oldPublicId) {
                await cloudinary.uploader.destroy(oldPublicId);
            }
        }

        const uploadResult = await uploadBufferToCloudinary(
            req.file.buffer,
            "feedgrid/menu-items",
            [
                {
                    width: 600,
                    height: 600,
                    crop: "fill",
                    gravity: "auto",
                    quality: "auto",
                },
            ]
        );

        menuItem.image = uploadResult.secure_url;
        await menuItem.save({ validateBeforeSave: false });
        await deleteCache(`restaurants:menu:${restaurantId}`);
        await deleteCache(`restaurants:detail:${restaurantId}`);

        res.status(200).json({
            success: true,
            message: "Menu item image uploaded successfully",
            image: menuItem.image,
        });
    } catch (error) {
        console.error("Upload menu item image error:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to upload menu item image",
        });
    }
};

const deleteMenuItemImage = async (req, res) => {
    try {
        const { restaurantId, itemId } = req.params;

        const restaurant = await Restaurant.findById(restaurantId);

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
                message: "Not authorized",
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

        if (!menuItem.image) {
            return res.status(400).json({
                success: false,
                message: "This menu item has no image to delete",
            });
        }

        const publicId = getPublicIdFromUrl(menuItem.image);
        if (publicId) {
            await cloudinary.uploader.destroy(publicId);
        }

        menuItem.image = null;
        await menuItem.save({ validateBeforeSave: false });
        await deleteCache(`restaurants:menu:${restaurantId}`);
        await deleteCache(`restaurants:detail:${restaurantId}`);

        res.status(200).json({
            success: true,
            message: "Menu item image deleted successfully",
        });
    } catch (error) {
        console.error("Delete menu item image error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to delete menu item image",
        });
    }
};

module.exports = {
    uploadRestaurantImages,
    deleteRestaurantImage,
    uploadMenuItemImage,
    deleteMenuItemImage,
};