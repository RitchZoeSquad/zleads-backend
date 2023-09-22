const asyncHandler = require("express-async-handler")
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const sendEmail = require("../utils/sendEmailVerificationMail.js")
const otpGenerator = require('otp-generator');
const sendForgetMail = require("../utils/sendForgetPaswordEmail.js")
const crypto = require("crypto")
const fs = require('fs');
const path = require("path")
const dynamodb = require("../config/db.js")
const uuid = require('uuid'); // Import the uuid package


const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  if (!email || !name || !password) {
    res.status(200).json({ success: false, message: "Provide all details during registration..." });
    return;
  }
  const getUserParams = {
    TableName: 'users', // Replace with your table name
    IndexName: 'email-index', // Replace with your GSI name
    KeyConditionExpression: 'email = :email',
    ExpressionAttributeValues: {
      ':email': email,
    }
  }

  const existingUser = await dynamodb.query(getUserParams).promise();

  if (existingUser.Items.length!==0) {
    res.status(200).json({ success: false, message: "User already exists" });
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const userId = uuid.v4(); // Generate a unique UUID for the user

  const code= otpGenerator.generate(6, { digits: true,upperCaseAlphabets  : false, lowerCaseAlphabets : false, specialChars : false });

  const expireDate = new Date(Date.now() + 10 * 60000).toISOString();

  const newUserItem = {
    _id: userId, // Assign the generated UUID to the _id field
    email: email,
    password: hashedPassword,
    name: name,
    type:"credentials",
    TotalLeadsFound:0,
    VerificationCode: code,
    VerificationCodeExpires: expireDate,
    profilePhoto: "images/user.png",
  };

  const putUserParams = {
    TableName: 'users',
    Item: newUserItem,
  };

  await dynamodb.put(putUserParams).promise();

  await sendEmail(email, code);

  res.status(200).json({ success: true, message: newUserItem });
});



const authUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const getUserParams = {
    TableName: 'users', // Replace with your table name
    IndexName: 'email-index', // Replace with your GSI name
    KeyConditionExpression: 'email = :email',
    ExpressionAttributeValues: {
      ':email': email,
    }
  }

  const user = await dynamodb.query(getUserParams).promise();

  if (user.Items.length===0) {
    res.status(200).json({ success: false, message: "Invalid email or password" });
    return;
  }

  const validatePassword = await bcrypt.compare(password, user.Items[0].password);

  if (!validatePassword) {
    res.status(200).json({ success: false, message: "Invalid email or password" });
    return;
  }

  if (!user.Items[0].isVerified) {
    if (!(user.Items[0].VerificationCodeExpires > new Date().toISOString())) {
      const code= otpGenerator.generate(6, { digits: true,upperCaseAlphabets  : false, lowerCaseAlphabets : false, specialChars : false });

      const expireDate = new Date(Date.now() + 10 * 60000).toISOString();

      const updateUserParams = {
        TableName: 'users', // Replace with your actual table name
        Key: {
          _id: user.Items[0]._id,
        },
        UpdateExpression: 'set VerificationCode = :code, VerificationCodeExpires = :expireDate',
        ExpressionAttributeValues: {
          ':code': code,
          ':expireDate': expireDate,
        },
        ReturnValues: 'ALL_NEW',
      };

      await dynamodb.update(updateUserParams).promise();
      await sendEmail(email, code);

    
    }
  return  res.status(200).json({
      success: false,
      message: 'Before you can log in, please verify your email address. Kindly check your inbox for a verification link.',
    });
  } else {
    const token = jwt.sign({ _id: user.Items[0]._id }, process.env.SECRET_KEY, {
      expiresIn: "10hr",
    });

    res.cookie("token", token, {
      path: "/",
      expires: new Date(Date.now() + 1000 * 36000),
      httpOnly: true,
      sameSite: "none",
      secure:true
    });

    res.status(200).json({ success: true, message: user.Items[0] });
  }

})


const verifyEmail = asyncHandler(async (req, res) => {
  const { code, email } = req.body;

  if (!email || !code) {
    return res.status(200).json({ success: false, message: "Provide Code and Email" });
  }

  const getUserParams = {
    TableName: 'users', // Replace with your table name
    IndexName: 'email-index', // Replace with your GSI name
    KeyConditionExpression: 'email = :email',
    ExpressionAttributeValues: {
      ':email': email,
    }
  }

  const queryResult = await dynamodb.query(getUserParams).promise();

  const user = queryResult.Items[0]; // Assuming you only expect one item with the given verification code
 
  if (user && user.VerificationCode === code && user.VerificationCodeExpires > new Date().toISOString()) {
    const updateUserParams = {
      TableName: 'users',
      Key: {
        _id: user._id,
      },
      UpdateExpression: 'set isVerified = :isVerified, VerificationCode = :emptyCode, VerificationCodeExpires = :emptyDate',
      ExpressionAttributeValues: {
        ':isVerified': true,
        ':emptyCode': '',
        ':emptyDate': '',
      },
    };

    await dynamodb.update(updateUserParams).promise();

    res.status(200).json({ success: true, message: "Email verified successfully" });
  } else {
    res.status(200).json({ success: false, message: "Invalid or expired OTP provided" });
  }
});



const logout = asyncHandler(
  asyncHandler(async (req, res) => {
    res.clearCookie('token')
    req.cookies.token = ''
    res.status(200).json({ "success": true, "message": "logout successfully" })
  })
);

const getUserProfile = asyncHandler(async (req, res) => {
  const { user } = req; // Assuming you have the user object in your request

  const getUserParams = {
    TableName: 'users', // Assuming your table name is 'users'
    Key: {
      _id: user._id, // Using the _id field for the query
    },
  };

  const userResult = await dynamodb.get(getUserParams).promise();

  if (userResult.Item) {
    res.json({ success: true, message: userResult.Item });
  } else {
    res.status(200).json({ success: false, message: "User not found" });
  }
});


const updateUserProfile = asyncHandler(async (req, res) => {
  const { name, country, province, city, bio, twilio_api, google_api } = req.body;
  const { _id } = req.user; // Assuming you have the user's _id in your request

  const getUserParams = {
    TableName: 'users', // Assuming your table name is 'users'
    Key: {
      _id: _id, // Using the _id field for the query
    },
  };

  const userResult = await dynamodb.get(getUserParams).promise();

  if (userResult.Item) {
    const user = userResult.Item;

    if (req.file && `images/${_id}${req.file.originalname}` !== user.profilePhoto && user.profilePhoto !== "images/user.png") {
      const filePath = path.join(__dirname, '..', 'public', user.profilePhoto);

      fs.unlink(filePath, (err) => {
        if (err) {
          console.error('Error deleting file:', err);
        } else {
          console.log('File deleted successfully');
        }
      });
    }

    const updateProfileParams = {
      TableName: 'users',
      Key: {
        _id: _id,
      },
      UpdateExpression: `
        set #name = :name,
        country = :country,
        city = :city,
        Province = :province,
        profilePhoto = :profilePhoto,
        bio = :bio,
        twilio_api = :twilio_api,
        google_api = :google_api
      `,
      ExpressionAttributeNames: {
        '#name': 'name',
      },
      ExpressionAttributeValues: {
        ':name': name,
        ':country': country,
        ':city': city,
        ':province': province,
        ':profilePhoto': req.file ? `images/${_id}${req.file.originalname}` : user.profilePhoto,
        ':bio': bio,
        ':twilio_api': twilio_api,
        ':google_api': google_api,
      },
      ReturnValues: 'ALL_NEW',
    };

    const updatedUser = await dynamodb.update(updateProfileParams).promise();

    res.json({
      success: true,
      message: updatedUser.Attributes
    });
  } else {
    res.status(200).json({ success: false, message: "User not found" });
  }
});

const forgetPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const getUserParams = {
    TableName: 'users', // Replace with your table name
    IndexName: 'email-index', // Replace with your GSI name
    KeyConditionExpression: 'email = :email',
    ExpressionAttributeValues: {
      ':email': email,
    }
  }
  
    const userResult = await dynamodb.query(getUserParams).promise();

  const user = userResult.Items[0];

  if (!user) {
    return res.status(200).json({ success: false, message: 'User not found!' });
  }

  const code = crypto.randomBytes(32).toString('hex');
  const expireDate = new Date(Date.now() + 10 * 60000).toISOString();

  const updatePasswordParams = {
    TableName: 'users',
    Key: {
      _id: user._id,
    },
    UpdateExpression: 'set ForgetPasswordCode = :code, ForgetPasswordCodeExpires = :expireDate',
    ExpressionAttributeValues: {
      ':code': code,
      ':expireDate': expireDate,
    },
  };

  await dynamodb.update(updatePasswordParams).promise();

  await sendForgetMail(email, code);

  res.status(200).json({ success: true, message: "Instructions for resetting your password have been sent to your email" });
});



const resetpassword = asyncHandler(async (req, res) => {
  const { Newpassword, code, email } = req.body;


  if (!email || !code) {
    return res.status(200).json({ success: false, message: "Provide Code and Email" });
  }
  const getUserParams = {
    TableName: 'users', // Replace with your table name
    IndexName: 'email-index', // Replace with your GSI name
    KeyConditionExpression: 'email = :email',
    ExpressionAttributeValues: {
      ':email': email,
    }
  }
  
    const queryResult = await dynamodb.query(getUserParams).promise();

  const user = queryResult.Items[0]; // Assuming you only expect one item with the given forget password code

  if (user && user.ForgetPasswordCode === code && user.ForgetPasswordCodeExpires > new Date().toISOString()) {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(Newpassword, salt);

    const updatePasswordParams = {
      TableName: 'users',
      Key: {
        _id: user._id,
      },
      UpdateExpression: 'set password = :password, ForgetPasswordCode = :emptyCode, ForgetPasswordCodeExpires = :emptyDate',
      ExpressionAttributeValues: {
        ':password': hashedPassword,
        ':emptyCode': '',
        ':emptyDate': '',
      },
    };

    await dynamodb.update(updatePasswordParams).promise();

    res.status(200).json({ success: true, message: "Password changed successfully" });
  } else {
    res.status(200).json({ success: false, message: "Invalid or expired token provided" });
  }
});

module.exports = {
  authUser,
  registerUser,
  getUserProfile,
  logout,
  updateUserProfile,
  resetpassword,
  forgetPassword,
  verifyEmail
};
