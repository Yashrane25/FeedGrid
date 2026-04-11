//When we upload an image, Cloudinary stores it and returns a permanent URL. We store that URL in MongoDB. DB never stores the actual image binary.

import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import multer from "multer";

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});


const storage = new CloudinaryStorage({
    cloudinary,
    params: {
        folder: "FeedGrid",     //All images go inside this Cloudinary folder
        allowed_formats: ["jpg", "jpeg", "png", "webp"],
        transformation: [
            //Resize to max 800x600 before storing to saves storage space
            //crop: "limit" means: only shrink if larger, never enlarge
            { width: 800, height: 600, crop: "limit" },
        ],
    },
});

//multer middleware that handles multipart/form data (file upload requests)
export const upload = multer({ storage });

export default cloudinary;
