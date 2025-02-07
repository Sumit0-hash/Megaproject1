import {asyncHandler} from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiErrors.js";
import { User } from "../models/user.model.js";
import {uploadOnCloudinary} from "../utils/Cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"

const registerUser=asyncHandler( async (req,res)=>{
    // get user data from frontend.
    // validation- not empty
    // check if user already exist:username,email.
    // check for images,check for avtar
    // upload to cloudinary,avtar
    // create user object-create entry in DB.
    // remove password and refresh token field from response.
    // check for user creation.
    // return response.

    const {fullname,email,username,password}=req.body
    
    if (
        [fullname, email, username, password].some((field) => field?.trim() === "")
    ) {
        return new ApiError(400,"All fields are required !");
    }
    const existedUser=await User.findOne({
        $or: [{ username } , { email }]
    })
    if (existedUser) {
        throw new ApiError(409,"User with email or username already exists.")
    }

    const avtarLocalPath = req.files?.avtar[0]?.path.replace(/\\/g, "/");
    // const coverImageLocalPath = req.files?.coverImage[0]?.path.replace(/\\/g, "/");

    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path
    }
    //checking the images:-
    if (!avtarLocalPath) {
        console.error("Avatar Upload Failed! Path:", avtarLocalPath);
        throw new ApiError(400,"Please upload an avtar");
    }
    console.log("req.files:", req.files);

    //uploading on cloudinary:-
    const avtar= await uploadOnCloudinary(avtarLocalPath)
    const coverImage= await uploadOnCloudinary(coverImageLocalPath)
    //checking whether avtar is uploaded as it's important field.
    if (!avtar) {
        throw new ApiError(400, "Failed to upload avtar");
    }
    //creating user object:-
    const user=await User.create({
        fullname,
        avtar:avtar.url,
        coverImage:coverImage?.url||"",
        email,
        password,
        username:username.toLowerCase()
    })
    //check for user creation:-
    const createdUser=await User.findById(user._id).select(  //In .select,we define the fields we do not want. 
        "-password -refreshToken"
    )
    if(!createdUser){
        throw new ApiError(500,"Something went wrong while registering the User.")
    }
    // returning response:-
    return res.status(201).json(
        new ApiResponse(200,createdUser,"User registered Successfully !")
    )
} )
export {registerUser}