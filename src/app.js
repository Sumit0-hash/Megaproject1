import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"

const app=express()

app.use(cors({
    origin:process.env.CORS_ORIGIN,
    credentials:true
}))

// app.use(express.json({limit:"16kb"}))
app.use(express.json())
app.use(express.urlencoded({extended:true}))  // extended allows to sent objects inside objects.
app.use(express.static("public"))  // static is used to store public assets.
app.use(cookieParser())

// import Routes
import userRouter from './routes/user.routes.js'

// routes declaration
app.use("/api/v1/users",userRouter)


export { app }