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

module.exports = [
  config.PROJECT_ID,
  config.DIALOGFLOW_PRIVATE_KEY,
  config.DIALOGFLOW_CLIENT_EMAIL,
  config.DEBUG_PASSWORD
]
