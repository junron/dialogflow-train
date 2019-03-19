const deepEqual = (x, y)=>{
  const ok = Object.keys, tx = typeof x, ty = typeof y;
  return x && y && tx === 'object' && tx === ty ? (
    ok(x).length === ok(y).length &&
      ok(x).every(key => deepEqual(x[key], y[key]))
  ) : (x === y);
}
module.exports = {

  toCSV(data){
    const mostRows = module.exports.countData(data)
    // Add one row for intent name
    let csv = Array(mostRows+1).fill("")
    const keys = Object.keys(data);
    for(const key of keys){
      csv[0]+=`"${key}",`
      for(let i=1;i<=mostRows;i++){
        if(data[key][i-1]===undefined){
          csv[i]+=","
        }else{
          csv[i]+=`"${data[key][i-1]}",`
        }
      }
    }
    // csv = csv.map(r=>r.split("\n").join("\\n"))
    return csv.join("\n")
  },
  countData(data){
    let curr = 0
    const keys = Object.keys(data);
    for(const key of keys){
      curr = Math.max(curr,data[key].length)
    }
    return curr
  },
  async toJSON(csv){
    const parser = require('csvtojson')()
    const json = {}
    const parsed = await parser.fromString(csv)
    for(const row of parsed){
      const keys = Object.keys(row);
      for(const key of keys){
        if(key.startsWith("field")){
          // Extra blank spaces
          continue
        }
        if(row[key].length===0){
          continue
        }
        if(json[key]===undefined){
          json[key] = [row[key].split("\\n").join("\n")]
        }else{
          json[key].push(row[key].split("\\n").join("\n"))
        }
      }
    }
    return json
  },
  deepEqual
}