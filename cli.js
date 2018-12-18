#!/usr/bin/env node
const config = require("./lib/loadData")
const cli = require("commander")

const dialogflow = require("./lib/dialogflow")(...config)
const training = require("./lib/training")(...config)

const uuid = require("uuid/v4")()

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
          writeFile("responses.csv",toCSV(responses))
        }else{
          writeFile("responses.json",JSON.stringify(responses))
        }
      }
      if(!options.responseOnly){
        if(options.csv){
          writeFile("phrases.csv",toCSV(trainingPhrases))
        }else{
          writeFile("phrases.json",JSON.stringify(trainingPhrases))
        }
      }
      console.log("\x1b[32mDone.\x1b[0m")
    })
})

function toCSV(data){
  const mostRows = countData(data)
  // Add one row for intent name
  let csv = Array(mostRows+1).fill("")
  for(const key in data){
    csv[0]+=`"${key}",`
    for(let i=1;i<=mostRows;i++){
      if(data[key][i-1]===undefined){
        csv[i]+=","
      }else{
        csv[i]+=`"${data[key][i-1]}",`
      }
    }
  }
  return csv.join("\n")
}
function countData(data){
  let curr = 0
  for(const key in data){
    curr = Math.max(curr,data[key].length)
  }
  return curr
}
cli.parse(process.argv)
