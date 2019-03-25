/*
 * Request handlers
 */

// Dependencies
const { read, create, remove, update }= require('./data');
const { hash, createRandomString } = require('./helpers');
const config = require('./config');

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
 */
handlers._users.get = (data, callback) => {
  // Check that the phone number provided is valid.
  const queryStringPhone = data.queryStringObject.phone 
  const phone = typeof(queryStringPhone) === 'string' 
    && queryStringPhone.trim().length > 10 ? queryStringPhone.trim() : false;
  if(phone) {
    // Get the token from the headers
    const token = typeof(data.headers.token) === 'string' ?
    data.headers.token : false;
    // Verifify that the given token is valid for a phone number
    handlers._tokens.verifyToken(token, phone, tokenIsValid => {
      if (tokenIsValid) {
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
        callback(403, {Error: `Missing required token in headers or token
          is invalod`})
      }
    });

  } else {
    callback(400, {Error: 'Missing required field'})
  }
};

// Users - put 
/**
 * Required data: phone
 * Optional data: firstName, lastName, password (at least one)
 */
handlers._users.put = (data, callback) => {
  // Check for the required field
  const payloadPhone = data.payload.phone;
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
    // Get the token from the headers
    const token = typeof(data.headers.token) === 'string' ?
      data.headers.token : false;
    // Verifify that the given token is valid for a phone number
    handlers._tokens.verifyToken(token, phone, tokenIsValid => {
      if (tokenIsValid) {
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
        callback(403, {Error: `Missing required token in headers or token
           is invalod`})
      }
    });

  } else {
    callback(400, {Error: 'Missing required field'});
  }
};

// Users - delete
/**
 * Required field: phone
 * @todo Cleanup (delete) any other data files associated with this user.
 */
handlers._users.delete = (data, callback) => {
    // Check that the phone number provided is valid.
    const queryStringPhone = data.queryStringObject.phone 
    const phone = typeof(queryStringPhone) === 'string' 
      && queryStringPhone.trim().length > 10 ? queryStringPhone.trim() : false;
    if(phone) {
      // Get the token from the headers
      const token = typeof(data.headers.token) === 'string' ?
      data.headers.token : false;
      // Verifify that the given token is valid for a phone number
      handlers._tokens.verifyToken(token, phone, tokenIsValid => {
        if (tokenIsValid) {
          read('users', phone, (err, data) => {
            if (!err && data) {
              remove('users', phone, err => {
                if (!err) {
                  // Delete checks associated with the user
                  const userChecks = Array.isArray(data.checks) ? 
                    data.checks : [];

                  const checksToDelete = userChecks.length;
                  if (checksToDelete > 0) {
                    let checksDeleted = 0;
                    let deletionErrors = false;
                    // Loop through the checks
                    for (let checkId of userChecks) {
                      // Delete the check
                      remove('checks', checkId, err => {
                        if (err) {
                          deletionErrors = true;
                        }
                        checksDeleted++;
                        if(checksDeleted < checksToDelete) {
                          if(!deletionErrors) {
                            callback(200);
                          } else {
                            callback(500, {Error: `Errors when attempting to delete the User's check`})
                          }
                        } 
                      });
                    }
                  } else {
                    callback(200);
                  }
                } else {
                  callback(500, {Error: 'Could not delete the specified user'});
                }
                
              });
            } else {
              callback(404, {Error: 'Could not find the specified user'});
            }
          })
        } else {
          callback(403, {Error: `Missing required token in headers or token
             is invalod`})
        }
      });


    } else {
      callback(400, {Error: 'Missing required field'})
    }
};


// Tokens handler
handlers.tokens = (data, callback) => {
  const acceptableMethods = ['post', 'get', 'put', 'delete'];
  if(acceptableMethods.includes(data.method)) {
    handlers._tokens[data.method](data, callback);
  } else {
    callback(405);
  }
}

// Container for all the tokens methods
handlers._tokens = {};

// Tokens - post 
/**
 * Required data: phone, password
 * Optional data: none
 */
handlers._tokens.post = (data, callback) => {
  const phone = typeof(data.payload.phone) === 'string' && 
    data.payload.phone.trim().length >= 10 ? data.payload.phone.trim() :
    false;
  const password = typeof(data.payload.password) === 'string' && 
    data.payload.password.trim().length > 0 ? data.payload.password.trim() :
    false; 
  if (phone && password) {
    console.log('aaaaaaa')
    // Lookup the user who matches that phone
    read('users', phone, (err, userData) =>{
      if(!err && userData) {
        // Hash the sent password and compare with the password stored
        const hashedPassword = hash(password);
        if(hashedPassword === userData.hashedPassword) {
          // If valid create a new token with a rando name. Set expiration date
          // 1 hour in the future
          const tokenId = createRandomString(20);
          const expires = Date.now() + 1000 * 60 * 60;
          const tokenObject = {
            phone,
            id: tokenId,
            expires 
          };

          // Store the token
          create('tokens', tokenId, tokenObject, (err) => {
            if (!err) {
              callback(200, tokenObject);
            } else {
              callback(500, {Error: 'Could not create token'})
            }
          });
        } else {
          callback(400, {Error: 'Password did not match'})
        }
      } else {
        callback(400, {Error: 'Could not find the specified user'});
      }
    });
  } else {
    callback(400, {Error: 'Missing required field(s)'});
  }
};

// Tokens - get
/**
 * Required data: id
 * Optional data: none
 */
handlers._tokens.get = (data, callback) => {
    // Check that the phone number provided is valid.
    const queryStringId = data.queryStringObject.id 
    const id = typeof(queryStringId) === 'string' 
      && queryStringId.trim().length > 10 ? queryStringId.trim() : false;
    if(id) {
      // Lokup the token
      read('tokens', id, (err, tokenData) => {
        if (!err && tokenData) {
          callback(200, tokenData);
        } else {
          callback(404);
        }
      })
    } else {
      callback(400, {Error: 'Missing required field'})
    }id
};

// Tokens - put
/**
 * Required data: id, extend
 * Optional data: none
 */
handlers._tokens.put = (data, callback) => {
  const id = typeof(data.payload.id) === 'string' && 
    data.payload.id.trim().length == 20 ? data.payload.id.trim() :
    false;
  const extend = typeof(data.payload.extend) === 'boolean' && 
    data.payload.extend === true ? data.payload.extend  : false; 
  if(id && extend) {
    read('tokens', id, (err, tokenData) => {
      if(!err && tokenData){  
        // Check to make sure the token isn't already expired
        if (tokenData.expires > Date.now()) {
          // Set the expiration hour an hour from now
          tokenData.expires = Date.now() + 1000 * 60 * 60;

          // Store the new updates
          update('tokens', id, tokenData, err => {
            if(!err) {
              callback(200);
            } else {
              callback(500, {Error: 'Could not update the token'});
            }
          });
        } else {
          callback(400, {Error:'The token has already expired'});
        }
      } else {
        callback(400, {Error: 'Specified token does not exist'});
      }
    })
  } else {
    callback(400, {Error: 'Missing required field(s) or field(s) are invalid'});  
  }
};

// Tokens - delete
/**
 * Required data: id
 * Optional data: none
 */
handlers._tokens.delete = (data, callback) => {
  // Check that the phone number provided is valid.
  const queryStringId = data.queryStringObject.id; 
  const id = typeof(queryStringId) === 'string' 
    && queryStringId.trim().length > 10 ? queryStringId.trim() : false;
  if(id) {
    read('tokens', id, (err, data) => {
      if (!err && data) {
        remove('tokens', id, err => {
          if (!err) {
            callback(200);
          } else {
            callback(500, {Error: 'Could not delete the specified token'});
          }
        });
      } else {
        callback(404, {Error: 'Could not find the specified token'});
      }
    })
  } else {
    callback(400, {Error: 'Missing required field'})
  }
};

// Verify if a given token is currently valid for a given user
handlers._tokens.verifyToken = (id, phone, callback) => {
  // Lookup the token
  read('tokens', id, (err, tokenData)=> {
    if(!err && tokenData) {
      // Check the token is for the given user and has not expired
      if(tokenData,phone === phone && tokenData.expires > Date.now()){
        callback(true);
      } else {
        callback(false)
      }
    } else {
      callback(false)
    }
  });
}

// Checks handler
handlers.checks = (data, callback) => {
  const acceptableMethods = ['post', 'get', 'put', 'delete'];
  if(acceptableMethods.includes(data.method)) {
    handlers._checks[data.method](data, callback);
  } else {
    callback(405);
  }
}

// Container for all the checks methods
handlers._checks = {};

// Checks - post 
/**
 * Required data: protocol, url, method, successCodes, timeoutSeconds
 * Optional data: none
 */
handlers._checks.post = (data, callback) => {
  // Validate inputs
  const protocol = typeof(data.payload.protocol) === 'string' && 
    ['http', 'https'].includes(data.payload.protocol.trim()) ? 
    data.payload.protocol.trim() :
    false;
  const url = typeof(data.payload.url) === 'string' && 
    data.payload.url.trim().length > 0 ? data.payload.url.trim() :
    false; 
  const method = typeof(data.payload.method) === 'string' && 
    ['post', 'get', 'put', 'delete'].includes(data.payload.method.trim()) ? 
    data.payload.method.trim() :
    false;
  const successCodes = Array.isArray(data.payload.successCodes) && 
    data.payload.successCodes.length > 0 ? 
    data.payload.successCodes :
    false;
  const timeoutSeconds = typeof(data.payload.timeoutSeconds) === 'number' && 
    data.payload.timeoutSeconds % 1 === 0 && data.payload.timeoutSeconds >=1 
     ? data.payload.timeoutSeconds:
    false; 

  if (protocol && url && method && successCodes && timeoutSeconds) {
    // Get the token from the headers
    
    const token = typeof(data.headers.token) === 'string' ? data.headers.token:
      false;
    // Lookup the user reading the token
    read('tokens', token, (err, tokenData) => {
      if (!err && tokenData) {
        const userPhone = tokenData.phone;
      
        // Lookup the user data 
        read('users', userPhone, (err, userData) =>{
          if (!err && userData) {
            const userChecks = Array.isArray(userData.checks) ? 
              userData.checks : [];
            if (userChecks.length < config.maxChecks) {
              // Create a random id for the check
              const checkId = createRandomString(20);

              // Create the check object, and include the user's phone
              const checkObject = {
                id: checkId, 
                userPhone,
                protocol,
                url,
                method,
                successCodes,
                timeoutSeconds
              };

              // Save the object
              create('checks', checkId, checkObject, err => {
                if (!err) {
                  // Add the check id to the users object
                  userData.checks = userChecks;
                  userData.checks.push(checkId);

                  // Save the user data
                  update('users', userPhone, userData, err => {
                    if (!err) {
                      callback(200, checkObject)
                    } else {
                      callback(500, {Error:  `Could not update the user with 
                      the new check`});
                    }
                  })
                } else {
                  callback(500, {Error: 'Could not create the new check'});
                }
              })
            } else {
              callback(400, {Error: `The user already has the maximum number of checks ${config.maxChecks}`});
            }
          } else {
            callback(403);
          }
        })
      } else {
        callback(403);
      }
    })
  } else {
    callback(400, {Error: 'Missing required field(s)'});
  }
};

// Checks - get
/**
 * Required data: id
 * Optional data: none
 */
handlers._checks.get = (data, callback) => {
  // Check that the id provided is valid.
  const queryStringId = data.queryStringObject.id 
  const id = typeof(queryStringId) === 'string' 
    && queryStringId.trim().length === 20 ? queryStringId.trim() : false;
  if(id) {
    // Lookup the check
    read('checks', id, (err, checkData) => {
      if (!err && checkData ) {
        // Get the token from the headers
        const token = typeof(data.headers.token) === 'string' ?
        data.headers.token : false;
        // Verifify that the given token and belongs to the user who created
        // the check
        const phone = checkData.userPhone;
        handlers._tokens.verifyToken(token, phone, tokenIsValid => {
          if (tokenIsValid) {
            // Return the check data
            callback(200, checkData);
          } else {
            callback(403)
          }
        });
      } else {
        callback(404)
      }
    })



  } else {
    callback(400, {Error: 'Missing required field'})
  }
};

// Checks - put
/**
 * Required data: id
 * Optional data: protocol, url, method, succesCodes, timeoutSeconds
 */
handlers._checks.put = (data, callback) => {
  // Check for the required field
  const payloadId = data.payload.id;
  const id = typeof(payloadId) === 'string' 
    && payloadId.trim().length === 20 ? payloadId.trim() : false;

  // Check for the optional fields
  const protocol = typeof(data.payload.protocol) === 'string' && 
    ['http', 'https'].includes(data.payload.protocol.trim()) ? 
    data.payload.protocol.trim() :
    false;
  const url = typeof(data.payload.url) === 'string' && 
    data.payload.url.trim().length > 0 ? data.payload.url.trim() :
    false; 
  const method = typeof(data.payload.method) === 'string' && 
    ['post', 'get', 'put', 'delete'].includes(data.payload.method.trim()) ? 
    data.payload.method.trim() :
    false;
  const successCodes = Array.isArray(data.payload.successCodes) && 
    data.payload.successCodes.length > 0 ? 
    data.payload.successCodes :
    false;
  const timeoutSeconds = typeof(data.payload.timeoutSeconds) === 'number' && 
    data.payload.timeoutSeconds % 1 === 0 && data.payload.timeoutSeconds >=1 
     ? data.payload.timeoutSeconds:
    false; 
  // Error if the phone is invalid
  if(id) {
    // Check optional fields: at least need one
    if (protocol || url || method || successCodes || timeoutSeconds) {
      // Lookup the check
      read('checks', id, (err, checkData) => {
        if (!err && checkData) {
          // Get the token from the headers
          const token = typeof(data.headers.token) === 'string' ?
          data.headers.token : false;
          // Verifify that the given token and belongs to the user who created
          // the check
          const phone = checkData.userPhone;
          handlers._tokens.verifyToken(token, phone, tokenIsValid => {
            
            if (tokenIsValid) {
              // Update the check where necessary
              if (protocol) {
                checkData.protocol = protocol;
              }
              if (url) {
                checkData.url = url;
              }
              if (method) {
                checkData.method = method;
              }
              if (successCodes) {
                checkData.successCodes = successCodes;
              }
              if (timeoutSeconds) {
                checkData.timeoutSeconds = timeoutSeconds;
              }

              // Store the new updates
              update('checks', id, checkData, err => {
                if(!err) {
                  callback(200);
                } else {
                  callback(500, {Error: 'Could not update the check'})
                }
              })
            } else {
              callback(403)
            }
          });
        } else {
          callback(400, {Error: 'Check ID does not exist'})
        }
      });
    } else {
      callback(400, {Error: 'Missing fields to upgrade'})
    }

  } else {
    callback(400, {Error: 'Missing required field'});
  }
};
// Checks - delete
/**
 * Required data: id
 * Optional data: none
 */
handlers._checks.delete = (data, callback) => {
  // Check that the phone number provided is valid.
  const queryStringId = data.queryStringObject.id; 
  const id = typeof(queryStringId) === 'string' 
    && queryStringId.trim().length > 10 ? queryStringId.trim() : false;
  if(id) {
    // Lookup the check 
    read('checks', id, (err, checkData) => {
      if (!err && checkData) {
        // Get the token from the headers
        const token = typeof(data.headers.token) === 'string' ?
        data.headers.token : false;
        // Verifify that the given token and belongs to the user who created
        // the check
        const phone = checkData.userPhone;
        handlers._tokens.verifyToken(token, phone, tokenIsValid => {
          if (tokenIsValid ){
            remove('checks', id, err => {
              if (!err) {
                const user = checkData.userPhone;
                read('users', user, (err, userData) => {
                  if(!err && userData) {
                    const userChecks = Array.isArray(userData.checks) ? 
                      userData.checks: [];

                    // Remove the deleted check from list
                    const checkPosition = userChecks.indexOf(id);
                    if(checkPosition > -1) {
                      userChecks.splice(checkPosition, 1);
                      update('users', user, userData, err => {
                        if(!err) {
                          callback(200);
                        } else {
                          callback(500, {Error: `Could not update the user`})
                        }
                      });
                    } else {
                      callback(500,{Error: `Could not find the check on the user's object so could not remove it`})
                    }
                  } else {
                    callback(500, {Error: 'Could not find the user who created the check, therefore the check won\'t be removed'})
                  }
                })
              } else {
                callback(500, {Error: 'Could not delete the specified check'});
              }
            });
          } else {
            callback(403)
          }
        });



      } else {
        callback(400, {Error: 'The specified check ID does not exist'});
      }
    });



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
 