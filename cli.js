#!/usr/bin/env node
const config = require("./lib/loadData")
const cli = require("commander")

const dialogflow = require("./lib/dialogflow")(...config)
const training = require("./lib/training")(...config)

const uuid = require("uuid/v4")()
const utils = require("./lib/util")


console.log("\x1b[32mSuccessfully connected to dialogflow\x1b[0m")
console.log("Request id:",uuid)

cli
.version("1.0.0")
.command("client")
.description("Talk to your bot from the command line")
.action(()=>{
  const readline = require('readline')
  const reader = readline.createInterface(process.stdin, process.stdout, null)
  const [handleCommand,admin] = require("./lib/admin-commands")([uuid])
  console.log("Type something to send to the bot.\nPress ^C to exit.")
  reader.prompt()
  reader.on("line",async data=>{
    if(await handleCommand({chatId:uuid,text:data},{
      sendMessage:(chatId,response)=>{
        console.log("\x1b[36mCommand result:\n\n"+response+"\x1b[0m")
      }
    })){
      reader.prompt()
      return
    }
    dialogflow({
      sessionId:uuid,
      query:data
    })
    .then(response=>{
      const result = response[0].queryResult.fulfillmentText
      console.log("\x1b[34mBot:",result+"\x1b[0m")
      admin.setUserMessage(uuid,response[0].queryResult)
      reader.prompt()
    })
  })
})


// Dumping utility

cli
.command("dump")
.description("Dump responses and training phrases from dialogflow")
.option("-c, --csv","Output data into a csv file")
.option("-r, --response-only","Only fetch responses")
.option("-p, --phrases-only","Only fetch training phrases")
.action((options)=>{
  const {writeFileSync:writeFile} = require("fs")
  require("./lib/dump")(training)
    .then(({responses,trainingPhrases})=>{
      console.log("\x1b[32mData fetched\x1b[0m")
      if(!options.phrasesOnly){
        // User did not ask to omit responses
        if(options.csv){
          writeFile("responses.csv",utils.toCSV(responses))
        }else{
          writeFile("responses.json",JSON.stringify(responses))
        }
      }
      if(!options.responseOnly){
        if(options.csv){
          writeFile("phrases.csv",utils.toCSV(trainingPhrases))
        }else{
          writeFile("phrases.json",JSON.stringify(trainingPhrases))
        }
      }
      console.log("\x1b[32mDone.\x1b[0m")
    })
})


// Lists intents which have the least training phrases

cli
.command("needsreview")
.description("Lists intents which have the least training phrases")
.option("-j, --json","Output intents as JSON")
.option("--no-color","Do not color output")
.action(options=>{
  training.needsReview(options.color,options.json)
  .then(data=>{
    console.log(data)
  })
})


// Non existent command
cli.on('command:*', function () {
  console.error('Invalid command: %s\nSee --help for a list of available commands.', cli.args.join(' '));
  process.exit(1)
})

cli.parse(process.argv)

// No command specified, show help
if(!cli.args.length){
  cli.outputHelp()
  process.exit(0)
}
