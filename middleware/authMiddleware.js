const  jwt =require( 'jsonwebtoken')
const  asyncHandler =require( 'express-async-handler')
const dynamodb = require('../config/db.js');

const protect = asyncHandler(async (req, res, next) => {
  const cookie = req.cookies.token;
  if (!cookie) {
    throw new Error('Token not found');
  }
    const decodedToken = jwt.verify(cookie, process.env.SECRET_KEY);

    const getUserParams = {
      TableName: 'users', // Change this to your DynamoDB table name
      Key: {
        _id: decodedToken._id,
      },
    };

    const user = await dynamodb.get(getUserParams).promise();

    if (!user.Item) {
      throw new Error('User not found');
    }
else{
  req.user = user.Item;
  next();
}
});

module.exports = { protect };