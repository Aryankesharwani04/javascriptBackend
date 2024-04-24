import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import {User} from "../models/user.model.js";
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";



const registerUser = asyncHandler(async (req, res) => {
    //take username, email, password, encrypt the password  and create a new user
    //validate required thing
    // check duplicacy of register of user
    // check for images and avatar
    //upload everything to cloudinary
    //create a user object and entry in db
    //remove password and refresh  Token
    // check for user creation is done or not
    //return res
    const { fullname, username, email, password} = req.body;
    if([fullname, username, email, password].some((field) =>{
        return field?.trim() === ""})
    ){
        throw new ApiError(400,"Please fill all fields");
    }
    const existedUser = await User.findOne(
        { $or: [{email}, {username}]}
    );
    if(existedUser){
        throw new ApiError(409, "user already exist with similar username or email");
    }
    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath = req.files?.coverImage[0]?.path;

    if(!avatarLocalPath){
        throw new ApiError(400, " avatar is required");
    }
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if(!avatar)
        throw new ApiError(400, " avatar is required");
    const user = await User.create(
        {
            fullname,
            avatar: avatar.url,
            coverImage: coverImage?.url || "",
            email,
            password,
            username: username.toLowerCase()
        }
    )
    const checkUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )
    if(!checkUser) 
        throw new ApiError(500,"Something went wrong while creating the account")

    return res.status(201).json(
        new ApiResponse(200,"Account has been created successfully")
    )
});


export {
    registerUser
};