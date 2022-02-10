const args = require('../helpers/args.helper.js')

const TABLE_CAPACITY = "capacity"
const TABLE_ID = "id"

chg_hours = (time, n_hours) => {
  if (time === null) { return null }
  let adj = new Date(time)
  if(!args.isDate(adj) || !args.isNum(n_hours)) { return null }
  adj.setHours(adj.getHours() + n_hours)
  return adj
}

choose_tables = (n_diners, tables) => {
  if(!args.isNum(n_diners) || !args.isTable(tables)) { return null}
  let total_capacity = tables.map( (t) => t[TABLE_CAPACITY] )
                             .reduce( (partial, a) => partial + a, 0 )
  if (n_diners > total_capacity) { return null } 
  else if(n_diners === total_capacity) { return tables.map( (t) => t[TABLE_ID] ) }
  else {
    let last_viewed = null
    let tables_to_book = []
    for (let t of tables) {
      let seats = t[TABLE_CAPACITY]
      if (seats > n_diners) { 
        last_viewed = t
      } else if ( seats === n_diners || !last_viewed ) {
        tables_to_book.push(t[TABLE_ID])
        n_diners -= seats
      } else {
        tables_to_book.push(last_viewed[TABLE_ID])
        n_diners -= last_viewed[TABLE_CAPACITY]
      }
      if (n_diners <= 0) { break }
    }
    if (n_diners > 0) { tables_to_book.push(last_viewed[TABLE_ID]) }
    return tables_to_book
  }
}

module.exports = { chg_hours, choose_tables }