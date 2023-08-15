const  mongoose =require ('mongoose')

const connectDB = async () => {
  try {
    mongoose.set('strictQuery', false)
   mongoose.connect(process.env.MONGO_URI ).then(console.log("connected successfully"))
  }catch(e){
    console.log(e)
  }
}

module.exports= connectDB
