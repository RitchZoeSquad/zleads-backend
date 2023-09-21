const  express =require( 'express')
const { placesSearchusingGooglePlaceApi, foundLeadsOfUser,riskyLeadsOfUser,EmailVerifer } = require('../controllers/leadsController');
const { protect } = require('../middleware/authMiddleware');
const router = express.Router()

router.route('/googlePlacesApiSearch').post(protect,placesSearchusingGooglePlaceApi)
router.route('/foundleads').post(protect,foundLeadsOfUser)
router.route('/riskyleads').post(protect,riskyLeadsOfUser)
router.route('/verifyEmail').post(protect,EmailVerifer)
  

module.exports= router
