import {Video} from "../models/video.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";


const getAllVideos = asyncHandler(async (req, res) => {
    console.log(req.query)
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query
    //TODO: get all videos based on query, sort, pagination
    //First of all we will match the conditions using query 
    //and find the documents where the title field contains a substring that matches the regular expression 
    //The $regex operator is used for pattern matching, and the $options: "i" ensures case-insensitive matching.
    //now we will set owner preference from userId in matchconditions
    //then we match aa=ll documents matching using aggregation pipeplines
    //then we lookup for the videos using pipeline and project usefull things
    const matchConditions = {
        $or: [ 
            {title: { $regex: query, $options: "1"}},
            {description: { $regex: query, $options: "1"}}
        ]
    }
    if(userId)
        matchConditions.owner = new mongoose.Types.ObjectId(userId)
    const videos = await Video.aggregate(
        [
            {
                $match: matchConditions
            },
            {
                $lookup: {
                    from: "users",
                    LocalField : "owner",
                    foreignField: "_id",
                    as: "owner",
                    pipeline: [
                        {
                            $project: {
                                _id: 1,
                                fullname: 1,
                                username: 1,
                                avatar: 1,
                                email: 1,
                            }
                        }
                    ]
                },
                
            },
            {
                $addFields: {
                    owner: {
                        $first: $owner
                    }
                }
            },
            {
                $sort: {
                    [sortBy || createdAt] : sortType || 1,
                }
            }
        ]
    )

    videos.mongooseAggregatePaginate()

    await videos
    .sort(sortCriteria)
    .skip((page - 1)*limit)
    .limit(limit)
    .exec();

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            videos,
            "Videos fetched successfully"
        )
    )
})

const publishAVideo = asyncHandler(async(req, res) => {
    //to publish a video i will first find the current user access to upload video in his account
    //now after this i will request body to give me title and description
    //then i will find the url or path of the video to upload
    //then i will upload the video in the cloudinary
    //then i will use video model to create a video document
    //then i will return the Api Response of successfully uploading a video
    const { userId } = req.query;
    if(!userId)
        throw new ApiError(400, "User not found")

    const { title, description } = req.body;

    const videoPath = req.file?.path;

    if(!videoPath)
        throw new ApiError(400, "Video path not fetched")

    const duration = "";

    ffmeg.ffprobe(videoPath, async(err, metadata) => {
        if (err) {
            console.error('Error probing video:', err);
            return res.status(500).json({ error: 'Error probing video' });
        }
        duration = metadata.format.duration;
    });
    

    const videoUploadPath = await uploadOnCloudinary(videoPath);

    const video = await new Video({
        title,
        description,
        userId,
        videoFile: videoUploadPath.url,
        thumbnail: title,
        duration
    })


    await video.save();

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            video,
            "Video Published Successfully"
        )
    )
    

})

const getVideoById = asyncHandler(async(req, res) => {
    //first i will find the id of the video by req.parameters
    //then i will fetch the video from video database
    //then i will give it to the use accessing the video by verifying credentials
    const {videoId} = req.params

    if(!videoId)
        throw new ApiError(400, "Id of the video not fetched")

    const video = await Video.findById(videoId);
    if(!video)
        throw new ApiError(404, "Video not found")

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            video,
            "Video fetched successfully"
        )
    )
})

const updateVideo = asyncHandler(async(req, res) => {
    // first i will get the new video link from req.file
    //then i will upload that new video to cloudinary
    // then i will find the id of the video where i have to update using req.params
    // and by finding i will update that video link to the new video link
    // i think i also should delete that old video from the cloudinary also but i did not getting idea to delete

    const newVideoLocalPath = req.file?.path;

    if(!newVideoLocalPath)
        throw new ApiError(400, " Updated Video not found")

    const newVideo = await uploadOnCloudinary(newVideoLocalPath)

    if(!newVideo)
        throw new ApiError(400, "Error While uploading updated video")

    const {videoId} = req.params

    if(!videoId)
        throw new ApiError(400, "Id of user not found to update video")

    const oldVideo = await Video.findById(videoId)
    if(oldVideo && oldVideo.videoFile){
        const path = oldVideo.videoFile.public_id
        await deleteFromCloudinary(path)
    }
    const video = await Video.findByIdAndUpdate(
        videoId,
        {
            $set:{
                videoFile: newVideo
            }
        },
        {new : true}
    )

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            video,
            "Video Updated successfully"
        )
    )

})

const deleteVideo = asyncHandler(async(req, res) => {
    //to delete a video first i will get the video id to delete
    // then i will find that videoFile to get its cloudinary
    //then i will delete the video

    const {videoId} = req.params
    if(!videoId)
        throw new ApiError(400, "Id of user not found to delete video")
    
    const video = await Video.findById(videoId)

    if(!video)
        throw new ApiError(400, "Video not found to delete")

    if(!video.videoFile)
        throw new ApiError(400, "file of video not found to delete")

    const oldVideoPath = video.videoFile.public_id

    await deleteFromCloudinary(oldVideoPath)

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            {},
            "Video deleted successfully"
        )
    )




})

export{
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,

}


