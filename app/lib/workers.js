/**
 * Workers-related tasks
 * 
 */

 // Dependencies
 const path = require('path');
 const fs = require('fs');
 const http = require('http');
 const https = require('https');
 const { list, read, remove, update } = require('./data');
 const { sendTwilioSms } = require('./helpers');


// Instantiate the workers
const workers = {};

// Lookup all checks, get their data, send to a validator
workers.gatheAllChecks = () => {
  // Get all the checks
  list('checks', (err, checks) => {
    if (!err && checks && checks.length > 0) {
      for(let check of checks) {
        // Read the check data
        read('checks', check, (err, originalCheckData) => {
          if(!err && originalCheckData) {
            // Pass the data to check validator.
            workers.validateCheckData(originalCheckData);
          } else {
            console.error(`Error readin ${check} data`)
          }
        });
      }
    } else {
      console.error("Error: Could no find any checks to process");
    }
  });
};

// Sanity-check the check-data
workers.validateCheckData = (originalCheckData) => {
  originalCheckData = typeof(originalCheckData) === 'object' && 
    originalCheckData !== null ? originalCheckData : {};
  originalCheckData.id = typeof(originalCheckData.id) === 'string' && 
    originalCheckData.id.trim().length === 20 ? 
    originalCheckData.id.trim() : false;
  originalCheckData.userPhone = typeof(originalCheckData.userPhone)==='string' 
  &&  originalCheckData.userPhone.trim().length >= 10 ? 
  originalCheckData.userPhone.trim() : false;
  originalCheckData.protocol = typeof(originalCheckData.protocol)==='string' 
  ['http', 'htpps'].includes(originalCheckData.protocol.trim()) ? 
  originalCheckData.protocol.trim() : false;
  originalCheckData.method = typeof(originalCheckData.method)==='string' 
  ['get', 'post', 'put', 'delete'].includes(originalCheckData.method.trim()) ? 
  originalCheckData.method.trim() : false;
  originalCheckData.url = typeof(originalCheckData.url)==='string' 
  &&  originalCheckData.url.trim().length > 0 ? 
  originalCheckData.url.trim() : false;
  originalCheckData.successCodes = Array.isArray(originalCheckData.successCodes)
  &&  originalCheckData.successCodes.length > 0 ? 
  originalCheckData.successCodes : false;
  originalCheckData.timeoutSeconds = 
    typeof(originalCheckData.timeoutSeconds)==='number' 
    &&  originalCheckData.timeoutSeconds >= 1 && 
    originalCheckData.timeoutSeconds <= 5 ? 
    originalCheckData.timeoutSeconds : false;

  // Set the keys that may not be set (if the workers have never seen this 
  //  check before)
  originalCheckData.state = typeof(originalCheckData.state)==='string' 
  ['up', 'down'].includes(originalCheckData.state.trim()) ? 
  originalCheckData.state.trim() : 'down';
  originalCheckData.timeoutSeconds = 
    typeof(originalCheckData.lastChecked)==='number' 
    &&  originalCheckData.lastChecked >= 0 ? 
    originalCheckData.lastChecked : false;

  // If all the checks pass pass the data along the next step
  if(originalCheckData.id &&  originalCheckData.userPhone && 
    originalCheckData.url && originalCheckData.protocol &&
    originalCheckData.method && originalCheckData.successCodes &&
    originalCheckData.timeoutSeconds) {
      workers.performCheck(originalCheckData);
    } else {
      console.error('Error: One of the checks is not properly formated')
    }
};

// Perform the check
workers.performCheck = (originalCheckData) =>{
  // Prepare the initial check outcome
  let checkOutcome = {
    error: false,
    responseCode: false
  }

  // Mark that the outcome has not been sent yet
  let outcomeSent = false;

  // Parse the hostname and the path out of the original check data
  let parsedUrl = url.parse(`${originalCheckData.protocol}://${originalCheckData.url}`, true);
  const hostname = parsedUrl.hostname;
  const path = parsedUrl.path; // Using path and noy pathname because we want the query string

  const requestDetails = {
    protocol: `${ originalCheckData.protocol}:`,
    hostname,
    method: originalCheckData.method.toUpperCase(),
    path,
    timeout: originalCheckData.timeoutSeconds * 1000
  };

  // Instantiate the request object using http or https module
  const _moduleToUse = originalCheckData.protocol === 'http' ?  http : https;
  var req = _moduleToUse.request(requestDetails, res => {
    // Grab the status
    const status = req.statusCode;

    // Update the outcome
    checkOutcome.responseCode = status;
    if(!outcomeSent) {
      workers.processCheckoutcome(originalCheckData, checkOutcome);
      outcomeSent = true;
    }

    // Bind to the error event
    res.on('error', e => {
      // Update the checkOutcome
      checkOutcome.error = {
        error: true,
        value: e
      }
      if (!outcomeSent) {
        workers.processCheckoutcome(originalCheckData, checkOutcome);
        outcomeSent = true;
      }
    });

    // Bind to the timeout event
    res.on('timeout', e => {
      // Update the checkOutcome
      checkOutcome.error = {
        error: true,
        value: 'timeout'
      }
      if (!outcomeSent) {
        workers.processCheckoutcome(originalCheckData, checkOutcome);
        outcomeSent = true;
      }
    });
  });

  // End the request
  req.end();
};

// Process the checkoutcome, update the check data as needed, trigger an alert for the user
// Special logic for acommodatin a check that has never been tested before
workers.processCheckout = (originalCheckData, checkOutcome ) => {
  // Decide if the check is considerer up or down
  const state = !checkOutcome.error && checkOutcome.responseCode && 
    originalCheckData.successCodes.includes(checkOutcome.responseCode) ? 
    'up' : 'down';
  
  // Decide if an alert is warranted
  const alertWarranted = originalCheckData.lastChecked && 
    originalCheckData.state !== state ? true : false; 
  
  // Update the check data
  const newCheckdata = originalCheckData;
  newCheckdata.state = state;
  newCheckdata.lastChecked = Date.now();

  update('checks', newCheckdata.id, newCheckdata, err => {
    if(!err) {
      if(alertWarranted) {
        workers.alertUsertToStatusChange(newCheckdata)
      } else {
        console.info('Check outcome has not changed, no alert needed')
      }
    } else {
      console.error(`Error trying to save updates to ${newCheckdata.id}`)
    }
  });
}

// Alert the user as to a change in their check status 
workers.alertUsertToStatusChange = ({method, protocol, url, state}) => {
  const msg = `Alert: Your check for ${method.toUpperCase()} ${protocol}://${url} is currently ${state}`;
  sendTwilioSms(newCheckdata.userPhone, msg, err => {
    if (!err) {
      console.log('Success: User was alerted to a status change');
    } else {
      console.error(`Error: Could not sent sms alert to user`); 
    }
  })
}

// Timer to execute all the worker-process once per minute.
workers.loop = () => {
  setInterval( ()=> {
    workers.gatheAllChecks();
  }, 60000);
};

// Init script
workers.init = () =>{
  // Execute all the checks inmediately
  workers.gatheAllChecks();

  // Call the loop so the checks will execute later on
  workers.loop();
}

// Export the module
module.exports = workers;