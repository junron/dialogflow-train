let config = {}
const {join} = require("path")
const {readFileSync} = require("fs")
try{
  config = require(join(process.cwd(),"config.json"))
}catch(e){
  console.log("Config file not found")
}

if(process.env.DIALOGFLOW_PRIVATE_KEY_FILE!==undefined){
  config.DIALOGFLOW_PRIVATE_KEY_FILE = process.env.DIALOGFLOW_PRIVATE_KEY_FILE
}
if(process.env.DIALOGFLOW_PRIVATE_KEY!==undefined){
  config.DIALOGFLOW_PRIVATE_KEY = process.env.DIALOGFLOW_PRIVATE_KEY
}
if(process.env.DIALOGFLOW_CLIENT_EMAIL!==undefined){
  config.DIALOGFLOW_CLIENT_EMAIL = process.env.DIALOGFLOW_CLIENT_EMAIL
}
if(process.env.PROJECT_ID!==undefined){
  config.PROJECT_ID = process.env.PROJECT_ID
}
if(process.env.DEBUG_PASSWORD!==undefined){
  config.DEBUG_PASSWORD = process.env.DEBUG_PASSWORD
}


if(config.DIALOGFLOW_PRIVATE_KEY_FILE){
  config.DIALOGFLOW_PRIVATE_KEY = readFileSync(config.DIALOGFLOW_PRIVATE_KEY_FILE,'utf-8')
}

if(!config.DEBUG_PASSWORD){
  console.log("\x1b[31m Debug password not set, defaulting to 'Hello, world!'\x1b[0m")
  config.DEBUG_PASSWORD = "Hello, world!"
}
module.exports = [
  config.PROJECT_ID,
  config.DIALOGFLOW_PRIVATE_KEY,
  config.DIALOGFLOW_CLIENT_EMAIL,
  config.DEBUG_PASSWORD
]
