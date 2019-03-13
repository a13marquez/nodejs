/*
 * Helpers for various tasks 
 */

// Dependencies
const crypto = require('crypto');
const config = require('./config');

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

}

// Export the module
module.exports = helpers