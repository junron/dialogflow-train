module.exports = (projectId,privKey,email)=>{
  const languageCode = 'en-US';
  const config = {
    credentials:{
      private_key:privKey,
      client_email:email
    }
  }
  // Instantiate a DialogFlow client.
  const dialogflow = require('dialogflow');
  const sessionClient = privKey ? 
  new dialogflow.SessionsClient(config)
  : new dialogflow.SessionsClient()


  return async ({
    sessionId,
    query,
  }) => {
    // Define session path
    const sessionPath = sessionClient.sessionPath(projectId, sessionId);

    // The text query request.
    const request = {
      session: sessionPath,
      queryInput: {
        text: {
          text: query,
          languageCode: languageCode,
        },
      }
    };
    
    const response = await sessionClient.detectIntent(request);
    const result = response[0].queryResult
    if(!result.intent){
      result.intent = {
        displayName: "Small talk"
      }
    }
    return response
  }
}
