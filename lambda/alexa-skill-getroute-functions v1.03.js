/* HELPER FUNCTIONS */

const https = require("https"); // To establish HTTPS connection with Google Directions API
var AWS = require("aws-sdk");
AWS.config.update({region: "eu-west-1"}); // Ireland region
const tableName = "dynamodb_alfred_location_bookmarks"; // DynamoDB table

var myFunctions = function () { };
var docClient = new AWS.DynamoDB.DocumentClient();

myFunctions.prototype.getDirectionsData = (options, postData) => {
  return new Promise ((resolve, reject) => {
    var request = https.request(options, (response) => {
      // reject if status is not 2xxx
      if (response.statusCode < 200 || response.statusCode >= 300) {
        return reject(new Error("statusCode=" + response.statusCode));
      }
      
      var body = [];
      response.on("data", function (chunk) {
        body.push(chunk);
      });
      
      // When process ends
      response.on("end", () => {
        try {
          body = JSON.parse(Buffer.concat(body).toString()); // Complete JSON data from Google Maps Directions API
          // for non-JSON input, just use 'body' i.e. do not need to parse JSON
        } catch (error) {
          reject(error);
        }
        resolve(body);
      });
    });

    // Manage other request errors
    request.on("error", (error) => {
      reject(error);
    });

    request.end();
  });
};

myFunctions.prototype.addLocation = (location, userID) => {
  return new Promise((resolve, reject) => {
      const params = {
          TableName: tableName,
          Item: {
            "userId"    : userID,
            "location"  : location
          }
      };
      docClient.put(params, (err, data) => {
          if (err) {
              console.log("Unable to insert =>", JSON.stringify(err))
              return reject("Unable to insert");
          }
          console.log("Saved Data, ", JSON.stringify(data));
          resolve(data);
      });
  });
}

myFunctions.prototype.removeLocation = (location, userID) => {
  return new Promise((resolve, reject) => {
      const params = {
          TableName: tableName,
          Key: {
              "userId"    : userID,
              "location"  : location
          },
          ConditionExpression: "attribute_exists(location)"
      }
      docClient.delete(params, function (err, data) {
          if (err) {
              console.error("Unable to delete item. Error JSON:", JSON.stringify(err, null, 2));
              return reject(JSON.stringify(err, null, 2))
          }
          console.log(JSON.stringify(err));
          console.log("DeleteItem succeeded:", JSON.stringify(data, null, 2));
          resolve()
      })
  });
}

myFunctions.prototype.getLocations = (userID) => {
  return new Promise((resolve, reject) => {
      const params = {
          TableName: tableName,
          KeyConditionExpression: "#userID = :user_id",
          ExpressionAttributeNames: {
              "#userID": "userId"
          },
          ExpressionAttributeValues: {
              ":user_id": userID
          }
      }
      docClient.query(params, (err, data) => {
          if (err) {
              console.error("Unable to read item. Error JSON:", JSON.stringify(err, null, 2));
              return reject(JSON.stringify(err, null, 2))
          } 
          console.log("GetItem succeeded:", JSON.stringify(data, null, 2));
          resolve(data.Items)
          
      })
  });
}

module.exports = new myFunctions();


