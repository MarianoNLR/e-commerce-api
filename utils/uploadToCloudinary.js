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
                if (result) {
                    resolve(result);
                } else {
                    reject(error);
                }
            }
        );
        streamifier.createReadStream(buffer).pipe(uploadStream);
    });
}