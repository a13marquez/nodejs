/*
 * Helpers for various tasks 
 */

// Dependencies
const crypto = require('crypto');
const config = require('./config');
const queryString = require('querystring');
const https = require('https');

var helpers = {}

// Create a SHA256 hash
helpers.hash = str => {
  if(typeof(str) === 'string' && str.length > 0) {
    return crypto.createHmac('sha256', config.hashSecret)
      .update(str).digest('hex');
  } else {
    return false;
  }
}

// Parse a JSON string to an object in all cases, without throwing
helpers.parseJsonToObject = str => {
  try {
    return JSON.parse(str)
  } catch(e) {
    return {}
  }
}

// Create random string of given length
helpers.createRandomString = (strLength) => {
  strLength = parseInt(strLength) > 0 ? parseInt(strLength) : false;
  if(strLength) {
    const possibleCharacters = 'abcdefghijklmnopqrstuvwxyz1234567890';

    // Start the final string
    var str = '';
    for (strLength; strLength--;) {
      // Get a random char
      const randomCharacter = possibleCharacters
        .charAt(Math.floor(Math.random() * possibleCharacters.length));
      str+=randomCharacter
    }
    // Return the final string
    return str;
  } else {
    return false;
  }
}

// Send an SMS message via Twilio
helpers.sendTwilioSms = (phone, msg, callback) => {

  //Validate parameters
  phone = typeof(phone) === 'string' && phone.trim().length >= 10 ? 
    phone.trim() :
    false;
  msg = typeof(msg) === 'string' && msg.trim().length < 1600 ? 
  msg.trim() :
  false;
  console.log(phone);
  console.log(msg);
  if(phone && msg) {
    // Configure the payload to send to Twilio
    let payload = {
      From: '+1' + config.twilio.fromPhone,
      To: '+1' + phone,
      Body: msg
    };

    // Stringify the payload
    const stringPayload = queryString.stringify(payload);

    // Configurer the request details
    let requestDetails = {
      protocol: 'https:',
      hostname: 'api.twilio.com',
      method: 'POST',
      path: `2010-04-01/Accounts/${config.twilio.accountSid}/Messages.json`,
      auth: `${config.twilio.accountSid}:${config.twilio.authToken}`,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(stringPayload)
      }
      
    };

    // Instantiate the requiest object
    const req = https.request(requestDetails, res => {
      console.log(res)
      // Grab the status of the sent request
      const status = res.statusCode;
      callback(status)
      // Callback succesfuly if the request went through
      if (status === 200 || status === 201) {
        console.log(200)
        callback(false); 
      } else {
        console.log(status)
        callback(`Status code returned was ${status}`);
      }
    });

    // Bind to the error event so it doesn't get thrown
    req.on('error', e => { 
      console.log(e)
      callback(e); });

    // Add the payload
    req.write(stringPayload); 

    // End the request
    req.end();
  } else {
    callback('Given parameters were missing or invalid')
  }
}

// Export the module
module.exports = helpers