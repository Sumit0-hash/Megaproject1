// File upload
import { v2 as cloudinary} from "cloudinary";
import fs from "fs";  //fs is file system(helps in read,write,remove,etc)
// Files will come according to file system.
// Note:When file is successfully uploaded,we will delete/unlink it.

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:process.env.CLOUDINARY_API_KEY,
    api_secret:process.env.CLOUDINARY_API_SECRET
})

const uploadOnCloudinary=async (localFilePath)=>{
    try {
        if(!localFilePath) return null
        // upload the file in cloudinary
        const response=await cloudinary.uploader.upload(localFilePath,{
            resource_type:"auto"
        })
        //file has been uploaded successfully
        console.log("File uploaded Successfully on Cloudinary!!",response.url) //response.url will give us public url.
        return response;
    } catch (error) {
        fs.unlinkSync(localFilePath) //remove the locally saved temporary file as upload operation got failed.'
        return null;
    }

}

export {uploadOnCloudinary}
