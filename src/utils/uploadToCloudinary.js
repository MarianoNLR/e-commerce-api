import cloudinary from "../config/cloudinary.js";
import streamifier from "streamifier"

export function uploadToCloudinary (buffer, folder = 'uploads') {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            { 
                folder,
                resource_type: 'image'
            },
            (error, result) => {
                if (error) {
                    return reject(error);
                }

                if (!result) {
                    return reject(new Error('No result from Cloudinary upload'));
                }
                resolve(result);
            }
        );
        streamifier.createReadStream(buffer).pipe(uploadStream);
    });
}