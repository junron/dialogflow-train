const structJson = require("./structjson")
const simplifyResponse = response =>{
  if(!response.text){
    const payload = structJson.structProtoToJson(response.payload)
    if(payload.telegram.location){
      const {lat,long} = payload.telegram.location
      response.text = {
        text:[`<location long=${long} lat=${lat}></location>`]
      }
    }else{
      response.text = {
        text:[payload.telegram.text]
      }
      for(const btn of payload.telegram.inlineKeyboard){
        response.text.text[0]+="<button>"+btn+"</button>"
      }
    }
  }
  return response;
}
module.exports = {
    dump:async training =>{
    const output = {}
    const responses = {}

    return training.listIntents().then(data=>{
      data = data.sort((a,b)=>{
        if(a.displayName>b.displayName){
          return 1
        }else if(a.displayName<b.displayName){
          return -1
        }
        return 0
      })
      for(const intent of data){
        output[intent.displayName] = []
        responses[intent.displayName] = []
        for(const response of intent.messages){
          responses[intent.displayName].push(...simplifyResponse(response).text.text)
        }
        if(intent.messages.length===0 || intent.messages.length===1 && intent.messages[0].text && intent.messages[0].text.text.length===0){
          responses[intent.displayName].push("There is no fixed response for this intent. It may be linked to a webhook for fulfillment instead.")
        }
        for(const phrase of intent.trainingPhrases){
          output[intent.displayName].push(phrase.parts
            .map(part=>part.text)
            .join("")
            )
        }
      }
      return {
        responses,
        trainingPhrases:output
      }
    })
  },
  simplifyResponse
}