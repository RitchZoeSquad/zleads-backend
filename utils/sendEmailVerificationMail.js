const mg = require("mailgun-js");

const sendEmail = async (email, code) => {
  
  const mailgun =mg({
    apiKey: process.env.MAILGUN_API_KEY,
    domain: process.env.MAILGUN_DOMAIN,
  });
  
  var mailOptions = {
    from: `Zleads ${process.env.EMAIL_ID}`,
    to: email,
    subject: `verify your email for Zleads `,
    html: `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Zleads - Email Verification</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                margin: 0;
                padding: 0;
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
            }
            .container {
                border-radius: 8px;
                box-shadow: 0px 4px 8px rgba(0, 0, 0, 0.1);
                padding: 24px;
                text-align: center;
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

            .token {
                font-size: 18px;
                margin-top: 16px;
            }
            .expiry {
                font-size: 14px;
                color: #666666;
                margin-top: 8px;
            }
            .instructions {
                font-size: 14px;
                color: #666666;
                margin-top: 24px;
                text-align: left;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h1 class="title">Welcome to Zleads!</h1>
            <p class="message">Please verify your email address to get started.</p>
            <p class="token">Verification Token: <strong>${code}</strong></p>
            <p class="expiry">This code will expire in 10 minutes.</p>
            <a   href=http://localhost:3000/verifyemail >Verify Email</a>
            <p class="instructions">To complete your email verification:</p>
            <ol class="instructions">
                <li>Follow the "Verify Email" link above.</li>
                <li>You will be redirected to a verification page.</li>
                <li>Enter the verification token provided above: <strong>${code}</strong>.</li>
                <li>Complete the verification process to access your Zleads account.</li>
            </ol>
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
module.exports = sendEmail;


 