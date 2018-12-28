const {deepEqual} = require("./util")
const structJson = require("./structjson")
const parseResponse = res=>{
  const msg = {
    platform:"TELEGRAM",
    message:"text"
  }
  if(res.includes("linked to a webhook")){
    return "webhook"
  }
  if(res.includes("<button>")){
    const [text,...buttons] = res.split("<button>")
    msg.payload = structJson.jsonToStructProto({
      telegram:{
        text,
        inlineKeyboard:buttons.map(button=>button.replace("</button>",""))
      }
    })
    msg.message = "payload"
  }else if(res.includes("<location")){
    const data = res.split("<location long=")[1].split(" lat=")
    msg.payload = structJson.jsonToStructProto({
      telegram:{
        location:{
          long:parseFloat(data[0]),
          lat:parseFloat(data[1].split("></location>")[0])
        }
      }
    })
    msg.message = "payload"
  }else {
    msg.text = {
      text:[res]
    }
    if(!res.includes("](")){
      msg.platform = "PLATFORM_UNSPECIFIED"
    }
  }
  return msg
}
module.exports = training =>{
  return {
    uploadResponses:async (data)=>{
      const promises = []
      const intents = [...(await training.listIntents())]
      const existingIntents = intents.map(i=>i.displayName)
      for(const intentName in data){
        if(existingIntents.includes(intentName)){
          const responses = data[intentName]
          if(responses[0]!==undefined){
            const intent = intents.find(i=>i.displayName===intentName)
            const newResponses = responses.map(parseResponse)
            if(newResponses.includes(false)){
              console.log(`\x1b[35mSkipped\x1b[0m ${intent.displayName}: \x1b[31mInsufficient location information\x1b[0m`)
              continue
            }
            if(newResponses.includes("webhook")){
              console.log(`\x1b[35mSkipped\x1b[0m ${intent.displayName}: \x1b[31mNo responses configured, may use webhook\x1b[0m`)
              continue
            }
            if(deepEqual(newResponses,intent.messages)){
              continue
            }
            console.log(`\x1b[32mModified:\x1b[0m ${intent.displayName}`)
            intent.messages = newResponses
            promises.push(training.updateIntent(intent))
          }
        }
      }
      await Promise.all(promises)
      console.log("\x1b[32mDone\x1b[0m")
    }
  }
}