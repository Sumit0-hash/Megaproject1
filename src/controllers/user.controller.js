import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiErrors.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/Cloudinary.js";
// import { uploadOnCloudinary,deleteFromCloudinary } from "../utils/Cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken; //adding value in user object.
    await user.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating refresh and access token !!"
    );
  }
};

const registerUser = asyncHandler(async (req, res) => {
  // get user data from frontend.
  // validation- not empty
  // check if user already exist:username,email.
  // check for images,check for avtar
  // upload to cloudinary,avtar
  // create user object-create entry in DB.
  // remove password and refresh token field from response.
  // check for user creation.
  // return response.

  const { fullname, email, username, password } = req.body;

  if (
    [fullname, email, username, password].some((field) => field?.trim() === "")
  ) {
    return new ApiError(400, "All fields are required !");
  }
  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });
  if (existedUser) {
    throw new ApiError(409, "User with email or username already exists.");
  }

  const avtarLocalPath = req.files?.avtar[0]?.path.replace(/\\/g, "/");
  // const coverImageLocalPath = req.files?.coverImage[0]?.path.replace(/\\/g, "/");

  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }
  //checking the images:-
  if (!avtarLocalPath) {
    console.error("Avatar Upload Failed! Path:", avtarLocalPath);
    throw new ApiError(400, "Please upload an avtar");
  }
  console.log("req.files:", req.files);

  //uploading on cloudinary:-
  const avtar = await uploadOnCloudinary(avtarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);
  //checking whether avtar is uploaded as it's important field.
  if (!avtar) {
    throw new ApiError(400, "Failed to upload avtar");
  }
  //creating user object:-
  const user = await User.create({
    fullname,
    avtar: avtar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase(),
  });
  //check for user creation:-
  const createdUser = await User.findById(user._id).select(
    //In .select,we define the fields we do not want.
    "-password -refreshToken"
  );
  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering the User.");
  }
  // returning response:-
  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User registered Successfully !"));
});

const loginUser = asyncHandler(async (req, res) => {
  //req body ->data
  //get username or email
  //find the user
  //if user exists,then check the password.
  //access and refresh token generation.
  //send cookie.

  const { email, username, password } = req.body;

  if (!username && !email) {
    throw new ApiError(400, "Username or email is required !!");
  }

  const user = await User.findOne({
    $or: [{ email }, { username }],
  });
  if (!user) {
    throw new ApiError(404, "Username does not exist");
  }

  const isPasswordValid = await user.isPasswordCorrect(password); //we use here user not User because User is mongoDB instance and will not give access of methods present in file.

  if (!isPasswordValid) {
    throw new ApiError(404, "Password is incorrect.");
  }
  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id
  );
  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  //sending cookies:-
  const options = {
    httpOnly: true,
    secure: true,
  }; //this will allow no one to bydefault modify cookies on frontend.(server can access and modify)

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "User logged in Successfully !!"
      )
    );
});
const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id, //how to find user
    {
      //what we have to update
      $set: {
        //what we have to update.
        refreshToken: undefined,
      },
    },
    {
      new: true, //this will return new value(with refresh token as undefined)
    }
  );
  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User Logged Out"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized request !");
  }

  //verifying incomingRequestToken
  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decodedToken?._id);

    if (!user) {
      throw new ApiError(401, "Invalid refresh Token !");
    }

    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh Token is expired or used !");
    }

    const options = {
      httpOnly: true,
      secure: true,
    };
    //generating new access token
    const { newaccessToken, newrefreshToken } =
      await generateAccessAndRefreshTokens(user._id);
    return res
      .status(200)
      .cookie("newaccessToken", newaccessToken, options)
      .cookie("newaccessToken", newrefreshToken, options)
      .json(
        new ApiResponse(
          200,
          { newaccessToken, refreshToken: newrefreshToken },
          "Access Token Refreshed !"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token");
  }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  //In case you want to add a confirm password validation,add confPassword to upper parameters and write this code
  // if(!(newPassword===confPassword)){
  //   throw new ApiError(400,"Password and Confirm Password must be same");
  // }
  const user = await User.findById(req.body?._id);
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);
  if (!isPasswordCorrect) {
    throw new ApiError(400, "Password Invalid !");
  }
  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed Successfully !"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(200, req.user, "Current user fetched Successfully !");
});

//when we want to update files,we should write another controller and endpoints for it.
const updateAccountDetails = asyncHandler(async (req, res) => {
  const { fullname, email } = req.body;
  if (!(fullname || email)) {
    throw new ApiError(400, "All fields are required !");
  }
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullname,
        email: email,
      },
    },
    { new: true }
  ).select(-password);
  return res
    .status(200)
    .json(new ApiResponse(200, user, "Account details updated Successfully !"));
});

const updateUserAvtar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.files?.path;
  if (!avatarLocalPath) {
    throw new ApiError(400, "Avtar file is missing !");
  }
  const avtar = await uploadOnCloudinary(avatarLocalPath);
  if (!avtar.url) {
    throw new ApiError(400, "Error while uploading avatar !");
  }

  // Fetch the current user to get the old avatar URL
  // const currUser=await User.findById(req.user?._id)
  // const oldAvtar=await currUser?.avtar

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avtar: avtar.url,
      },
    },
    { new: true }
  ).select("-password");

  //Deleting old image:-
  // if(oldAvtar){
  //   await deleteFromCloudinary(oldAvtar)
  // }

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Avtar updated Successfully !"));
});

const updateUserCoverImage = asyncHandler(async (req, res) => {
  const coverLocalPath = req.file?.path;
  if (!coverLocalPath) {
    throw new ApiError(400, "Cover Image file is missing !");
  }
  const coverImage = await uploadOnCloudinary(coverLocalPath);
  if (!coverImage.url) {
    throw new ApiError(400, "Error while uploading avatar !");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avtar: coverImage.url,
      },
    },
    { new: true }
  ).select("-password");
  return res
    .status(200)
    .json(new ApiResponse(200, user, "Cover Image updated Successfully !"));
});
const getUserChannelProfile = asyncHandler(async (req, res) => {
  const { username } = req.params;
  if (!username?.trim()) {
    throw new ApiError(400, "Username is missing !");
  }

  const channel = await User.aggregate([
    {
      $match: {
        username: username.toLowerCase(),
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo",
      },
    },
    {
      $addFields: {
        //adding new fields
        subscribersCount: { $size: "$subscribers" },
        channelsSubscribedToCount: { $size: "$subscribedTo" },
        isSubscribed: {
          $cond: {
            if: { $in: [req.user?._id, "$subscribers.subscriber"]},
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        //decide which will be sent further
        fullname: 1,
        username: 1,
        avtar: 1,
        coverImage: 1,
        subscribersCount: 1,
        channelsSubscribedToCount: 1,
        isSubscribed: 1,
        email: 1,
      },
    },
  ]);
  if (!channel?.length) {
    throw new ApiError(404, "Channel not found !!");
  }
  return res
    .status(200)
    .json(
      new ApiResponse(200, channel[0], "User channel fetched successfully !!")
    );
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvtar,
  updateUserCoverImage,
  getUserChannelProfile,
};
