import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) throw new Error("No file path provided");

    // Convert Windows paths to Unix-style (fix for Windows)
    localFilePath = localFilePath.replace(/\\/g, "/");

    console.log("📤 Uploading file to Cloudinary:", localFilePath);

    // Upload file to Cloudinary
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });

    console.log("✅ File uploaded successfully:", response.url);

    // Delete the local file after successful upload
    fs.unlinkSync(localFilePath); // unlinkSync is used for synchronous deletion(stop and execute).
    return response;
  } catch (error) {
    // Delete the file only if it exists
    if (fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
    }

    return null;
  }
};

// const deleteFromCloudinary = async (url) => {
//   const publicId = url.split("/").pop().split(".")[0];
//   await cloudinary.uploader.destroy(publicId);
// };

// export { uploadOnCloudinary, deleteFromCloudinary };
export { uploadOnCloudinary };
