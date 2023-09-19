const  express =require( 'express')
const path = require('path');
const router = express.Router()
const {
  authUser,
  registerUser,
  getUserProfile,
  updateUserProfile,
  logout,
  verifyEmail,
  forgetPassword,
  resetpassword
} =require( '../controllers/userController.js')
const  { protect } =require( '../middleware/authMiddleware.js')

const multer  = require('multer')
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/images')
  },
  filename: function (req, file, cb) {
    cb(null, `${req.user._id}${file.originalname}`)
  }
})

const upload = multer({ storage: storage })


router.route('/register').post(registerUser)
router.post('/login', authUser)
router.post('/logout', protect,logout)
router.post('/verifyemail',verifyEmail)
router.post('/forgetpassword',forgetPassword)
router.post('/resetpassword',resetpassword)
router.route('/profile').get(protect, getUserProfile).put(protect,upload.single('photo'), updateUserProfile)
  

module.exports= router
