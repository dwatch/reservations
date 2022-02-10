isDate = (arg) => {
  return arg && !isNaN(arg) && Object.prototype.toString.call(arg) === "[object Date]"
}

isNum = (arg) => {
  return typeof(arg) === 'number'
}

isNumList = (arg) => {
  if(Object.prototype.toString.call(arg) === '[object Array]') {
    let boolArr = arg.map((v) => typeof(v) === 'number')
    return boolArr.every(Boolean)
  }
  return false
}

isTable = (arg) => {
  if(Object.prototype.toString.call(arg) === '[object Array]') {
    for (let table of arg) {
      if (!table["id"] || !table["capacity"]) { return false }
    }
    return true
  }
  return false
}

module.exports = { isDate, isNum, isNumList, isTable }