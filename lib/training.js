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
    }
  }

}