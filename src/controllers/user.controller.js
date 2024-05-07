import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import {User} from "../models/user.model.js";
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from  'jsonwebtoken'



const generateAccessTokenAndRefreshToken = async(userId) =>{
    try {
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();
        user.refreshToken = refreshToken;
        user.save({valodateBeforeSave: false});
        return {accessToken, refreshToken};
    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating access and refresh token");
    }
}

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
    // console.log(req.files);
    const avatarLocalPath = req.files?.avatar[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;
    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
        coverImageLocalPath = req.files.coverImage[0].path;
    }

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
        new ApiResponse(200,user, "Account has been created successfully")
    )
});

const loginUser = asyncHandler(async (req,res) => {
    const {email,username,password} = req.body;
    if(!email && !username){
        throw new ApiError(400,"username or email is required");
    }
    const user = await User.findOne({
        $or: [{email}, {username}],
    });

    if(!user){
        throw new ApiError(400, "User does not exist");
    }
    const isPasswordValid = await user.isPasswordCorrect(password);
    if (!isPasswordValid) {
        throw new ApiError(400,'Invalid credentials');
    }

    const {accessToken, refreshToken} = await generateAccessTokenAndRefreshToken(user._id);

    const loggedUser = await User.findById(user._id).select("-password -refreshToken");

    const options = {
        httpOnly : true,
        secure:true
    }
    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(
            200, 
            {
                user:loggedUser,accessToken,refreshToken
            },
            "User Logged in successfully"
        )
    )


})

//     //req.body
//     //check email or username and password
//     //give access token
//     //send via cookies

const logoutUser = asyncHandler(async (req,res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                refreshToken: undefined
            }
        },
        {
            new : true
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }
    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(
        new ApiResponse(
            200,
            {},
            "User Logged Out Successfully"

        )
    )
})

const refreshAccessToken = asyncHandler(async (req,res)=>{
   try {
     const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken
 
     if(!incomingRefreshToken)
         throw new ApiError(401, "unauthorised request");
 
     const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);
     const user = await User.findById(decodedToken?._id)
 
     if(!user)
         throw new ApiError(401,"Invalid Token")
     
     if(incomingRefreshToken !== user?.refreshToken){
         throw new ApiError(401, "Refresh token is expired or in use")
     }
 
     const options = {
         httpOnly:true,  //it will
         secure:true
     }
     const {newrefreshToken, accessToken } = await generateAccessTokenAndRefreshToken(user._id);
 
     return res
     .status(200)
     .cookie("accessTokem", accessToken, options)
     .cookie("newrefreshToken", newrefreshToken, options)
     .json(
         new ApiResponse(
             200,
             {
                 accessToken,
                 newrefreshToken
             },
             "Access token refreshed"
         )
     )
   } catch (error) {
        new ApiError(401, error?.message || "Invalid refresh token")
   }
});

const changeCurrentPassword = asyncHandler(async (req,res,) => {
    const {oldPassword, newPassword} = req.body;

    const user = await User.findById(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)
    if(!isPasswordCorrect)
        throw new ApiError(400, "Invalid old password")

    user.password = newpassword;

    await user.save({validateBeforeSave: false})
    return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"));
})

const getCurrentUser = asyncHandler(async(req, res) => {
    const user = await req.user
    return res
    .status(200)
    .json(new ApiResponse(200, user, "current user fetched successfully"))
})

const updateAccountDetail = asyncHandler(async(req,res) => {
    const {fullname, email} = req.body;
    if(!fullname && !email){
        throw new ApiError(400,"At least one field must be updated");
    }
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                fullName : fullname||req.user.fullName,  
                email : email||req.user.email, 
            }
        },
        {new: true}
    ).select("-password")
    return res
    .status(200)
    .json(new ApiResponse(200, user , "Account detail Updated Successfully"))
})

const updateUserAvatar = asyncHandler(async(req,res) => {
    const avatarLocalPath = req.file?.path;
    if(!avatarLocalPath){
        throw new ApiError(400,'Avatar file is missing:');
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if(!avatar?.url){
        throw new ApiError(400, "error while uploading");
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                avatar: avatar.url,
            }
        },
        {new: true}
    ).select("-password")
    return res
    .status(201)
    .json(
        new ApiResponse(200, user, "Avatar updated")
    )
})


const updateUserCoverImage = asyncHandler(async(req,res) => {
    const coverImageLocalPath = req.file?.path;
    if(!coverImageLocalPath){
        throw new ApiError(400,'Cover image file is missing:');
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!coverImage?.url){
        throw new ApiError(400, "error while uploading");
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                coverImage: coverImage.url,
            }
        },
        {new: true}
    ).select("-password")
    return res
    .status(201)
    .json(
        new ApiResponse(200, user, "Cover Image updated")
    )

})

const getUserChannelProfile = asyncHandler(async(req, res) => {
    const {username} = req.params;
    
    if(!username?.trim()){
        throw new ApiError(400, "username invalid");
    }

    const channel = await User.aggregate(
        {
            $match :{
                username: username?.toLowerCase(),
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"

            },
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        {
            $addField:{
                subscribersCount:{
                    $size: "$subscribers"
                },
                channelsubscribedToCount: {
                    $size: "$subscribedTo"
                },
                isSubscribed: {
                    $cond: {
                        if: {$in: [req.user?._id, "$subscribers.subscriber"]},
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project:{
                username: 1,
                email: 1,
                fullname: 1,
                subscribersCount: 1,
                channelsubscribedToCount: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1,
            }
        }
    )

    if(!channel?.length){
        throw new ApiError(404, "channel does not exist")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200, channel[0], "user channels fetched successfully")
    )
})


export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetail, 
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
};