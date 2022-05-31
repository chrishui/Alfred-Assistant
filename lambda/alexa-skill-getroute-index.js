// Author: Chris Hui
// Site: https://www.chrishui.co.uk/

/* SETUP CODE AND CONSTANTS */

const Alexa = require("ask-sdk-core");
const actions = require('./functions');

// User data
// Future Upgrade - make them come from a database like DynamoDB
const Bookmarks = { 
  "Queen Mary University of London": "51.52423394319559,-0.04040667867097111",
  "London School of Economics": "51.51449884895787,-0.1163976528188817",
  "my office": "51.52206587054375,-0.0798565191478259"
};

var user_origin = "51.44973679770549,-0.15494462325817196";  // Possible future update: Account linking with user account
var user_destination = "XXXXXX"; // Destination to be later replaced

// Google Directions API Related Data
var google_api_key = process.env.google_api_key; 

var google_api_traffic_model = "best_guess"; // For driving mode: optimistic or pesimistic 
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

const SKILL_NAME = "Alfred Assistant";

/* INTENT HANDLERS */

const LaunchRequestHandler = {
  canHandle(handlerInput) {
      return handlerInput.requestEnvelope.request.type === 'LaunchRequest';
  },
  handle(handlerInput) {
      console.log("Launch Request Handler Called");

      let speechText = `Hi, I am ${SKILL_NAME}, your cloud based personal assistant.`;
      let repromptText = "I did not get a response, do you need help?"; 
      
      // Setting the attributes property for data persistence
      // repromptText asks if user needs help -> need to associate 'yes' response with 'help' intent
      // If the user says "Yes" to the repromptText question, the script will know what to do next
      handlerInput.attributesManager.setSessionAttributes({ type: "help" });
      
      return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(repromptText)
      .getResponse();
  }
};

const HelpIntent = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return (
      request.type === "IntentRequest" &&
      request.intent.name === "AMAZON.HelpIntent"
      );
  },
  handle(handlerInput) {
    console.log("HelpIntent Handler Called");
    
    let speechText = "I can obtain commute information to a destination of your choosing. I have also stored your bookmarked locations. Would you like me to read them out to you?";
    
    let repromptText = "Sorry, I did not receive an input. Would you like me to read out your bookmarked locations?";

    // Session management
    handlerInput.attributesManager.setSessionAttributes({ type: "bookmarks" });
    
    return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(repromptText)
      .getResponse();
  }
};

const YesIntent = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return (
      request.type === "IntentRequest" &&
      request.intent.name === "AMAZON.YesIntent"
      );
  },
  handle(handlerInput) {
    console.log("AMAZON.YesIntent intent handler called");
    
    // Session management
    let attributes = handlerInput.attributesManager.getSessionAttributes();
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

const NoIntent = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return (
      request.type === "IntentRequest" &&
      request.intent.name === "AMAZON.NoIntent"
      );
  },
  handle(handlerInput) {
    console.log("NoIntent intent handler called");
    return handlerInput.responseBuilder
      .getResponse();
  }
};

// Gracefully handle any intent that wasn't handled
const FallbackIntent = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return (
      request.type === "IntentRequest" &&
      request.intent.name === "AMAZON.FallbackIntent"
      );
  },
  handle(handlerInput) {
    console.log("FallbackIntent Handler called");
    
    let speechText = "Sorry, I wasn't able to understand what you said. Please try again.";
    
    return handlerInput.responseBuilder
      .speak(speechText)
      .getResponse();
  }
};

const GetBookmarksIntent = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return (
      request.type === "IntentRequest" &&
      request.intent.name === "GetBookmarks"
      );
  },
  handle(handlerInput) {
    console.log("GetBookmarksIntent Intent Handler Called");
    
    // Get the list of Keys for Bookmarks Object
    let keys = Object.keys(Bookmarks); // Store keys as array
    let destinations = "";
    
    for (let i=0; i<keys.length; i++) {
      if (i==keys.length-1) {
        destinations += " and ";
      }
      destinations += keys[i] + ", ";
    }
    
    let speechText = "Your bookmarked locations are " + destinations;
    
    return handlerInput.responseBuilder
      .speak(speechText)
      .getResponse();
  }
};

const GetRouteIntent = {
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
    let slotdata = handlerInput.requestEnvelope.request.intent.slots; // The {destination} slot name, defined in developer portal
    console.log("Slot Value: " + JSON.stringify(slotdata));

    let speechText = "";
    let destination = "";
    let speakdestination = "";
    let slot = "";
   
   // Get user's destination from slot value
   if (slotdata.destination.value) {
    slot = slotdata.destination.value.toLowerCase(); // Make lower case to ensure matching of info
    console.log("Destination Slot was detected. The value is " + slot);
   }
   
   // Try to get destination from bookmarked lcoations
   if (Bookmarks[slot]) {
     destination = Bookmarks[slot];
     speakdestination = slot.replace("my ", "your ");
   } else {
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
   
   console.log("Google Directions API path: https://" + google_api_host + final_api_path);
   
   try {
     let jsondata = await actions.getData(options); // Use "await" expression that pauses the execution of the "async" funciton, until promise is resolved (getData function returns promise)
     console.log(jsondata);
     let status = jsondata.status;
     
     if (status == "OK") {
       
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
        
        speechText = "It will take you " + duration + " to reach " + speakdestination + ". You will arrive  around " +
                     "<say-as interpret-as='time'>" + timeinhhmm + "</say-as> if you leave within 5 minutes"; 
       
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

const UnhandledHandler = {
  canHandle() {
      return true;
  },
  handle(handlerInput, error) {
      console.log(`Error Handler : ${error.message}`);
      
      return handlerInput.responseBuilder
        .speak('Sorry, I am unable to understand. Please try again.')
        .getResponse();
  }
};

exports.handler = Alexa.SkillBuilders.custom()
    .addRequestHandlers(
        LaunchRequestHandler,
        GetBookmarksIntent,
        HelpIntent,
        YesIntent,
        NoIntent,
        FallbackIntent,
        GetRouteIntent
    )
    .addErrorHandlers(UnhandledHandler)
    .lambda();
    

