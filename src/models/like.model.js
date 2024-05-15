import mongoose, {Schema} from "mongoosse"

const likeSchema = new Schema({
    comment :{
        type : Schema.Types.ObjectId,
        ref: "Comment"
    },
    video: {
        type: Schema.Types.ObjectId,
        ref: "Video"
    },
    tweet: {
        type: Schema.Types.ObjectId,
        ref: "Tweet"
    },
    likedBy:{
        type: Schema.Types.ObjectId,
        ref: "User"
    }
}, {timestamps: true})

export const like = mongoose.model("like", likeSchema)
