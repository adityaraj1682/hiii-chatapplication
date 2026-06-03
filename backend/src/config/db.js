import mongoose from 'mongoose'
import dotenv from 'dotenv'
dotenv.config()
export async function connection(){
    try{
        mongoose.connect(process.env.MONGO_URI).then(()=>{
            console.log('Successfully connected to the database')
        })
    }catch(err){
        console.log('Error in connecting with the database',err)
        process.exit(1)
    }
}