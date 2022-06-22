// Author: Chris Hui
// Site: https://www.chrishui.co.uk/

/* SETUP CODE AND CONSTANTS */

const Alexa = require("ask-sdk-core");
const helperFunctions = require('./functions'); 

// User data
var user_origin = "51.44973679770549,-0.15494462325817196";  // Possible future update: Account linking with user account
var user_destination = "XXXXXX"; // Destination to be later replaced

// Google Directions API Related Data
var google_api_key = process.env.google_api_key; 
var google_api_departure_time = "now"; // Time of API request
var google_api_mode = "transit" 
var google_api_host = "maps.googleapis.com";
var google_api_path = "/maps/api/directions/json?origin=" +
  user_origin +
  "&destination=" +
  user_destination +
  "&mode=" +
  google_api_mode +
  "&departure_time=" +
  google_api_departure_time +
  "&key=" +
  google_api_key;
var google_api_path_driving = google_api_path.replace("transit", "driving");

const SKILL_NAME = "Alfred directions";
const GENERAL_REPROMPT = "What would you like to do?";

/* INTENT HANDLERS */

const LaunchRequestHandler = {
  canHandle(handlerInput) {
      return handlerInput.requestEnvelope.request.type === 'LaunchRequest';
  },
  handle(handlerInput) {
      let speechText = `Hi, welcome to ${SKILL_NAME}. What would you like help with?`;
      handlerInput.attributesManager.setSessionAttributes({ type: "help" }); // Session management
      return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(GENERAL_REPROMPT)
      .getResponse();
  }
};

const HelpIntentHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return (
      request.type === "IntentRequest" &&
      request.intent.name === "AMAZON.HelpIntent"
      );
  },
  handle(handlerInput) {
    let speechText = "I can obtain commute information to a destination of your choosing. I have also stored your bookmarked locations. Would you like me to read them out to you?";
    let repromptText = "Sorry, I did not receive an input. Would you like me to read out your bookmarked locations?";
    handlerInput.attributesManager.setSessionAttributes({ type: "bookmarks" }); // Session management
    return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(repromptText)
      .getResponse();
  }
};

const YesIntentHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return (
      request.type === "IntentRequest" &&
      request.intent.name === "AMAZON.YesIntent"
      );
  },
  handle(handlerInput) {
    let attributes = handlerInput.attributesManager.getSessionAttributes(); // Session management
    let speechText = "";
    
    if (attributes.type) {
      switch (attributes.type) {
        case "bookmarks":
          return GetBookmarksIntent.handle(handlerInput);
        case "help":
          return HelpIntent.handle(handlerInput);
          
        default:
          speechText = "Sorry, I am unable to process that.";
      }
      
    } else {
      speechText = "Sorry, I am not sure what this is referring to.";
    }
    
    return handlerInput.responseBuilder
      .speak(speechText)
      .getResponse();
  }
};

const NoIntentHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return (
      request.type === "IntentRequest" &&
      request.intent.name === "AMAZON.NoIntent"
      );
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder
      .getResponse();
  }
};

const FallbackIntentHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return (
      request.type === "IntentRequest" &&
      request.intent.name === "AMAZON.FallbackIntent"
      );
  },
  handle(handlerInput) {
    console.log("FallbackIntent Handler called");
    
    let speechText = "Sorry, I wasn't able to understand. Please try again.";
    
    return handlerInput.responseBuilder
      .speak(speechText)
      .getResponse();
  }
};

const ErrorHandler = {
  canHandle() {
      return true;
  },
  handle(handlerInput, error) {
    console.log(`Error request: ${JSON.stringify(handlerInput.requestEnvelope.request)}`);
    console.log(`Error handled: ${error.message}`);
    
    return handlerInput.responseBuilder
      .speak("Sorry, I am unable to understand. Please try again.")
      .getResponse();
  }
};

const GetRouteIntentHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return (
      request.type === "IntentRequest" &&
      request.intent.name === "GetRoute"
      );
  },
  async handle(handlerInput) {
    console.log("GetRouteIntent Intent Handler called");
    
    // The slot information
    let slotdata = handlerInput.requestEnvelope.request.intent.slots; 
    console.log("Slot Value: " + JSON.stringify(slotdata));

    let speechText = "";
    let destination = "";
    let speakdestination = "";
    let slot = "";
   
   // Get user's destination from slot value
   if (slotdata.destination.value) { // The {destination} slot value
    slot = slotdata.destination.value.toLowerCase(); // Make lower case to ensure matching of info
    console.log("Destination Slot was detected. The value is " + slot);
    destination = slot;
    speakdestination = destination;
   }
   
  //  If user did not provide destination intent slot
   if (destination === "") {
     console.log("No slot value for destination is provided");
     
     let speechText = "I didn't receive a destination, would you like me to read out your bookmarked locations instead?";
     let repromptText = "Sorry, I did not receive a response. Would you like me to read out your bookmarked locations?";
     
     handlerInput.attributesManager.setSessionAttributes({ type: "bookmarks" });
     
     return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(repromptText)
      .getResponse();
   }
   
   console.log("Destination is not blank");
   
   // Prepare the final google API path
   let final_api_path = google_api_path.replace(user_destination, encodeURIComponent(destination));
   
   // https options
   let options = {
     host: google_api_host,
     path: final_api_path,
     method: "GET"
   };

   let final_api_path_driving = google_api_path_driving.replace(user_destination, encodeURIComponent(destination));
   let options_driving = {
    host: google_api_host,
    path: final_api_path_driving,
    method: "GET"
  };
   
   console.log("Google Directions API path: https://" + google_api_host + final_api_path);
   
   try {
     let jsondata = await helperFunctions.getDirectionsData(options); // Use "await" expression that pauses the execution of the "async" funciton, until promise is resolved (getDirectionsData function returns promise)
     console.log(jsondata);
     let status = jsondata.status;

     let jsondata_driving = await helperFunctions.getDirectionsData(options_driving);
     let status_driving = jsondata_driving.status;
     
     if (status == "OK" && status_driving == "OK") {

        // Public transportation
        let duration = jsondata.routes[0].legs[0].duration.text;
        let seconds = jsondata.routes[0].legs[0].duration.value;
        
        // Arrival time, adjusted to UK timezone
        let nd = new Date();
        let ld = new Date(nd.getTime() + (seconds + 300)* 1000);
        let timeinhhmm = ld.toLocaleTimeString("en-GB", {
          timeZone: 'Europe/London',
          hour: "2-digit",
          minute: "2-digit"
        });

        // Driving
        let duration_driving = jsondata_driving.routes[0].legs[0].duration.text;
        let seconds_driving = jsondata_driving.routes[0].legs[0].duration.value;

        // Arrival time for dribving
        let nd_driving = new Date();
        let ld_driving = new Date(nd_driving.getTime() + (seconds_driving + 300)* 1000);
        let timeinhhmm_driving = ld_driving.toLocaleTimeString("en-GB", {
          timeZone: 'Europe/London',
          hour: "2-digit",
          minute: "2-digit"
        });
        
        speechText = "By public transportation, it will take you " + duration + " to reach " + speakdestination + ". You will arrive at around " +
                     "<say-as interpret-as='time'>" + timeinhhmm + 
                     "</say-as>. If you drove, it will take you " + duration_driving + " instead, and you will arrive at around " +
                     "<say-as interpret-as='time'>" + timeinhhmm_driving + 
                     "</say-as> if you leave within 5 minutes"; 
       
     } else {
       speechText = "Sorry, I was not able to get traffic information for your destination " + speakdestination + ". Please try a different destination";
     }
     
   } catch (error) {
     speechText = "Sorry, an error occurred getting data from Google. Please try again.";
     console.log(error);
   }
   
   return handlerInput.responseBuilder
    .speak(speechText)
    .getResponse();
   
  }
};

const InProgressAddLocationIntentHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'IntentRequest' &&
      request.intent.name === 'AddLocationIntent' &&
      request.dialogState !== 'COMPLETED';
  },
  handle(handlerInput) {
    const currentIntent = handlerInput.requestEnvelope.request.intent;
    return handlerInput.responseBuilder
      .addDelegateDirective(currentIntent)
      .getResponse();
  }
};

const AddLocationIntentHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'AddLocationIntent';
  },
  async handle(handlerInput) {
    const {responseBuilder} = handlerInput;
    const userID = handlerInput.requestEnvelope.context.System.user.userId; 
    const slotdata = handlerInput.requestEnvelope.request.intent.slots;
    const location = slotdata.location.value; // The {location} slot value
    return helperFunctions.addLocation(location, userID)
      .then((data) => {
        const speechText = `You have added location ${location}. You can say add to add another one or remove to remove location`;
        return responseBuilder
          .speak(speechText)
          .reprompt(GENERAL_REPROMPT)
          .getResponse();
      })
      .catch((err) => {
        console.log("Error occured while saving location", err);
        const speechText = "we cannot save your location right now. Please try again!"
        return responseBuilder
          .speak(speechText)
          .getResponse();
      })
  },
};

const InProgressRemoveLocationIntentHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'IntentRequest' &&
      request.intent.name === 'RemoveLocationIntent' &&
      request.dialogState !== 'COMPLETED';
  },
  handle(handlerInput) {
    const currentIntent = handlerInput.requestEnvelope.request.intent;
    return handlerInput.responseBuilder
      .addDelegateDirective(currentIntent)
      .getResponse();
  }
};

const RemoveLocationIntentHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'RemoveLocationIntent';
  }, 
  handle(handlerInput) {
    const {responseBuilder} = handlerInput;
    const userID = handlerInput.requestEnvelope.context.System.user.userId; 
    const slotdata = handlerInput.requestEnvelope.request.intent.slots;
    const location = slotdata.location.value; // The {location} slot value
    return helperFunctions.removeLocation(location, userID)
      .then((data) => {
        const speechText = `You have removed location ${location}, you can add another one by saying add`
        return responseBuilder
          .speak(speechText)
          .reprompt(GENERAL_REPROMPT)
          .getResponse();
      })
      .catch((err) => {
        const speechText = `You do not have a location ${location}, you can add it by saying add`
        return responseBuilder
          .speak(speechText)
          .reprompt(GENERAL_REPROMPT)
          .getResponse();
      })
  }
};

const GetLocationsIntentHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'GetLocationsIntent';
  },
  async handle(handlerInput) {
    const {responseBuilder} = handlerInput;
    const userID = handlerInput.requestEnvelope.context.System.user.userId; 
    return helperFunctions.getLocations(userID)
      .then((data) => {
        var speechText = "Your bookmarked locations are "
        if (data.length == 0) {
          speechText = "You do not have any bookmarked locations yet, add location by saving add location "
        } else {
          speechText += data.map(e => e.location).join(", ")
        }
        return responseBuilder
          .speak(speechText)
          .reprompt(GENERAL_REPROMPT)
          .getResponse();
      })
      .catch((err) => {
        const speechText = "we cannot get your saved locations right now. Please try again!"
        return responseBuilder
          .speak(speechText)
          .getResponse();
      })
  }
};

const skillBuilder = Alexa.SkillBuilders.custom();
exports.handler = skillBuilder
    .addRequestHandlers(
        LaunchRequestHandler,
        HelpIntentHandler,
        YesIntentHandler,
        NoIntentHandler,
        FallbackIntentHandler,
        GetRouteIntentHandler,
        InProgressAddLocationIntentHandler,
        AddLocationIntentHandler,
        InProgressRemoveLocationIntentHandler,
        RemoveLocationIntentHandler,
        GetLocationsIntentHandler
    )
    .addErrorHandlers(ErrorHandler)
    // .withTableName(dynamoDBTableName)
    // .withAutoCreateTable(true)
    .lambda();
    
