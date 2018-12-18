module.exports = {

  toCSV(data){
    const mostRows = this.countData(data)
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
  },
  countData(data){
    let curr = 0
    for(const key in data){
      curr = Math.max(curr,data[key].length)
    }
    return curr
  }
}