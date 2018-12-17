let config
const {join} = require("path")
const {readFileSync} = require("fs")
try{
  config = require(join(process.cwd(),"config.json"))
}catch(e){
  throw "Config file not found"
}

if(config.DIALOGFLOW_PRIVATE_KEY_FILE){
  config.DIALOGFLOW_PRIVATE_KEY = readFileSync(config.DIALOGFLOW_PRIVATE_KEY_FILE,'utf-8')
}

const dialogflow = require("./lib/dialogflow")(
  config.PROJECT_ID,
  config.DIALOGFLOW_PRIVATE_KEY,
  config.DIALOGFLOW_CLIENT_EMAIL
)
const training = require("./lib/training")(
  config.PROJECT_ID,
  config.DIALOGFLOW_PRIVATE_KEY,
  config.DIALOGFLOW_CLIENT_EMAIL
)
console.log("Successfully connected to dialogflow")
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
      console.log("Bot:",response[0].queryResult.fulfillmentText)
      reader.prompt()
    })
  })
}