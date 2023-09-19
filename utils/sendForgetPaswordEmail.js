const mg = require("mailgun-js");

const sendForgetMail = async (email, code) => {
  
  const mailgun =mg({
    apiKey: process.env.MAILGUN_API_KEY,
    domain: process.env.MAILGUN_DOMAIN,
  });
  
  var mailOptions = {
    from: `Zleads ${process.env.EMAIL_ID}`,
    to: email,
    subject: `Reset password  for Zleads `,
    html: `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Zleads - Forgot Password</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                margin: 0;
                padding: 0;
                background-color: #f5f5f5;
            }
            .container {
                border-radius: 8px;
                box-shadow: 0px 4px 8px rgba(0, 0, 0, 0.1);
                padding: 24px;
                text-align: center;
                background-color: #ffffff;
                max-width: 400px;
                margin: 50px auto;
            }
            .logo {
                width: 80px;
                height: 80px;
                margin-bottom: 16px;
            }
            .title {
                font-size: 24px;
                margin-bottom: 8px;
            }
            .message {
                font-size: 16px;
                color: #666666;
                margin-bottom: 24px;
            }
            .btn {
              display: flex;
              justify-content: center;
              width: 120px;
              margin: auto;
              height: 40px;
              align-items: center;
              outline: none;
              text-decoration:none;
              color :white;
              border: none;
              background-color: #ed6214;
              border-radius: 4px;
              cursor: pointer;
              
          }

            .expiry {
                font-size: 14px;
                color: #666666;
                margin-top: 8px;
            }
            .note {
                font-size: 14px;
                color: #666666;
                margin-top: 16px;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h1 class="title">Zleads - Password Reset</h1>
            <p class="message">You have requested to reset your password.</p>
          <a     href=${process.env.REACT_URL}/resetpassword/${code} >Reset Password</a>
            <p class="expiry">This link is valid for a 10 minutes only.</p>
            <p class="note">If you didn't request this password reset, no further action is needed.</p>
        </div>
    </body>
    </html>
    

    `
  };


mailgun.messages()
.send(
  mailOptions, (error, body) => {
    if (error) {
      console.log(error);
    } else {
      console.log("Email sent successfully");
    }
 
  });
}
module.exports = sendForgetMail;