const https = require("https");

const myfunctions = {
  // Make an HTTP Request and retrieve data either through GET or POST
  // Options -> URL
  // postData -> in case of making a POST request, instead of GET request
  getData: function(options, postData) {
    // Async function, wait for Google to respond before Alexa reads out
    return new Promise(function(resolve,reject) { // Will return either resolve or reject
      var request = https.request(options, function(response) {
        // reject if status is not 2xxx
        if (response.statusCode < 200 || response.statusCode >= 300) {
          return reject(new Error("statusCode=" + response.statusCode));
        }
        
        // Status is in 2xx
        // cumulate data
        var body = [];
        response.on("data", function (chunk) {
          body.push(chunk);
        });
        
        // when process ends
        response.on("end", function() {
          try {
            body = JSON.parse(Buffer.concat(body).toString()); // Complete JSON data from Google Maps Directions API
            // for non-JSON input, just use 'body' i.e. do not need to parse JSON
          } catch (error) {
            reject(error);
          }
          resolve(body);
        });
      });

      // manage other request errors
      request.on("error", function(error) {
        reject(error);
      });

      // POST data (optional)
      if (postData) {
        request.write(postData);
      }
      
      // End the request. It's Important
      request.end();
    }); // promise ends
  }
};

module.exports = myfunctions;


