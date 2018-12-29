const {deepEqual} = require("./util")
const diff = require("diff")
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
const parsePhrases = phrase=>{
  return {
    parts:[{
      text:phrase
    }],
    type:"EXAMPLE"
  }
}
const simplifyPhrase = phrase =>{
  return phrase.parts[0].text
}
module.exports = training =>{
  return {
    uploadResponses:async (data)=>{
      const changes = {
        modified:0,
        created:0
      }
      const promises = []
      const intents = await training.listIntents()
      const existingIntents = intents.map(i=>i.displayName)
      for(const intentName in data){
        const responses = data[intentName]
        if(existingIntents.includes(intentName)){
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
            console.log(`\x1b[33mModified:\x1b[0m ${intent.displayName}`)
            changes.modified++
            intent.messages = newResponses
            promises.push(training.updateIntent(intent))
          }
        }else{
          // Intent does not exist in dialogflow, create it
          const res = await training.createIntent({
            displayName:intentName,
            messages:responses.map(parseResponse)
          })
          console.log(`\x1b[32mCreated:\x1b[0m ${res[0].displayName}`)
          changes.created++
        }
      }
      await Promise.all(promises)
      console.log(`\x1b[32mDone uploading responses: ${changes.modified} intents modified, ${changes.created} intents created\n\x1b[0m`)
    },
    uploadPhrases:async (data)=>{
      const changes = {
        modified:0,
        created:0
      }
      const promises = []
      const intents = await training.listIntents()
      const existingIntents = intents.map(i=>i.displayName)
      for(const intentName in data){
        const phrases = data[intentName].sort()
        if(existingIntents.includes(intentName)){
          if(phrases[0]!==undefined){
            const intent = intents.find(i=>i.displayName===intentName)
            const newPhrases = phrases.map(parsePhrases)
            const oldPhrases = intent.trainingPhrases.map(simplifyPhrase).sort()
            if(deepEqual(phrases,oldPhrases)){
              continue
            }
            console.log(`\x1b[32mModified:\x1b[0m ${intent.displayName}`)
            for(let i=0;i<Math.max(phrases.length,oldPhrases.length);i++){
              const now = phrases[i] ? phrases[i] : ""
              const prev = oldPhrases[i] ? oldPhrases[i] : ""
              const difference = diff.diffChars(now,prev)
              if(difference.length===1){
                continue
              }
              difference.forEach(part=>{
                const color = part.added ? '\x1b[32m' :
                  part.removed ? '\x1b[31m\u001b[9m' : '';
                process.stdout.write(color+part.value+"\x1b[0m");
              })
              console.log()
            }
            changes.modified++
            intent.trainingPhrases = newPhrases
            promises.push(training.updateIntent(intent))
          }
        }else{
          // Intent does not exist in dialogflow, create it
          const res = await training.createIntent({
            displayName:intentName,
            trainingPhrases:phrases.map(parsePhrases)
          })
          console.log(`\x1b[32mCreated:\x1b[0m ${res[0].displayName}`)
          changes.created++
        }
      }
      await Promise.all(promises)
      console.log(`\x1b[32mDone uploading training phrases: ${changes.modified} intents modified, ${changes.created} intents created\n\x1b[0m`)
    }
  }
}