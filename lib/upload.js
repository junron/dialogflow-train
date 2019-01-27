const {deepEqual} = require("./util")
const diff = require("diff")
const structJson = require("./structjson")
const {simplifyResponse,simplifyPhrase} = require("./dump")

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
  if(!phrase.includes("</")){
    return {
      parts:[{
        text:phrase
      }],
      type:"EXAMPLE"
    }
  }
  const split = phrase.split("<");
  const parts = []
  for(const part of split){
    if(!part.includes(">")){
      parts.push({
        text:part
      })
    }else if(part.includes("alias=")){
      // Starting tag
      const tag = part.split(' ')[0];
      const alias = part.split('>')[0].split("alias=")[1];
      const value = part.split('>')[1];
      parts.push({
        text:value,
        entityType:tag,
        alias
      })
    }else{
      parts.push({
        text:part.split(">")[1]
      })
    }
  }
  return {
    parts,
    type:"EXAMPLE"
  }
}

module.exports = training =>{
  return {
    uploadResponses:async (data,dryRun=false)=>{
      let output = [];
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
              if(dryRun){
                output.push({
                  type:"error",
                  reason:"Insufficient location information",
                  intent:intent.displayName
                })
              }
              console.log(`\x1b[35mSkipped\x1b[0m ${intent.displayName}: \x1b[31mInsufficient location information\x1b[0m`)
              continue
            }
            if(newResponses.includes("webhook")){
              if(dryRun){
                output.push({
                  type:"warning",
                  reason:"No responses configured, may use webhook",
                  intent:intent.displayName
                })
              }
              console.log(`\x1b[35mSkipped\x1b[0m ${intent.displayName}: \x1b[31mNo responses configured, may use webhook\x1b[0m`)
              continue
            }
            if(deepEqual(newResponses,intent.messages)){
              continue
            }
            const makeSimple = res => simplifyResponse(res).text.text[0];
            const changed = diff.diffArrays(intent.messages.map(makeSimple),responses).filter(a=>a.removed||a.added)
            console.log(`\x1b[33mModified:\x1b[0m ${intent.displayName}`)
            if(dryRun){
              output.push({
                type:"modified",
                changes:JSON.stringify(changed),
                intent:intent.displayName
              })
            }
            changes.modified++
            intent.messages = newResponses
            if(!dryRun){
              promises.push(training.updateIntent(intent))
            }
          }
        }else{
          if(dryRun){
            output.push({
              type:"created",
              messages:responses.map(parseResponse),
              changes:JSON.stringify(diff.diffArrays([],responses)),
              intent:intentName
            })
            console.log(`\x1b[32mCreated:\x1b[0m ${intentName}`)
          }else{
            // Intent does not exist in dialogflow, create it
            const res = await training.createIntent({
              displayName:intentName,
              messages:responses.map(parseResponse),
              trainingPhrases:[intentName].map(parsePhrases)
            })
            console.log(`\x1b[32mCreated:\x1b[0m ${res[0].displayName}`)
          }
          changes.created++
        }
      }
      await Promise.all(promises)
      console.log(`\x1b[32mDone uploading responses: ${changes.modified} intents modified, ${changes.created} intents created\n\x1b[0m`)
      return output;
    },
    uploadPhrases:async (data,dryRun=false)=>{
      const changes = {
        modified:0,
        created:0
      }
      const output = []
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
            const changed = diff.diffArrays(oldPhrases,phrases).filter(a=>a.removed||a.added)
            for(const diff of changed){
              if(diff.added){
                console.log(`\x1b[32m${diff.value}\x1b[0m`)
              }else{
                console.log(`\x1b[31m${diff.value}\x1b[0m`)
              }
            }
            if(dryRun){
              output.push({
                type:"modified",
                changes:JSON.stringify(changed),
                intent:intent.displayName
              })
            }else{
              promises.push(training.updateIntent(intent))
            }
            changes.modified++
            intent.trainingPhrases = newPhrases
          }
        }else{
          // Intent does not exist in dialogflow, create it
          if(dryRun){
            output.push({
              type:"created",
              changes:JSON.stringify(diff.diffArrays([],phrases)),
              intent:intentName
            })
            console.log(`\x1b[32mCreated:\x1b[0m ${intentName}`)
          }else{
            const res = await training.createIntent({
              displayName:intentName,
              trainingPhrases:phrases.map(parsePhrases)
            })
            console.log(`\x1b[32mCreated:\x1b[0m ${res[0].displayName}`)
          }
          changes.created++
        }
      }
      await Promise.all(promises)
      console.log(`\x1b[32mDone uploading training phrases: ${changes.modified} intents modified, ${changes.created} intents created\n\x1b[0m`)
      return output;
    }
  }
}