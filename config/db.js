const AWS = require('aws-sdk');

let dynamodb;
  try {
    AWS.config.update({
      region: process.env.AWS_REGION,
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    });

    // Create a DynamoDB DocumentClient
     dynamodb = new AWS.DynamoDB.DocumentClient();

    console.log('Connected to DynamoDB successfully');
  } catch (e) {
    console.error('Error connecting to DynamoDB:', e);
  }

module.exports = dynamodb;
