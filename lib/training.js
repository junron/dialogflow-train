module.exports = (projectId,privKey,email)=>{
  const config = {
    credentials:{
      private_key:privKey,
      client_email:email
    }
  }
  // Instantiate a DialogFlow client.
  const dialogflow = require('dialogflow');
  const intentsClient = privKey ? 
  new dialogflow.IntentsClient(config)
  : new dialogflow.IntentsClient()
  const projectAgentPath = intentsClient.projectAgentPath(projectId)

  
  return {
    async listIntents(){
      const request = {
        parent: projectAgentPath,
        intentView:"INTENT_VIEW_FULL"
      };
      const intents = await intentsClient.listIntents(request)
      return intents[0]
    },
    async updateIntent(intent){
      const request = {
        intent,
        intentView:"INTENT_VIEW_FULL"
      };
      return await intentsClient.updateIntent(request)
    },
    async addTrainingPhrase(intent,text){
      intent.trainingPhrases.push({
        parts:[{
          text
        }],
        type:"EXAMPLE"
      })
      return this.updateIntent(intent)
    },
    async removeTrainingPhrase(intent,text){
      intent.trainingPhrases = intent.trainingPhrases
      .filter(({parts})=>{
        return parts[0].text!==text
      })
      return this.updateIntent(intent)
    },
    async needsReview(useColors=true,json=false){
      const intents = await this.listIntents()
      const bottom10 = 
      intents.map(intent=>({
        displayName:intent.displayName,
        trainingPhrases:intent.trainingPhrases.length
      }))
      .sort((intentA,intentB)=>{
        return intentA.trainingPhrases-intentB.trainingPhrases
      })
      .slice(0,10)
      if(json){
        return bottom10
      }
      let message = ""
      const numbers = Array.from(new Set(bottom10.map(a=>a.trainingPhrases)))
      for(let i=0;i<10;i++){
        const position = numbers.indexOf(bottom10[i].trainingPhrases)
        const color = 
        position === 0 ? "\x1b[31m" :
        position < 2 ? "\x1b[33m" :
        position < 3 ? "\x1b[35m" :
        ""

        message+=`${useColors ? color: ""}${i+1}. ${bottom10[i].displayName}
- ${bottom10[i].trainingPhrases} ${bottom10[i].trainingPhrases===1 ? "phrase" : "phrases"}${useColors ? "\x1b[0m": ""}\n`
      }
      return message
    }
  }

}