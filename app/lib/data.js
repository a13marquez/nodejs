/*
 * Library for starting and editing data 
 */

// Dependencies
const fs = require('fs');
const path = require('path');
const { parseJsonToObject } = require('./helpers')

// Container for the module (to be exported)
const lib = {}

// Base directory of the data folder
lib.baseDir = path.join(__dirname, '/../.data/');

// Write data to a file
lib.create = (dir, file, data, callback) => { 
  // Open the file for writing
  fs.open(`${lib.baseDir}${dir}/${file}.json`, 'wx', (err, fileDescriptor) => {
    if (!err && fileDescriptor) {
      // Convert data to string
      const stringData = JSON.stringify(data)
      // Write file and close if
      fs.writeFile(fileDescriptor, stringData, err => {
        if(!err) {
          callback(false)
        } else {
          callback('Error writing to new file');
        }
      });
    } else {
      callback('Could not create new file, it may already exist');
    }

  });
}

// Read data from a file
lib.read = (dir, file, callback)=> {
  fs.readFile(`${lib.baseDir}${dir}/${file}.json`, 'utf-8', (err, data) => {
    if(!err && data) {
      const parsedData = parseJsonToObject(data);
      callback(false, parsedData)
    } else {
      callback(err, data);
    }
  });
};

// Update data inside a file
lib.update = (dir, file, data, callback) => {
  // Open the file for writing
  fs.open(`${lib.baseDir}${dir}/${file}.json`, 'r+', (err, fileDescriptor) =>{
    if (!err && fileDescriptor) {
      // Convert data to string
      const stringData = JSON.stringify(data);

      // Truncate the file
      fs.truncate(fileDescriptor, err => {
        if(!err) {
          //write to the file
          fs.writeFile(fileDescriptor, stringData, err => {
            if (!err) {
              fs.close(fileDescriptor, err => {
                if (!err) {
                  callback(false)
                } else {
                  callback('Error closing the file');
                }
              })
            }  
          });
        } else {

        }
         
        callback(err);
      })

    } else{
      callback('Could not open the file for updating, it may not exists yet')
    }
  });
}

// Delete a file
lib.remove = (dir, file, callback) => {
  // unlink the file
  fs.unlink(`${lib.baseDir}${dir}/${file}.json`, err => {
    if(!err) {
      callback(false);
    } else {
      callback('Error deleting the file')
    }
  });
} 

// Export the module
 module.exports = lib;