module.exports = async training =>{
  const output = {}
  const responses = {}

  return training.listIntents().then(data=>{
    data = data.sort((a,b)=>{
      if(a.displayName>b.displayName){
        return 1
      }else if(a.displayName<b.displayName){
        return -1
      }
      return 0
    })
    for(const intent of data){
      output[intent.displayName] = []
      responses[intent.displayName] = []
      for(const response of intent.messages){
        if(!response.text){
          if(response.payload.fields.telegram.structValue.fields.location){
            response.text = {
              text:["<location></location>"]
            }
          }else{
            response.text = {
              text:[response.payload.fields.telegram.structValue.fields.text.stringValue]
            }
            for(const btn of response.payload.fields.telegram.structValue.fields.inlineKeyboard.listValue.values){
              response.text.text[0]+="<button>"+btn.stringValue+"</button>"
            }
          }
        }
        responses[intent.displayName].push(...response.text.text)
      }
      for(const phrase of intent.trainingPhrases){
        output[intent.displayName].push(phrase.parts
          .map(part=>part.text)
          .join("")
          )
      }
    }
    return {
      responses,
      trainingPhrases:output
    }
  })
}