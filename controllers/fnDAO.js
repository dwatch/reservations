const db = require('../db_connect.js')
const logger = require('../logger/logger.js')
const args = require('../helpers/args.helper.js')
const lib = require('../helpers/reserve.helper.js')
var format = require('pg-format');

class reserveDAO {
  static #queries = {
    "get_diet_restrict":          'SELECT bit_or(diet_restrict) FROM diner WHERE id = ANY($1::int[])',
    "post_reserve":               'INSERT INTO reservations (start_time, end_time) VALUES ($1, $2) RETURNING id',
    "post_party":                 'INSERT INTO party (rv_id, diner_id) VALUES %L',
    "post_reserved_tables":       'INSERT INTO reserved_table (rv_id, table_id) VALUES %L',
    "del_reserve":                'UPDATE reservations SET ts_cancelled = $1 WHERE id = $2',
    "del_party":                  'DELETE FROM party WHERE rv_id = $1',
    "del_reserved_tables":        'DELETE FROM reserved_table WHERE rv_id = $1',
    "get_all_diner_reserves":     `SELECT * FROM reservations r 
                                    LEFT JOIN party pt ON pt.rv_id = r.id 
                                    WHERE pt.diner_id = ANY($1::int[]) AND r.ts_cancelled IS NULL`,
    "get_diner_reserves":         `SELECT * FROM reservations r
                                    LEFT JOIN party pt ON pt.rv_id = r.id
                                    WHERE pt.diner_id = ANY($1::int[]) AND r.ts_cancelled IS NULL
                                    AND start_time > $2 AND start_time < $3`,
    "get_available_tables":       `SELECT DISTINCT t.id, t.capacity 
                                    FROM tables t 
                                    LEFT JOIN reserved_table rt ON t.id = rt.table_id
                                    LEFT JOIN reservations r ON r.id = rt.rv_id 
                                    WHERE rest_id = $1 
                                    AND (r.ts_created IS NULL
                                        OR (r.ts_cancelled IS NULL 
                                          AND NOT (r.start_time < $2 AND r.end_time > $3)
                                        )
                                      )
                                    ORDER BY capacity DESC`,
    "get_available_restaurants":  `SELECT rest.id, rest.name AS capacity
                                    FROM restaurant rest
                                    LEFT JOIN tables t ON rest.id = t.rest_id
                                    LEFT JOIN reserved_table rt ON t.id = rt.table_id
                                    LEFT JOIN reservations r ON r.id = rt.rv_id
                                    WHERE rest.id = ANY($1::int[])
                                    AND (r.ts_created IS NULL
                                          OR (r.ts_cancelled IS NULL 
                                            AND NOT (r.start_time < $2 AND r.end_time > $3)
                                          )
                                        )
                                    GROUP BY rest.id
                                    HAVING sum(capacity) > $4`,
    "get_viable_restaurants":     'SELECT * FROM restaurant WHERE diet_restrict = (diet_restrict | $1)',
    "find_reservation":           'SELECT * FROM reservations WHERE id = $1'
  }

  //For Logging
  static reserve_logger = logger
  static #base_meta = {filename: 'fnDAO.js'}
  //Magic Numbers/ColNames
  static #RESERVE_TIME = 2

  //Helper
  static async run_query(query_str, query_args, fn_name) {
    const json_params = this.#base_meta
    json_params['funcName'] = fn_name
    try {
      let result = await db.query(query_str, query_args)
      logger.info('query successful', json_params)
      logger.info(result.rows, json_params)
      return result.rows
    } catch(e) {
      logger.info('query failed', json_params)
      logger.error('query failed', json_params)
      logger.error(e, json_params)
      return null
    }
  }

  static async find_reservation(reserve_id) {
    logger.info('find_reservation', this.#base_meta)
    if (!args.isNum(reserve_id)) { 
      logger.error('ill-defined parameters', {filename: 'fnDAO.js', funcName:'find_reservation'}) 
      return null
    }
    let reserves = await this.run_query(this.#queries["find_reservation"], [reserve_id], 'find_reservation')
    if (reserves) {
      return reserves[0]
    }
    return reserves
  }

  static get_available_restaurants = async (n_diners, rest_ids, start_time) => {
    logger.info('get_available_restaurants', this.#base_meta)
    if(!args.isNum(n_diners) || !args.isNumList(rest_ids) || !args.isDate(start_time)) { 
      logger.error('ill-defined parameters', {filename: 'fnDAO.js', funcName:'get_available_restaurants'}) 
      return null 
    }
    let end_time = lib.chg_hours(start_time, this.#RESERVE_TIME)
    return this.run_query(this.#queries["get_available_restaurants"], 
                          [rest_ids, end_time, start_time, n_diners], 
                          'get_available_restaurants')
  }

  static async get_available_tables(rest_id, start_time) {
    logger.info('get_available_tables', this.#base_meta)
    if(!args.isNum(rest_id) || !args.isDate(start_time)) { 
      logger.error('ill-defined parameters', {filename: 'fnDAO.js', funcName:'get_available_tables'}) 
      return null 
    }
    let end_time = lib.chg_hours(start_time, this.#RESERVE_TIME)
    return this.run_query(this.#queries["get_available_tables"], [rest_id, end_time, start_time], 'get_available_tables')
  }

  static async get_diner_reservations(diner_ids, start_time = null) {
    logger.info('get_diner_reservations', this.#base_meta)
    if(!args.isNumList(diner_ids) || (start_time && !args.isDate(start_time))) { 
      logger.error('ill-defined parameters', {filename: 'fnDAO.js', funcName:'get_diner_reservations'}) 
      return null 
    }
    if (start_time == null) {
      return this.run_query(this.#queries["get_all_diner_reserves"], [diner_ids], 'get_diner_reservations')    
    } else {
      let params = [diner_ids, lib.chg_hours(start_time, -this.#RESERVE_TIME), lib.chg_hours(start_time, this.#RESERVE_TIME)]
      return this.run_query(this.#queries["get_diner_reserves"], params, 'get_diner_reservations')   
    }
  }

  static async get_dietary_restrictions(diner_ids) {
    logger.info('get_dietary_restrictions', this.#base_meta)
    if (!args.isNumList(diner_ids)) { 
      logger.error('ill-defined parameters', {filename: 'fnDAO.js', funcName:'get_dietary_restrictions'}) 
      return null 
    }
    let params = [diner_ids]
    let restricts = await this.run_query(this.#queries["get_diet_restrict"], params, 'get_dietary_restrictions')
    if (restricts) {
      return restricts[0]["bit_or"]
    }
    return restricts
  }

  static async get_viable_restaurants(diet_restrict) {
    logger.info('get_viable_restaurants', this.#base_meta)
    if (!args.isNum(diet_restrict)) { 
      logger.error('ill-defined parameters', {filename: 'fnDAO.js', funcName:'get_viable_restaurants'}) 
      return null
    }
    return this.run_query(this.#queries["get_viable_restaurants"], [diet_restrict], 'get_viable_restaurants')
  }

  //TODO - start_time must be greater than current time
  static async post_reservation(start_time, table_ids, diner_ids) {
    logger.info('post_reservation', this.#base_meta)
    if(!args.isDate(start_time) || !args.isNumList(table_ids) || !args.isNumList(diner_ids)) { 
      logger.error('ill-defined parameters', {filename: 'fnDAO.js', funcName:'post_reservation'}) 
      return null 
    }
    //First Post to Reservations Table
    let params = [start_time, lib.chg_hours(start_time, this.#RESERVE_TIME)]
    let rv_id = await this.run_query(this.#queries["post_reserve"], params, 'post_reservation -> post_reservation')
    if (!rv_id) { return null }
    //Then Post to reserved_table and party auxilliary tables
    let table_query_vals = table_ids.map(function (t_id) { return [rv_id[0]['id'], t_id] })
    let diner_query_vals = diner_ids.map(function (d_id) { return [rv_id[0]['id'], d_id] })
    let table_query = await this.run_query(format(this.#queries['post_reserved_tables'], table_query_vals), 
                                            [], 'post_reservation -> post_reserved_tables')
    let diner_query = await this.run_query(format(this.#queries['post_party'], diner_query_vals), 
                                            [], 'post_reservation -> post_party')
    return (table_query && diner_query) ? rv_id[0]['id'] : null
  }

  //TODO - What if it crashes halfway through these queries?
  static async del_reservation(reserve_id) {
    logger.info('del_reservation', this.#base_meta)
    if(!args.isNum(reserve_id)) { 
      logger.error('ill-defined parameters', {filename: 'fnDAO.js', funcName:'del_reservation'}) 
      return null 
    }
    let params = [new Date(), reserve_id]
    let del_reserve = await this.run_query(this.#queries["del_reserve"], params, 
                                              'del_reservation -> del_reserve')
    let del_rv_table = await this.run_query(this.#queries['del_reserved_tables'], [reserve_id], 
                                              'del_reservation -> del_reserved_tables')
    let del_party = await this.run_query(this.#queries['del_party'], [reserve_id], 
                                              'del_reservation -> del_party')
    if (del_reserve && del_party && del_rv_table) {
      return true
    }
    return null
  }
}

module.exports = reserveDAO