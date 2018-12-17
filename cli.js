const config = require("./lib/loadData")

const dialogflow = require("./lib/dialogflow")(...config)
const training = require("./lib/training")(...config)

console.log("\x1b[32mSuccessfully connected to dialogflow\x1b[0m")
const uuid = require("uuid/v4")()

if(process.argv[2]==="client"){
  const readline = require('readline')
  const reader = readline.createInterface(process.stdin, process.stdout, null)
  console.log("Type something to send to the bot.\nPress ^C to exit.")
  reader.prompt()
  reader.on("line",data=>{
    dialogflow({
      sessionId:uuid,
      query:data
    })
    .then(response=>{
      console.log("\x1b[34mBot:",response[0].queryResult.fulfillmentText+"\x1b[0m")
      reader.prompt()
    })
  })
}else if(process.argv[2]==="dump"){
  require("./lib/dump")(training)
  .then(({responses,trainingPhrases})=>{
    const {writeFileSync:writeFile} = require("fs")
    writeFile("responses.json",JSON.stringify(responses))
    writeFile("phrases.json",JSON.stringify(trainingPhrases))
  })
}