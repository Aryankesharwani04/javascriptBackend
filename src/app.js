import express from "express"
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express()
//to avoid cors stoping us to access the database we will change it credentials
app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))

app.use(express.json({limit: "16kb"}))
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"))
app.use(cookieParser())

//import routes

import userRouter from  './routes/user.routes.js';

//set router middleware
app.use("/api/v1/user", userRouter);



export { app }