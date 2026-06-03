import express from 'express'
import dotenv from 'dotenv'
import authRoutes from './src/routes/auth.route.js'
import userRoutes from './src/routes/user.route.js'
import chatRoutes from './src/routes/chat.route.js'
import postRoutes from './src/routes/post.route.js'
import aiRoutes from './src/routes/ai.route.js'
import { connection } from './src/config/db.js'
import cors from "cors";
import cookieParser from 'cookie-parser'
import path from "path"
const app = express()

dotenv.config()
app.use(cookieParser())
const PORT = process.env.PORT || 3000

const __dirname = path.resolve()
app.use(cors({
    origin: "http://localhost:5173",
    credentials: true  //allow frontend to send the cookies
}))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({limit: '10mb',extended: true}))
app.use('/api/auth',authRoutes)
app.use('/api/users',userRoutes)
app.use('/api/chat',chatRoutes)
app.use('/api/posts',postRoutes)
app.use('/api/ai',aiRoutes)

if (process.env.NODE_ENV === "production"){
    app.use(express.static(path.join(__dirname,"../frontend/dist")))

    app.get("/*splat",(req,res)=>{
        res.sendFile(path.join(__dirname,"../frontend/dist/index.html"))
    })
}
app.listen(PORT,()=>{
    console.log(`Server is running on port ${PORT}`)
    connection()
})