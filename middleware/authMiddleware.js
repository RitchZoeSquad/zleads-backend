const  jwt =require( 'jsonwebtoken')
const  asyncHandler =require( 'express-async-handler')
const  User =require( '../models/userModel.js')

const protect = asyncHandler(async (req, res, next) => {
  const cookie=req.cookies.token;
    if(!cookie){
      throw new Error('token not found')
    } 
     jwt.verify(String(cookie),process.env.SECRET_KEY,async(err,user)=>{
        if(err){
          throw new Error('invalid token provided')
        }
        const u=await User.findOne({"_id":user._id});
        req.user=u;
        next()
    }
    
    )
})



module.exports= { protect }
