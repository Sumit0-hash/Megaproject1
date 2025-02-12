import { ApiError } from "../utils/ApiErrors.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import jwt from "jsonwebtoken"
import { User } from "../models/user.model.js"

export const verifyJWT= asyncHandler(async(req,_,next)=>{ //we put _ instead of res because res will not be used here.
    //taking access of tokens.
    try {
        const token=req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ","")
        if(!token){
            throw new ApiError(401,"Unauthorized request.")
        }
        //Verification:-
        const decodedToken=jwt.verify(token,process.env.ACCESS_TOKEN_SECRET) //jwt.verify existence of token and return in decoded form.
        const user=await User.findById(decodedToken?._id).select("-password -refreshToken")
        if(!user){
            throw new ApiError(401,"Invalid Access Token.")
        }
        req.user=user;
        next()
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid access token.")
    }
})