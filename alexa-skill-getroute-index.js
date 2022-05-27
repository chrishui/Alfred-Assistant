const Alexa = require("ask-sdk-core");
const actions = require('./functions');

// Bookmarked Places and their coordinates
// Future Upgrade - make them come from a database like DynamoDB
// NOTE: All entries to be in lower case, and no space between coordinates
const Bookmarks = {
  "qmul": "51.52423394319559,-0.04040667867097111",
  "lse": "51.51449884895787,-0.1163976528188817",
  "my office": "51.52206587054375,-0.0798565191478259"
};

// User and Google API configuration related variables
// 1. Setting Coordinates for your home/origin
var user_origin = "51.44973679770549,-0.15494462325817196";  // Possible future update: Account linking with user account
var user_destination = "XXXXXX"; // keep it as XXXXXX as it will be replaced later

// 2. Google Maps Directions API Related Data
// 2a. API Key - Unique for every user
var google_api_key = process.env.google_api_key; // CHANGE IT WITH YOUR API KEY

// 2b. Setting the configurable options for the API
var google_api_traffic_model = "best_guess"; // For driving only - it can be optimistic & pessimistic too
var google_api_departure_time = "now"; // Time of API request
var google_api_mode = "transit" 

// 2c. Deconstructing the Directions API URL
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

// Launch Request Handler -- When a skill is launched 
const LaunchRequestHandler = {
  canHandle(handlerInput) {
      return handlerInput.requestEnvelope.request.type === 'LaunchRequest';
  },
  handle(handlerInput) {
      console.log("Launch Request Handler Called");
      
      let speechText = "Hi, I am Alfred, your cloud based personal assistant. You can ask me to get route information.";
      let repromptText = "Sorry, I did not receive any input. Do you need help?"; // User should respond with 'yes', 'no' or no response
      
      // Setting the attributes property for data persistence
      // repromptText asks if user needs help -> need to associate 'yes' response with 'help' intent
      // If the user says "Yes" to the repromptText question, the script will know what to do next
      handlerInput.attributesManager.setSessionAttributes({ type: "help"});
      
      return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(repromptText)
      .getResponse();
  }
};

// Get the list of bookmarked places
const GetBookmarks = {
  canHandle(handlerInput) {
    return (
      handlerInput.requestEnvelope.request.type === "IntentRequest" &&
      handlerInput.requestEnvelope.request.intent.name === "GetBookmarks"
      );
  },
  handle(handlerInput) {
    console.log("GetBookmarks Intent Handler Called");
    
    // Get the list of Keys for Bookmarks Object
    let keys = Object.keys(Bookmarks); // Store keys as array
    let destinations = "";
    
    // Now iterate through the array and create a statement of places
    for (let i=0; i<keys.length; i++) {
      // OPTIONAL: if it is the last destination, add the keyword "and"
      if (i==keys.length-1) {
        destinations += " and ";
      }
      
      // add the destinations and append comma with each to make it a proper speech
      destinations += keys[i] + ", ";
    }
    
    let speechText = "Your bookmarked places are " + destinations;
    
    return handlerInput.responseBuilder
      .speak(speechText)
      .getResponse();
  }
};

// If user asks for Help
const HelpIntent = {
  canHandle(handlerInput) {
    return (
      handlerInput.requestEnvelope.request.type === "IntentRequest" &&
      handlerInput.requestEnvelope.request.intent.name === "AMAZON.HelpIntent"
      );
  },
  handle(handlerInput) {
    console.log("HelpIntent Handler Called");
    
    // Setting the attributes property for data persistence within the session
    let attributes = {
      type: "bookmarks"
    };
    handlerInput.attributesManager.setSessionAttributes(attributes);
    
    let speechText = "I have the ability to get travel route information to a destination of your choosing. I also have a few locations bookmarked for easy access. Would you like me to read them out to you?";
    
    let repromptText = "Sorry, I did not receive any input. Do you want me to read out your bookmarked destinations?";
    
    return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(repromptText)
      .getResponse();
  }
};


// If the user said "Yes" to anything
const YesIntent = {
  canHandle(handlerInput) {
    return (
      handlerInput.requestEnvelope.request.type === "IntentRequest" &&
      handlerInput.requestEnvelope.request.intent.name === "AMAZON.YesIntent"
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
          return GetBookmarks.handle(handlerInput);
        case "help":
          return HelpIntent.handle(handlerInput);
          
        default:
          speechText = "Sorry, I do not understand how to process that.";
      }
      
    } else {
      speechText = "Sorry, I am not sure what you are saying Yes for.";
    }
    
    return handlerInput.responseBuilder
      .speak(speechText)
      .getResponse();
  }
};

// When the user says "No" to a request
const NoIntent = {
  canHandle(handlerInput) {
    return (
      handlerInput.requestEnvelope.request.type === "IntentRequest" &&
      handlerInput.requestEnvelope.request.intent.name === "AMAZON.NoIntent"
      );
  },
  handle(handlerInput) {
    console.log("NoIntent intent handler called");
    return handlerInput.responseBuilder
      .getResponse();
  }
};

// Gracefully handle any intent that wasn't handled
const Fallback = {
  canHandle(handlerInput) {
    return (
      handlerInput.requestEnvelope.request.type === "IntentRequest" &&
      handlerInput.requestEnvelope.request.intent.name === "AMAZON.FallbackIntent"
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

// Get Route Intent Handler
const GetRoute = {
  canHandle(handlerInput) {
    return (
      handlerInput.requestEnvelope.request.type === "IntentRequest" &&
      handlerInput.requestEnvelope.request.intent.name === "GetRoute"
      );
  },
  // It will be an asynchronous function
  async handle(handlerInput) {
    console.log("GetRoute Intent Handler called");
    
    // The slot information
    let slotdata = handlerInput.requestEnvelope.request.intent.slots; // The {destination} slot name, defined in developer portal
    console.log("Slot Values --> " + JSON.stringify(slotdata));
    
    let speechText = "";
    
    // destination address - can be the bookmark's coordinates or a postal address
    let destination = "";
    
    // what alexa sould speak out once a destination is provided
    let speakdestination = "";
    
   // The slot value
   let slot = "";
   
   // Get the "destination" from the "slot value"
   if (slotdata.destination.value) {
    slot = slotdata.destination.value.toLowerCase(); // Make lower case to ensure matching of info
    console.log("Destination Slot was detected. The value is " + slot);
   }
   
   // First try to get the value from bookmarks
   if (Bookmarks[slot]) {
     destination = Bookmarks[slot];
     speakdestination = slot.replace("my ", "your "); // Is this necessary? Since I have 'LSE' saved for example. Alfred will say '...to reach your office'
   } else {
     destination = slot;
     speakdestination = destination;
   }
   
   // If user did not provide {destination}, ask for the destination
   if (destination === "") {
     console.log("Destination is blank");
     
     let speechText = "Where would you like to go today?";
     let repromptText = "Sorry, I did not receive a repsonse. Would you like me to read out your bookmarked destinations?";
     
     handlerInput.attributesManager.setSessionAttributes({
       type: "bookmarks"
     });
     
     return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(repromptText)
      .getResponse();
   }
   
   console.log("Destination is not blank");
   
   // Prepare the final google API path
   // replacing XXXXXX (user_destination variable) with a url encoded version of the actual destination
   let final_api_path = google_api_path.replace(user_destination, encodeURIComponent(destination));
   
   // https "options"
   let options = {
     host: google_api_host,
     path: final_api_path,
     method: "GET"
   };
   
   // Log the complete Google URL for your review / cloudwatch
   console.log("Google API Path --> https://" + google_api_host + final_api_path);
   
   try {
     let jsondata = await actions.getData(options); // Use "await" expression that pauses the execution of the "async" funciton, until promise is resolved (getData function returns promise)
     console.log(jsondata);
     
     // 1. Check the status first
     let status = jsondata.status;
     
     if (status == "OK") {
       
        // Get the duration in traffic from the json array
        let duration = jsondata.routes[0].legs[0].duration.text;
        
        // Google API returns "min" in response. Replace the "min" with "minute" (OPTIONAL)
        // duration = duration.replace("min","minute");
        
        // Get the value in seconds too so that you can do the time calculation
        let seconds = jsondata.routes[0].legs[0].duration.value;
        
        // Initialise a new date, add 300 seconds (5 minutes) to it,
        // to compensate for the delay it will take to get to your vehicle.
        // Then get the hour and the minute only, and not the complete date.
        let nd = new Date();
        let ld = new Date(nd.getTime() + (seconds + 300)* 1000);
        let timeinhhmm = ld.toLocaleTimeString("en-GB", {
          timeZone: 'Europe/London',
          hour: "2-digit",
          minute: "2-digit"
        });
        
        // let timeinhhmm = ld.toLocaleTimeString("en-US", {timeZone: 'Asia/Kolkata', hour:'2-digit', minute: '2-digit'});
        // https://en.wikipedia.org/wiki/List_of_tz_database_time_zones
        
        // SSML - Speech Synthesis Markup Language
        // Documentation: https://developer.amazon.com/en-US/docs/alexa/custom-skills/speech-synthesis-markup-language-ssml-reference.html
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

// Unhandled Requests
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
        GetBookmarks,
        HelpIntent,
        YesIntent,
        NoIntent,
        Fallback,
        GetRoute
    )
    .addErrorHandlers(UnhandledHandler)
    .lambda();
    

