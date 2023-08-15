const asyncHandler =require( "express-async-handler")
const users =require( "../models/userModel.js")
const bcrypt =require( "bcryptjs")
const jwt =require( "jsonwebtoken")
const sendEmail =require( "../utils/sendEmailVerificationMail.js")
const otpGenerator = require('otp-generator');
const sendForgetMail = require("../utils/sendForgetPaswordEmail.js")
const crypto=require("crypto")
const fs = require('fs');
const path = require("path")
  const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  if (!email || !name || !password) {
    throw new Error("provide all details during registeration ...");
  }
  const userExists = await users.findOne({ email :email});

  if (userExists) {
    res.status(400);
    throw new Error("User already exists");
  }
  const hashedpassword = await bcrypt.hash(req.body.password, 10);

  const code= otpGenerator.generate(6, { digits: true,upperCaseAlphabets  : false, lowerCaseAlphabets : false, specialChars : false });


  const  ExpireDate = new Date(Date.now() + 10 * 60000); 

  const newUser = new users({ email, password: hashedpassword,name ,VerficationCode:code,VerificationCodeExpires:ExpireDate,profilePhoto:"images/user.png"});

 await sendEmail(req.body.email,code)
  const user = await newUser.save();
  res.status(200).json({"success":true,"message":user})
});



const authUser = asyncHandler(
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    const user = await users.findOne({ email: req.body.email });
    if (user===null) {
      throw new Error("Invalid  email or password");
    } else {


     
      const validate = await bcrypt.compare(password, user.password);
      if (validate) {


        if(!user.isVerified  ){

          if(!(user.VerificationCodeExpires > new Date(Date.now())) ){
     
  const code= otpGenerator.generate(6, { digits: true,upperCaseAlphabets  : false, lowerCaseAlphabets : false, specialChars : false });
          
           const  ExpireDate = new Date(Date.now() + 10 * 60000); 
           
           await users.updateOne({"email":email},{VerficationCode:code,"VerificationCodeExpires":ExpireDate});
           sendEmail(email,code)
          }
          return res.status(200).json({ success: false, message: 'Before you can log in, please verify your email address. Kindly check your inbox for a verification link.' });
         }
         
      
      else{
        const token = await jwt.sign({ _id: user._id }, process.env.SECRET_KEY, {
          expiresIn: "10hr",
        });
        res.cookie("token", token, {
          path: "/",
          expires: new Date(Date.now() + 1000 * 36000),
          httpOnly: true,
          sameSite: "none",
          secure:true
        });
        res.status(200).json({ success: true, message: user, token: token });
      } 
    }else {
        res.status(401);
        throw new Error("Invalid email or password");
      }
    }
  })
);

const verifyEmail= asyncHandler(async (req, res) => {
  const user=await users.findOne({"VerficationCode":req.body.code});
   if(user!==null  && user.VerificationCodeExpires>new Date(Date.now())){
    await users.updateOne({"VerficationCode":req.body.code},{"isVerified":true ,"VerficationCode":"","VerificationCodeExpires":""});
    return res.status(200).json({ success: true, message:"email verified succesfully" });
  
   }else{
    return res.status(200).json({"success":false,"message":"Invalid or Expired  OTP provided"})
   }
  }
)


const logout = asyncHandler(
  asyncHandler(async (req, res) => {
    res.clearCookie('token')
    req.cookies.token=''
    res.status(200).json({"success":true ,"message":"logout successfully"})
      })
);

const getUserProfile = asyncHandler(async (req, res) => {
  const user = await users.findById(req.user._id);

  if (user) {
    res.json({
      "success":true,"message":user });
  } else {
    res.status(404);
    throw new Error("User not found");
  }
});


const updateUserProfile = asyncHandler(async (req, res) => {

  const { name, country, province, city, bio, twilio_api, google_api } = req.body;
  const user = await users.findById(req.user._id);
  if (user) {

    if(req.file  && `images/${req.user._id}${req.file.originalname}`!==user.profilePhoto && user.profilePhoto!=="images/user.png"){
      const filePath = path.join(__dirname, '..', 'public', user.profilePhoto);

fs.unlink(filePath, (err) => {
  if (err) {
    console.error('Error deleting file:', err);
  } else {
    console.log('File deleted successfully');
  }
});
    }
  const t=await users.findByIdAndUpdate(req.user._id,{
        name:name,
        country:country,
        city:city,
        Province:province,
        profilePhoto:req.file?`images/${req.user._id}${req.file.originalname}`:user.profilePhoto,
        bio:bio,
        twilio_api:twilio_api,
        google_api:google_api
      },  { new: true }).select('-password')

    res.json({
      success: true,
      message: t,
    });
  } else {
    res.status(404);
    throw new Error("User not found");
  }
});


const forgetPassword = asyncHandler(async (req, res) => {

  const { email } = req.body;

    // Find the user by email
    const user = await users.findOne({ email });
    if (!user) {
      return res.status(200).json({ success: false, message: 'User not found !' });
    }
    const code=crypto.randomBytes(32).toString('hex')

  const  ExpireDate = new Date(Date.now() + 10* 60000); 
  // Create the user with the hashed password
  const u = await users.updateOne({ email},{ForgetPasswordCode:code,ForgetPasswordCodeExpires:ExpireDate});
   sendForgetMail(user.email,code)

    res.status(200).json({ success: true, "message":"Instruction for resetting your password has been sent to your email" });
})

const resetpassword = asyncHandler(async (req, res) => {

  const {Newpassword,code}=req.body
  const user=await users.findOne({"ForgetPasswordCode":code});
  if(user!==null && user.ForgetPasswordCodeExpires>new Date(Date.now())){  
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(Newpassword, salt);

   await users.updateOne({"ForgetPasswordCode":code},{"password":hashedPassword ,"ForgetPasswordCode":"","ForgetPasswordCodeExpires":""});
   return res.status(200).json({ success: true, message:"Password changed successfully " });
 
  }else{
   return res.status(200).json({"success":false,"message":"Invalid or Expired  Token provided"})
  }
})


module.exports= {
  authUser,
  registerUser,
  getUserProfile,
  logout,
  updateUserProfile,
  resetpassword,
  forgetPassword,
  verifyEmail
};
