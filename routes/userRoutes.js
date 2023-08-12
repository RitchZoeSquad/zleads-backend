const  express =require( 'express')

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

router.route('/register').post(registerUser)
router.post('/login', authUser)
router.post('/logout', protect,logout)
router.post('/verifyemail',verifyEmail)
router.post('/forgetpassword',forgetPassword)
router.post('/resetpassword',resetpassword)
router
  .route('/profile')
  .get(protect, getUserProfile)
  .put(protect, updateUserProfile)
  

module.exports= router
