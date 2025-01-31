import dotenv from "dotenv"
// import mongoose from "mongoose"
// import { DB_NAME } from "./constants";
import connectDB from "./db/index.js";
import express from "express"

dotenv.config({path:'./env'})  //dotenv should be loaded asap.

const app=express()

connectDB()

// or

// IIFE(Immediately Invoked Function Expression) approach:-
/*
;( async ()=>{
    try {
        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        app.on("error",(error)=>{
            console.log("Error:",error)
            throw error
        })

        app.listen(process.env.PORT,()=>{
            console.log(`App is listening on port: ${process.env.PORT}`)
        })
    } catch (error) {
        console.error("ERROR",error)
        throw err
    }
})()  // ; is applied before for cleaning purpose. 
*/