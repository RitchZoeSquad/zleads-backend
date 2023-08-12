const mongoose = require('mongoose')


const userSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: true
    },
    password: {
      type: String,
      required: true
    },
    isVerified: {
      type: Boolean,
      default: false
    },
    VerficationCode: {
      type: String,
    },
    VerificationCodeExpires: {
      type: Date
    },
    ForgetPasswordCode: {
      type: String,
    },
    profilePhoto:{
   type:String
    },
    country:{
      type:String
    },
    city:{
      type:String
    },
    Province:{
      type:String
    },
    bio:{
      type:String
    },
    twilio_api:{
      type:String
    },
     google_api:{
      type:String
    },
    ForgetPasswordCodeExpires: {
      type: Date
    }
  },
  {
    timestamps: true,
  }
)

const users = mongoose.model('users', userSchema)

module.exports = users
