#!/usr/bin/env node
const config = require("./lib/loadData")
const cli = require("commander")

const dialogflow = require("./lib/dialogflow")(...config)
const training = require("./lib/training")(...config)

const uuid = require("uuid/v4")()
const utils = require("./lib/util")

cli
.version("1.0.0")
.command("client")
.description("Talk to your bot from the command line")
.action(()=>{
  console.log("\x1b[32mSuccessfully connected to dialogflow\x1b[0m")
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
})


// Dumping utility

cli
.command("dump")
.description("Dump responses and training phrases from dialogflow")
.option("-c, --csv","Output data into a csv file")
.option("-r, --response-only","Only fetch responses")
.option("-p, --phrases-only","Only fetch training phrases")
.action((options)=>{
  console.log("\x1b[32mSuccessfully connected to dialogflow\x1b[0m")
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
