import mongoose, {Schema} from "mongoosse"

const tweetSchema = new Schema({
    content :{
        type : String,
        required: true
    },
    owner:{
        type: Schema.Types.ObjectId,
        ref: "User"
    }
}, {timestamps: true})

export const tweet = mongoose.model("tweet", tweetSchema)
