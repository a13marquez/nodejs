/*
 * Request handlers
 */

// Dependencies
const { read, create, remove, update }= require('./data');
const { hash } = require('./helpers')

// Define handlers.
let handlers = {};

// Users handler
handlers.users = (data, callback) => {
  const acceptableMethods = ['post', 'get', 'put', 'delete'];
  if(acceptableMethods.includes(data.method)) {
    handlers._users[data.method](data, callback);
  } else {
    callback(405);
  }
}

// Container for the users submethods
handlers._users = {};

// Users - post 
/**
 * Required data: firstName, lastName, phone, password, tosAgreement
 * Optional data: none
 */
handlers._users.post = (data, callback) => {
  // Check required fields
  const firstName = typeof(data.payload.firstName) === 'string' && 
    data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() :
    false;
  const lastName = typeof(data.payload.lastName) === 'string' && 
    data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() :
    false;
  const phone = typeof(data.payload.phone) === 'string' && 
    data.payload.phone.trim().length >= 10 ? data.payload.phone.trim() :
    false;
  const password = typeof(data.payload.password) === 'string' && 
    data.payload.password.trim().length > 0 ? data.payload.password.trim() :
    false;
  const tosAgreement = typeof(data.payload.tosAgreement) === 'boolean' && 
    data.payload.tosAgreement===true  ? data.payload.tosAgreement : false;
    
  if (firstName && lastName && phone && password && tosAgreement) {
  // Make sure that the user doesn't already exist
    read('users', phone, (err, data) => {
      if (err){
        // Hash the password
        let hashedPassword = hash(password);
        if(hashedPassword) {
          
          // Create the user object
          const userObject = {
            firstName,
            lastName,
            phone,
            hashedPassword,
            tosAgreement
          };

          // Store the user
          create('users', phone, userObject, err => {
            if (!err){
               callback(200)
            } else {
              console.log(err);
              callback(500, {Error: 'Could not create the new user'});
            }
          });

        } else {
          callback(500, {Error: 'Could not hash the password'})
        }
      }  else {
        // User already exist
        callback(400, {Error: 'A user with that phone number already exists'});
      } 
    });
   } else {
     callback(400, {Error: 'Missing required fields'});
   }
};

// Users - get 
/**
 * Require data: phone
 * Optional data: none
 * @TODO Only let an authenticated user access their object. Don't let them
 * access anyone else's
 */
handlers._users.get = (data, callback) => {
  // Check that the phone number provided is valid.
  const queryStringPhone = data.queryStringObject.phone 
  const phone = typeof(queryStringPhone) === 'string' 
    && queryStringPhone.trim().length > 10 ? queryStringPhone.trim() : false;
  if(phone) {
    read('users', phone, (err, data) => {
      if (!err && data) {
        // Remove the hashed password from the user object before returning it.
        const objectWithoutHash ={
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone,
          tosAgreement: data.tosAgreement
        }
        callback(200, objectWithoutHash);
      } else {
        callback(404);
      }
    })
  } else {
    callback(400, {Error: 'Missing required field'})
  }
};

// Users - put 
/**
 * Required data: phone
 * Optional data: firstName, lastName, password (at least one)
 *  @TODO Only let an authenticated user update their own object.
 */
handlers._users.put = (data, callback) => {
  // Check for the required field
  const payloadPhone = data.payload.phone;
  console.log(data)
  const phone = typeof(payloadPhone) === 'string' 
    && payloadPhone.trim().length > 10 ? payloadPhone.trim() : false;

  // Check for the optional fields
  const firstName = typeof(data.payload.firstName) === 'string' && 
  data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() :
  false;
  const lastName = typeof(data.payload.lastName) === 'string' && 
    data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() :
    false;

  const password = typeof(data.payload.password) === 'string' && 
    data.payload.password.trim().length > 0 ? data.payload.password.trim() :
    false;

  // Error if the phone is invalid
  if(phone) {
    // Error if nothing is sent to update
    if(firstName ||lastName || password) {
      // Lookup user
      read('users', phone, (err, userData) => {
        if(!err && userData) {
          if (firstName) {
            userData.firstName = firstName;
          }
          if (lastName) {
            userData.lastName = lastName;
          }
          if (password) {
            userData.hashedPassword = hash(password);
          }
          // Store the new updates
          update('users', phone, userData, err=>{
            if(!err) {
              callback(200)
            } else {
              console.log(err);
              callback(500, {Error: 'Could not update the user'});
            }
          })
        } else {
          callback(400, {Error: 'The specified user does not exist'});
        }
      });
    } else {
      callback(400, {Error: 'Missing fields to update'});
    }
  } else {
    callback(400, {Error: 'Missing required field'});
  }
};

// Users - delete
/**
 * Required field: phone
 * @todo Only let an authenticated user delete their object.
 * @todo Cleanup (delete) any other data files associated with this user.
 */
handlers._users.delete = (data, callback) => {
    // Check that the phone number provided is valid.
    const queryStringPhone = data.queryStringObject.phone 
    const phone = typeof(queryStringPhone) === 'string' 
      && queryStringPhone.trim().length > 10 ? queryStringPhone.trim() : false;
    if(phone) {
      read('users', phone, (err, data) => {
        if (!err && data) {
          remove('users', phone, err => {
            if (!err) callback(200);
            callback(500, {Error: 'Could not delete the specified user'});
          });
        } else {
          callback(404, {Error: 'Could not find the specified user'});
        }
      })
    } else {
      callback(400, {Error: 'Missing required field'})
    }
};

//ping handler
handlers.ping = (data, callback) => {
  callback(200)
}


// Not found handler
handlers.notFound = (data, callback) => {
  callback(404)
}



// Export the handlers
module.exports = handlers;
 