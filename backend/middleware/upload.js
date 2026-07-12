const multer = require("multer");
const storage = multer.memoryStorage();

//Reject non image files before they consume memory
const imageFileFilter = (req, file, cb) => {
    const allowedMimeTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp",
    ];

    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(
            new Error("Invalid file type. Only JPG, PNG, and WebP images are allowed."),
            false
        );
    }
};

//Multer instances
//For restaurant images up to 3 files, 5MB each
const uploadRestaurantImages = multer({
    storage,
    fileFilter: imageFileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, //5MB
        files: 3,
    },
});

//For menu item images single file, 3MB max
const uploadMenuItemImage = multer({
    storage,
    fileFilter: imageFileFilter,
    limits: {
        fileSize: 3 * 1024 * 1024, //3MB
        files: 1,
    },
});

module.exports = {
    uploadRestaurantImages,
    uploadMenuItemImage,
};