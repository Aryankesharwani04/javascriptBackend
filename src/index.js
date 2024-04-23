// require('dotenv').config({path: './env'})
import {app} from "./app.js"
import dotenv from "dotenv";


dotenv.config({
    path: './.env'
})
import connectDB from "./db/index.js";


connectDB()
.then(() => {
    app.on("error", (err) => {
        console.log("ERROR OCCURED", err);
        throw err;
    })
    app.listen(process.env.PORT || 3000, () => {
        console.log(`Database connected at port ${process.env.port}`);
    })
})
.catch((err) => {
    console.log("MONGODB index.js FAILED !!!", err);
})













/*
import express from "express";

const app = express()

;( async () => {
    try{
        await mongoose.connect(`${process.env.MONOGODB_URI}/
        ${DB_NAME}`)
        app.on("error", (error) => {
            console.log("APP does not talk to database error occured: ", error);
            throw error
        })
        app.listen(process.env.PORT, () => {
            console.log(`App listening on PORT : ${process.env.PORT}`);
        })
    }
    catch(error){
        console.log("ERROR: ", error);
        throw error
    }
})()

*/