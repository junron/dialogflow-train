console.log("Dialogflow training admin commands enabled")
const config = require("./loadData")
const password = config.pop()
const buffer = Buffer.from(password,"utf-8")
const training = require("./training")(...config)
const {timingSafeEqual} = require("crypto")

module.exports = authedUserIds=>{
  const users = {}
  authedUserIds.forEach(id=>{
    users[id] = {
      authed:true
    }
  })
  const getUser = chatId => users[chatId] === undefined ? {} : users[chatId]
  const setUserMessage = (chatId,message)=>{
    const user = getUser(chatId)
    user.prevMessage = message
    return user
  }
  const isAuth = chatId=> getUser(chatId).authed

  // Call this function on message
  // Returns true if command has been executed, false otherwise
  return [async({text,chatId},bot)=>{
    if(text[0]!=="/" && !getUser(chatId).waitingForResponse){
      return false
    }
    const command = text.split(" ")[0].replace("/","")
    // Can be executed unauthed
    if(command==="auth"){
      const authPassword = Buffer.from(text.replace("/auth ",""))
      if(buffer.length==authPassword.length && timingSafeEqual(buffer,authPassword)){
        users[chatId] = {
          authed:true
        }
        await bot.sendMessage(chatId,"Authentication successful")
      }
      return true
    }
    if(!isAuth(chatId)){
      await bot.sendMessage(chatId,"You are not authorized to execute this command")
      return true
    }
    // Must be authed from this point
    // Special case
    if(getUser(chatId).waitingForResponse){
      if(Object.keys(getUser(chatId).intents).includes(text)){
        await training.addTrainingPhrase(getUser(chatId).intents[text],getUser(chatId).prevMessage.queryText)
        await training.removeTrainingPhrase(getUser(chatId).intents[getUser(chatId).prevMessage.intent.displayName],getUser(chatId).prevMessage.queryText)
        await bot.sendMessage(chatId,`Intent "${text}" updated successfully`)
        getUser(chatId).waitingForResponse = false
        delete getUser(chatId).intents
        return true
      }
    }
    if(command==="needsreview"){
      const message = await training.needsReview(false)
      await bot.sendMessage(chatId,message)
      return true
    }
    // Must have prevMessage from this point
    const result = getUser(chatId).prevMessage
    if(!result){
      await bot.sendMessage(chatId,"You do not have any previous messages")
      return true
    }
    switch(command){
      case "info":{
        await bot.sendMessage(chatId,`Query text: ${result.queryText}\n`+
        `Detected Intent: ${result.intent.displayName}\n`+
        `Confidence: ${result.intentDetectionConfidence}\n`+
        `Query Result: ${result.fulfillmentText}`);
        return true
      }
      case "add":{
        const intent = (await training.listIntents())
        .filter(intent=>{
          return intent.displayName === result.intent.displayName
        })[0]
        await training.addTrainingPhrase(intent,result.queryText)
        await bot.sendMessage(chatId,`Intent "${result.intent.displayName}" updated successfully`)
        return true
      }
      case "reject":{
        const intent = (await training.listIntents())
        .filter(intent=>{
          return intent.displayName === "Default fallback intent"
        })[0]
        await training.addTrainingPhrase(intent,result.queryText)
        await bot.sendMessage(chatId,`Fallback intent updated successfully`)
        return true
      }
      case "review":{
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
        return true
      }
      default:
        break;
    }
  },{
    getUser,
    setUserMessage,
    isAuth
  }]
}