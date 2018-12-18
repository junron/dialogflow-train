console.log("Dialogflow training admin commands for telegram enabled")
const config = require("./loadData")
const password = config.pop()
const buffer = Buffer.from(password,"utf-8")
const training = require("./training")(...config)
const {timingSafeEqual} = require("crypto")

module.exports = (bot,authedUserIds)=>{
  const users = {}
  authedUserIds.forEach(id=>{
    users[id] = {
      authed:true
    }
  })
  bot.onText(/\//,msg=>{
    const {id:chatId} = msg.chat
    ;(async ()=>{
      const command = msg.text.split(" ")[0].replace("/","")
      if(command==="auth"){
        const authPassword = Buffer.from(msg.text.replace("/auth ",""))
        if(buffer.length==authPassword.length && timingSafeEqual(buffer,authPassword)){
          users[chatId] = {
            authed:true
          }
          await bot.sendMessage(chatId,"Authentication successful")
        }
      }else if(command==="info"){
        if(users[chatId] && users[chatId].authed){
          const result = users[chatId].prevMessage
          if(!result){
            await bot.sendMessage(chatId,"You do not have any previous messages")
            return
          }
          await bot.sendMessage(chatId,`Query text: ${result.queryText}\n`+
          `Detected Intent: ${result.intent.displayName}\n`+
          `Confidence: ${result.intentDetectionConfidence}\n`+
          `Query Result: ${result.fulfillmentText}`);
        }else{
          await bot.sendMessage(chatId,"You are not authorized to execute this command")
        }
      }else if(command==="add"){
        if(users[chatId] && users[chatId].authed){
          const result = users[chatId].prevMessage
          if(!result){
            await bot.sendMessage(chatId,"You do not have any previous messages")
            return
          }
          const intent = (await training.listIntents())
          .filter(intent=>{
            return intent.displayName === result.intent.displayName
          })[0]
          await training.addTrainingPhrase(intent,result.queryText)
          await bot.sendMessage(chatId,`Intent "${result.intent.displayName}" updated successfully`)
        }else{
          await bot.sendMessage(chatId,"You are not authorized to execute this command")
        }
      }else if(command==="reject"){
        if(users[chatId] && users[chatId].authed){
          const result = users[chatId].prevMessage
          if(!result){
            await bot.sendMessage(chatId,"You do not have any previous messages")
            return
          }
          const intent = (await training.listIntents())
          .filter(intent=>{
            return intent.displayName === "Default fallback intent"
          })[0]
          await training.addTrainingPhrase(intent,result.queryText)
          await bot.sendMessage(chatId,`Fallback intent updated successfully`)
        }else{
          await bot.sendMessage(chatId,"You are not authorized to execute this command")
        }
      }else if(command==="review"){
        if(users[chatId] && users[chatId].authed){
          const result = users[chatId].prevMessage
          if(!result){
            await bot.sendMessage(chatId,"You do not have any previous messages")
            return
          }
          const intents = {}
          const keyboard = {
            reply_markup: {
              keyboard: [],
              one_time_keyboard: true,
            },
          }
          for(const intent of await training.listIntents()){
            intents[intent.displayName] = intent
            keyboard.reply_markup.keyboard.push([intent.displayName])
          }
          keyboard.reply_markup.keyboard = keyboard.reply_markup.keyboard.sort()
          await bot.sendMessage(chatId,"Select a intent from the list below",keyboard)
          users[chatId].waitingForResponse = true
          users[chatId].intents = intents
        }else{
          await bot.sendMessage(chatId,"You are not authorized to execute this command")
        }
      }else if(command==="needsreview"){
        if(users[chatId] && users[chatId].authed){
          const message = await training.needsReview(false)
          await bot.sendMessage(chatId,message)
        }else{
          await bot.sendMessage(chatId,"You are not authorized to execute this command")
        }
      }
    })()
    .catch(e=>{
      console.log("Error",e)
      bot.sendMessage(chatId,"An error occurred: "+e.toString())
    })
  })

  bot.onText(/./,msg=>{
    const {id:chatId} = msg.chat
    ;(async ()=>{
      if(users[chatId] && users[chatId].authed && users[chatId].waitingForResponse){
        if(Object.keys(users[chatId].intents).includes(msg.text)){
          await training.addTrainingPhrase(users[chatId].intents[msg.text],users[chatId].prevMessage.queryText)
          await training.removeTrainingPhrase(users[chatId].intents[users[chatId].prevMessage.intent.displayName],users[chatId].prevMessage.queryText)
          await bot.sendMessage(chatId,`Intent "${msg.text}" updated successfully`)
          users[chatId].waitingForResponse = false
          delete users[chatId].intents
        }
      }
    })()
    .catch(e=>{
      console.log("Error",e)
      bot.sendMessage(chatId,"An error occurred: "+e.toString())
    })
  })

  return {
    getUser(chatId){
      return users[chatId] 
    },
    setUserMessage(chatId,message){
      const user = this.getUser(chatId)
      user.prevMessage = message
      return user
    },
    isAuth(chatId){
      return this.getUser(chatId).authed
    }
  }
}